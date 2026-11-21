---
title: Example - Fibonacci Sequence
summary: Comparing recursion, an iterator class, iter() with a closure and a generator for the Fibonacci sequence shows why generators are both simpler and faster for lazy sequences.
minutes: 14
---

## The sequence

The Fibonacci numbers start `1, 1` and each following number is the sum of the two before it:

```text
1  1  2  3  5  8  13  21 ...
```

Counting positions from zero, that's `Fib(0) = 1`, `Fib(1) = 1` and `Fib(n) = Fib(n-1) + Fib(n-2)`. Our goal is an **iterator** that produces the first `n` numbers lazily, one at a time, without building a list up front. Along the way we'll compare four approaches.

## Approach 1: recursion

The definition is recursive, so a recursive function is the obvious first attempt:

```python run
def fib_recursive(n):
    if n <= 1:
        return 1
    return fib_recursive(n - 1) + fib_recursive(n - 2)

[fib_recursive(i) for i in range(7)]
```

It's correct, but each call spawns two more calls, and the same values get recomputed over and over. The running time grows exponentially: each extra step multiplies the work by about 1.6.

```python run
from timeit import timeit

print(timeit('fib_recursive(10)', globals=globals(), number=10))
print(timeit('fib_recursive(20)', globals=globals(), number=10))
print(timeit('fib_recursive(22)', globals=globals(), number=10))
```

Memoization fixes the speed. `functools.lru_cache` remembers previous results, so every `Fib(k)` is computed only once:

```python run
from functools import lru_cache

@lru_cache
def fib_recursive(n):
    if n <= 1:
        return 1
    return fib_recursive(n - 1) + fib_recursive(n - 2)

print(timeit('fib_recursive(29)', globals=globals(), number=10))
```

But recursion has a hard limit. Each nested call adds a stack frame, and Python refuses to go deeper than `sys.getrecursionlimit()` frames (1000 by default). Asking a fresh cache for `fib_recursive(2000)` needs about 2000 nested calls:

```python
fib_recursive(2000)
# RecursionError: maximum recursion depth exceeded
```

<div class="callout note">
<span class="callout-title">Why that cell isn't runnable</span>

In a regular CPython install you get the `RecursionError` shown above. In the browser runtime used on this site, the WebAssembly stack is much smaller than the recursion limit, so deep recursion through `lru_cache` can crash the interpreter before Python gets a chance to raise the error. That's one more reason to avoid deep recursion for problems like this one.

</div>

<div class="callout modern">
<span class="callout-title">`@lru_cache` without parentheses, and `@cache`</span>

Since Python 3.8 you can write `@lru_cache` without the parentheses. Since 3.9, `functools.cache` is an unbounded cache (the same as `lru_cache(maxsize=None)`), and a little faster because it never evicts entries.

</div>

## Approach 2: a simple loop

We don't need recursion at all. Keep the last two numbers and slide them forward:

```python run
def fib(n):
    fib_0 = 1
    fib_1 = 1
    for i in range(n - 1):
        fib_0, fib_1 = fib_1, fib_0 + fib_1
    return fib_1

print([fib(i) for i in range(7)])
print(timeit('fib(5000)', globals=globals(), number=10))
```

Fast, no recursion limit, and `fib(5000)` (a number with over a thousand digits) is no problem. Now let's turn this into an iterator.

## Approach 3: an iterator class

Using the iterable/iterator pattern, the iterable `Fib` hands out a fresh `FibIter` every time it's iterated:

```python run
class Fib:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return self.FibIter(self.n)

    class FibIter:
        def __init__(self, n):
            self.n = n
            self.i = 0

        def __iter__(self):
            return self

        def __next__(self):
            if self.i >= self.n:
                raise StopIteration
            result = fib(self.i)
            self.i += 1
            return result

list(Fib(7))
```

Or, with the two-argument `iter()` and a closure (the sentinel is the first number we *don't* want):

```python run
def fib_closure():
    i = 0
    def inner():
        nonlocal i
        result = fib(i)
        i += 1
        return result
    return inner

list(iter(fib_closure(), fib(7)))
```

Both work, but both have two problems:

1. They're verbose and not obvious to read.
2. More importantly, each step calls `fib(i)`, which recomputes the sequence **from the beginning**. Producing `n` numbers costs about `1 + 2 + … + n` additions, which grows like `n²`. The iterator throws away the two previous numbers it just had.

## Approach 4: a generator

Our loop-based `fib` function already has the right shape. It computes every Fibonacci number in turn; it just returns only the last one. Make it `yield` each one instead:

```python run
def fib_gen(n):
    fib_0 = 1
    fib_1 = 1
    for i in range(n - 1):
        fib_0, fib_1 = fib_1, fib_0 + fib_1
        yield fib_1

list(fib_gen(7))
```

Close, but the first two numbers are missing: we only yield values computed *inside* the loop. Yield the starting values too:

```python run
def fib_gen(n):
    fib_0 = 1
    yield fib_0
    fib_1 = 1
    yield fib_1
    for i in range(n - 1):
        fib_0, fib_1 = fib_1, fib_0 + fib_1
        yield fib_1

list(fib_gen(7))
```

Now we produce eight numbers when we asked for seven. Since two values come before the loop, the loop should run `n - 2` times:

```python run
def fib_gen(n):
    fib_0 = 1
    yield fib_0
    fib_1 = 1
    yield fib_1
    for i in range(n - 2):
        fib_0, fib_1 = fib_1, fib_0 + fib_1
        yield fib_1

list(fib_gen(7))
```

(This version still yields two numbers for `n = 0` or `n = 1`; one of the practice exercises asks you to handle that properly.)

## How much faster?

Let's time producing 2000 numbers with each approach. The class and the closure both recompute from scratch on every step; the generator just keeps its two local variables between `yield`s:

```python run
print('class:    ', timeit('list(Fib(2_000))', globals=globals(), number=1))

sentinel = fib(2_000)
print('closure:  ', timeit('list(iter(fib_closure(), sentinel))', globals=globals(), number=1))

print('generator:', timeit('list(fib_gen(2_000))', globals=globals(), number=1))
```

The generator is a few hundred times faster here, and the gap widens as `n` grows (quadratic vs. linear work). Of course we could have written a smarter iterator class that stores `fib_0` and `fib_1` on `self`; the point is that the generator gives you that "remember where I was" behavior for free, so the natural code is also the efficient one.

<div class="callout tip">
<span class="callout-title">Try it: an infinite generator</span>

Generators don't need an end. Drop the `n` and loop forever, then take as many values as you need with `itertools.islice`:

```python run
from itertools import islice

def fib_forever():
    a, b = 1, 1
    while True:
        yield a
        a, b = b, a + b

list(islice(fib_forever(), 10))
```

An infinite list is impossible, but an infinite generator is fine, because values are produced only when someone asks for them.

</div>

<div class="takeaways">

## Key takeaways

- Naive recursion recomputes values exponentially often; `lru_cache` fixes the speed, but deep recursion still hits the recursion limit.
- An iterator that calls `fib(i)` on each step does `O(n²)` work because it forgets its previous results.
- A generator keeps its local variables between `yield`s, so the natural loop-based code produces each number in constant time.
- Turning a "compute the n-th value" loop into a generator is often just a matter of yielding inside the loop and checking the first values and the loop count.
- Generators can be infinite; combine them with `itertools.islice` to take a finite number of values.

</div>
