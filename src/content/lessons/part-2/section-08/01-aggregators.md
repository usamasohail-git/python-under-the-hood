---
title: Aggregators
summary: Functions like min, max, sum, any and all reduce a whole iterable to a single value, and they consume iterators as they go.
minutes: 13
files: ['car-brands.txt']
---

## Reducing an iterable to one value

An **aggregator** takes an iterable and boils it down to a single result. You have used several already: `min`, `max`, `sum`, `len` (for sized collections), and the two Boolean aggregators `any` and `all`. They all accept *any* iterable, not just lists, so they work directly on generators:

```python run
def squares(n):
    for i in range(n):
        yield i ** 2

print(list(squares(5)))
print(min(squares(5)), max(squares(5)), sum(squares(5)))
```

Each call above builds a **fresh** generator. That matters, because an aggregator has to iterate over its argument to compute anything, and iterating an iterator uses it up:

```python run
sq = squares(5)
print(max(sq))      # walks through every value
try:
    print(min(sq))  # nothing left to look at
except ValueError as ex:
    print('ValueError:', ex)
```

`min` and `max` raise `ValueError` on an empty iterable because there is no sensible answer. If you'd rather get a fallback value, pass `default=`:

```python run
print(max(squares(0), default=None))
print(max(['apple', 'fig', 'banana'], key=len))   # key works like in sorted()
```

<div class="callout modern">
<span class="callout-title">More aggregators: math.prod and statistics</span>

`sum` has a multiplicative sibling, `math.prod` (Python 3.8), and the `statistics` module adds `mean`, `median`, `mode` and friends. They all accept any iterable.

```python run
import math, statistics
print(math.prod(range(1, 6)), statistics.mean(squares(5)))
```

</div>

## Truthiness, briefly

`any` and `all` work with **truth values**. Every object in Python has one:

- numbers are falsy when they equal zero, truthy otherwise
- empty strings, lists, tuples, dicts, sets and ranges are falsy; non-empty ones are truthy
- `None` is falsy
- instances of your own classes are truthy by default, unless the class defines `__bool__`, or `__len__` returning 0

```python run
class Person:
    pass

class MySeq:
    def __init__(self, n):
        self.n = n
    def __len__(self):
        return self.n

print(bool(Person()), bool(MySeq(0)), bool(MySeq(10)))
```

## any and all

`any(iterable)` returns `True` if **at least one** element is truthy. `all(iterable)` returns `True` if **every** element is truthy.

```python run
print(any([0, '', None]), any([0, '', None, 'hello']))
print(all([1, 'abc', [1, 2], range(5)]), all([1, 'abc', [1, 2], range(5), '']))
```

You can think of `any` as chaining the elements with `or`, and `all` as chaining them with `and`, then converting the result to a `bool`:

```python run
result = 0 or '' or None or 'hello'
print(repr(result), bool(result))
```

Like `or` and `and`, both functions **short-circuit**: `any` stops at the first truthy element and `all` stops at the first falsy one. With a generator you can watch it happen:

```python run
def noisy(values):
    for v in values:
        print('  checking', v)
        yield v

print(any(noisy([0, 0, 7, 0, 9])))
print(all(noisy([1, 2, 0, 3])))
```

Only three values were checked in each case. On a huge (or infinite) iterator that can be the difference between instant and never.

Two edge cases worth remembering: `any([])` is `False` (there is nothing truthy) and `all([])` is `True` (there is nothing falsy, so the claim "every element is truthy" holds vacuously).

```python run
any([]), all([])
```

## Testing a condition on every element

In practice you rarely care whether the elements themselves are truthy. You want to know whether they all (or any of them) satisfy some condition, like "is a number" or "is longer than 3 characters". The pattern is to first turn each element into `True`/`False` with a **predicate** (a function returning a Boolean), then aggregate.

To check "is a number", the cleanest test is `isinstance` against the abstract base class `numbers.Number`, which `int`, `float`, `complex`, `Fraction`, `Decimal` and `bool` all register with:

```python run
from numbers import Number
from decimal import Decimal

print([isinstance(v, Number) for v in (10, 10.5, 2+3j, Decimal('10.3'), True, '100', [10])])
```

The long way to check a whole list uses a flag and a `break`:

```python run
data = [10, 20, 30, 40, 'hello']

is_all_numbers = True
for item in data:
    if not isinstance(item, Number):
        is_all_numbers = False
        break
print(is_all_numbers)
```

The short way maps the predicate over the data and hands the result to `all`. `map` is lazy, so `all` can still short-circuit:

```python run
print(all(map(lambda x: isinstance(x, Number), data)))
print(all(map(lambda x: isinstance(x, Number), [10, 20, 30, 40])))
```

A generator expression does the same job and many people find it easier to read:

```python run
all(isinstance(x, Number) for x in data)
```

Use whichever you find clearer. Note that a *list comprehension* (`all([... for x in data])`) would also give the right answer, but it builds the whole list first and loses the short-circuit.

## Aggregating a file

A text file object is an iterator over its lines, so aggregators work on files directly, one line at a time, without loading the file into memory. The file `car-brands.txt` holds one brand per line:

```python run
with open('car-brands.txt') as f:
    for row in f:
        print(len(row), row, end='')
```

Notice that each length includes the trailing `\n` (only the last line, which has no newline, is counted without one). Is every brand at least 3 characters? Is any longer than 10?

```python run
with open('car-brands.txt') as f:
    print(all(len(row.rstrip('\n')) >= 3 for row in f))

with open('car-brands.txt') as f:
    print(any(len(row.rstrip('\n')) > 10 for row in f))

with open('car-brands.txt') as f:
    print(max(f, key=len).strip())
```

We open the file again for each test because the first aggregation consumes the file iterator, exactly like the `squares` generator earlier. Also keep the aggregation *inside* the `with` block: once the file is closed, iterating it raises `ValueError`.

<div class="takeaways">

## Key takeaways

- `min`, `max`, `sum`, `any` and `all` accept any iterable, and they **exhaust** iterators they are given.
- `min`/`max` raise `ValueError` on empty input unless you pass `default=`; both accept a `key=` function.
- `any` is a chain of `or`, `all` a chain of `and`. Both short-circuit, and `all([])` is `True`.
- To test a condition on every element, combine a predicate with `map` or a generator expression, then aggregate.

</div>
