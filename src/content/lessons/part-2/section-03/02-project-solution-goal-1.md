---
title: Project Solution - Goal 1
summary: Build the immutable Polygon class step by step, with computed properties, validation, equality and ordering, testing each piece with assert and math.isclose.
minutes: 18
---

## Design first

A regular polygon is completely determined by `n` (vertices) and `R` (circumradius). Everything else, from the side length to the area, can be **computed** from those two numbers. That suggests a simple design:

- store only `n` and `R`, in "private" attributes `_n` and `_R`;
- expose everything as read-only `@property` methods.

Why compute instead of calculating everything once in `__init__` and storing it? Because there's then a single source of truth. There's no way for `area` to disagree with `side_length`, and since the polygon is immutable, there's nothing to keep in sync anyway. (If a property were expensive, you could cache it; here, a couple of trig calls are cheap.)

## A first version

```python run
import math

class Polygon:
    def __init__(self, n, R):
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

p = Polygon(4, 1)
print(p, p.interior_angle, p.side_length, p.area)
```

Notice that `area` and `perimeter` are built from the other properties. Each formula appears exactly once.

## Testing with `assert`

`assert condition, message` does nothing when the condition is true and raises `AssertionError` (with your message) when it's false. That makes it a lightweight way to write unit tests:

```python run
assert 1 == 1                  # silent
try:
    assert 1 > 10, '1 is not greater than 10'
except AssertionError as ex:
    print('AssertionError:', ex)
```

Let's test the simple properties first:

```python run
def test_basics():
    p = Polygon(3, 1)
    assert repr(p) == 'Polygon(n=3, R=1)', f'actual: {p!r}'
    assert p.count_vertices == 3
    assert p.count_edges == 3
    assert p.circumradius == 1
    assert p.interior_angle == 60, f'actual: {p.interior_angle}'

test_basics()
print('basics OK')
```

### Floats need `math.isclose`

Now the square: its side should be exactly `√2`. But watch what happens with `==`:

```python run
p = Polygon(4, 1)
print(p.side_length, math.sqrt(2), p.side_length == math.sqrt(2))
```

The two values differ by a rounding error in the last digit, so an `==` test would fail even though the formula is correct. Floating-point results should be compared with a **tolerance**. `math.isclose(a, b, rel_tol=..., abs_tol=...)` returns `True` when the values are within a relative tolerance (a fraction of their size) or an absolute one:

```python run
print(math.isclose(p.side_length, math.sqrt(2), rel_tol=0.001, abs_tol=0.001))
```

The reference values from the project description are rounded to five decimals, so a tolerance of `0.001` is comfortably loose enough:

```python run
def close(a, b):
    return math.isclose(a, b, rel_tol=0.001, abs_tol=0.001)

def test_geometry():
    p = Polygon(4, 1)
    assert p.interior_angle == 90
    assert close(p.area, 2), f'actual: {p.area}'
    assert close(p.side_length, math.sqrt(2)), f'actual: {p.side_length}'
    assert close(p.perimeter, 4 * math.sqrt(2)), f'actual: {p.perimeter}'
    assert close(p.apothem, 0.707), f'actual: {p.apothem}'

    p = Polygon(6, 2)
    assert close(p.side_length, 2)
    assert close(p.apothem, 1.73205)
    assert close(p.area, 10.3923)
    assert close(p.perimeter, 12)
    assert close(p.interior_angle, 120)

    p = Polygon(12, 3)
    assert close(p.side_length, 1.55291)
    assert close(p.apothem, 2.89778)
    assert close(p.area, 27)
    assert close(p.perimeter, 18.635)
    assert close(p.interior_angle, 150)

test_geometry()
print('geometry OK')
```

## Validation

Right now nothing stops us from creating a nonsensical polygon:

```python run
print(Polygon(2, 10).interior_angle)   # a "polygon" with 2 vertices
```

A convex polygon needs at least 3 vertices, so the initializer should reject anything smaller. A bad *value* of the right type is exactly what `ValueError` is for.

