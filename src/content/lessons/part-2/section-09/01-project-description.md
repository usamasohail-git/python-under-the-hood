---
title: Project Description
summary: Four aligned CSV files about the same people; your job is to read them lazily into typed named tuples, merge them, drop stale records and find the most popular car makes per gender.
minutes: 10
files: ['data/personal_info.csv', 'data/employment.csv', 'data/vehicles.csv', 'data/update_status.csv']
---

## The data

You have four CSV files, each with one row per person:

| File | Contents |
|---|---|
| `data/personal_info.csv` | name, gender and language |
| `data/employment.csv` | employer, department and employee ID |
| `data/vehicles.csv` | the make, model and year of the person's vehicle |
| `data/update_status.csv` | when the record was created and last updated |

Every file contains an `ssn` column (a social security number) that **uniquely** identifies a person. You are guaranteed that:

- every SSN appears in **all four** files,
- it appears exactly **once** per file,
- all four files are **sorted by SSN**, so row *k* of each file describes the same person.

The files are already loaded in this page's working directory. Let's peek at the first lines of each:

```python run
fnames = ['data/personal_info.csv', 'data/employment.csv',
          'data/vehicles.csv', 'data/update_status.csv']

for fname in fnames:
    print(fname)
    with open(fname) as f:
        for _ in range(3):
            print('   ', next(f), end='')
```

A few things to notice already:

- the `ssn` column is first in three files but **last** in `employment.csv`
- `model_year` should be an integer, and the two dates in `update_status.csv` should be `datetime` objects; right now everything is text
- each file's first line is a **header** naming its columns

## The goals

**Goal 1.** For each file, create a lazy iterator that yields one **named tuple** per data row, with every field converted to the right type (strings, an `int` for `model_year`, `datetime` for the dates). The named tuple's field names should come from the header row. For now these are four independent iterators.

**Goal 2.** Create a single iterable that combines all the columns of all four files, yielding one named tuple per person. The files are aligned, so you don't need to match SSNs, but the combined record must contain `ssn` **only once**, not four times.

**Goal 3.** Some records are **stale**: they haven't been updated since March 1, 2017 (`last_updated < 2017-03-01`). Create an iterator over the combined data that yields only the **current** (non-stale) records.

**Goal 4.** Using the current records, find the **largest group of car makes for each gender**: for women and for men, which vehicle make is most common? There may be a tie, in which case report every make with the top count.

## Hint: don't split on commas

The obvious way to break a line into fields is `line.split(',')`. It works until a field itself contains a comma, which some employer names do. CSV handles this by wrapping such a field in double quotes:

```python run
with open('data/employment.csv') as f:
    for line in f:
        if '"' in line:
            print(line, end='')
            print(line.strip().split(','))
            break
```

The naive split produces five fields instead of four. The standard library's `csv` module understands the quoting rules (including doubled quotes inside quoted fields), so use `csv.reader`, which turns each line into a list of strings:

```python run
import csv
from itertools import islice

def read_file(fname):
    with open(fname) as f:
        yield from csv.reader(f, delimiter=',', quotechar='"')

for row in islice(read_file('data/employment.csv'), 4):
    print(row)

print(next(csv.reader([line])))   # the troublesome line from above
```

Every row is now split correctly, but the values are still all strings, and the header row is mixed in with the data. Dealing with both is part of Goal 1.

(`csv.reader` accepts any iterable of lines, so a one-element list works for testing a single line.)

A few more pointers:

- Keep everything **lazy**: generators and `itertools`, not lists, until a goal genuinely needs all the data at once.
- The dates look like `2017-10-07T00:14:42Z`. `datetime.strptime` with the format `'%Y-%m-%dT%H:%M:%SZ'` parses them.
- `collections.namedtuple` accepts a list of field names, such as a header row.
- Write small, reusable functions: Goal 2 builds on Goal 1, Goal 3 on Goal 2, and Goal 4 on Goal 3.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution lessons, open the **practice page** for this section. Each goal is an auto-graded exercise working with these same four files, so you can build the pipeline step by step and check every piece as you go. The next four lessons walk through one possible solution.

</div>

<div class="takeaways">

## Key takeaways

- Four files, one row per person, all sorted by SSN: row *k* of every file is the same person.
- The goals build on each other: typed per-file iterators, one combined stream, a date filter, then grouping.
- Use `csv.reader` rather than `split(',')`, because quoted fields can contain commas.

</div>
