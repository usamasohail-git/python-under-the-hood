---
title: Mapping and Reducing
summary: map and starmap transform every item lazily, reduce folds an iterable into one value, and accumulate yields every intermediate result of that fold.
minutes: 13
---

## map

`map(func, iterable)` lazily yields `func(item)` for each item. It returns an iterator, so like every other iterator it is used up after one pass:

```python run
maps = map(lambda x: x ** 2, range(5))
print(list(maps))
print(list(maps))
```

`map` also accepts **several** iterables. It then calls `func` with one item from each, in parallel, and stops at the shortest, just like `zip`:

```python run
print(list(map(lambda x, y: x + y, [1, 2, 3], [10, 20, 30, 40])))
print(list(map(pow, [2, 3, 4], [5, 2, 3])))
```

## starmap: when the arguments are already bundled

Often the data arrives as tuples (rows from a file, pairs from `zip`, points). If the function takes two arguments, a plain `map` passes the whole tuple as a single argument and fails:

```python run
def add(x, y):
    return x + y

pairs = [(0, 0), (1, 1), (2, 2)]
try:
    list(map(add, pairs))
except TypeError as ex:
    print('TypeError:', ex)
```

One workaround is a function that takes one tuple and indexes into it, but that's clumsy. `itertools.starmap` does the unpacking for you: it calls `func(*item)` for each item, the way `add(*t)` unpacks a tuple into positional arguments.

```python run
from itertools import starmap

print(add(*(2, 3)))
print(list(starmap(add, pairs)))
print(list(starmap(pow, [(2, 5), (3, 2), (10, 3)])))
```

So `map(f, xs, ys)` and `starmap(f, zip(xs, ys))` produce the same values. Use `map` when the arguments come from separate iterables, `starmap` when they're already grouped.

The equivalent generator expression is `(func(*args) for args in iterable)`, or with explicit unpacking `(x + y for x, y in pairs)`.

## reduce: folding into one value

`sum` is a special-purpose aggregator: it combines values with `+`. `functools.reduce(func, iterable[, initial])` generalizes that to any **binary** function (one that takes two arguments). It combines the first two items, then combines that result with the third, and so on, returning only the final value:

```python run
from functools import reduce
import operator

print(reduce(operator.add, [10, 20, 30]))        # ((10 + 20) + 30)
print(reduce(operator.mul, [1, 2, 3, 4]))        # running product
print(reduce(operator.mul, [1, 2, 3, 4], 10))    # with a starting value
print(reduce(lambda a, b: a if a > b else b, [3, 8, 2, 9, 4]))   # a hand-rolled max
```

The `operator` module provides function versions of the operators (`operator.add`, `operator.mul`, `operator.or_`...), which read better than tiny lambdas.

The optional `initial` value also makes `reduce` safe on empty input. Without it there is nothing to return:

```python run
print(reduce(operator.add, [], 0))
try:
    reduce(operator.add, [])
except TypeError as ex:
    print('TypeError:', ex)
```

## Seeing the intermediate results

`sum` and `reduce` throw away every intermediate value. Sometimes those are exactly what we want: a running balance, cumulative sales, the best score so far. A generator can yield the accumulator at every step:

```python run
def running_reduce(fn, iterable, start=None):
    it = iter(iterable)
    if start is None:
        accumulator = next(it)
    else:
        accumulator = start
    yield accumulator
    for item in it:
        accumulator = fn(accumulator, item)
        yield accumulator

print(list(running_reduce(operator.add, [10, 20, 30])))
print(list(running_reduce(operator.mul, [1, 2, 3, 4])))
print(list(running_reduce(operator.mul, [1, 2, 3, 4], 10)))
```

## itertools.accumulate

`accumulate` is the built-in, C-speed version of that generator. Note the argument order: the iterable comes **first**, because the function is optional and defaults to addition.

```python run
from itertools import accumulate

print(list(accumulate([10, 20, 30])))
print(list(accumulate([1, 2, 3, 4], operator.mul)))
print(list(accumulate([3, 8, 2, 9, 4], max)))    # best value so far
```

<div class="callout modern">
<span class="callout-title">Python 3.8: accumulate(initial=...)</span>

Older notebooks note that `accumulate` has no start value, so you'd need a hand-written generator like the one above. Since Python 3.8 it takes a keyword-only `initial=` argument. The initial value is yielded first, so the output is one item longer than the input:

```python run
print(list(accumulate([1, 2, 3, 4], operator.mul, initial=10)))
print(list(accumulate([], initial=0)))
```

</div>

The last value of `accumulate` is always what `reduce` would have returned, so `accumulate` is handy for debugging a `reduce` call too. A small practical example, an account balance after each transaction:

```python run
transactions = [100, -30, -20, 250, -75]
for t, balance in zip(transactions, accumulate(transactions)):
    print(f'{t:>5}  balance: {balance:>4}')
```

Both iterables in that `zip` have the same length, so every transaction is paired with the balance right after it.

<div class="takeaways">

## Key takeaways

- `map(f, it1, it2, ...)` calls `f` with one item from each iterable and stops at the shortest.
- `starmap(f, iterable)` calls `f(*item)`, for data that is already grouped into tuples.
- `functools.reduce` folds an iterable into one value with a binary function; give it an `initial` value to handle empty input.
- `accumulate(iterable, func=operator.add, *, initial=None)` yields every intermediate result of the fold.

</div>
