---
title: Project Solution - Goal 2
summary: Zip the four per-file iterators together, flatten each group of records with chain.from_iterable, and drop the duplicate SSN columns with a compress mask.
minutes: 15
files: ['data/personal_info.csv', 'data/employment.csv', 'data/vehicles.csv', 'data/update_status.csv']
---

## Where we start

We carry over the Goal 1 code unchanged: the lazy CSV reader, the date parser, the named tuple factory, `iter_file`, and the per-file constants.

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

fnames = ('data/personal_info.csv', 'data/employment.csv',
          'data/vehicles.csv', 'data/update_status.csv')
class_names = 'Personal', 'Employment', 'Vehicle', 'UpdateStatus'
parsers = ((str, str, str, str, str),
           (str, str, str, str),
           (str, str, str, int),
           (str, parse_date, parse_date))
```

## Step 1: walking the files in parallel

Row *k* of every file describes the same person, so we need item *k* of every iterator at the same time. That's exactly what `zip` does. We build the four iterators with a generator expression and unpack them into `zip`:

```python run
file_iters = (iter_file(fname, class_name, parser)
              for fname, class_name, parser in zip(fnames, class_names, parsers))
zipped = zip(*file_iters)

first = next(zipped)
for record in first:
    print(record)
```

Each item of `zipped` is a tuple of four named tuples. Unpacking `*file_iters` exhausts the small outer generator (four items) but doesn't read any rows: each `iter_file` generator is lazy until `zip` asks it for a value.

Because the files are guaranteed to be aligned, we don't need to compare SSNs. If they weren't guaranteed, this is the place to check, for example `assert len({r.ssn for r in group}) == 1`, or `zip(..., strict=True)` to catch files of different lengths.

## Step 2: flattening a group of records

We want one flat row per person, not a tuple of four tuples. A named tuple is itself iterable, so `chain.from_iterable` flattens one group into a single stream of values:

```python run
flat = list(itertools.chain.from_iterable(first))
print(len(flat))
print(flat)
```

Sixteen values, but the SSN appears four times: positions 0, 8, 9 and 13.

## Step 3: dropping duplicate columns with compress

Which columns to keep is a decision made **once**, so we write it down as a mask per file, `True` to keep a column, `False` to drop it. We keep the SSN from the personal file and drop it from the other three (in `employment.csv` it's the *last* column):

```python run
personal_fields_compress = [True, True, True, True, True]
employment_fields_compress = [True, True, True, False]
vehicle_fields_compress = [False, True, True, True]
update_status_fields_compress = [False, True, True]
compress_fields = (personal_fields_compress, employment_fields_compress,
                   vehicle_fields_compress, update_status_fields_compress)

mask = tuple(itertools.chain.from_iterable(compress_fields))
print(list(itertools.compress(flat, mask)))
```

The masks are flattened the same way as the data, so position *i* in the mask lines up with value *i* in a flattened row. Notice we store the flattened mask as a **tuple**: it's reused for every row, and a `chain` iterator would be exhausted after the first one.

## Step 4: a named tuple class for the combined record

The same flatten-and-compress trick, applied to the four **headers**, gives the field names of the combined record. Since they come from the files, they're always in the same order as the values:

```python run
def create_combo_named_tuple_class(fnames, compress_fields):
    compress_fields = itertools.chain.from_iterable(compress_fields)
    field_names = itertools.chain.from_iterable(extract_field_names(fname) for fname in fnames)
    compressed_field_names = itertools.compress(field_names, compress_fields)
    return namedtuple('Data', compressed_field_names)

Data = create_combo_named_tuple_class(fnames, compress_fields)
print(Data._fields)
```

Here the `chain` iterators are fine, because they're used exactly once.

## Step 5: putting it together

```python run
def iter_combined(fnames, class_names, parsers, compress_fields):
    combo_nt = create_combo_named_tuple_class(fnames, compress_fields)
    compress_fields = tuple(itertools.chain.from_iterable(compress_fields))
    zipped_tuples = zip(*(iter_file(fname, class_name, parser)
                          for fname, class_name, parser in zip(fnames, class_names, parsers)))
    merged_iter = (itertools.chain.from_iterable(zipped_tuple) for zipped_tuple in zipped_tuples)
    for row in merged_iter:
        compressed_row = itertools.compress(row, compress_fields)
        yield combo_nt(*compressed_row)

data_iter = iter_combined(fnames, class_names, parsers, compress_fields)
for row in itertools.islice(data_iter, 2):
    print(row, end='\n\n')
```

Every stage is lazy: `zip` pulls one record from each file, `chain.from_iterable` flattens it, `compress` filters the values, and only then is a `Data` tuple built. At no point does more than one person's data sit in memory.

Let's check the full stream: 1,000 people, each with a unique SSN, and types preserved from Goal 1:

```python run
rows = list(iter_combined(fnames, class_names, parsers, compress_fields))
print(len(rows), len({row.ssn for row in rows}))
print(rows[-1].model_year, type(rows[-1].last_updated).__name__)
```

<div class="callout note">
<span class="callout-title">Why not a dictionary keyed by SSN?</span>

If the files were **not** aligned, you would have to match records by SSN, for example by loading three files into dictionaries and looking each person up. That needs memory proportional to the data. The alignment guarantee is what lets this solution use a single, constant-memory pass. Knowing your data's guarantees often decides which design is possible.

</div>

<div class="takeaways">

## Key takeaways

- `zip(*iterators)` walks parallel, aligned iterators in lock step.
- `chain.from_iterable` flattens one level: a tuple of named tuples becomes one stream of values.
- A flattened `compress` mask selects columns; apply the same mask to the headers to get matching field names.
- Store a mask you reuse as a tuple. An iterator would be used up after the first row.

</div>
