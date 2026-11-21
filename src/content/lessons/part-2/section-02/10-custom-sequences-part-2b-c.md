---
title: Custom Sequences - Part 2b/c
summary: Build a mutable Polygon sequence of validated Point objects, with concatenation, append/extend/insert, index and slice assignment, del and pop.
minutes: 20
---

## The plan

Let's put everything together and build a realistic **mutable** custom sequence: a `Polygon` that is an ordered collection of 2D points (its vertices). We'll want it to feel like a list:

- indexing, slicing, `len` and iteration
- `+` and `+=`, plus `append`, `extend` and `insert`
- index and slice assignment (`p[0] = ...`, `p[0:2] = [...]`)
- `del p[i]` and `p.pop(i)`

Internally we'll store the points in a list and **delegate** most of the work to it. Our job is mainly to validate input and keep every element a proper `Point`.

## A Point that validates its coordinates

A named tuple would give us a point with `x` and `y`, but it would accept anything as a coordinate. We want real numbers only, so we'll write a small class. The `numbers` module defines abstract numeric types we can test against:

```python run
import numbers

print(isinstance(10, numbers.Real), isinstance(10.5, numbers.Real))
print(isinstance(1 + 1j, numbers.Number), isinstance(1 + 1j, numbers.Real))
```

Our `Point` will itself be a tiny sequence (`__len__` and `__getitem__`), which means it can be unpacked just like a tuple. That turns out to be very convenient: `Point(*pt)` will work whether `pt` is a `Point`, a tuple or a list.

```python run
class Point:
    def __init__(self, x, y):
        if isinstance(x, numbers.Real) and isinstance(y, numbers.Real):
            self._pt = (x, y)
        else:
            raise TypeError('Point co-ordinates must be real numbers.')

    def __repr__(self):
        return f'Point(x={self._pt[0]}, y={self._pt[1]})'

    def __len__(self):
        return 2

    def __getitem__(self, s):
        return self._pt[s]

p = Point(1, 2)
x, y = p
print(p, len(p), p[0], (x, y))
print(Point(*p), Point(*[3, 4]))

try:
    Point(1, 2j)
except TypeError as ex:
    print('TypeError:', ex)
```

## The core of Polygon

The initializer takes any number of point-like arguments and converts each one to a `Point`. `__len__` and `__getitem__` simply delegate to the internal list, so indexing, negative indices and slicing all work immediately:

```python run
class Polygon:
    def __init__(self, *pts):
        self._pts = [Point(*pt) for pt in pts]

    def __repr__(self):
        pts_str = ', '.join(repr(pt) for pt in self._pts)
        return f'Polygon({pts_str})'

    def __len__(self):
        return len(self._pts)

    def __getitem__(self, s):
        return self._pts[s]

p = Polygon((0, 0), Point(1, 1), [2, 2])
print(p)
print(len(p), p[0], p[-1])
print(p[::-1])
```

Two details in `__repr__`. First, `', '.join(...)` needs **strings**, so joining the `Point` objects directly would raise a `TypeError`; we convert each one with `repr`. Second, we print the points as separate arguments (no square brackets) because that's how `Polygon(...)` is actually called.