## Equality and ordering

The spec says two polygons are equal when they have the same number of vertices **and** the same circumradius, while ordering looks at the number of vertices only.

```python run
class Polygon(Polygon):          # extend the previous version for this step
    def __init__(self, n, R):
        if n < 3:
            raise ValueError('Polygon must have at least 3 vertices.')
        self._n = n
        self._R = R

    def __eq__(self, other):
        if isinstance(other, Polygon):
            return (self.count_edges == other.count_edges
                    and self.circumradius == other.circumradius)
        return NotImplemented

    def __gt__(self, other):
        if isinstance(other, Polygon):
            return self.count_vertices > other.count_vertices
        return NotImplemented

try:
    Polygon(2, 10)
except ValueError as ex:
    print('ValueError:', ex)
```

Three design decisions are worth spelling out:

- **Returning `NotImplemented`** for unknown types (rather than `False` or raising) lets Python try the other operand's method. For `==` it then falls back to an identity comparison, so `Polygon(3, 1) == 'triangle'` is simply `False`. For `>`, Python raises a clean `TypeError` when neither side knows how to compare.
- **We only wrote `__gt__`, yet `<` works.** For `a < b`, Python first tries `a.__lt__(b)`. Our class doesn't define it, so Python tries the *reflected* operation `b.__gt__(a)`, which we did define. (`<=` and `>=` would need `__le__`/`__ge__`, or the `functools.total_ordering` decorator.)
- **`!=` comes for free** from `__eq__`: Python inverts the result unless you define `__ne__` yourself.

```python run
def test_comparisons():
    p1 = Polygon(3, 10)
    p2 = Polygon(10, 10)
    p3 = Polygon(15, 10)
    p4 = Polygon(15, 100)
    p5 = Polygon(15, 100)

    assert p2 > p1
    assert p2 < p3            # handled by p3.__gt__(p2)
    assert p3 != p4           # same n, different R
    assert p1 != p4
    assert p4 == p5 and p4 is not p5
    assert (Polygon(3, 1) == 'triangle') is False

    try:
        Polygon(2, 10)
        assert False, 'expected ValueError for n=2'
    except ValueError:
        pass

test_comparisons()
print('comparisons OK')

try:
    Polygon(3, 1) > 3
except TypeError as ex:
    print('TypeError:', ex)
```

## Is it really immutable?

Each property has a getter but no setter, so trying to assign to one fails:

```python run
p = Polygon(5, 1)
try:
    p.area = 100
except AttributeError as ex:
    print('AttributeError:', ex)
```

Strictly speaking, someone could still write `p._n = 7`. The leading underscore is a convention meaning "internal, don't touch", and in Python that convention is the usual way to express immutability for simple classes. (`__slots__`, frozen dataclasses or a `namedtuple` base can make it stricter.)

<div class="callout note">
<span class="callout-title">Equality and hashing</span>

When a class defines `__eq__` without `__hash__`, Python sets `__hash__` to `None`, so instances can't be put in a set or used as dict keys. Since our polygons are immutable, it would be safe to add `def __hash__(self): return hash((self._n, self._R))`, which is consistent with `__eq__`.

</div>

## The final class

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

test_basics()
test_geometry()
test_comparisons()
print('all tests pass')
```

Re-running all the earlier tests against the final class is the point of keeping them as functions: whenever you change the code, you can check that nothing broke. Notice that writing the tests took about as long as writing the class. That's normal, and it's time well spent.

<div class="takeaways">

## Key takeaways

- Store only the defining values (`n`, `R`) and compute everything else with read-only properties.
- Use `assert` for quick tests, and `math.isclose` with a tolerance for floating-point results.
- Raise `ValueError` for arguments of the right type but an invalid value.
- Return `NotImplemented` from comparison methods for unsupported types; Python then tries the reflected operation.
- Defining `__gt__` alone is enough for both `>` and `<`, thanks to reflection.

</div>
