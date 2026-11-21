---
title: Project Solution - Goal 2
summary: Build the read-only Polygons sequence by delegating indexing and slicing to a tuple, and find the most efficient polygon with max and a key function.
minutes: 14
---

## Starting point

We'll reuse the final `Polygon` class from Goal 1:

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
        if isinstance(other, Polygon):
            return (self.count_edges == other.count_edges
                    and self.circumradius == other.circumradius)
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, Polygon):
            return self.count_vertices > other.count_vertices
        return NotImplemented
```

The `Polygons` sequence needs:

- `__init__(m, R)` with validation;
- `__len__` and `__getitem__`, the two methods that make something a sequence;
- a readable `__repr__`;
- a `max_efficiency_polygon` property.

## The skeleton

The sequence holds the polygons with `3, 4, ..., m` vertices, which is `m - 2` polygons:

```python run
class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be at least 3')
        self._m = m
        self._R = R

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

try:
    Polygons(2, 10)
except ValueError as ex:
    print('ValueError:', ex)

print(len(Polygons(3, 1)), len(Polygons(6, 1)), Polygons(6, 1))
```

## Indexing and slicing by delegation

We could implement `__getitem__` by hand, normalizing negative indices, raising `IndexError` and resolving slices with `slice.indices()`, exactly as we did for the Fibonacci sequence. But there's a much simpler option: build the polygons once and store them in a **built-in sequence**, then pass every index or slice straight through to it. The built-in already handles every case correctly, including the `IndexError` that makes iteration stop.

Which built-in? The sequence is supposed to be immutable, so a **tuple** is the natural choice: even our own code can't accidentally append to it.

```python run
class Polygons:
    def __init__(self, m, R):
        if m < 3:
            raise ValueError('m must be at least 3')
        self._m = m
        self._R = R
        self._polygons = tuple(Polygon(i, R) for i in range(3, m + 1))

    def __len__(self):
        return self._m - 2

    def __repr__(self):
        return f'Polygons(m={self._m}, R={self._R})'

    def __getitem__(self, s):
        return self._polygons[s]

polygons = Polygons(8, 1)
for p in polygons:
    print(p, end='  ')
print()
print(polygons[0], polygons[-1])
print(polygons[2:5])
print(polygons[::-2])
```

Indexing, negative indices, slices, extended slices and iteration all work, with a single line of code in `__getitem__`. Out-of-range indices raise `IndexError` just like a tuple would:

```python run
try:
    polygons[100]
except IndexError as ex:
    print('IndexError:', ex)

print(len(polygons), Polygon(5, 1) in polygons, Polygon(5, 2) in polygons)
```

`in` works too. With no `__contains__`, Python iterates and compares with `==`, which uses our `Polygon.__eq__` (both `n` and `R` must match).

<div class="callout note">
<span class="callout-title">Slices return tuples here</span>

Because we delegate, `polygons[2:5]` returns a plain `tuple` of `Polygon` objects, not a new `Polygons` instance. That's perfectly fine for this project. (A `Polygons` sequence always starts at a triangle, so a slice from the middle couldn't be represented as one anyway.)

</div>

## The most efficient polygon

Finally, we need the polygon with the highest area-to-perimeter ratio. The `Polygon` class doesn't have a ratio property, so we compute it in a key function. You could sort all the polygons by that key and take the first one, but sorting does far more work than needed. `max` with a `key` finds the largest in a single pass:

```python run
class Polygons(Polygons):        # add the property to the previous version
    @property
    def max_efficiency_polygon(self):
        return max(self._polygons, key=lambda p: p.area / p.perimeter)

polygons = Polygons(10, 1)
polygons.max_efficiency_polygon
```

Let's check the answer by looking at all the ratios:

```python run
for p in polygons:
    print(f'{p!r:20} {p.area / p.perimeter:.5f}')
```

The ratio grows with every extra vertex, so the polygon with the most vertices always wins. That makes sense: area / perimeter = `(n/2 · s · a) / (n · s)` = `a / 2`, half the apothem, and the apothem `R cos(π/n)` grows towards `R` as `n` increases.

## Approaching a circle

As `n` grows, a regular polygon looks more and more like its circumscribed circle. With `R = 1`, the area should approach `π` and the perimeter `2π`:

```python run
polygons = Polygons(500, 1)
last = polygons[-1]
print(last, last.area, math.pi)
print(last.perimeter, 2 * math.pi)
```

## Tests

As before, let's capture the behavior in tests we can re-run:

```python run
def test_polygons():
    try:
        Polygons(2, 1)
        assert False, 'expected ValueError for m=2'
    except ValueError:
        pass

    ps = Polygons(6, 2)
    assert len(ps) == 4
    assert repr(ps) == 'Polygons(m=6, R=2)'
    assert [p.count_vertices for p in ps] == [3, 4, 5, 6]
    assert ps[0] == Polygon(3, 2) and ps[-1] == Polygon(6, 2)
    assert list(ps[1:3]) == [Polygon(4, 2), Polygon(5, 2)]
    assert list(ps[::-1]) == [Polygon(n, 2) for n in (6, 5, 4, 3)]
    assert ps.max_efficiency_polygon == Polygon(6, 2)
    try:
        ps[4]
        assert False, 'expected IndexError'
    except IndexError:
        pass

test_polygons()
print('Polygons tests pass')
```

## Where to go from here

This solution builds every polygon up front. That's fine for a few hundred polygons, but `Polygons(10_000_000, 1)` would allocate ten million objects before you used a single one. A **lazy** version would compute each polygon only when requested, in `__getitem__`, the way our Fibonacci sequence did. Making sequences lazy, and the iterator protocol that supports that, is where the next sections are headed.

<div class="takeaways">

## Key takeaways

- `__len__` plus `__getitem__` makes a class a sequence; delegating `__getitem__` to a tuple gives you correct indexing, slicing and `IndexError` for free.
- Storing the items in a tuple keeps the sequence immutable, even from your own code.
- `max(items, key=f)` finds the best item in one pass; there's no need to sort.
- For regular polygons with a fixed `R`, the area-to-perimeter ratio is half the apothem, so it always increases with `n`.

</div>
