---
title: Application - Example 2
summary: Bounded integer coordinates, a descriptor that validates a whole sequence of points, and `Polygon` subclasses that change their rules just by redefining one descriptor.
minutes: 15
---

## The goal

We want a `Polygon` class whose `vertices` attribute must be a sequence of `Point2D` objects, with a minimum (and optionally a maximum) number of points. Each `Point2D` must have integer coordinates within screen bounds, say `0 ≤ x ≤ 800` and `0 ≤ y ≤ 400`. Two descriptors will do all the checking.

## A bounded integer descriptor

```python run
class Int:
    def __init__(self, min_value=None, max_value=None):
        self.min_value = min_value
        self.max_value = max_value

    def __set_name__(self, owner_class, name):
        self.name = name

    def __set__(self, instance, value):
        if not isinstance(value, int):
            raise ValueError(f'{self.name} must be an int.')
        if self.min_value is not None and value < self.min_value:
            raise ValueError(f'{self.name} must be at least {self.min_value}')
        if self.max_value is not None and value > self.max_value:
            raise ValueError(f'{self.name} cannot exceed {self.max_value}')
        instance.__dict__[self.name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.name, None)


class Point2D:
    x = Int(min_value=0, max_value=800)
    y = Int(min_value=0, max_value=400)

    def __init__(self, x, y):
        self.x = x          # goes through Int.__set__
        self.y = y

    def __repr__(self):
        return f'Point2D(x={self.x}, y={self.y})'

    def __str__(self):
        return f'({self.x}, {self.y})'

p = Point2D(0, 10)
print(str(p), repr(p))
try:
    Point2D(0, 500)
except ValueError as ex:
    print('ValueError:', ex)
```

Notice the checks use `is not None` rather than `if self.min_value and ...`: a bound of `0` is falsy, and a truthiness test would silently skip it.

Because `__init__` assigns `self.x = x`, the validation also runs at construction time. There's no way to build an invalid point.

## A sequence-of-points descriptor

To accept "any sequence", mutable or not, we check against the abstract base class `collections.abc.Sequence`:

```python run
from collections.abc import Sequence, MutableSequence

print(isinstance([1, 2, 3], Sequence), isinstance([1, 2, 3], MutableSequence))
print(isinstance((1, 2, 3), Sequence), isinstance((1, 2, 3), MutableSequence))
print(isinstance({1, 2, 3}, Sequence))
```

Now the descriptor. It validates the container, its length and every element, then stores a **list copy** so the polygon can grow later, and so the caller's own list can't change our vertices behind our back:

```python run
class Point2DSequence:
    def __init__(self, min_length=None, max_length=None):
        self.min_length = min_length
        self.max_length = max_length

    def __set_name__(self, owner_class, name):
        self.name = name

    def __set__(self, instance, value):
        if not isinstance(value, Sequence):
            raise ValueError(f'{self.name} must be a sequence type.')
        if self.min_length is not None and len(value) < self.min_length:
            raise ValueError(f'{self.name} must contain at least {self.min_length} elements')
        if self.max_length is not None and len(value) > self.max_length:
            raise ValueError(f'{self.name} cannot contain more than {self.max_length} elements')
        for index, item in enumerate(value):
            if not isinstance(item, Point2D):
                raise ValueError(f'Item at index {index} is not a Point2D instance.')
        instance.__dict__[self.name] = list(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        # create an empty list the first time, so callers always get a list
        return instance.__dict__.setdefault(self.name, [])
```

## The `Polygon` class

```python run
class Polygon:
    vertices = Point2DSequence(min_length=3)

    def __init__(self, *vertices):
        self.vertices = vertices

    def append(self, pt):
        if not isinstance(pt, Point2D):
            raise ValueError('Can only append Point2D instances.')
        max_length = type(self).vertices.max_length
        if max_length is not None and len(self.vertices) >= max_length:
            raise ValueError(f'Vertices length is at max ({max_length})')
        self.vertices.append(pt)

attempts = [
    lambda: Polygon(),
    lambda: Polygon(Point2D(-100, 0), Point2D(0, 1), Point2D(1, 0)),
    lambda: Polygon(Point2D(0, 0), 'oops', Point2D(1, 0)),
]
for attempt in attempts:
    try:
        attempt()
    except ValueError as ex:
        print('ValueError:', ex)

p = Polygon(Point2D(0, 0), Point2D(1, 0), Point2D(0, 1))
p.append(Point2D(10, 10))
print(p.vertices)
```

