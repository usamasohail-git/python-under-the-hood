---
title: Project 3 - Solution - Goal 1
summary: Building the lazy row pipeline step by step, with a header-derived named tuple, defensive parsers with defaults, a zip-driven row parser and a generator that yields only valid Ticket tuples.
minutes: 20
files: ['nyc_parking_tickets_extract.csv']
---

## Plan

Goal 1 asks for a lazy iterator of typed named tuples. We'll build it as a short pipeline of small pieces, each easy to test on its own:

1. **Column names and the named tuple**, derived from the header line.
2. **`read_data()`**, a generator that yields raw data lines (header skipped).
3. **Parser functions**, one per data type, each with a fallback default.
4. **`parse_row()`**, which turns one raw line into a `Ticket` (or a default for bad rows).
5. **`parsed_data()`**, the generator that ties it all together.

## Column names and the `Ticket` named tuple

The header line gives us the column names. Named tuple field names must be valid identifiers, so we replace spaces with underscores and lower-case everything:

```python run
from collections import namedtuple

file_name = 'nyc_parking_tickets_extract.csv'

with open(file_name) as f:
    column_headers = next(f).strip('\n').split(',')

column_names = [header.replace(' ', '_').lower() for header in column_headers]
column_names
```

```python run
Ticket = namedtuple('Ticket', column_names)
Ticket._fields
```

Why a named tuple? Each ticket is a fixed record of nine fields. A named tuple is as light as a tuple, immutable, and lets us write `ticket.vehicle_make` instead of remembering that the make is at index 7.

## Reading the raw rows lazily

Every time we want the data we need to open the file and skip the header. A tiny generator wraps that up, and since a file object is already an iterator of lines, `yield from` hands the remaining lines straight through:

```python run
def read_data():
    with open(file_name) as f:
        next(f)           # skip the header row
        yield from f

raw_data = read_data()
for _ in range(3):
    print(repr(next(raw_data)))
```

Nothing is read until we ask for it, and the file is closed automatically once the generator is exhausted (or closed).

## Choosing a type for each column

Looking at the sample values, the columns break down like this:

| # | Column | Type | Required? |
|---|---|---|---|
| 0 | `summons_number` | `int` | yes |
| 1 | `plate_id` | `str` | yes |
| 2 | `registration_state` | `str` | no (allow empty) |
| 3 | `plate_type` | `str` | no |
| 4 | `issue_date` | `datetime.date` | yes |
| 5 | `violation_code` | `int` | yes |
| 6 | `vehicle_body_type` | `str` | no |
| 7 | `vehicle_make` | `str` | yes (Goal 2 counts it) |
| 8 | `violation_description` | `str` | no |

"Required" is our own decision: if a required field is missing or can't be parsed, we'll treat the whole row as invalid. Optional text fields just become empty strings.

## Parsers with defaults

The data is strings, and some of those strings will be empty or malformed. Each parser tries the conversion and returns a caller-chosen `default` instead of raising. Making `default` **keyword-only** (the bare `*`) keeps call sites readable: `parse_int(value, default=0)`, never a mysterious `parse_int(value, 0)`.

```python run
from datetime import datetime

def parse_int(value, *, default=None):
    try:
        return int(value)
    except ValueError:
        return default

def parse_date(value, *, default=None):
    date_format = '%m/%d/%Y'
    try:
        return datetime.strptime(value, date_format).date()
    except ValueError:
        return default

def parse_string(value, *, default=None):
    cleaned = value.strip()
    return cleaned if cleaned else default
```

Test them, including the failure cases:

```python run
print(repr(parse_int('123')), repr(parse_int('hello', default='N/A')), repr(parse_int('')))
print(repr(parse_date('3/28/2018')), repr(parse_date('10/5/2016')))
print(repr(parse_date('31/31/2000', default='N/A')))
print(repr(parse_string('   hello   ')), repr(parse_string('  ', default='N/A')))
```

Note that `strptime` happily accepts `10/5/2016` even though `%m` and `%d` normally mean two digits: zero padding is optional when parsing. And `.date()` drops the (meaningless) time part of the `datetime`.

<div class="callout note">
<span class="callout-title">Why `None` as the default?</span>

`None` is our marker for "this value is missing or invalid". It can't be confused with a real value: an `int` column never legitimately contains `None`, and text columns that are allowed to be empty use `''` instead. That's what lets us detect bad rows later with a single check.

</div>

## One parser per column

Now we line up a parser for each column, in column order. For the optional text columns we need `parse_string` with `default=''`, but we still need a **callable that takes one argument**. `functools.partial` creates exactly that by freezing the keyword argument; a `lambda` would work just as well (the last entry shows both styles):

