---
title: Project 3 - Description
summary: The brief for a lazy parking-ticket pipeline, covering the data file, the two goals (typed named tuples per row, and violation counts by car make) and the constraints.
minutes: 8
files: ['nyc_parking_tickets_extract.csv']
---

## The data

You're given `nyc_parking_tickets_extract.csv`, a small extract (1,000 tickets) from a public data set of parking violations issued in New York City. The full data set has millions of rows, which is exactly why we want a solution that never needs the whole file in memory.

Let's peek at the first few lines. A file object is a lazy iterator over its lines, so `next()` reads just one line at a time:

```python run
file_name = 'nyc_parking_tickets_extract.csv'

with open(file_name) as f:
    for _ in range(4):
        print(repr(next(f)))
```

Some things to notice straight away:

- The **first line is a header** with the column names. The data starts on line 2.
- Every line ends with a `'\n'` that you'll have to strip.
- Fields are separated by commas. (In this extract no field contains a comma or quotes, so splitting on `','` is enough. A general CSV file would need the `csv` module.)
- Everything you read from a file is a **string**, even values that look like numbers or dates.

Here are the columns, paired with the values from the first ticket:

```python run
with open(file_name) as f:
    headers = next(f).strip('\n').split(',')
    first = next(f).strip('\n').split(',')

for header, value in zip(headers, first):
    print(f'{header:>22}: {value}')
```

## The data isn't perfectly clean

Real data rarely is. Some rows have **empty fields**, for example tickets with no vehicle make or no violation description:

```python run
with open(file_name) as f:
    next(f)                                   # skip the header
    rows = (line.strip('\n').split(',') for line in f)
    no_make = [row for row in rows if row[7] == '']

print(len(no_make), 'rows without a vehicle make')
for row in no_make[:3]:
    print(row)
```

You'll also spot values such as `99` in the registration-state column, which is clearly not a state. Decide which problems matter for the goals and handle those; you don't need to clean everything.

## Your goals

**Goal 1.** Create a **lazy iterator** that yields one **named tuple** per data row. Each field should have an appropriate Python type: integers should be `int`, dates should be `datetime.date`, and text should be a stripped `str`. Decide what to do with rows that have missing or invalid values in important columns.

**Goal 2.** Calculate the **number of violations by car make** (the `Vehicle Make` column), sorted from the most common make to the least common.

## Constraints and hints

- **Be lazy wherever you reasonably can.** Read and process the file one row at a time with generators. It's fine to materialize something when you have to (the final counts, for instance), but keep it to a minimum.
- Turn the header into valid identifiers for the named tuple's field names (`'Summons Number'` → `'summons_number'`).
- Write one small parser function per data type (`int`, date, string). Each should accept a `default` to return when the value can't be parsed, rather than crashing on bad data.
- The dates look like `10/5/2016`, that is month/day/year. `datetime.strptime` with the right format string will parse them.
- A generator that skips the header and then delegates to the file with `yield from` makes a nice first stage of the pipeline.
- For counting, think about which dictionary type saves you from checking whether a key already exists.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution walkthroughs, open the **practice page** for this section. Each goal is broken into auto-graded exercises (parsers, row parser, lazy iterator, counts by make) with tests that check your types, your handling of bad rows and your laziness. Have a go first; the next two lessons build a complete solution step by step.

</div>

<div class="takeaways">

## Key takeaways

- The input is a 1,000-row CSV extract with a header line, `'\n'` line endings and some empty fields.
- Goal 1: a lazy iterator of typed named tuples, one per valid row.
- Goal 2: violation counts per vehicle make, sorted in descending order.
- Prefer generators throughout; only the final result should need to be materialized.

</div>
