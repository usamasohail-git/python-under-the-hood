---
title: Project 3 - Solution - Goal 2
summary: Counting violations per car make on top of the lazy Ticket iterator, first with a plain dict, then with defaultdict and Counter, and returning the counts sorted in descending order.
minutes: 14
files: ['nyc_parking_tickets_extract.csv']
---

## The pipeline from Goal 1

Here is the complete Goal 1 code in one cell, so this page is self-contained:

```python run
from collections import namedtuple
from datetime import datetime
from functools import partial

file_name = 'nyc_parking_tickets_extract.csv'

with open(file_name) as f:
    column_headers = next(f).strip('\n').split(',')

column_names = [header.replace(' ', '_').lower() for header in column_headers]
Ticket = namedtuple('Ticket', column_names)

def read_data():
    with open(file_name) as f:
        next(f)
        yield from f

def parse_int(value, *, default=None):
    try:
        return int(value)
    except ValueError:
        return default

def parse_date(value, *, default=None):
    try:
        return datetime.strptime(value, '%m/%d/%Y').date()
    except ValueError:
        return default

def parse_string(value, *, default=None):
    cleaned = value.strip()
    return cleaned if cleaned else default

column_parsers = (
    parse_int,                              # summons_number
    parse_string,                           # plate_id
    partial(parse_string, default=''),      # registration_state
    partial(parse_string, default=''),      # plate_type
    parse_date,                             # issue_date
    parse_int,                              # violation_code
    partial(parse_string, default=''),      # vehicle_body_type
    parse_string,                           # vehicle_make
    partial(parse_string, default=''),      # violation_description
)

def parse_row(row, *, default=None):
    fields = row.strip('\n').split(',')
    parsed = [func(field) for func, field in zip(column_parsers, fields)]
    if all(item is not None for item in parsed):
        return Ticket(*parsed)
    return default

def parsed_data():
    for row in read_data():
        parsed = parse_row(row)
        if parsed is not None:
            yield parsed

next(parsed_data())
```

## Counting with a plain dictionary

To count violations per make we stream through the tickets once and keep a running total per make in a dictionary: the make is the key and the count is the value. With a plain `dict`, the first time we see a make we have to create the entry:

```python run
makes_counts = {}

for ticket in parsed_data():
    if ticket.vehicle_make in makes_counts:
        makes_counts[ticket.vehicle_make] += 1
    else:
        makes_counts[ticket.vehicle_make] = 1

print(len(makes_counts), 'different makes')
print(sum(makes_counts.values()), 'tickets counted')
```

The dictionary is the only thing we build in memory, and it grows with the number of *distinct makes* (60), not with the number of tickets. That's the "minimal materialization" the project asked for: the tickets themselves are never stored.

To show the results from most to least common, sort the `(make, count)` pairs by their second element:

```python run
ranked = sorted(makes_counts.items(), key=lambda item: item[1], reverse=True)
for make, count in ranked[:10]:
    print(f'{make:6} {count}')
```

Sorting does need all the pairs at once, so this step can't be lazy, but it's working on 60 small tuples.

## `defaultdict`: no more "does the key exist?"

The `if … in … else` dance is so common that the standard library has a dictionary that does it for you. A `collections.defaultdict` is created with a **factory**: a zero-argument callable that produces the default value. When you look up a missing key, it calls the factory, stores the result under that key and returns it:

```python run
from collections import defaultdict

d = defaultdict(str)
d['a'] = 100
print(repr(d['a']), repr(d['b']))   # str() == ''
print(dict(d))                      # 'b' was inserted by the lookup
```

For counting, use `int` as the factory, since `int()` returns `0`. Then "set to 1 if new, otherwise add 1" collapses to a single `+= 1`:

```python run
d = defaultdict(int)
d['make1'] += 1      # missing: starts at int() == 0, becomes 1
d['make1'] += 1
d['make2'] += 1
dict(d)
```

The counting loop becomes:

```python run
makes_counts = defaultdict(int)
for ticket in parsed_data():
    makes_counts[ticket.vehicle_make] += 1

sorted(makes_counts.items(), key=lambda item: item[1], reverse=True)[:5]
```

## Returning a sorted dictionary

Let's wrap it up in a function. Since Python 3.7, dictionaries are guaranteed to **preserve insertion order**, so if we insert the makes in descending order of count, the returned dict *is* the ranking. (Older code used `OrderedDict` for this.)

```python run
def violation_counts_by_make():
    makes_counts = defaultdict(int)
    for ticket in parsed_data():
        makes_counts[ticket.vehicle_make] += 1

    return {make: count
            for make, count in sorted(makes_counts.items(),
                                      key=lambda item: item[1],
                                      reverse=True)}

counts = violation_counts_by_make()
print(list(counts.items())[:12])
```

Toyota (`TOYOT`) leads with 112 tickets, followed by Honda and Ford. The make codes are truncated to five characters in the source data, hence `CHEVR`, `NISSA` and `ME/BE` (Mercedes-Benz).

<div class="callout note">
<span class="callout-title">What about ties?</span>

`GMC` and `HYUND` both have 35 tickets. Python's `sort` is **stable**: items that compare equal keep their original relative order. With `reverse=True` that's still true (equal items are not flipped), so tied makes appear in the order they were first seen in the file. If you need a deterministic tie-breaker that doesn't depend on the input order, sort by a tuple key such as `key=lambda item: (-item[1], item[0])` (count descending, then name ascending).

</div>

## Even shorter: `Counter`

Counting hashable things is common enough that `collections.Counter` exists for exactly this job. It accepts any iterable, including a generator expression, so the whole computation is one lazy pass:

```python run
from collections import Counter

make_counter = Counter(ticket.vehicle_make for ticket in parsed_data())
print(make_counter.most_common(5))
print(dict(make_counter.most_common()) == counts)
```

`most_common()` returns the `(key, count)` pairs sorted by count (ties again in first-seen order), so it produces the same ranking as our function.

## Reusing the pipeline

Because `parsed_data()` yields typed records, other questions are now one-liners. For example, the most common violation descriptions, and the date range covered by the extract:

```python run
descriptions = Counter(t.violation_description or '(none)' for t in parsed_data())
for desc, count in descriptions.most_common(4):
    print(f'{count:4}  {desc}')

dates = [t.issue_date for t in parsed_data()]
print(min(dates), 'to', max(dates))
```

The dates come back as real `datetime.date` objects, so `min` and `max` compare them chronologically. With the raw strings, `'10/5/2016' < '9/30/2016'` would be `True` and the "earliest" date would be wrong. Getting the types right in Goal 1 is what makes analyses like this trustworthy.

<div class="takeaways">

## Key takeaways

- Count in a single streaming pass: only the per-key totals live in memory, not the records.
- `defaultdict(int)` turns "create or increment" into `counts[key] += 1`; the factory is called for missing keys.
- `sorted(d.items(), key=lambda item: item[1], reverse=True)` ranks by value; insertion-ordered dicts (3.7+) can hold the ranking.
- `sort` is stable, so ties keep their first-seen order; use a tuple key for a deterministic tie-breaker.
- `Counter(generator)` and `.most_common()` do the whole job in one line.
- A typed, lazy record iterator makes further analysis simple and correct.

</div>
