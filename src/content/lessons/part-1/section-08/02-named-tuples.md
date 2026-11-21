---
title: Named Tuples
summary: "`collections.namedtuple` is a class factory: it builds a tuple subclass whose positions also have names, giving you readable records with a repr, equality and immutability for free."
minutes: 15
---

## The problem: positions or a class?

With a plain tuple, `pt = (10, 20)`, the distance from the origin is `sqrt(pt[0] ** 2 + pt[1] ** 2)`. That works, but a reader has to know that `0` means *x* and `1` means *y*. The compiler doesn't care; humans do.

The usual fix is a small class:

```python run
class Point3D:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

p1 = Point3D(10, 20, 30)
p2 = Point3D(10, 20, 30)
print(p1)
print(p1 == p2)
```

Now `p1.x` is readable, but look at what we *didn't* get: the repr is an unhelpful `<__main__.Point3D object at 0x...>`, and two points with identical coordinates compare **unequal** (the default `==` compares identity). To fix both you write `__repr__` and `__eq__` yourself. The instances are also mutable, which you may not want for a coordinate, and they can't be unpacked or iterated.

A **named tuple** combines the strengths of both: it *is* a tuple (immutable, indexable, iterable, unpackable), and each position also has a name.

## `namedtuple` is a class factory

`namedtuple` lives in the `collections` module. It isn't a type; it's a **function that creates a new class** and returns it. You give it two things: the name of the class to create and the field names, in the order the values will be stored.

```python run
from collections import namedtuple

Point2D = namedtuple('Point2D', ['x', 'y'])
print(Point2D)
print(type(Point2D))
print(Point2D.__mro__)
```

`Point2D` is an ordinary class (its type is `type`) and its parent is `tuple`. Calling it creates instances:

```python run
pt = Point2D(10, 20)
print(pt)
print(isinstance(pt, tuple))
```

<div class="callout note">
<span class="callout-title">Two different "Point2D"s</span>

In `Point2D = namedtuple('Point2D', ...)`, the string `'Point2D'` is the **class's name** (what its repr shows). The variable on the left is just a **label** that refers to the class object. They don't have to match:

```python run
Pt = namedtuple('Point2D', 'x y')
p = Pt(1, 2)
print(p, type(p).__name__)
```

This is no different from writing `Alias = SomeClass` after a `class` statement. Using the same name for both is simply less confusing, so that's the convention.

</div>

The generated class's constructor uses your field names as its **parameter names**, so keyword arguments work too:

```python run
print(Point2D(y=20, x=10))
```

## What you get for free

```python run
a = Point2D(10, 20)
b = Point2D(10, 20)
print(a)              # a useful repr
print(a == b)         # equality by value
print(max(a))         # it's a tuple, so any iterable tool works
x, y = a              # ...including unpacking
print(x, y)
```

Because named tuples are real tuples, functions written for plain sequences work on them without change. A dot product that works in any number of dimensions:

```python run
def dot_product(a, b):
    return sum(e1 * e2 for e1, e2 in zip(a, b))

print(list(zip(Point2D(1, 2), Point2D(10, 20))))
print(dot_product(Point2D(1, 2), Point2D(10, 20)))

Point4D = namedtuple('Point4D', 'i j k l')
print(dot_product(Point4D(1, 1, 1, 10), Point4D(2, 2, 2, 10)))
print(dot_product((1, 2, 3), (10, 20, 30)))     # plain tuples too
```

You couldn't do this with the `Point3D` class above without writing extra methods to make it iterable.

## Ways to specify the field names

The field names can be given as any sequence of strings, or as a **single string** with names separated by spaces and/or commas. Since any whitespace counts, even a multi-line string works:

```python run
Circle = namedtuple('Circle', ('center_x', 'center_y', 'radius'))
City = namedtuple('City', 'name country population')
Stock = namedtuple('Stock', 'symbol, year, month, day, open, high, low, close')
Stock2 = namedtuple('Stock2', '''symbol
                                 year month day
                                 open high low close''')

print(Circle(0, 0, 10))
print(City('New York', 'USA', 8_500_000))
print(Stock._fields == Stock2._fields)
```

## Accessing the data

By name, by index, by slice, by iteration, by unpacking: all of them work.

