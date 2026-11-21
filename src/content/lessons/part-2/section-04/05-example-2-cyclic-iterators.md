---
title: Example 2 - Cyclic Iterators
summary: An iterator doesn't have to end. A cyclic iterator loops over a finite collection forever, and itertools.cycle provides one ready-made.
minutes: 8
---

## The problem

Nothing in the iterator protocol says an iterator must eventually raise `StopIteration`. Infinite iterators are perfectly legal, and sometimes exactly what you want.

Suppose we number some items `1, 2, 3, …` and want to tag each one with a compass direction, cycling through `N, S, W, E`:

```text
1N, 2S, 3W, 4E, 5N, 6S, 7W, 8E, 9N, 10S, ...
```

The numbers run on as long as we like; the directions repeat. What we need is something that hands out `N, S, W, E, N, S, W, E, …` forever.

## A custom cyclic iterator

The modulo operator turns an ever-increasing counter into a position that wraps around:

```python run
class CyclicIterator:
    def __init__(self, lst):
        self.lst = lst
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        result = self.lst[self.i % len(self.lst)]
        self.i += 1
        return result

iter_cycl = CyclicIterator('NSWE')
print([next(iter_cycl) for _ in range(10)])
```

`__next__` never raises `StopIteration`, so **never** write `for d in CyclicIterator('NSWE')` or `list(CyclicIterator('NSWE'))` without some other way to stop: that loop would run forever. Instead, something finite has to drive it. Here the `range` is in charge and we pull one direction per number:

```python run
n = 10
iter_cycl = CyclicIterator('NSWE')
for i in range(1, n + 1):
    direction = next(iter_cycl)
    print(f'{i}{direction}', end=' ')
```

The same thing as a comprehension:

```python run
iter_cycl = CyclicIterator('NSWE')
[f'{i}{next(iter_cycl)}' for i in range(1, n + 1)]
```

## The `zip` approach

`zip` is another way to let a finite iterable drive an endless (or merely longer) one, because **`zip` stops as soon as its shortest input runs out**:

```python run
list(zip(range(1, 6), CyclicIterator('NSWE')))
```

Even without a custom class, we could repeat the string enough times to be sure it's long enough:

```python run
n = 10
[f'{i}{direction}' for i, direction in zip(range(1, n + 1), 'NSWE' * (n // 4 + 1))]
```

That works, but it builds a throwaway string, and we have to get the arithmetic right. The cyclic iterator expresses the idea directly.

## `itertools.cycle`

This pattern is common enough that the standard library has it. `itertools.cycle(iterable)` returns an infinite iterator that repeats the items of any iterable:

```python run
import itertools

iter_cycl = itertools.cycle('NSWE')
print([f'{i}{next(iter_cycl)}' for i in range(1, 11)])
print([f'{i}{d}' for i, d in zip(range(1, 11), itertools.cycle('NSWE'))])
```

There's a subtle difference from our class. `CyclicIterator` indexes into its argument, so it only works on **sequences**. `itertools.cycle` works on any iterable, even a one-shot iterator: during the first pass it saves each item it sees, and from then on it replays the saved copy.

```python run
directions = iter(['N', 'S', 'W', 'E'])    # an iterator, can't be indexed
c = itertools.cycle(directions)
print([next(c) for _ in range(6)])
print(list(directions))                     # cycle consumed the original...
print(next(c), next(c))                     # ...but still has its own copy
```

<div class="callout tip">
<span class="callout-title">Taking just a few items from an infinite iterator</span>

`itertools.islice(iterator, n)` gives you the first `n` items lazily, so `list(itertools.islice(itertools.cycle('NSWE'), 6))` is safe. It's the standard way to peek at an infinite iterator.

</div>

<div class="takeaways">

## Key takeaways

- Iterators may be **infinite**: `__next__` simply never raises `StopIteration`.
- Never fully consume an infinite iterator (`list()`, a bare `for`); let something finite drive it, such as a `range` with `next()`, or `zip`.
- `zip` stops at its shortest input, which makes it a natural partner for infinite iterators.
- `itertools.cycle` repeats any iterable forever, caching items from the first pass; `itertools.islice` takes a finite slice.

</div>