`append` needs to know the maximum length. It's configuration of the descriptor, so it reads it from the descriptor: `type(self).vertices` is a class access, which (because our `__get__` returns `self` when `instance is None`) gives back the `Point2DSequence` object. This is a good example of why that convention matters.

`self.vertices.append(pt)` bypasses `__set__`: it *reads* the list (via `__get__`) and mutates it. That's why `append` repeats the type and length checks itself.

## Specialized polygons through inheritance

Since the rules live in the descriptor, a subclass can change them by redefining just that one class attribute. Everything else (`__init__`, `append`) is inherited:

```python run
class Triangle(Polygon):
    vertices = Point2DSequence(min_length=3, max_length=3)

class Square(Polygon):
    vertices = Point2DSequence(min_length=4, max_length=4)

t = Triangle(Point2D(0, 0), Point2D(1, 0), Point2D(0, 1))
s = Square(Point2D(0, 0), Point2D(1, 0), Point2D(0, 1), Point2D(1, 1))
for shape in (t, s):
    try:
        shape.append(Point2D(10, 10))
    except ValueError as ex:
        print(f'{type(shape).__name__}: {ex}')

try:
    Triangle(Point2D(0, 0), Point2D(1, 0))
except ValueError as ex:
    print('ValueError:', ex)
```

Attribute lookup on `t` finds `Triangle.vertices` first in the MRO, so the triangle's own descriptor (and its limits) applies, and `type(self).vertices.max_length` in the inherited `append` picks it up too.

## Making `Polygon` a sequence

A few special methods turn `Polygon` into a proper sequence-like container: `len()`, indexing, slicing, iteration, `in` and `+=`:

```python run
class Polygon:
    vertices = Point2DSequence(min_length=3)

    def __init__(self, *vertices):
        self.vertices = vertices

    def append(self, pt):
        if not isinstance(pt, Point2D):
            raise ValueError('Can only append Point2D instances.')
        max_length = type(self).vertices.max_length
        if max_length is not None and len(self.vertices) >= max_length:
            raise ValueError(f'Vertices length is at max ({max_length})')
        self.vertices.append(pt)

    def __len__(self):
        return len(self.vertices)

    def __getitem__(self, idx):
        return self.vertices[idx]

    def __iadd__(self, pt):
        self.append(pt)
        return self

    def __contains__(self, pt):
        return pt in self.vertices

p = Polygon(Point2D(0, 0), Point2D(1, 0), Point2D(1, 1))
p += Point2D(10, 10)
print(len(p), p[0], p[1:3])
print(list(p))
print(Point2D(0, 0) in p)
```

Why is `Point2D(0, 0) in p` `False`? `in` compares with `==`, and `Point2D` doesn't define `__eq__`, so it inherits identity comparison from `object`. The new `Point2D(0, 0)` is a different object from the one stored in the polygon. Adding `__eq__` (and `__hash__`, so points stay usable in sets and as dict keys) fixes it:

```python run
def _eq(self, other):
    return isinstance(other, Point2D) and (self.x, self.y) == (other.x, other.y)

def _hash(self):
    return hash((self.x, self.y))

Point2D.__eq__ = _eq
Point2D.__hash__ = _hash

print(Point2D(0, 0) in p, Point2D(5, 5) in p)
print(Point2D(1, 1) == Point2D(1, 1), len({Point2D(1, 1), Point2D(1, 1)}))
```

(Here we attach the methods to the existing class to avoid repeating it; in real code you'd simply write them in the class body.)

<div class="takeaways">

## Key takeaways

- Descriptors can validate complex values: a whole sequence, its length and every element.
- Use `is not None` for optional bounds; a bound of `0` is falsy.
- Store a copy (`list(value)`) when you need a mutable, private container.
- Configuration lives on the descriptor and can be read via the class: `type(self).vertices.max_length`.
- Subclasses can change validation rules by redefining a single descriptor attribute.
- Mutating a value obtained via `__get__` (like `self.vertices.append`) doesn't call `__set__`, so re-check what needs checking.

</div>