To keep each step short, we'll now add methods to the class one at a time by assigning functions to class attributes. In real code they'd all live in the class body (you'll see the complete class at the end).

## Concatenation: `+` and `+=`

`+` should only combine two polygons and must return a **new** `Polygon`. We return `NotImplemented` for anything else, which makes Python raise a sensible `TypeError`:

```python run
def __add__(self, other):
    if isinstance(other, Polygon):
        return Polygon(*self._pts, *other._pts)
    return NotImplemented

Polygon.__add__ = __add__

p1 = Polygon((0, 0), (1, 1))
p2 = Polygon((2, 2), (3, 3))
result = p1 + p2
print(result, result is p1)
try:
    p1 + [(4, 4)]
except TypeError as ex:
    print('TypeError:', ex)
```

For `+=` we can be more generous, just as lists are: accept another `Polygon` **or** any iterable of point-like things. Since `extend` needs exactly the same logic, we write `extend` once and have `__iadd__` call it and return `self`:

```python run
def extend(self, pts):
    if isinstance(pts, Polygon):
        self._pts.extend(pts._pts)
    else:
        self._pts.extend(Point(*pt) for pt in pts)

def __iadd__(self, pts):
    self.extend(pts)
    return self

def append(self, pt):
    self._pts.append(Point(*pt))

def insert(self, i, pt):
    self._pts.insert(i, Point(*pt))

Polygon.extend = extend
Polygon.__iadd__ = __iadd__
Polygon.append = append
Polygon.insert = insert

p1 = Polygon((0, 0), (1, 1))
before = id(p1)
p1 += Polygon((2, 2))
p1 += [(3, 3), Point(4, 4)]
p1.append((5, 5))
p1.insert(1, Point(50, 50))
print(p1)
print(id(p1) == before)
```

The object was mutated throughout. Notice how converting with `Point(*pt)` in every entry point keeps the invariant "every element is a `Point`" no matter what the caller passes in.

## Index and slice assignment: `__setitem__`

`p[i] = value` and `p[i:j] = values` both call `__setitem__(s, value)`, where `s` is an `int` or a `slice`. The tricky part is that `value` should be a single point for an index, but an *iterable* of points for a slice. Our strategy:

1. Try to interpret `value` as an iterable of points.
2. If that fails, try to interpret it as a single point.
3. Accept the assignment only when the shapes match (index ↔ single point, slice ↔ iterable of points), and raise a clear error otherwise.

```python run
def __setitem__(self, s, value):
    try:
        rhs = [Point(*pt) for pt in value]
        is_single = False
    except TypeError:
        try:
            rhs = Point(*value)
            is_single = True
        except TypeError:
            raise TypeError('Invalid Point or iterable of Points') from None

    if (isinstance(s, int) and is_single) or (isinstance(s, slice) and not is_single):
        self._pts[s] = rhs
    else:
        raise TypeError('Incompatible index/slice assignment')

Polygon.__setitem__ = __setitem__

p = Polygon((0, 0), (1, 1), (2, 2))
p[0] = Point(10, 10)
print(p)
p[0:2] = [(0, 0), (1, 1), (5, 5)]     # slices can change the length
print(p)
```

Why does step 1 fail for a single point like `Point(10, 10)` or `(10, 10)`? Iterating it yields plain numbers, and `Point(*10)` raises `TypeError` because a number can't be unpacked. That failure is what sends us to step 2.

Now the misuse cases produce helpful messages instead of confusing ones from deep inside a comprehension:

```python run
for target, value in [(slice(0, 2), (10, 10)),       # single point into a slice
                      (0, [(0, 0), (1, 1)]),         # many points into an index
                      (0, (0, 2 + 2j))]:             # not real numbers
    try:
        p[target] = value
    except TypeError as ex:
        print('TypeError:', ex)
```

Because the actual assignment is delegated to the list, extended slices also follow list rules (same length required), and you get list's own `ValueError` if the lengths don't match.

## Deleting: `__delitem__` and `pop`

`del p[i]` and `del p[i:j]` call `__delitem__`. Delegation makes both trivial. We'll add `pop` too, with the same default as lists (the last item):

```python run
def __delitem__(self, s):
    del self._pts[s]

def pop(self, i=-1):
    return self._pts.pop(i)

Polygon.__delitem__ = __delitem__
Polygon.pop = pop

p = Polygon(*zip(range(6), range(6)))
print(p)
del p[0]
del p[-1]
print(p)
del p[0:2]
print(p)
print(p.pop(), p)
```

`zip(range(6), range(6))` produces the pairs `(0, 0), (1, 1), ...`, and `*` unpacks them as separate arguments.

## The complete class

Here is everything in one place, the way you'd actually write it:

```python run
class Polygon:
    def __init__(self, *pts):
        self._pts = [Point(*pt) for pt in pts]

    def __repr__(self):
        return f"Polygon({', '.join(repr(pt) for pt in self._pts)})"

    def __len__(self):
        return len(self._pts)

    def __getitem__(self, s):
        return self._pts[s]

    def __setitem__(self, s, value):
        try:
            rhs = [Point(*pt) for pt in value]
            is_single = False
        except TypeError:
            try:
                rhs = Point(*value)
                is_single = True
            except TypeError:
                raise TypeError('Invalid Point or iterable of Points') from None
        if (isinstance(s, int) and is_single) or (isinstance(s, slice) and not is_single):
            self._pts[s] = rhs
        else:
            raise TypeError('Incompatible index/slice assignment')

    def __delitem__(self, s):
        del self._pts[s]

    def __add__(self, other):
        if isinstance(other, Polygon):
            return Polygon(*self._pts, *other._pts)
        return NotImplemented

    def __iadd__(self, pts):
        self.extend(pts)
        return self

    def append(self, pt):
        self._pts.append(Point(*pt))

    def extend(self, pts):
        if isinstance(pts, Polygon):
            self._pts.extend(pts._pts)
        else:
            self._pts.extend(Point(*pt) for pt in pts)

    def insert(self, i, pt):
        self._pts.insert(i, Point(*pt))

    def pop(self, i=-1):
        return self._pts.pop(i)

square = Polygon((0, 0), (0, 1), (1, 1), (1, 0))
square[1:3] = [(0, 2), (2, 2)]
square += [(5, 5)]
print(square)
print(len(square), square.pop(), [x + y for x, y in square])
```

<div class="callout tip">
<span class="callout-title">Let the standard library fill in the rest</span>

If you inherit from `collections.abc.MutableSequence` and implement `__getitem__`, `__setitem__`, `__delitem__`, `__len__` and `insert`, the base class supplies `append`, `extend`, `pop`, `remove`, `reverse`, `clear`, `__iadd__`, `__contains__`, `index` and `count` automatically, all built on your five methods.

</div>

<div class="takeaways">

## Key takeaways

- Wrapping a list and delegating to it is the easiest way to build a custom mutable sequence; your code focuses on validation.
- Convert inputs at every entry point (`__init__`, `append`, `extend`, `insert`, `__setitem__`) to keep a consistent element type.
- `__setitem__(s, value)` receives an `int` or a `slice`; check that the value's shape matches.
- `__iadd__` can share `extend`'s logic but must return `self`; `__add__` must return a new object.
- `del obj[...]` calls `__delitem__`; `pop` is an ordinary method you define yourself.

</div>
