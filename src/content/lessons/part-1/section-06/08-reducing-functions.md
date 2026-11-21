---
title: Reducing Functions
summary: A reducing function combines all the elements of an iterable into one value by repeatedly applying a two-argument function, which is what functools.reduce does.
minutes: 13
---

## What is reducing?

A **reducing function** takes an iterable and **reduces** it to a single value: the sum of a list, its maximum, whether all of its elements are true. They're also called *accumulators* or *aggregators*, or *folds* in functional languages.

The pattern behind all of them is the same, and it's worth building it ourselves before using Python's version.

## Building it by hand

Let's find the maximum of a list. Start with a function that returns the larger of **two** values:

```python run
l = [5, 8, 6, 10, 9]

_max = lambda a, b: a if a > b else b

def max_sequence(sequence):
    result = sequence[0]
    for x in sequence[1:]:
        result = _max(result, x)
    return result

max_sequence(l)
```

Step by step, the running `result` evolves like this:

```
result = 5
result = _max(5, 8)   -> 8
result = _max(8, 6)   -> 8
result = _max(8, 10)  -> 10
result = _max(10, 9)  -> 10
```

To compute the **minimum** instead, the loop doesn't change at all. Only the two-argument function does:

```python run
_min = lambda a, b: a if a < b else b

def min_sequence(sequence):
    result = sequence[0]
    for x in sequence[1:]:
        result = _min(result, x)
    return result

min_sequence(l)
```

Since only the function changes, we can make it a parameter. That gives us a general-purpose, higher-order reducing function:

```python run
def _reduce(fn, sequence):
    result = sequence[0]
    for x in sequence[1:]:
        result = fn(result, x)
    return result

print(_reduce(_max, l))
print(_reduce(_min, l))
print(_reduce(lambda a, b: a + b, l))    # the sum
```

With a different two-argument function, the same loop computes a sum. Our version has a weakness though: it uses indexing and slicing (`sequence[0]`, `sequence[1:]`), so it only works with **sequences**. It fails on, say, a set or a generator, which can be iterated but not indexed.

## `functools.reduce`

The standard library's version lives in the `functools` module. It works the same way, but with **any iterable**:

```python run
from functools import reduce

print(reduce(lambda a, b: a if a > b else b, l))
print(reduce(lambda a, b: a if a < b else b, l))
print(reduce(lambda a, b: a + b, l))
print(reduce(lambda a, b: a + b, {5, 8, 6, 10, 9}))   # a set works too
```

<div class="callout note">
<span class="callout-title">Why isn't `reduce` a built-in?</span>

In Python 2, `reduce` was a built-in function. Python 3 moved it into `functools`, because explicit loops and the specialized built-ins below are usually more readable. It remains useful when no built-in exists for the operation you need.

</div>

## Built-in reducing functions

Some reductions are so common that Python provides them directly. Prefer these whenever they fit: they're clearer and faster.

```python run
print(max(l), min(l), sum(l))
```

### `any` and `all`

`any(iterable)` returns `True` if **at least one** element is truthy; `all(iterable)` returns `True` if **every** element is truthy.

```python run
print(any([0, 1, 2]), any([0, 0, 0]))
print(all([0, 1, 2]), all([1, 2, 3]))
```

These are reductions with `or` and `and`. We can reproduce them with `reduce`. Note that `or`/`and` return one of their operands rather than `True`/`False`, so we wrap the result in `bool`:

```python run
print(reduce(lambda a, b: bool(a or b), [0, 1, 2]))
print(reduce(lambda a, b: bool(a or b), [0, 0, 0]))
print(reduce(lambda a, b: bool(a and b), [0, 1, 2]))
print(reduce(lambda a, b: bool(a and b), [1, 2, 3]))
```

The built-ins also **short-circuit**: `any` stops at the first truthy element and `all` at the first falsy one, while `reduce` always processes everything. And for an empty iterable, `any([])` is `False` and `all([])` is `True`.

```python run
print(any([]), all([]))
```

## Products and factorials

For a product of all the elements, `reduce` with multiplication does the job:

```python run
def mult(a, b):
    return a * b

l = [2, 3, 4]
print(reduce(mult, l))
print(reduce(lambda a, b: a * b, l))
```

```
step 1: result = 2
step 2: result = mult(2, 3) = 6
step 3: result = mult(6, 4) = 24
l is exhausted: return 24
```

A factorial, `n! = 1 * 2 * 3 * ... * n`, is just the product of `range(1, n + 1)`:

```python run
n = 5
reduce(lambda a, b: a * b, range(1, n + 1))
```

Compare that with a loop and with recursion:

```python run
def fact_loop(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def fact_rec(n):
    return 1 if n <= 1 else n * fact_rec(n - 1)

print([fact_loop(i) for i in range(1, 6)])
print([fact_rec(i) for i in range(1, 6)])
```

The `reduce` version is the most compact, but not necessarily the easiest to read. Choose whichever makes your intent clearest.

<div class="callout modern">
<span class="callout-title">`math.prod` (Python 3.8+)</span>

Products are common enough that Python 3.8 added `math.prod`, which works like `sum` but multiplies. For factorials specifically, use `math.factorial`.

```python run
import math
print(math.prod([2, 3, 4]), math.prod(range(1, 6)), math.factorial(5))
print(math.prod([]))   # empty product is 1
```

</div>

## The initializer

What happens with an empty iterable? There's no first element to start from:

```python run
try:
    reduce(lambda x, y: x * y, [])
except TypeError as ex:
    print('TypeError:', ex)
```

`reduce` takes an optional third argument, the **initializer**. It's placed *before* the elements, so it's the starting value of `result`, and it is also what `reduce` returns when the iterable is empty. Choose a value that doesn't change the outcome: `1` for products, `0` for sums.

```python run
print(reduce(lambda x, y: x * y, [], 1))
print(reduce(lambda x, y: x * y, [1, 2, 3], 1))
print(reduce(lambda x, y: x + y, [], 0))
```

The initializer must be passed by position. On 3.13, `reduce(f, [], initial=1)` raises a `TypeError` (Python 3.14 allows the keyword).

The initializer also lets the result have a **different type** from the elements, for example counting characters across a list of words:

```python run
reduce(lambda total, word: total + len(word), ['apple', 'fig', 'kiwi'], 0)
```

Without the `0`, the first "total" would be the string `'apple'`, and adding a number to it would fail.

<div class="takeaways">

## Key takeaways

- A reducing function repeatedly combines a running result with the next element: `result = fn(result, x)`.
- `functools.reduce(fn, iterable[, initializer])` implements this for any iterable.
- Prefer the built-ins when they fit: `sum`, `min`, `max`, `any`, `all`, and `math.prod` (3.8+). `any`/`all` short-circuit.
- The initializer is the starting value and the result for an empty iterable. Without one, `reduce` raises `TypeError` on an empty iterable.

</div>
