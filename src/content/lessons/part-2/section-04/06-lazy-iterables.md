---
title: Lazy Iterables
summary: Lazy evaluation postpones computing a value until someone asks for it. Iterables can be lazy too, producing each item on demand instead of storing them all.
minutes: 11
---

## What "lazy" means

**Lazy evaluation** means deferring a computation until its result is actually needed. If the value is never requested, the work (and the memory to store the result) is never spent. It's not specific to iteration, so let's start with a class property.

## Eager, on-the-fly, and lazy

Here's a circle that computes its area **eagerly**: every time the radius is set, the area is recalculated and stored, whether or not anyone ever looks at it:

```python run
import math

class Circle:
    def __init__(self, r):
        self.radius = r

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, r):
        self._radius = r
        self.area = math.pi * r ** 2     # computed right away

c = Circle(1)
print(c.area)
c.radius = 2
print(c.radius, c.area)
```

The other extreme computes the area **every time** it's read and never stores it:

```python run
class Circle:
    def __init__(self, r):
        self.radius = r

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, r):
        self._radius = r

    @property
    def area(self):
        return math.pi * self.radius ** 2

c = Circle(1)
print(c.area)
c.radius = 2
print(c.area)
```

Always correct, but if `area` is read a thousand times we compute it a thousand times. The **lazy** version combines the best of both: compute on the first request, cache the result, and throw the cache away only when the radius changes:

```python run
class Circle:
    def __init__(self, r):
        self.radius = r

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, r):
        self._radius = r
        self._area = None            # invalidate the cached area

    @property
    def area(self):
        if self._area is None:
            print('Calculating area...')
            self._area = math.pi * self.radius ** 2
        return self._area

c = Circle(1)
print(c.area)
print(c.area)        # cached: no recalculation
c.radius = 2
print(c.area)        # radius changed, so recalculated once
```

<div class="callout modern">
<span class="callout-title">`functools.cached_property` (Python 3.8+)</span>

For values that never need invalidating, the standard library does this for you: decorate a method with `@functools.cached_property` and it runs once, on first access, after which the result is stored in the instance's `__dict__`. Our hand-written version is still needed here because changing the radius must reset the cache.

</div>

## Lazy iterables

The same idea applies to collections. An iterable doesn't have to **store** its items. Its iterator can **compute** each one when `next()` asks for it. Here's an iterable of factorials `0!, 1!, 2!, …`:

```python run
class Factorials:
    def __init__(self, length):
        self.length = length

    def __iter__(self):
        return self.FactIter(self.length)

    class FactIter:
        def __init__(self, length):
            self.length = length
            self.i = 0

        def __iter__(self):
            return self

        def __next__(self):
            if self.i >= self.length:
                raise StopIteration
            result = math.factorial(self.i)
            self.i += 1
            return result

facts = Factorials(5)
print(list(facts))
print(list(facts))     # an iterable: re-iterable, recomputed each time
```

No list of factorials exists anywhere. `Factorials(5)` stores just one number, the length, whether that's 5 or 5 million. Each value is computed at the moment it's requested.

Once items are computed on demand, there's no reason the collection must even end. Drop the length and you get an **infinite** lazy iterable, something that couldn't possibly be stored:

```python run
class Factorials:
    def __iter__(self):
        return self.FactIter()

    class FactIter:
        def __init__(self):
            self.i = 0

        def __iter__(self):
            return self

        def __next__(self):
            result = math.factorial(self.i)
            self.i += 1
            return result

fact_iter = iter(Factorials())
for _ in range(10):
    print(next(fact_iter), end=' ')
```

As with the cyclic iterator, the consumer decides how many items to take.

## Lazy vs eager: the trade-off

| | Eager (build a list) | Lazy (compute on demand) |
|---|---|---|
| Memory | all items at once | one item at a time |
| Startup cost | everything computed up front | nothing until the first `next()` |
| Infinite collections | impossible | natural |
| Random access, `len()` | easy | usually not available |
| Re-reading items | free | recomputed each pass |

Lazy evaluation wins whenever you process items one at a time and the collection is large, expensive or unbounded. If you need to index into the data or reuse it heavily, materializing a list can be the better choice.

<div class="callout note">
<span class="callout-title">Thin shells</span>

Look at `Factorials`: all the real work is in the iterator. The iterable is little more than a shell whose `__iter__` creates one. This pattern is so common that Python has a much shorter way to write it, **generators**, which are coming up soon.

</div>

<div class="takeaways">

## Key takeaways

- **Lazy evaluation** postpones work until a value is requested, and can cache it so the work happens at most once.
- Lazy properties: compute on first access, store in a private attribute, and reset that attribute when the inputs change. `functools.cached_property` handles the no-reset case.
- A **lazy iterable** computes each item in `__next__` instead of storing them, so memory use doesn't grow with the size of the collection.
- Lazy iterables can be infinite; the consumer decides how many items to take.

</div>