```python run
from functools import partial

column_parsers = (
    parse_int,                              # summons_number
    parse_string,                           # plate_id (required)
    partial(parse_string, default=''),      # registration_state
    partial(parse_string, default=''),      # plate_type
    parse_date,                             # issue_date
    parse_int,                              # violation_code
    partial(parse_string, default=''),      # vehicle_body_type
    parse_string,                           # vehicle_make (required)
    lambda x: parse_string(x, default=''),  # violation_description
)
len(column_parsers) == len(column_names)
```

## Parsing a row

To parse a row we split it into fields and apply the *i*-th parser to the *i*-th field. `zip` pairs them up:

```python run
def parse_row(row):
    fields = row.strip('\n').split(',')
    return (func(field) for func, field in zip(column_parsers, fields))

rows = read_data()
for _ in range(3):
    print(list(parse_row(next(rows))))
```

The types are right. Now let's return a `Ticket`, but only when every **required** field parsed. Required fields default to `None`, so the row is valid when no value is `None`.

Can we just use `all()`? Not quite:

```python run
print(all([10, 'hello']))
print(all([None, 'hello']))
print(all([10, '']))          # an allowed empty string makes this False!
print(all([0, 'x']))          # ...and so would a legitimate 0
```

`all()` tests *truthiness*, and empty strings and zero are falsy. We need "is not `None`" specifically, which a generator expression expresses lazily (and `all` stops at the first failure):

```python run
values = [10, '', 0]
print(all(v is not None for v in values))
values.append(None)
print(all(v is not None for v in values))
```

The final row parser:

```python run
def parse_row(row, *, default=None):
    fields = row.strip('\n').split(',')
    # A list, not a generator: we iterate the parsed values twice
    # (once to validate, once to build the Ticket).
    parsed = [func(field) for func, field in zip(column_parsers, fields)]
    if all(item is not None for item in parsed):
        return Ticket(*parsed)
    return default

rows = read_data()
print(parse_row(next(rows)))
```

This is one of the places where being eager is the right call. A row has only nine values, and a generator would be exhausted by `all()` before we could build the tuple from it.

## Which rows get rejected?

Before trusting the pipeline, let's look at every row that fails validation, and pair each raw value with its column name so we can see *why*:

```python run
bad_rows = 0
for row in read_data():
    if parse_row(row) is None:
        bad_rows += 1
        print(dict(zip(column_names, row.strip('\n').split(','))))
print(bad_rows, 'rows rejected')
```

All five rejected rows are missing the vehicle make; every other required field parsed fine. Rows with an empty violation description are kept, since that column is optional, which is the behavior we chose. A thorough cleaning job would go further (for example, `99` is not a real registration state), but this is enough for our goals.

## The lazy iterator

Finally, the generator for Goal 1. It pulls raw lines from `read_data()`, parses each one and yields only the valid tickets:

```python run
def parsed_data():
    for row in read_data():
        parsed = parse_row(row)
        if parsed:
            yield parsed

tickets = parsed_data()
for _ in range(3):
    print(next(tickets))
```

`if parsed:` works here because a non-empty named tuple is always truthy and the default is `None`. Writing `if parsed is not None:` would be more explicit, and safer if you ever changed the default to something falsy.

Let's check the result on the whole file:

```python run
print(sum(1 for _ in parsed_data()), 'valid tickets')

first = next(parsed_data())
print({name: type(value).__name__ for name, value in first._asdict().items()})
```

995 valid tickets, each with properly typed fields. And at no point did we hold more than one row in memory: `read_data` yields a line, `parse_row` converts it, `parsed_data` yields the ticket, and the line is gone.

<div class="callout tip">
<span class="callout-title">Hardening the parser</span>

Two easy improvements for real-world files:

- **`zip(..., strict=True)`** (Python 3.10+) raises `ValueError` if a row has the wrong number of fields, instead of silently dropping the extras. You could catch that in `parse_row` and return the default.
- The **`csv` module** handles quoted fields that contain commas, which a plain `split(',')` gets wrong. `csv.reader(f)` is itself a lazy iterator, so it slots into `read_data()` with no other changes to the pipeline.

</div>

<div class="takeaways">

## Key takeaways

- Derive named-tuple field names from the header; a named tuple gives readable, immutable, lightweight records.
- Small parsers with a keyword-only `default` make bad data a value you can check, not an exception that stops the pipeline.
- `partial` (or a `lambda`) adapts a parser to the one-argument shape we need; `zip` applies one parser per field.
- `all()` tests truthiness. Use `all(x is not None for x in values)` when empty strings and zeros are valid.
- Materialize only where it's needed (the nine parsed fields of one row); keep the row-level pipeline lazy with generators and `yield from`.

</div>
