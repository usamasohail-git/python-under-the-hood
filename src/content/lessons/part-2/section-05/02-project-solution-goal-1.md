---
title: Project Solution - Goal 1
summary: Turn each calculated Polygon property into a lazy property with a private backing attribute, then prove with tests that the values are right and computed only once.
minutes: 12
---

## The recipe for a lazy property

Every lazy property follows the same two steps:

1. In `__init__`, create a private **backing attribute** for the property and set it to `None`, meaning "not computed yet".
2. In the property's getter, compute the value **only if** the backing attribute is still `None`, store it there, and return it.

Because `Polygon` has no setters, `_n` and `_R` never change after creation, so a cached value can never become wrong. That's why we don't need the invalidation step that the `Circle` example in the lazy-iterables lesson needed when its radius changed.

## The refactored `Polygon`

```python run
import math

class Polygon:
    def __init__(self, n, R):
        if n < 3:
            raise ValueError('Polygon must have at least 3 vertices.')
        self._n = n
        self._R = R
        # backing attributes for the lazy properties
        self._interior_angle = None
        self._side_length = None
        self._apothem = None
        self._area = None
        self._perimeter = None

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

A few design notes:

- `count_vertices`, `count_edges` and `circumradius` just return stored values, so there's nothing to cache.
- `area` and `perimeter` use the `side_length` and `apothem` **properties**, not the formulas. So computing `area` caches `side_length` and `apothem` as a side effect, and a later `perimeter` reuses the cached `side_length`.
- `None` is a safe "not yet computed" marker because none of these properties can ever legitimately be `None`.

## Checking the results

The external behavior must not change, so the tests from Project 1 should still pass unchanged. Here's a condensed version:

```python run
def test_polygon():
    rel_tol = abs_tol = 0.001

    try:
        Polygon(2, 10)
        assert False, 'Creating a Polygon with 2 sides: exception expected'
    except ValueError:
        pass

    p = Polygon(3, 1)
    assert str(p) == 'Polygon(n=3, R=1)', f'actual: {p}'
    assert p.count_vertices == 3 and p.count_edges == 3 and p.circumradius == 1
    assert p.interior_angle == 60

    p = Polygon(4, 1)
    assert p.interior_angle == 90
    assert math.isclose(p.area, 2, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.side_length, math.sqrt(2), rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.perimeter, 4 * math.sqrt(2), rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.apothem, 0.707, rel_tol=rel_tol, abs_tol=abs_tol)

    p = Polygon(6, 2)
    assert math.isclose(p.side_length, 2, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.apothem, 1.73205, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.area, 10.3923, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.perimeter, 12, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.interior_angle, 120, rel_tol=rel_tol, abs_tol=abs_tol)

    p = Polygon(12, 3)
    assert math.isclose(p.side_length, 1.55291, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.apothem, 2.89778, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.area, 27, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.perimeter, 18.635, rel_tol=rel_tol, abs_tol=abs_tol)
    assert math.isclose(p.interior_angle, 150, rel_tol=rel_tol, abs_tol=abs_tol)

    p1, p2, p3 = Polygon(3, 10), Polygon(10, 10), Polygon(15, 10)
    p4, p5 = Polygon(15, 100), Polygon(15, 100)
    assert p2 > p1 and p2 < p3
    assert p3 != p4 and p1 != p4 and p4 == p5

test_polygon()
print('all Polygon tests passed')
```

Notice `p2 < p3` works although we only defined `__gt__`: Python tries the reflected operation `p3 > p2`.

## Checking the laziness

Correct results don't prove the properties are lazy: the eager version passes the same tests. To verify laziness we need to observe **how often the work happens**. One way is to temporarily replace `math.sin` and `math.cos` with counting wrappers. Our class looks up `math.sin` every time it runs, so it picks up the replacement:

```python run
from collections import Counter

calls = Counter()
real_sin, real_cos = math.sin, math.cos

def counting_sin(x):
    calls['sin'] += 1
    return real_sin(x)

def counting_cos(x):
    calls['cos'] += 1
    return real_cos(x)

math.sin, math.cos = counting_sin, counting_cos
try:
    p = Polygon(8, 1)
    print('after creation:', dict(calls))
    for _ in range(100):
        p.area, p.perimeter, p.side_length, p.apothem
    print('after 100 rounds of access:', dict(calls))
finally:
    math.sin, math.cos = real_sin, real_cos     # always restore!
```

Nothing is computed at construction, and four hundred property reads trigger exactly one `sin` and one `cos`. The backing attributes show what's been cached:

```python run
p = Polygon(5, 1)
p.perimeter
print({k: v for k, v in vars(p).items() if k not in ('_n', '_R')})
```

Asking for `perimeter` computed and cached `side_length` along the way; `apothem`, `area` and `interior_angle` are still untouched.

<div class="callout modern">
<span class="callout-title">`functools.cached_property` (Python 3.8+)</span>

The standard library can do the caching for you. Replace `@property` with `@cached_property` and drop the backing attributes and `if ... is None` checks:

```python
from functools import cached_property

class Polygon:
    ...
    @cached_property
    def side_length(self):
        return 2 * self._R * math.sin(math.pi / self._n)
```

The first access runs the method and stores the result in the instance's `__dict__` under the same name; after that, normal attribute lookup finds it directly. One difference: a `cached_property` can be overwritten by assignment (`p.side_length = 5` works), whereas a plain read-only `property` refuses. For an immutable class the hand-written version is stricter.

</div>

<div class="takeaways">

## Key takeaways

- Lazy property = private backing attribute initialized to `None` + compute-and-store on first access.
- Immutability makes caching safe: no inputs can change, so nothing needs invalidating.
- Building properties on other properties (`area` uses `side_length`) shares the cached work.
- Test laziness separately from correctness, for example by counting calls to the expensive functions.
- `functools.cached_property` is the modern shortcut, at the cost of allowing assignment.

</div>
