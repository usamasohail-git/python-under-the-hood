---
title: Decorator Application - Memoization
summary: Cache the results of expensive calls so they're computed only once. We build memoizers by hand, then use functools.lru_cache and functools.cache.
minutes: 15
---

## The problem: repeated work

Here's the recursive Fibonacci function again, with a message every time it actually computes something:

```python run
def fib(n):
    print(f'Calculating fib({n})')
    return 1 if n < 3 else fib(n - 1) + fib(n - 2)

fib(6)
```

Fifteen calls to get one number, with `fib(3)` computed three times and `fib(2)` five times. Since `fib(n)` always returns the same result for the same `n`, we could **remember** each result the first time and simply look it up afterwards. Caching the results of function calls like this is called **memoization**.

## A class with a cache

A dictionary from argument to result is all we need:

```python run
class Fib:
    def __init__(self):
        self.cache = {1: 1, 2: 1}

    def fib(self, n):
        if n not in self.cache:
            print(f'Calculating fib({n})')
            self.cache[n] = self.fib(n - 1) + self.fib(n - 2)
        return self.cache[n]

f = Fib()
print(f.fib(6))
print(f.fib(7))    # only one new calculation
```

## The same thing as a closure

The cache becomes a free variable:

```python run
def fib():
    cache = {1: 1, 2: 1}

    def calc_fib(n):
        if n not in cache:
            print(f'Calculating fib({n})')
            cache[n] = calc_fib(n - 1) + calc_fib(n - 2)
        return cache[n]

    return calc_fib

f = fib()
print(f(10))
print(f(11))
```

## As a decorator

Both versions mix caching logic into the Fibonacci code. A decorator separates the two concerns: the function stays a plain recursive definition, and the decorator adds the cache around it.

```python run
from functools import wraps

def memoize_fib(fn):
    cache = {}

    @wraps(fn)
    def inner(n):
        if n not in cache:
            cache[n] = fn(n)
        return cache[n]

    return inner

@memoize_fib
def fib(n):
    print(f'Calculating fib({n})')
    return 1 if n < 3 else fib(n - 1) + fib(n - 2)

print(fib(3))
print(fib(10))
print(fib(6))     # cached: nothing to calculate
```

This time decorating the recursive function directly is exactly what we want. Inside `fib`, the recursive calls look up the global name `fib`, which now refers to the memoized closure, so **every** level of the recursion benefits from the cache.

## A more general memoizer

`memoize_fib` only handles one argument. Positional arguments arrive as a tuple, and tuples of hashable values are hashable, so `args` itself can be the dictionary key:

```python run
def memoize(fn):
    cache = {}

    @wraps(fn)
    def inner(*args):
        if args not in cache:
            cache[args] = fn(*args)
        return cache[args]

    return inner

@memoize
def fact(n):
    print(f'Calculating {n}!')
    return 1 if n < 2 else n * fact(n - 1)

print(fact(6))
print(fact(6))
print(fact(7))
```

This simple memoizer still has real limitations:

- **Keyword arguments** aren't supported.
- **Every argument must be hashable.** A list argument raises `TypeError`, because it can't be a dictionary key.
- The cache is **unbounded**: it grows forever, trading more and more memory for speed.

## `functools.lru_cache`

Memoization is common enough that the standard library ships a robust, fast implementation: `functools.lru_cache`. It handles positional and keyword arguments and limits the cache size. When the cache is full, it discards the **L**east **R**ecently **U**sed entry.

```python run
from functools import lru_cache

@lru_cache
def fact(n):
    print(f'Calculating fact({n})')
    return 1 if n < 2 else n * fact(n - 1)

print(fact(5))
print(fact(4))   # served from the cache
print(fact.cache_info())
```

`cache_info()` reports hits, misses, the maximum size (128 by default) and the current number of entries; `cache_clear()` empties the cache.

The speed-up for Fibonacci is dramatic, because each value is now computed exactly once:

```python run
from time import perf_counter

def fib_no_memo(n):
    return 1 if n < 3 else fib_no_memo(n - 1) + fib_no_memo(n - 2)

@lru_cache
def fib_memo(n):
    return 1 if n < 3 else fib_memo(n - 1) + fib_memo(n - 2)

start = perf_counter()
result = fib_no_memo(25)
print(f'no memo: result={result}, elapsed: {perf_counter() - start:.6f}s')

start = perf_counter()
result = fib_memo(25)
print(f'memo:    result={result}, elapsed: {perf_counter() - start:.6f}s')
```

<div class="callout modern">
<span class="callout-title">`@lru_cache` vs `@lru_cache()`</span>

Since Python 3.8 you can write `@lru_cache` without parentheses. Older code (and older notebooks) always writes `@lru_cache()`, because back then `lru_cache` was *only* a decorator factory: calling it returned the real decorator. Both forms work today. We'll learn how to write decorators that take arguments in the next lesson.

</div>

### Choosing a cache size

`maxsize` sets how many results to keep (`None` means unlimited). Watch the LRU policy at work with a deliberately tiny cache of 8 entries:

```python run
@lru_cache(maxsize=8)
def fib(n):
    print(f'Calculating fib({n})')
    return 1 if n < 3 else fib(n - 1) + fib(n - 2)

fib(10)
print(fib.cache_info())
```

All 10 values were computed, but only the 8 most recently used (`fib(3)` to `fib(10)`) were kept. Now compute `fib(20)`: it only needs `fib(20)` down to `fib(11)`, because `fib(10)` and `fib(9)` are still cached.

```python run
fib(20)
print(fib.cache_info())
```

Those 10 new results pushed out the older entries, so the cache now holds `fib(13)` to `fib(20)`. Asking for `fib(10)` again means starting from scratch:

```python run
fib(10)
print(fib.cache_info().misses)
```

## `functools.cache` (Python 3.9+)

If you don't need a size limit, Python 3.9 added `functools.cache`. It's simply `lru_cache(maxsize=None)`: an unbounded cache that's slightly faster because it never has to track usage order.

```python run
from functools import cache

@cache
def fib(n):
    return 1 if n < 3 else fib(n - 1) + fib(n - 2)

print(fib(100))
print(fib.cache_info())
```

`fib(100)` would take longer than the age of the universe without memoization; with it, it needs exactly 100 calculations.

<div class="callout note">
<span class="callout-title">Only memoize pure functions</span>

A cache assumes that the same arguments always give the same result, and that skipping the call doesn't matter. Don't memoize functions that depend on the current time, random numbers, files or other changing state, or that are called for their side effects. Also remember that arguments must be hashable: `fib([1, 2])` with a cached function raises `TypeError: unhashable type: 'list'`.

</div>

<div class="takeaways">

## Key takeaways

- **Memoization** stores results keyed by arguments, so repeated calls become dictionary lookups.
- A memoizing decorator keeps the cache in a closure; decorating a recursive function caches every level of the recursion.
- `functools.lru_cache(maxsize=128)` evicts the least recently used entries; `cache_info()` and `cache_clear()` help inspect and reset it.
- `functools.cache` (3.9+) is an unbounded `lru_cache`. `@lru_cache` without parentheses works since 3.8.
- Only memoize pure functions with hashable arguments, and keep memory use in mind.

</div>
