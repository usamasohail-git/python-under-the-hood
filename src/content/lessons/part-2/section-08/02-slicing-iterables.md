---
title: Slicing Iterables
summary: itertools.islice brings slicing to any iterable, lazily, and itertools.batched (3.12) splits an iterable into fixed-size chunks.
minutes: 12
---

## Slicing needs a sequence

Square-bracket slicing is a **sequence** feature. A list, tuple, string or range knows its length and can jump straight to any index, so `l[0:2]` (or the equivalent `l[slice(0, 2)]`) is easy:

```python run
l = [1, 2, 3, 4, 5]
s = slice(0, 2)
print(l[0:2], l[s])
```

A generator has no indexes. It can only hand you the next value, so slicing it fails:

```python run
import math

def factorials(n):
    for i in range(n):
        yield math.factorial(i)

facts = factorials(100)
try:
    facts[0:2]
except TypeError as ex:
    print('TypeError:', ex)
```

## Building a lazy slice by hand

We can still get "items 1 to 4" from an iterator: throw away the first `start` items, then yield the next `stop - start`. Written as a generator, the result is itself lazy:

```python run
def slice_(iterable, start, stop):
    it = iter(iterable)
    for _ in range(start):
        next(it)
    for _ in range(start, stop):
        yield next(it)

list(slice_(factorials(100), 1, 5))
```

This version has no `step`, and it would crash with a `RuntimeError` if the iterable ran out early (a `StopIteration` escaping a generator is converted into an error). Rather than polishing it, use the real thing.

## itertools.islice

`islice(iterable, stop)` or `islice(iterable, start, stop[, step])` returns a lazy iterator over the selected items:

```python run
from itertools import islice

print(list(factorials(10)))
print(islice(factorials(10), 0, 3))          # just an iterator, nothing computed yet
print(list(islice(factorials(10), 0, 3)))
print(list(islice(factorials(10), 0, 10, 2)))
print(list(islice(factorials(10), None, None, 2)))   # None means "default"
```

The arguments follow the usual slice conventions (start is inclusive, stop exclusive, `None` means "from the beginning", "to the end", "step 1"), with one big restriction: **no negative values**. A negative index means "count from the end", and an iterator has no end you can see without consuming everything.

```python run
try:
    islice(factorials(10), -3, None)
except ValueError as ex:
    print('ValueError:', ex)
```

`islice` really shines with **infinite** iterators, where "the first five" is the only sensible question:

```python run
def factorials():
    index = 0
    while True:
        yield math.factorial(index)
        index += 1

list(islice(factorials(), 5))
```

## Skipping is not free

`islice` cannot teleport. To reach item 5 it must call `next` five times and discard the results, and with a step of 2 it still produces every item, it just doesn't hand all of them to you. A print inside the generator makes this visible:

```python run
def factorials():
    index = 0
    while True:
        print(f'computing factorial({index})')
        yield math.factorial(index)
        index += 1

list(islice(factorials(), 2, 8, 3))
```

Two values came out, but eight were computed. If producing each item is expensive (a network call, a database row), skipping still costs you.

## islice consumes what you give it

`islice` returns an **iterator**, even when you pass it a list, so it is single-use:

```python run
s = islice([1, 2, 3, 4, 5], 0, 3)
print(list(s))
print(list(s))
```

And when you pass it an iterator, slicing advances *that* iterator. Slices of the same iterator are therefore consecutive, not overlapping:

```python run
def counter():
    n = 0
    while True:
        yield n
        n += 1

c = counter()
print(next(c), next(c), next(c))   # consume 0, 1, 2
print(list(islice(c, 3)))          # starts where we left off
print(next(c))                     # and islice moved c forward again
```

This is true of almost every function in `itertools`: they don't copy their input, they pull from it.

## Chunking: from islice to batched

That "consecutive slices" behavior is actually useful. Calling `islice(it, n)` repeatedly on the same iterator splits it into chunks of size `n`:

```python run
def chunks(iterable, n):
    it = iter(iterable)
    while chunk := tuple(islice(it, n)):
        yield chunk

list(chunks(range(10), 4))
```

<div class="callout modern">
<span class="callout-title">Python 3.12: itertools.batched</span>

Chunking is common enough that Python 3.12 added it to the module. `batched(iterable, n)` yields tuples of length `n`, with a shorter final batch if the data doesn't divide evenly. Python 3.13 added `strict=True`, which raises `ValueError` if the last batch would be short.

```python run
from itertools import batched

print(list(batched('ABCDEFG', 3)))
try:
    list(batched('ABCDEFG', 3, strict=True))
except ValueError as ex:
    print('ValueError:', ex)
```

Typical uses: sending records to an API 100 at a time, or inserting rows into a database in batches.

</div>

<div class="takeaways">

## Key takeaways

- Bracket slicing only works on sequences. `itertools.islice` slices **any** iterable, lazily.
- `islice` accepts `None` but not negative start, stop or step.
- Skipped items are still produced: `islice` calls `next` for every item up to `stop`.
- `islice` returns a one-shot iterator and advances the iterator you pass in; repeated calls yield consecutive chunks.
- For fixed-size chunks, use `itertools.batched` (3.12+, with `strict=` from 3.13).

</div>
