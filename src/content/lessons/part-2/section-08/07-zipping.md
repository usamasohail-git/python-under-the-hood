---
title: Zipping
summary: zip walks several iterables in parallel and stops at the shortest; zip_longest pads to the longest, zip(strict=True) insists on equal lengths, and pairwise pairs neighbors.
minutes: 12
---

## zip stops at the shortest

`zip(*iterables)` yields tuples made of one item from each iterable, in parallel. It is lazy, and it stops as soon as **any** of its inputs is exhausted:

```python run
l1 = [1, 2, 3, 4, 5]
l2 = [1, 2, 3, 4]
l3 = [1, 2, 3]

list(zip(l1, l2, l3))
```

It works with any iterables, including generators of different lengths:

```python run
def integers(n):
    yield from range(n)

def squares(n):
    for i in range(n):
        yield i ** 2

def cubes(n):
    for i in range(n):
        yield i ** 3

list(zip(integers(6), squares(5), cubes(4)))
```

Stopping at the shortest makes `zip` safe with **infinite** iterators, as long as at least one input is finite:

```python run
from itertools import count

list(zip('abc', count(), count(100, 10)))
```

One detail about *how* it stops: `zip` pulls from its inputs left to right. When it hits the exhausted one, any items it already pulled from earlier inputs in that round are lost. Put the shortest (or the one you'll reuse) **first** if that matters:

```python run
it = iter(range(10))
print(list(zip(it, 'ab')))
print(next(it))        # 2 was pulled and dropped in the failed third round

it = iter(range(10))
print(list(zip('ab', it)))
print(next(it))        # nothing lost this time
```

## Unzipping

Zipping is its own inverse. Unpack a list of tuples back into `zip` and the columns come out:

```python run
pairs = [('a', 1), ('b', 2), ('c', 3)]
letters, numbers = zip(*pairs)
print(letters, numbers)
```

Same trick, different angle: `zip(*matrix)` transposes a list of rows into columns.

## zip_longest

Sometimes stopping early silently drops data you care about. `itertools.zip_longest` keeps going until the **longest** input is done, filling the gaps with `fillvalue` (default `None`):

```python run
from itertools import zip_longest

print(list(zip_longest(l1, l2, l3)))
print(list(zip_longest(l1, l2, l3, fillvalue='N/A')))
```

There's only one `fillvalue`, used for every input that runs out. And because it runs to the longest input, never give `zip_longest` an infinite iterator: it would never stop.

<div class="callout modern">
<span class="callout-title">Python 3.10: zip(strict=True)</span>

Very often iterables are *supposed* to be the same length (names and scores, keys and values), and a mismatch means a bug. Plain `zip` hides that bug by truncating. With `strict=True`, `zip` raises `ValueError` if the inputs turn out to have different lengths:

```python run
names = ['ann', 'bob', 'cat']
scores = [90, 85]
print(list(zip(names, scores)))          # silently loses 'cat'
try:
    list(zip(names, scores, strict=True))
except ValueError as ex:
    print('ValueError:', ex)
```

The check happens when the shorter input runs out, so items before the mismatch have already been produced.

</div>

## Pairing neighbors with pairwise

A very common need is to look at each item together with the **next** one: differences between consecutive readings, steps in a path, checking a list is sorted. With a sequence you can zip it with itself shifted by one:

```python run
readings = [10, 12, 15, 15, 11]
list(zip(readings, readings[1:]))
```

That slice doesn't work on an iterator, and it copies the list. The previous lesson built a `tee` recipe for the general case.

<div class="callout modern">
<span class="callout-title">Python 3.10: itertools.pairwise</span>

`pairwise(iterable)` yields overlapping pairs `(s0, s1), (s1, s2), ...` from any iterable, lazily. An input with fewer than two items yields nothing.

```python run
from itertools import pairwise

print(list(pairwise('ABCD')))
print([b - a for a, b in pairwise(readings)])
print(all(a <= b for a, b in pairwise(readings)))
print(list(pairwise([42])))
```

</div>

Zipping also pairs nicely with the infinite iterators. Here is a header with numbered columns, with `zip` stopping when the header runs out:

```python run
header = ['name', 'city', 'age']
for i, col in zip(count(1), header):
    print(i, col)
```

<div class="takeaways">

## Key takeaways

- `zip` is lazy, works with any iterables, and stops at the **shortest**, so it's safe with infinite inputs.
- `zip(*rows)` unzips, or transposes, a list of tuples.
- `zip_longest` runs to the longest input and fills gaps with a single `fillvalue`; never give it an infinite iterator.
- Use `zip(..., strict=True)` (3.10+) when lengths must match, and `itertools.pairwise` (3.10+) for consecutive pairs.

</div>