```python run
djia = Stock('DJIA', 2018, 1, 25, 26_313, 26_458, 26_260, 26_393)

print(djia.close, djia[7], djia[-1])
print(djia.high - djia.low)
print(djia[:4])            # a slice is a plain tuple

symbol, *_, close = djia
print(symbol, close)
```

Compare `djia.high - djia.low` with `djia[5] - djia[6]`: the first is self-documenting.

Named tuples are still immutable, so you can't assign to a field:

```python run
try:
    djia.close = 0
except AttributeError as ex:
    print('AttributeError:', ex)
```

## Valid field names and `rename`

Field names must be valid identifiers, can't be keywords, can't repeat, and, a `namedtuple`-specific rule, **can't start with an underscore** (the class reserves underscore names such as `_fields` for itself):

```python run
for fields in ['name age _ssn', 'name def', 'name name']:
    try:
        namedtuple('Person', fields)
    except ValueError as ex:
        print('ValueError:', ex)
```

Passing `rename=True` replaces each invalid name with an underscore followed by its **position**. Because user names can't start with `_`, these generated names can never collide with yours:

```python run
Person = namedtuple('Person', ['firstname', 'lastname', '_age', 'ssn'], rename=True)
eric = Person('Eric', 'Idle', 42, 'unknown')
print(eric)
print(Person._fields)
```

`_age` was at index 2, so it became `_2`. This is handy when field names come from data you don't control, such as the header row of a CSV file.

## Introspection: `_fields` and `_asdict()`

The field names are stored on the **class**, in the `_fields` tuple:

```python run
print(Point2D._fields)
print(Stock._fields)
```

An instance can convert itself to a dictionary with `_asdict()`:

```python run
print(eric._asdict())
print(type(eric._asdict()))
```

<div class="callout modern">
<span class="callout-title">Changes since older Python versions</span>

- **`_asdict()` returns a plain `dict`** since Python 3.8. In 3.1 to 3.7 it returned an `OrderedDict`. Regular dicts have kept insertion order since 3.7 (officially), so nothing is lost.
- **`_source` and `verbose=True` are gone.** Older notebooks show `print(Point2D._source)` to display the generated class's source code. That attribute was removed in Python 3.7, when the implementation stopped building the class from a source template. The idea is still accurate: the result behaves like a `class Point2D(tuple)` with `__slots__ = ()`, a `__new__` taking your field names, a `__repr__`, and one read-only accessor per field.
- **Field accessors** are now small C-level descriptors (`collections._tuplegetter`, since 3.8) instead of `property(itemgetter(i))`, which makes attribute access faster.

</div>

```python run
print(Point2D.__slots__)
print(type(Point2D.x))
print(Point2D.__new__.__doc__)
```

## Is there overhead?

Very little. The field names live on the class, not on each instance, and `__slots__ = ()` means instances have no per-instance `__dict__`. An instance is laid out just like a plain tuple:

```python run
import sys
print(sys.getsizeof((10, 20)), sys.getsizeof(Point2D(10, 20)))
print(hasattr(Point2D(10, 20), '__dict__'))
```

Indexing, slicing and iteration cost the same as for a tuple; name lookup costs about the same as an attribute lookup on any class.

## Modern alternative: `typing.NamedTuple`

Since Python 3.6 you can declare the same kind of class with ordinary `class` syntax and type annotations. The result is still a `tuple` subclass with exactly the features above:

```python run
from typing import NamedTuple

class Point3D(NamedTuple):
    x: float
    y: float
    z: float

p = Point3D(1, 2, 3)
print(p, isinstance(p, tuple), Point3D._fields)
```

The annotations are documentation for readers and type checkers; they aren't enforced at run time (`Point3D('a', 2, 3)` works). You'll see in the following lessons that this form also makes docstrings, defaults and methods easier to add.

<div class="takeaways">

## Key takeaways

- `namedtuple(typename, field_names)` is a **class factory**: it returns a new subclass of `tuple`.
- Instances can be used as tuples (indexing, slicing, iterating, unpacking) **and** by field name.
- You get a readable `__repr__`, value-based `==`, and immutability without writing any code.
- Field names: any sequence of strings, or one string separated by spaces/commas. No leading underscores; `rename=True` fixes invalid names by position.
- `_fields` lists the names (on the class); `_asdict()` returns a regular `dict` (3.8+).
- `typing.NamedTuple` is the modern class-syntax way to define the same thing.

</div>
