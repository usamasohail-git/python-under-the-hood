---
title: Example 1 - Consuming Iterators Manually
summary: Calling next() yourself lets you peel off the first few items of a stream, like a file's header rows, and then hand the rest to a loop.
minutes: 12
files: ['cars.csv']
---

## `next()` without a loop

You don't need a loop to use an iterator. Grab one with `iter()` and pull items out with `next()` whenever you want:

```python run
s = 'I sleep all night, and I work all day'
iter_s = iter(s)
print(next(iter_s), next(iter_s), next(iter_s), next(iter_s), next(iter_s), sep='|')
```

The iterator remembers how far it got. If you now loop over `iter_s`, the loop picks up **where you left off**, not at the start. That's the trick this lesson is about: consume a few items by hand, then let a loop or comprehension handle the rest.

## The data: a file with two header rows

`cars.csv` describes about 400 car models. Values are separated by `;`, the first row holds the column names and the second row holds each column's data type:

```python run
with open('cars.csv') as file:
    for _, line in zip(range(5), file):    # just the first 5 lines
        print(line, end='')
```

(`print(..., end='')` because each line already ends with `'\n'`.) Our goal:

1. read the first row and create a `namedtuple` class from the column names
2. read the second row and remember the types
3. convert every remaining row to the right types and store it as a named tuple

## First attempt: a row counter

Without manual iteration, a natural approach is to count rows and branch on the count:

```python run
from collections import namedtuple

cars = []
with open('cars.csv') as file:
    row_index = 0
    for line in file:
        if row_index == 0:          # header row
            headers = line.strip('\n').split(';')
            Car = namedtuple('Car', headers)
        elif row_index == 1:        # data type row
            data_types = line.strip('\n').split(';')
        else:                       # data rows
            data = line.strip('\n').split(';')
            cars.append(Car(*data))
        row_index += 1

print(data_types)
print(cars[0])
```

It works, but every one of the ~400 iterations re-checks conditions that are only relevant for the first two lines. And notice that every field is still a string.

## Converting the values

Let's solve the type conversion as a separate, small problem. A function maps a type name to a conversion:

```python run
def cast(data_type, value):
    if data_type == 'DOUBLE':
        return float(value)
    elif data_type == 'INT':
        return int(value)
    else:                       # STRING and CAT (category) stay text
        return str(value)
```

To convert a whole row we need to pair each value with its type. `zip` does exactly that:

```python run
data_row = ['Chevrolet Chevelle Malibu', '18.0', '8', '307.0', '130.0', '3504.', '12.0', '70', 'US']
print(list(zip(data_types, data_row))[:3])

def cast_row(data_types, data_row):
    return [cast(data_type, value)
            for data_type, value in zip(data_types, data_row)]

print(cast_row(data_types, data_row))
```

## Using the file iterator directly

A file object is itself an iterator over its lines (we'll confirm this in a later lesson). So we can call `next()` on it twice to take the two header rows, and then loop over the **same iterator** for the data rows. The loop starts at line 3 because lines 1 and 2 have already been consumed:

```python run
cars = []
with open('cars.csv') as file:
    file_iter = iter(file)
    headers = next(file_iter).strip('\n').split(';')
    Car = namedtuple('Car', headers)
    data_types = next(file_iter).strip('\n').split(';')
    for line in file_iter:
        data = cast_row(data_types, line.strip('\n').split(';'))
        cars.append(Car(*data))

print(len(cars))
print(cars[0])
```

No row counter, no branches inside the loop, and each part of the file is handled by code that's only about that part. Since the loop body now just builds one value per line, it collapses naturally into a comprehension:

```python run
with open('cars.csv') as file:
    file_iter = iter(file)
    headers = next(file_iter).strip('\n').split(';')
    Car = namedtuple('Car', headers)
    data_types = next(file_iter).strip('\n').split(';')
    cars = [Car(*cast_row(data_types, line.strip('\n').split(';')))
            for line in file_iter]

print(cars[1])
print(cars[1].MPG / 2, cars[1].Cylinders + 1)   # real numbers now
```

<div class="callout note">
<span class="callout-title">Why `iter(file)` at all?</span>

Because a file is already an iterator, `iter(file)` returns the file itself, so `next(file)` would work just as well. Writing `iter(...)` explicitly makes the intent obvious and keeps the code correct if `file` is ever replaced by a list of lines or another *iterable* that isn't an iterator. Calling `next()` directly on a list would fail.

</div>

## When the iterator might be empty

`next()` raises `StopIteration` if there's nothing left. Pass a second argument to get a default instead:

```python run
empty = iter([])
print(next(empty, 'no header'))

it = iter(['only one line'])
print(next(it, None), next(it, None))
```

This is handy for reading an optional header without wrapping it in `try`/`except`.

<div class="callout tip">
<span class="callout-title">In real code</span>

For real CSV files, the standard library's `csv` module handles quoting and escaping for you: `csv.reader(file, delimiter=';')` returns an iterator of rows (lists of strings), and the same `next()` trick works on it to pull off the header rows first.

</div>

<div class="takeaways">

## Key takeaways

- `next(iterator)` takes one item without a loop. The iterator remembers its position, so a later loop continues from there.
- Pattern: consume header rows with `next()`, then loop over the same iterator for the data.
- `zip` pairs values with their types for row-by-row conversion.
- `next(iterator, default)` returns `default` instead of raising `StopIteration`.

</div>
