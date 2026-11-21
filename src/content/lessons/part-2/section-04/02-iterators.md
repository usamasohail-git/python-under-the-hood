---
title: Iterators
summary: An iterator is any object with a __next__ method and an __iter__ method that returns itself. That's enough for for loops, comprehensions and every function that iterates.
minutes: 11
---

## The iterator protocol

Python's iteration machinery is exactly the `__next__` + `StopIteration` idea from the previous lesson, with one more requirement. An **iterator** is an object that implements:

- `__next__()`: return the next item, or raise `StopIteration` when there are none left
- `__iter__()`: return the iterator **itself** (`return self`)

That's the whole **iterator protocol**: two methods. Let's add the missing `__iter__` to `Squares`:

```python run
class Squares:
    def __init__(self, length):
        self.length = length
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.i >= self.length:
            raise StopIteration
        result = self.i ** 2
        self.i += 1
        return result

sq = Squares(5)
print(next(sq), next(sq), next(sq))
```

`next()` still works. But now `for` works too:

```python run
sq = Squares(5)
for item in sq:
    print(item)
```

## Exhaustion

An iterator is a *one-way, one-time* walk. Once it has raised `StopIteration`, it's **exhausted**, and looping over it again produces nothing at all. No error, just nothing:

```python run
print('second loop:')
for item in sq:
    print(item)
print('(nothing printed)')
```

The only way to iterate again is to make a new iterator:

```python run
sq = Squares(5)
print([item for item in sq])
```

Because `Squares` is now a real iterator, it works everywhere Python expects something iterable: comprehensions, `enumerate`, `sorted`, `sum`, `list`, unpacking, and so on.

```python run
sq = Squares(5)
print([item for item in sq if item % 2 == 0])

sq = Squares(5)
print(list(enumerate(sq)))
print(list(enumerate(sq)))     # same object again: already exhausted

sq = Squares(5)
print(sorted(sq, reverse=True))
```

The second `list(enumerate(sq))` is empty, which is the silent behavior to watch out for. We'll come back to it at the end of the section, because it causes real bugs.

## `iter()` and `__iter__`

Just as `next()` calls `__next__`, the built-in `iter()` calls `__iter__`. For an iterator, that hands back the very same object:

```python run
sq = Squares(5)
print(id(sq) == id(sq.__iter__()))
print(iter(sq) is sq)
```

## What a `for` loop really does

Let's instrument the methods so we can watch Python use them:

```python run
class Squares:
    def __init__(self, length):
        self.length = length
        self.i = 0

    def __iter__(self):
        print('calling __iter__')
        return self

    def __next__(self):
        print('calling __next__')
        if self.i >= self.length:
            raise StopIteration
        result = self.i ** 2
        self.i += 1
        return result

for i in Squares(3):
    print(i)
```

Python calls `__iter__` **once**, at the start, and then `__next__` repeatedly, one extra time at the end (that's the call that raises `StopIteration` and ends the loop). The same pattern shows up anywhere iteration happens:

```python run
print(sorted(Squares(3), reverse=True))
```

So a `for` loop is roughly this `while` loop, which you can write yourself:

```python run
sq = Squares(3)
sq_iterator = iter(sq)        # step 1: ask the object for an iterator
print(sq_iterator is sq)
while True:
    try:
        item = next(sq_iterator)   # step 2: get items one at a time
    except StopIteration:          # step 3: stop when told to
        break
    print(item)                    # the loop body
```

Note the order: the `for` statement first asks the object for an iterator with `iter()`, and *then* calls `next()` on whatever came back. For an iterator, `iter()` returns itself, so the extra step looks pointless here. It isn't, and understanding why is the subject of the next lesson.

<div class="callout note">
<span class="callout-title">Only `StopIteration` ends a loop</span>

A `for` loop ends quietly only on `StopIteration`. Any other exception raised by `__next__` (an `IndexError`, `KeyError`…) propagates out of the loop as a normal error. That's why iterators must translate "out of data" into `StopIteration` explicitly.

</div>

<div class="takeaways">

## Key takeaways

- An **iterator** implements `__next__` (next item or `StopIteration`) and `__iter__` (returns `self`).
- `next(it)` calls `it.__next__()`; `iter(it)` calls `it.__iter__()`, which for an iterator is `it` itself.
- A `for` loop calls `iter()` once, then `next()` until `StopIteration`.
- Once exhausted, an iterator yields nothing more: a second loop over it silently does nothing.
- Any iterator works with comprehensions, `enumerate`, `sorted`, `list` and every other consumer of iterables.

</div>
