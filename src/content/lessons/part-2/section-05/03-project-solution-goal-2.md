---
title: Project Solution - Goal 2
summary: Replace the list-backed Polygons sequence with an iterable and a PolygonsIterator that creates each polygon on demand, and make max_efficiency_polygon lazy.
minutes: 14
---

## The plan

We're turning `Polygons` from a sequence into an iterable. Following the pattern from the iterables lesson, that means two classes:

- an **iterator**, `PolygonsIterator`, that creates and returns `Polygon(3, R)`, `Polygon(4, R)`, … `Polygon(m, R)` one per `next()` call
- the **iterable**, `Polygons`, which holds only `m` and `R` and returns a **new** `PolygonsIterator` from `__iter__`

First we need the lazy `Polygon` from Goal 1 (same code as before, written compactly):

```python run
import math

class Polygon:
    def __init__(self, n, R):
        if n < 3:
            raise ValueError('Polygon must have at least 3 vertices.')
        self._n = n
        self._R = R
        self._interior_angle = self._side_length = self._apothem = None
        self._area = self._perimeter = None

    def __repr__(self):
        return f'Polygon(n={self._n}, R={self._R})'

    @property
    def count_vertices(self):
        return self._n

    @property
    def count_edges(self):
        return self._n

    @property
    def circumradius(self):
        return self._R

    @property
    def interior_angle(self):
        if self._interior_angle is None:
            self._interior_angle = (self._n - 2) * 180 / self._n
        return self._interior_angle

    @property
    def side_length(self):
        if self._side_length is None:
            self._side_length = 2 * self._R * math.sin(math.pi / self._n)
        return self._side_length

    @property
    def apothem(self):
        if self._apothem is None:
            self._apothem = self._R * math.cos(math.pi / self._n)
        return self._apothem

    @property
    def area(self):
        if self._area is None:
            self._area = self._n / 2 * self.side_length * self.apothem
        return self._area

    @property
    def perimeter(self):
        if self._perimeter is None:
            self._perimeter = self._n * self.side_length
        return self._perimeter

    def __eq__(self, other):
        if isinstance(other, self.__class__):
            return (self.count_edges == other.count_edges
                    and self.circumradius == other.circumradius)
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, self.__class__):
            return self.count_vertices > other.count_vertices
        return NotImplemented
```

## Step 1: the iterator

The iterator needs to know where to stop (`m`), the common circumradius (`R`), and which polygon to produce next. We'll track the latter as the vertex count `_i`, starting at 3:

```python run
class PolygonsIterator:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be greater than 3')
        self._m = m
        self._R = R
        self._i = 3              # vertex count of the next polygon

    def __iter__(self):
        return self

    def __next__(self):
        if self._i > self._m:
            raise StopIteration
        result = Polygon(self._i, self._R)
        self._i += 1
        return result

p_iter = PolygonsIterator(5, 1)
for p in p_iter:
    print(p)
print(list(p_iter))      # an iterator: exhausted after one pass
```

Each `Polygon` is created inside `__next__`, at the moment it's requested. That's the laziness Goal 2 asks for: the iterator holds three numbers, no matter how large `m` is.

## Step 2: the iterable

`Polygons` keeps `m` and `R`, and its `__iter__` hands out a fresh iterator each time. The list and `__getitem__` are gone:

```python run
class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be greater than 3')
        self._m = m
        self._R = R

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

    def __iter__(self):
        return PolygonsIterator(self._m, self._R)

polygons = Polygons(5, 1)
print(list(polygons))
print(list(polygons))     # an iterable: every pass starts over
print(len(polygons), iter(polygons) is polygons)
```

Note `len()` still works: it's computed from `m`, so it doesn't need the polygons to exist. We can keep `__len__` even though we dropped the sequence protocol.

## Step 3: a lazy `max_efficiency_polygon`

The old property sorted `self._polygons`. Let's first make it lazy with a backing attribute, and, deliberately, forget that the list no longer exists:

