---
title: Iterating Callables
summary: The two-argument form iter(callable, sentinel) turns any zero-argument function into an iterator that calls it repeatedly until it returns the sentinel value.
minutes: 11
---

## An iterator over a function's results

An iterator doesn't have to walk over a collection at all. All `__next__` has to do is produce *some* value, and calling a function is a perfectly good way to produce one.

Start with a counter built from a closure (from Part 1): each call returns the next integer.

```python run
def counter():
    i = 0
    def inc():
        nonlocal i
        i += 1
        return i
    return inc

cnt = counter()
print(cnt(), cnt(), cnt())
```

An iterator that just calls a callable over and over:

```python run
class CallableIterator:
    def __init__(self, func):
        self.func = func

    def __iter__(self):
        return self

    def __next__(self):
        return self.func()

cnt_iter = CallableIterator(counter())
print([next(cnt_iter) for _ in range(5)])
```

That's an **infinite** iterator. To make it finite we need a stopping rule. A natural one: stop as soon as the function returns a special value, called the **sentinel**.

## Adding a sentinel

```python run
class CallableIterator:
    def __init__(self, func, sentinel):
        self.func = func
        self.sentinel = sentinel

    def __iter__(self):
        return self

    def __next__(self):
        result = self.func()
        if result == self.sentinel:
            raise StopIteration
        return result

cnt_iter = CallableIterator(counter(), 5)
for c in cnt_iter:
    print(c, end=' ')
```

The loop prints 1 to 4: the call that returns `5` ends the iteration, and the sentinel itself isn't produced. But there's a flaw. Once `StopIteration` has been raised, a well-behaved iterator should **stay** exhausted. Ours doesn't, because the underlying counter keeps going:

```python run
print(next(cnt_iter))    # resumes after the sentinel!
```

The fix is a flag that remembers we're done:

```python run
class CallableIterator:
    def __init__(self, func, sentinel):
        self.func = func
        self.sentinel = sentinel
        self.is_consumed = False

    def __iter__(self):
        return self

    def __next__(self):
        if self.is_consumed:
            raise StopIteration
        result = self.func()
        if result == self.sentinel:
            self.is_consumed = True
            raise StopIteration
        return result

cnt_iter = CallableIterator(counter(), 5)
print(list(cnt_iter))
try:
    next(cnt_iter)
except StopIteration:
    print('StopIteration: stays exhausted')
```

## The built-in: `iter(callable, sentinel)`

That generic class is built into Python. `iter()` has a second form:

```python
iter(iterable)            # -> iterator over the iterable
iter(callable, sentinel)  # -> calls callable() until it returns sentinel
```

The callable must take **no arguments**. The result behaves just like our final version, including staying exhausted:

```python run
cnt_iter = iter(counter(), 5)
print(type(cnt_iter))
print(list(cnt_iter))
print(next(cnt_iter, 'still exhausted'))
```

## Example: random numbers until a target appears

Any zero-argument callable works, and a `lambda` is often the easiest way to make one. Here we draw random numbers until we hit an 8. With a fixed seed we can check the result: first let's see the sequence.

```python run
import random

random.seed(0)
print([random.randint(0, 10) for _ in range(10)])
```

The first 8 is the fifth number, so iterating with sentinel `8` should give us exactly the four numbers before it:

```python run
random.seed(0)
random_iterator = iter(lambda: random.randint(0, 10), 8)
print(list(random_iterator))
```

## Example: a countdown

A closure that counts down, one step per call. Left to itself it happily goes negative:

```python run
def countdown(start=10):
    def run():
        nonlocal start
        start -= 1
        return start
    return run

takeoff = countdown(10)
print([takeoff() for _ in range(13)])
```

To stop after `0`, use `-1` as the sentinel: the first call that returns `-1` ends the iteration.

```python run
for val in iter(countdown(10), -1):
    print(val, end=' ')
```

## A practical use: reading in chunks

The classic real-world use is reading a file (or socket) in fixed-size chunks. `f.read(n)` returns the empty string `''` at the end of the file, which makes a natural sentinel. `functools.partial` turns `f.read(4)` into a zero-argument callable:

```python run
import io
from functools import partial

f = io.StringIO('abcdefghij')     # behaves like an open text file
for chunk in iter(partial(f.read, 4), ''):
    print(repr(chunk))
```

The same idea works with `f.readline` and sentinel `''` to read line by line, or with `b''` for binary files.

<div class="callout note">
<span class="callout-title">The sentinel is compared with `==`</span>

The iteration stops when `callable() == sentinel`. That's fine for numbers and strings; just be careful with values like `0` vs `0.0` (equal) or with objects that define their own `__eq__`.

</div>

<div class="takeaways">

## Key takeaways

- An iterator can produce values by calling a function; without a stopping rule it's infinite.
- A **sentinel** value ends the iteration when the callable returns it; the sentinel itself is not yielded.
- A correct iterator stays exhausted after its first `StopIteration`.
- `iter(callable, sentinel)` is the built-in version; the callable must take no arguments (use a `lambda` or `functools.partial`).
- Classic use: `iter(partial(f.read, size), '')` reads a file in chunks.

</div>
