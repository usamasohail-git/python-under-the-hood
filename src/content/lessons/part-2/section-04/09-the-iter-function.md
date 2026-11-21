---
title: The iter() Function
summary: iter() first looks for __iter__, then falls back to the sequence protocol via __getitem__. Calling it, not checking for attributes, is the reliable way to know if something is iterable.
minutes: 11
---

## What `iter()` does

You've used `iter()` to get an iterator from an iterable. Behind the scenes, `iter(obj)` tries these steps in order:

1. If `obj`'s type has `__iter__`, call it. The result must be an **iterator** (it must have `__next__`), otherwise `TypeError`.
2. Otherwise, if it has `__getitem__`, build a generic iterator that calls `obj[0]`, `obj[1]`, `obj[2]`, … until an `IndexError` (or `StopIteration`) is raised.
3. Otherwise, raise `TypeError: '…' object is not iterable`.

`for` loops, comprehensions, `list()`, unpacking and every other consumer go through exactly the same steps.

## The sequence fallback

Here's a sequence type with no `__iter__` at all:

```python run
class Squares:
    def __init__(self, n):
        self._n = n

    def __len__(self):
        return self._n

    def __getitem__(self, i):
        if i >= self._n:
            raise IndexError
        return i ** 2

sq = Squares(5)
for i in sq:
    print(i, end=' ')
```

The loop works because of step 2. We can even ask for the iterator Python builds:

```python run
sq_iter = iter(sq)
print(type(sq_iter))
print('__next__' in dir(sq_iter))
print(next(sq_iter), next(sq_iter))
```

Its type is just called `iterator`: a general-purpose wrapper that walks *any* object through `__getitem__`. And when neither method exists:

```python run
try:
    for i in 10:
        print(i)
except TypeError as ex:
    print('TypeError:', ex)
```

## Building that iterator ourselves

There's nothing magical about the fallback. We could write it ourselves for any sequence:

```python run
class SquaresIterator:
    def __init__(self, squares):
        self._squares = squares
        self._i = 0

    def __iter__(self):
        return self

    def __next__(self):
        try:
            result = self._squares[self._i]
        except IndexError:
            raise StopIteration
        self._i += 1
        return result

print(list(SquaresIterator(Squares(5))))
```

Note that it doesn't need `len()`. It just keeps indexing and translates the sequence's "out of range" signal (`IndexError`) into the iterator's "done" signal (`StopIteration`). That's why the built-in fallback works even for classes with no `__len__`.

## How *not* to test whether something is iterable

So an object is iterable if it implements the iterable protocol **or** the sequence protocol. Checking for `__iter__` with `hasattr` or `dir` is therefore not enough: it misses sequence-only classes like `Squares`, and it's fooled by an `__iter__` that doesn't return an iterator:

```python run
class SimpleIter:
    def __iter__(self):
        return 'Nope'

s = SimpleIter()
print('__iter__' in dir(s))
try:
    iter(s)
except TypeError as ex:
    print('TypeError:', ex)
```

The same goes for `collections.abc.Iterable`, which only looks for `__iter__`:

```python run
from collections.abc import Iterable
print(isinstance(Squares(5), Iterable))     # False, yet it IS iterable
print(isinstance(SimpleIter(), Iterable))   # True, yet it ISN'T
```

The only reliable test is to **call `iter()`** and see whether it raises:

```python run
def is_iterable(obj):
    try:
        iter(obj)
        return True
    except TypeError:
        return False

print(is_iterable(SimpleIter()), is_iterable(Squares(5)), is_iterable(100), is_iterable('abc'))
```

## Don't ask, just try

Before you reach for `is_iterable`, consider that you rarely need it. Checking first and then iterating is "look before you leap":

```python run
obj = 100
if is_iterable(obj):
    for i in obj:
        print(i)
else:
    print('Error: obj is not iterable')
```

The Pythonic style is "**it's easier to ask forgiveness than permission**" (EAFP): just do what you meant to do, and handle the failure if it happens:

```python run
obj = 100
try:
    for i in obj:
        print(i)
except TypeError as ex:
    print('Error:', ex)
```

The EAFP version is shorter, checks only once, and Python's own error message is more informative than ours. (One caveat: a `TypeError` raised *inside* the loop body would be caught too, so keep the `try` block small.)

<div class="takeaways">

## Key takeaways

- `iter(obj)` uses `__iter__` if present (and insists it returns an iterator), else falls back to `__getitem__` with indexes 0, 1, 2, … until `IndexError`, else raises `TypeError`.
- The fallback iterator's type is simply `iterator`, and it doesn't need `__len__`.
- An object is iterable if it supports the iterable protocol **or** the sequence protocol, so `hasattr(obj, '__iter__')` and `isinstance(obj, Iterable)` aren't reliable tests.
- The reliable test is calling `iter(obj)`; usually it's even better to just iterate inside `try`/`except TypeError` (EAFP).

</div>
