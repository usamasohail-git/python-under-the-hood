---
title: Project Solution - Goal 4
summary: Count car makes per gender with sorted and groupby, then pick out every make tied for the top spot with takewhile.
minutes: 15
files: ['data/personal_info.csv', 'data/employment.csv', 'data/vehicles.csv', 'data/update_status.csv']
---

## Setup: Goals 1 to 3

Same code as before, condensed. `filtered_iter_combined` from Goal 3 is the starting point.

```python run
import csv
import itertools
from collections import namedtuple
from datetime import datetime
from functools import partial

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

def filtered_iter_combined(fnames, class_names, parsers, compress_fields, *, key=None):
    yield from filter(key, iter_combined(fnames, class_names, parsers, compress_fields))

fnames = ('data/personal_info.csv', 'data/employment.csv',
          'data/vehicles.csv', 'data/update_status.csv')
class_names = 'Personal', 'Employment', 'Vehicle', 'UpdateStatus'
parsers = ((str, str, str, str, str), (str, str, str, str),
           (str, str, str, int), (str, parse_date, parse_date))
compress_fields = ((True, True, True, True, True), (True, True, True, False),
                   (False, True, True, True), (False, True, True))
cutoff_date = datetime(2017, 3, 1)
```

## Breaking the question down

"The largest group of car makes for each gender" means, for each gender separately:

1. keep only current records (Goal 3) for that gender,
2. group the records by `vehicle_make` and count each group,
3. find the highest count, and every make that has it.

Step 2 is where `groupby` comes in, and with it the rule from the Grouping lesson: `groupby` only merges **consecutive** items, so the data must be **sorted by the grouping key** first. Sorting needs all the items at once, so this is the first point in the project where we materialize data in a list (`sorted` does that for us). For 1,000 rows that's no problem.

## One filter for both conditions

The filter now has two conditions: recent enough, and the right gender. We write it as a plain function of three arguments and use `functools.partial` to fix the first two, leaving the one-argument predicate that `filter` expects:

```python run
def filter_key(cutoff_date, gender, row):
    return row.last_updated >= cutoff_date and row.gender == gender

is_current_female = partial(filter_key, cutoff_date, 'Female')
rows = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                              key=is_current_female)
first = next(rows)
print('first match:', first.first_name, first.gender, first.last_updated)
print('total matches:', 1 + sum(1 for _ in rows))
```

434 of the 871 current records belong to women.

## Grouping and counting

```python run
def group_data(fnames, class_names, parsers, compress_fields, filter_key, group_key):
    data = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                                  key=filter_key)
    sorted_data = sorted(data, key=group_key)
    groups = itertools.groupby(sorted_data, key=group_key)
    group_counts = ((key, sum(1 for _ in items)) for key, items in groups)
    return sorted(group_counts, key=lambda pair: pair[1], reverse=True)

group_key = lambda row: row.vehicle_make

results_f = group_data(fnames, class_names, parsers, compress_fields,
                       filter_key=partial(filter_key, cutoff_date, 'Female'),
                       group_key=group_key)
results_m = group_data(fnames, class_names, parsers, compress_fields,
                       filter_key=partial(filter_key, cutoff_date, 'Male'),
                       group_key=group_key)

print('Female:', results_f[:5])
print('Male:  ', results_m[:5])
```

A few details:

- The **same** `group_key` is used for sorting and grouping. If the two differed, equal keys might not end up adjacent.
- Each group is counted as soon as `groupby` produces it, inside one generator expression, so no group is skipped over and lost.
- The final `sorted(..., reverse=True)` orders makes by count. Python's sort is **stable**, so makes with equal counts stay in alphabetical order (the order `groupby` produced them in).

## Handling ties

Among current records, women's top two makes are tied at 42. Reporting just `results_f[0]` would silently drop Ford. Because the list is sorted by count, the winners are the leading run of items whose count equals the first one: a job for `takewhile`.

```python run
def largest_groups(counts):
    if not counts:
        return []
    top = counts[0][1]
    return list(itertools.takewhile(lambda pair: pair[1] == top, counts))

for gender, results in (('Female', results_f), ('Male', results_m)):
    print(gender, largest_groups(results))
```

So the answer: among current records, **Chevrolet and Ford** tie as the most common make for women (42 each), and **Ford** is the most common for men (40).

## Cross-checking with Counter

When a result matters, compute it a second, independent way. `collections.Counter` counts without sorting or grouping, and here it confirms the numbers:

```python run
from collections import Counter

current = filtered_iter_combined(fnames, class_names, parsers, compress_fields,
                                 key=lambda row: row.last_updated >= cutoff_date)
counts = Counter((row.gender, row.vehicle_make) for row in current)
print(counts[('Female', 'Chevrolet')], counts[('Female', 'Ford')], counts[('Male', 'Ford')])
```

This version also reads the files only **once**, whereas `group_data` runs the whole pipeline once per gender. Both are reasonable; the `groupby` version gives you the grouped records themselves, not just counts, if you need them.

<div class="callout note">
<span class="callout-title">Why not tee the stream for the two genders?</span>

You could read the data once and split it with `itertools.tee` into a "female" copy and a "male" copy. But we consume one copy completely (sorting it) before touching the other, so `tee` would buffer every row anyway. In that situation `list()` once and filter the list twice is simpler and uses the same memory.

</div>

<div class="takeaways">

## Key takeaways

- `groupby` needs data sorted by the **same** key it groups on; sorting is the one step that materializes the data.
- `functools.partial` turns a general multi-argument predicate into the one-argument function `filter` expects.
- Count each group as `groupby` yields it; then sort by count and use `takewhile` to collect every tie for first place.
- Verify the result another way, for example with `Counter`.

</div>
