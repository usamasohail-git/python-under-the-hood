---
title: Project Solution - Goal 3
summary: Filter the combined stream down to current records with filter and a key function, keeping the pipeline lazy and the cutoff configurable.
minutes: 11
files: ['data/personal_info.csv', 'data/employment.csv', 'data/vehicles.csv', 'data/update_status.csv']
---

## Setup: Goals 1 and 2

The code from the previous two goals, condensed into one cell. Nothing here has changed.

```python run
import csv
import itertools
from collections import namedtuple
from datetime import datetime

def csv_parser(fname, *, delimiter=',', quotechar='"', include_header=False):
    with open(fname) as f:
        reader = csv.reader(f, delimiter=delimiter, quotechar=quotechar)
        if not include_header:
            next(reader)
        yield from reader

def parse_date(value, *, fmt='%Y-%m-%dT%H:%M:%SZ'):
    return datetime.strptime(value, fmt)

def extract_field_names(fname):
    return next(csv_parser(fname, include_header=True))

def create_named_tuple_class(fname, class_name):
    return namedtuple(class_name, extract_field_names(fname))

def iter_file(fname, class_name, parser):
    nt_class = create_named_tuple_class(fname, class_name)
    for row in csv_parser(fname):
        yield nt_class(*(parse_fn(value) for value, parse_fn in zip(row, parser)))

def create_combo_named_tuple_class(fnames, compress_fields):
    field_names = itertools.chain.from_iterable(extract_field_names(fname) for fname in fnames)
    mask = itertools.chain.from_iterable(compress_fields)
    return namedtuple('Data', itertools.compress(field_names, mask))

def iter_combined(fnames, class_names, parsers, compress_fields):
    combo_nt = create_combo_named_tuple_class(fnames, compress_fields)
    mask = tuple(itertools.chain.from_iterable(compress_fields))
    zipped_tuples = zip(*(iter_file(fname, class_name, parser)
                          for fname, class_name, parser in zip(fnames, class_names, parsers)))
    for zipped_tuple in zipped_tuples:
        row = itertools.chain.from_iterable(zipped_tuple)
        yield combo_nt(*itertools.compress(row, mask))

fnames = ('data/personal_info.csv', 'data/employment.csv',
          'data/vehicles.csv', 'data/update_status.csv')
class_names = 'Personal', 'Employment', 'Vehicle', 'UpdateStatus'
parsers = ((str, str, str, str, str), (str, str, str, str),
           (str, str, str, int), (str, parse_date, parse_date))
compress_fields = ((True, True, True, True, True), (True, True, True, False),
                   (False, True, True, True), (False, True, True))
```

## What "stale" means

A record is **stale** if it hasn't been updated since March 1, 2017, that is, if `last_updated < datetime(2017, 3, 1)`. We want the opposite: the **current** records, where `last_updated >= cutoff`. Because Goal 1 already parsed `last_updated` into a `datetime`, this is a direct comparison. With the raw strings we'd be relying on the ISO format happening to sort correctly as text.

Let's look at the first few records' dates:

```python run
cutoff = datetime(2017, 3, 1)
for row in itertools.islice(iter_combined(fnames, class_names, parsers, compress_fields), 5):
    print(row.ssn, row.last_updated, 'current' if row.last_updated >= cutoff else 'STALE')
```

## A filtered iterator

The built-in `filter` already does what we need, lazily. The design question is how much to hard-code. The date and the field are specific to this goal, but "the combined data, filtered somehow" is reusable, so we accept the predicate as a `key` argument:

```python run
def filtered_iter_combined(fnames, class_names, parsers, compress_fields, *, key=None):
    iter_combo = iter_combined(fnames, class_names, parsers, compress_fields)
    yield from filter(key, iter_combo)
```

With `key=None`, `filter` keeps every truthy item, and every named tuple with fields is truthy, so the default passes everything through.

Now the current records:

```python run
cutoff = datetime(2017, 3, 1)
current = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                                 key=lambda row: row.last_updated >= cutoff)

for row in itertools.islice(current, 3):
    print(row.ssn, row.first_name, row.last_updated)
```

The second person (`101-71-4702`, updated January 2017) is skipped, as expected. How many records survive?

```python run
current = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                                 key=lambda row: row.last_updated >= cutoff)
n_current = sum(1 for _ in current)

all_rows = iter_combined(fnames, class_names, parsers, compress_fields)
n_stale = sum(1 for row in all_rows if row.last_updated < cutoff)

print(n_current, n_stale, n_current + n_stale)
```

871 current, 129 stale, 1,000 in total. Every check above used a fresh iterator, because counting consumes the one it's given.

## Making the cutoff a parameter

A lambda that refers to a global `cutoff` works, but it quietly depends on whatever `cutoff` is when the filter **runs**, not when it was created (closures look up variables late). A small factory function binds the date explicitly:

```python run
def updated_since(cutoff_date):
    def predicate(row):
        return row.last_updated >= cutoff_date
    return predicate

for date in (datetime(2017, 3, 1), datetime(2018, 1, 1), datetime(2018, 3, 1)):
    rows = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                                  key=updated_since(date))
    print(date.date(), sum(1 for _ in rows))
```

`functools.partial` is another way to do this, and you'll see it in the next goal.

<div class="callout tip">
<span class="callout-title">Filter as early as you can</span>

Our filter only needs `last_updated`, which comes from a single file. For much bigger data, you could filter while zipping, and skip building a `Data` tuple at all for stale rows. Here, with 1,000 rows, the clarity of "combine, then filter" is worth more than the saving.

</div>

<div class="takeaways">

## Key takeaways

- Parsing dates up front (Goal 1) makes the staleness test a plain `datetime` comparison.
- `filter(key, iterable)` keeps the pipeline lazy; accepting `key` as a parameter makes the function reusable.
- A predicate factory (or `functools.partial`) binds the cutoff date explicitly instead of relying on a global.
- Counting consumes an iterator: build a fresh one for every pass.

</div>