```python run
class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be greater than 3')
        self._m = m
        self._R = R
        self._max_efficiency_polygon = None

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

    def __iter__(self):
        return PolygonsIterator(self._m, self._R)

    @property
    def max_efficiency_polygon(self):
        if self._max_efficiency_polygon is None:
            sorted_polygons = sorted(self._polygons,
                                     key=lambda p: p.area / p.perimeter,
                                     reverse=True)
            self._max_efficiency_polygon = sorted_polygons[0]
        return self._max_efficiency_polygon

try:
    Polygons(10, 1).max_efficiency_polygon
except AttributeError as ex:
    print('AttributeError:', ex)
```

Of course: there's no `_polygons` any more. The fix is easy because `sorted` (and `max`) accept any iterable, and `self` **is** an iterable now. Sorting the whole collection just to take the first element is also more work than needed; `max` with a `key` finds the best item in a single pass without building a list:

```python run
class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be greater than 3')
        self._m = m
        self._R = R
        self._max_efficiency_polygon = None

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

    def __iter__(self):
        return PolygonsIterator(self._m, self._R)

    @property
    def max_efficiency_polygon(self):
        if self._max_efficiency_polygon is None:
            self._max_efficiency_polygon = max(
                self, key=lambda p: p.area / p.perimeter)
        return self._max_efficiency_polygon

polygons = Polygons(10, 1)
print(polygons.max_efficiency_polygon)
```

For a fixed circumradius, the area-to-perimeter ratio equals the apothem, `R·cos(π/n)`, which grows with `n`. So the polygon with the most vertices always wins, as the result confirms.

## Verifying the laziness

As in Goal 1, let's count the work instead of trusting it. A subclass of `Polygon` that records every creation, swapped in for the global name `Polygon` (which `PolygonsIterator.__next__` looks up each time it runs):

```python run
created = []
OriginalPolygon = Polygon

class CountingPolygon(OriginalPolygon):
    def __init__(self, n, R):
        created.append(n)
        super().__init__(n, R)

Polygon = CountingPolygon
try:
    big = Polygons(1_000_000, 1)
    print('after creating Polygons(1_000_000, 1):', len(created), 'polygons')
    it = iter(big)
    print(next(it), next(it))
    print('after two next() calls:', created)

    small = Polygons(6, 1)
    created.clear()
    print(small.max_efficiency_polygon, '| created:', created)
    created.clear()
    print(small.max_efficiency_polygon, '| created:', created)
finally:
    Polygon = OriginalPolygon
```

A million-polygon collection costs nothing to create, `next()` creates exactly one polygon per call, and `max_efficiency_polygon` iterates the collection once on first access and never again.

## Iterable vs sequence: what we gave up

The new `Polygons` can be looped over, sorted, summed, passed to `max` and so on, as often as we like. But it's no longer a sequence:

```python run
polygons = Polygons(6, 1)
print(sorted(polygons, reverse=True)[:2])
print(sum(p.count_edges for p in polygons))
try:
    polygons[0]
except TypeError as ex:
    print('TypeError:', ex)
```

Indexing and slicing are gone, and so is `reversed()`. If you wanted them back without giving up laziness, you could add a `__getitem__` that computes `Polygon(i + 3, R)` arithmetically (as the card deck in the reversed-iteration lesson does), or a `__reversed__` that counts down. That's a nice extension to try on your own.

<div class="takeaways">

## Key takeaways

- The iterable (`Polygons`) stores only the recipe (`m`, `R`); the iterator (`PolygonsIterator`) tracks the position and creates each polygon in `__next__`.
- `__iter__` returns a **new** iterator each time, so the collection can be iterated repeatedly.
- `len()` can stay: it's computed from `m`, not from stored items.
- Properties that used the old list must iterate the object instead; `max(self, key=...)` does it in one pass.
- Verify laziness by counting object creations, not just by checking results.

</div>
