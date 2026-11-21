---
title: Project Solution - Goal 1
summary: Build a lazy CSV reader, generate a named tuple class from each header row, and parse every column into its proper type with a tuple of parser functions.
minutes: 16
files: ['data/personal_info.csv', 'data/employment.csv', 'data/vehicles.csv', 'data/update_status.csv']
---

## The plan

Goal 1 asks for four iterators, one per file, each yielding typed named tuples. Rather than writing four similar functions, we'll write one generic `iter_file` and describe each file with **data**: its file name, the name of its named tuple class, and a tuple of functions that convert each column.

We'll build it from small pieces:

1. `csv_parser`: a generator yielding the rows of a CSV file as lists of strings
2. `parse_date`: turn the date strings into `datetime` objects
3. `create_named_tuple_class`: a named tuple class built from a file's header row
4. `iter_file`: combine the three

## Step 1: a lazy CSV reader

```python run
import csv
from itertools import islice

def csv_parser(fname, *, delimiter=',', quotechar='"', include_header=False):
    with open(fname) as f:
        reader = csv.reader(f, delimiter=delimiter, quotechar=quotechar)
        if not include_header:
            next(reader)          # skip the header row
        yield from reader

for row in islice(csv_parser('data/vehicles.csv'), 3):
    print(row)
```

A few design decisions worth spelling out:

- **A generator with `with` inside.** The file is opened when iteration starts and closed when the generator finishes. The caller never deals with file handles. (If the caller stops early, as `islice` does here, the file closes when the generator is closed or garbage collected.)
- **`yield from reader`** delegates to the `csv.reader` iterator, so rows are read from disk one at a time. Nothing is loaded into a list.
- **Keyword-only options** (after the bare `*`) keep calls readable: `csv_parser(fname, include_header=True)` can't be confused with a positional argument.

## Step 2: parsing dates

The update-status file stores dates like `2017-10-07T00:14:42Z`. `strptime` with a matching format string turns them into `datetime` objects:

```python run
from datetime import datetime

def parse_date(value, *, fmt='%Y-%m-%dT%H:%M:%SZ'):
    return datetime.strptime(value, fmt)

parse_date('2017-10-07T00:14:42Z')
```

<div class="callout modern">
<span class="callout-title">fromisoformat and the trailing Z (Python 3.11)</span>

Since Python 3.11, `datetime.fromisoformat` also accepts the `Z` suffix, but it returns a timezone-**aware** datetime (UTC), while `strptime` with a literal `Z` in the format returns a **naive** one. The two can't be compared with each other:

```python run
aware = datetime.fromisoformat('2017-10-07T00:14:42Z')
naive = parse_date('2017-10-07T00:14:42Z')
print(aware.tzinfo, naive.tzinfo)
try:
    aware < datetime(2017, 3, 1)
except TypeError as ex:
    print('TypeError:', ex)
```

Either style is fine, as long as every date in the pipeline, including the cutoff date in Goal 3, uses the same one. We'll stay with naive datetimes from `strptime`.

</div>

## Step 3: a named tuple class from the header

`namedtuple` accepts any iterable of field names, so the header row can be passed straight in. That way the field names always match the file, and adding a column to the CSV needs no code change:

```python run
from collections import namedtuple

def extract_field_names(fname):
    reader = csv_parser(fname, include_header=True)
    return next(reader)

def create_named_tuple_class(fname, class_name):
    fields = extract_field_names(fname)
    return namedtuple(class_name, fields)

Vehicle = create_named_tuple_class('data/vehicles.csv', 'Vehicle')
print(Vehicle._fields)
```

`extract_field_names` takes only the first row and abandons the generator. Header names must be valid Python identifiers for this to work, which they are here (`namedtuple(..., rename=True)` would replace invalid ones).

## Step 4: describing each file

Now the per-file differences become plain data. Each parser tuple has one function per column, in column order. `str` leaves a value as it is, `int` converts it, and `parse_date` is our own function. Any one-argument callable works:

```python run
fname_personal = 'data/personal_info.csv'
fname_employment = 'data/employment.csv'
fname_vehicles = 'data/vehicles.csv'
fname_update_status = 'data/update_status.csv'
fnames = fname_personal, fname_employment, fname_vehicles, fname_update_status

personal_parser = (str, str, str, str, str)
employment_parser = (str, str, str, str)
vehicle_parser = (str, str, str, int)
update_status_parser = (str, parse_date, parse_date)
parsers = personal_parser, employment_parser, vehicle_parser, update_status_parser

class_names = 'Personal', 'Employment', 'Vehicle', 'UpdateStatus'
```

In a real project these would live in their own `constants.py` module, so that the processing code never hard-codes a file name.

## Step 5: the typed iterator

`iter_file` creates the class once, then for every row pairs each raw value with its parser using `zip`, applies the parser, and unpacks the results into the named tuple:

```python run
def iter_file(fname, class_name, parser):
    nt_class = create_named_tuple_class(fname, class_name)
    reader = csv_parser(fname)
    for row in reader:
        parsed_data = (parse_fn(value) for value, parse_fn in zip(row, parser))
        yield nt_class(*parsed_data)

for fname, class_name, parser in zip(fnames, class_names, parsers):
    file_iter = iter_file(fname, class_name, parser)
    print(fname)
    for row in islice(file_iter, 2):
        print('   ', row)
```

The values now have real types:

```python run
vehicle = next(iter_file(fname_vehicles, 'Vehicle', vehicle_parser))
status = next(iter_file(fname_update_status, 'UpdateStatus', update_status_parser))

print(type(vehicle.model_year), vehicle.model_year + 1)
print(type(status.last_updated), status.last_updated - status.created)
```

The quoted employer names come through as single fields, because `csv.reader` handled them:

```python run
employment = iter_file(fname_employment, 'Employment', employment_parser)
next(row for row in employment if ',' in row.employer)
```

And each iterator is lazy and one-shot, just like any generator. Counting the rows consumes it:

```python run
it = iter_file(fname_personal, 'Personal', personal_parser)
print(sum(1 for _ in it), list(it))
```

<div class="callout note">
<span class="callout-title">`zip(row, parser)` and mismatched lengths</span>

If a row had more values than parsers (a malformed line), `zip` would silently drop the extras and the named tuple constructor would then complain about missing arguments, or not at all if lengths happened to line up. On Python 3.10+ you can write `zip(row, parser, strict=True)` to get a clear `ValueError` the moment a row has the wrong number of fields.

</div>

<div class="takeaways">

## Key takeaways

- A generator that opens the file inside `with` and uses `yield from csv.reader(...)` gives lazy, correctly split rows with automatic cleanup.
- Building the named tuple class from the header keeps field names in sync with the data.
- A tuple of parser functions (`str`, `int`, `parse_date`...) turns per-file differences into data, so one `iter_file` handles every file.
- `zip(row, parser)` pairs each value with its converter; `nt_class(*values)` builds the record.

</div>
