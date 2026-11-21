---
title: Caveat Using Iterators as Function Arguments
summary: An iterator passed to a function that iterates more than once is empty the second time, silently. Learn to spot the bug and how to defend against it.
minutes: 12
files: ['cars.csv']
---

## The trap

A function that asks for "an iterable" will happily accept an iterator, since every iterator is an iterable. That's usually exactly what you want. But if the code iterates over its argument **more than once**, an iterator gives you real data on the first pass and *nothing* on the second, with no error to warn you.

## A small example

Here's an iterator that produces `n` random numbers:

```python run
import random

class Randoms:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        self.i += 1
        return random.randint(0, 100)

random.seed(0)
l = list(Randoms(10))
print(l)
print(min(l), max(l))
```

With a list, `min` and `max` each iterate over the data and both get all ten numbers. Now pass the iterator itself:

```python run
random.seed(0)
numbers = Randoms(10)
print(min(numbers))
try:
    print(max(numbers))
except ValueError as ex:
    print('ValueError:', ex)
```

`min` consumed the iterator, so `max` received an empty one. Here we were lucky: `max` of nothing raises an error. Many operations just quietly return an empty or wrong result instead, as the next example shows.

## A realistic example

For each car in `cars.csv`, we want its MPG as a percentage of the **best** MPG in the file. That takes two passes: one to find the maximum and one to compute the percentages.

```python run
def parse_data_row(row):
    row = row.strip('\n').split(';')
    return row[0], float(row[1])

def max_mpg(data):
    best = 0
    for row in data:
        _, mpg = parse_data_row(row)
        best = max(best, mpg)
    return best

def list_data(data, mpg_max):
    return [f'{car}: {mpg / mpg_max * 100:.2f}%'
            for car, mpg in map(parse_data_row, data)]
```

Each function works on its own:

```python run
with open('cars.csv') as f:
    next(f), next(f)                # skip the two header rows
    print(max_mpg(f))

with open('cars.csv') as f:
    next(f), next(f)
    result = list_data(f, 46.6)
print(len(result), result[:3])
```

Now combine them on the same open file:

```python run
with open('cars.csv') as f:
    next(f), next(f)
    max_ = max_mpg(f)
    print(f'max={max_}')
    result = list_data(f, max_)
print(len(result), result)
```

No error, just an empty result. The file object is an iterator; `max_mpg` read it to the end, and `list_data` started at the end. In a larger program this kind of bug can be very hard to track down.

## Fix 1: create the iterator twice

Open the file once per pass:

```python run
with open('cars.csv') as f:
    next(f), next(f)
    max_ = max_mpg(f)

with open('cars.csv') as f:
    next(f), next(f)
    result = list_data(f, max_)
print(len(result), result[:3])
```

This keeps memory use tiny, but it reads the file twice and only works when you *can* start again (you can't rewind a network stream, for instance).

## Fix 2: materialize into a list

Read the data into an iterable once, and pass that around:

```python run
with open('cars.csv') as f:
    data = f.readlines()[2:]

max_ = max_mpg(data)
result = list_data(data, max_)
print(len(result), result[:3])
```

A list can be iterated as often as needed. The cost is memory: the whole data set lives in RAM, which may not be acceptable for a huge file.

## Fix 3: make the function defensive

The bug is most dangerous when the two passes happen **inside one function**, because the caller can't see it:

```python run
def list_data(data):
    best = max(mpg for _, mpg in map(parse_data_row, data))     # pass 1
    return [f'{car}: {mpg / best * 100:.2f}%'                    # pass 2
            for car, mpg in map(parse_data_row, data)]

with open('cars.csv') as f:
    next(f), next(f)
    print(list_data(f))
```

Remember the test from earlier lessons: for an iterator, `iter(x) is x`. A function that needs several passes can use it either to **refuse** iterators outright:

```python run
def list_data(data):
    if iter(data) is data:
        raise ValueError('data must be a re-iterable collection, not an iterator')
    best = max(mpg for _, mpg in map(parse_data_row, data))
    return [f'{car}: {mpg / best * 100:.2f}%'
            for car, mpg in map(parse_data_row, data)]

with open('cars.csv') as f:
    next(f), next(f)
    try:
        list_data(f)
    except ValueError as ex:
        print('ValueError:', ex)
```

or to quietly **materialize** an iterator into a list, while leaving real iterables alone:

```python run
def list_data(data):
    if iter(data) is data:
        data = list(data)
    best = max(mpg for _, mpg in map(parse_data_row, data))
    return [f'{car}: {mpg / best * 100:.2f}%'
            for car, mpg in map(parse_data_row, data)]

with open('cars.csv') as f:
    next(f), next(f)
    result = list_data(f)
print(len(result), result[:3])
```

Which to choose depends on the function. Raising is explicit and keeps memory use predictable; converting is more convenient for callers.

<div class="callout note">
<span class="callout-title">Zero MPG</span>

A few rows in this data set (the Citroen DS-21 Pallas and the Saab 900s, for example) have an MPG of `0`, which really means "unknown". They show up as `0.00%`. In a real analysis you'd filter those rows out before computing statistics.

</div>

<div class="callout tip">
<span class="callout-title">Documenting the requirement</span>

In type hints, `Iterable[str]` promises only a single pass, while `Collection[str]` or `Sequence[str]` (from `collections.abc` or `typing`) tells callers you need something you can loop over more than once. Choosing the right hint documents the caveat for free.

</div>

<div class="takeaways">

## Key takeaways

- An iterator passed to code that loops twice is empty on the second loop, usually with **no error**.
- Built-ins like `min`, `max`, `sum`, `sorted` and `list` each consume an iterator completely.
- Fixes: create a fresh iterator per pass, materialize the data into a list once, or make the function check `iter(data) is data` and then raise or convert.
- Know whether you hold an iterable or an iterator, and say in your function's docs which one it needs.

</div>
