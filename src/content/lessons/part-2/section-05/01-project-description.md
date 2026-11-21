---
title: Project - Description
summary: "Starting from the Polygon and Polygons classes of Project 1, make every computed property lazy and turn the polygon sequence into a lazy iterable."
minutes: 8
---

## Where we start

In Project 1 you built two classes:

- `Polygon(n, R)`: a regular, strictly convex polygon with `n` edges and circumradius `R`. It's **immutable** (only read-only properties) and exposes calculated properties: `interior_angle`, `side_length`, `apothem`, `area` and `perimeter`. Polygons compare equal when they have the same number of vertices and the same circumradius, and are ordered by number of vertices.
- `Polygons(m, R)`: a **sequence** of all polygons with 3 up to `m` vertices and a common circumradius `R`, with a `max_efficiency_polygon` property returning the polygon with the highest area-to-perimeter ratio.

Here's the code we'll use as the starting point (use your own version if you prefer):

```python run
import math

class Polygon:
    def __init__(self, n, R):
        if n < 3:
            raise ValueError('Polygon must have at least 3 vertices.')
        self._n = n
        self._R = R

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
        return (self._n - 2) * 180 / self._n

    @property
    def side_length(self):
        return 2 * self._R * math.sin(math.pi / self._n)

    @property
    def apothem(self):
        return self._R * math.cos(math.pi / self._n)

    @property
    def area(self):
        return self._n / 2 * self.side_length * self.apothem

    @property
    def perimeter(self):
        return self._n * self.side_length

    def __eq__(self, other):
        if isinstance(other, self.__class__):
            return (self.count_edges == other.count_edges
                    and self.circumradius == other.circumradius)
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, self.__class__):
            return self.count_vertices > other.count_vertices
        return NotImplemented


class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be greater than 3')
        self._m = m
        self._R = R
        self._polygons = [Polygon(i, R) for i in range(3, m + 1)]

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

    def __getitem__(self, s):
        return self._polygons[s]

    @property
    def max_efficiency_polygon(self):
        sorted_polygons = sorted(self._polygons,
                                 key=lambda p: p.area / p.perimeter,
                                 reverse=True)
        return sorted_polygons[0]
```

A quick look at what it does:

```python run
p = Polygon(6, 2)
print(p, p.side_length, round(p.area, 4), p.interior_angle)

polygons = Polygons(6, 1)
print(polygons, len(polygons), list(polygons))
print(polygons[2], polygons[-1], polygons.max_efficiency_polygon)
```

## What's wasteful about it

Two things in this design do more work than necessary:

1. **`Polygon` recomputes everything on every access.** `area` calls `side_length` and `apothem`, which call `math.sin` and `math.cos`, every single time. But a `Polygon` can't change after it's created, so each of those values only ever needs to be computed **once**.
2. **`Polygons` builds every polygon up front.** `Polygons(1000, 1)` immediately creates 998 `Polygon` objects and keeps them all in memory, even if you only look at the first one. The polygons are completely determined by `m` and `R`, so they can be created on demand.

## Goal 1: lazy properties

Refactor `Polygon` so that every calculated property (`interior_angle`, `side_length`, `apothem`, `area`, `perimeter`) is **lazy**:

- nothing is computed when the polygon is created
- a value is computed the first time it's requested, then cached
- later requests return the cached value without recomputing

Since `Polygon` is immutable, a cached value can never go stale, so you don't need any invalidation logic. Everything else (validation, `repr`, equality and ordering) must keep working exactly as before.

## Goal 2: a lazy iterable

Refactor `Polygons` from a sequence into an **iterable**:

- write an **iterator** class (call it `PolygonsIterator`) that hands out `Polygon(3, R)`, `Polygon(4, R)`, …, `Polygon(m, R)` one at a time, creating each polygon only when `next()` asks for it
- `Polygons.__iter__` must return a **new** iterator each time, so a `Polygons` object can be looped over as often as you like
- don't store the polygons in a list (or any other container); `Polygons` should only remember `m` and `R`
- keep `len()`, the `repr`, the `m < 3` check, and the `max_efficiency_polygon` property, which should also be **lazy**: computed once, on first access

## Hints

- A lazy property needs a private "backing" attribute (for example `self._area`), initialized to `None` in `__init__`. The property computes and stores the value only if the backing attribute is still `None`.
- The iterator needs to remember which polygon to produce next. A counter starting at 3 works well.
- `sorted()` and `max()` accept any iterable, including your new `Polygons` object.
- Test laziness, not just results: count how often `math.sin` is called, or how many `Polygon` objects are created.

## Try it yourself

Before reading the solution walkthroughs, open this section's **Practice** page. Each goal is an auto-graded exercise with starter code and tests that check both the results and the laziness of your implementation.

<div class="takeaways">

## Key takeaways

- Goal 1: every calculated `Polygon` property becomes lazy: computed on first access, cached afterwards.
- Goal 2: `Polygons` becomes an iterable whose iterator creates polygons on demand, with no stored list.
- `max_efficiency_polygon` must be lazy too.
- Immutability is what makes caching safe here: the inputs never change, so cached values never go stale.

</div>
