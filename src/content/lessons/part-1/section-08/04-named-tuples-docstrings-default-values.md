---
title: Named Tuples - Docstrings, Default Values
summary: "Document a named tuple class and its fields, and give fields default values with the `defaults` parameter, a prototype instance, or `__new__.__defaults__`."
minutes: 12
---

## Docstrings

A generated named tuple class already has docstrings, but they aren't very informative: the class's just repeats its signature, and each field's only says which position it stands for:

```python run
from collections import namedtuple

Point2D = namedtuple('Point2D', 'x y')
print(Point2D.__doc__)
print(Point2D.x.__doc__)
```

Both are writable, so you can replace them with something useful. The class docstring is the class's `__doc__`; each field accessor (`Point2D.x`, `Point2D.y`) is an object on the class with its own `__doc__`:

```python run
Point2D.__doc__ = 'Represents a 2D Cartesian coordinate'
Point2D.x.__doc__ = 'x-coordinate'
Point2D.y.__doc__ = 'y-coordinate'

print(Point2D.__doc__)
print(Point2D.x.__doc__)
```

These are exactly what `help()` and IDEs display. Below is part of the `help()` text (captured with `pydoc` so it prints here). Recent Python versions print the signature line `Point2D(x, y)` above your docstring, followed by the field docstrings further down:

```python run
import pydoc
text = pydoc.render_doc(Point2D, renderer=pydoc.plaintext)
lines = text.splitlines()
print('\n'.join(lines[2:5]))
print('\n'.join(line for line in lines if 'coordinate' in line))
```

Note that you set the field docstrings on the **class** (`Point2D.x`), not on an instance: `pt.x` is just the stored value.

## Default values

All fields of a plain `namedtuple` are required:

```python run
Vector = namedtuple('Vector', 'x1 y1 x2 y2 origin_x origin_y')
try:
    Vector(1, 1, 10, 10)
except TypeError as ex:
    print('TypeError:', ex)
```

Suppose most vectors start at the origin, so `origin_x` and `origin_y` should default to 0. There are three ways to arrange that.

### 1. The `defaults` parameter (Python 3.7+)

`namedtuple` accepts a `defaults` iterable. Like function defaults, they apply to the **rightmost** fields: line up the defaults under the field names from the right.

```python run
Vector = namedtuple('Vector', 'x1 y1 x2 y2 origin_x origin_y', defaults=(0, 0))

print(Vector(1, 1, 10, 10))
print(Vector(1, 1, 10, 10, -5, -5))
print(Vector._field_defaults)
```

This is the approach to use today. The defaults are recorded in `_field_defaults` (a dict), which makes them easy to inspect.

<div class="callout modern">
<span class="callout-title">Older notebooks don't have <code>defaults</code></span>

The `defaults` parameter was added in Python 3.7. Material written for 3.6 shows the two techniques below instead. Both still work, and both are worth understanding because they teach something about how Python works, but on 3.7+ `defaults=` is simpler and keeps `_field_defaults` accurate.

</div>

### 2. A prototype instance

Create one instance that holds the default values (using placeholders such as `None` for the rest), then build new records from it with `_replace`:

```python run
Vector = namedtuple('Vector', 'x1 y1 x2 y2 origin_x origin_y')

vector_zero_origin = Vector(x1=None, y1=None, x2=None, y2=None, origin_x=0, origin_y=0)
v1 = vector_zero_origin._replace(x1=1, y1=1, x2=10, y2=10)
v1
```

This is flexible (you can keep several prototypes with different defaults), but forgetting to replace a placeholder silently leaves a `None` in your record, and you have to create instances through the prototype instead of the class.

### 3. Setting `__new__.__defaults__`

Recall from the functions section that a function's default values are stored in its `__defaults__` tuple, and that this attribute is writable:

```python run
def func(a, b=20, c=30):
    print(a, b, c)

print(func.__defaults__)
func.__defaults__ = (200, 300)
func(10)
```

The constructor of a named tuple class is its `__new__` method, which is an ordinary Python function whose parameters are the field names. So setting **its** `__defaults__` gives the class default values:

```python run
Vector = namedtuple('Vector', 'x1 y1 x2 y2 origin_x origin_y')
Vector.__new__.__defaults__ = (0, 0)

print(Vector(5, 5, 20, 20))
print(Vector(x1=1, y1=1, x2=10, y2=10))
```

The same right-alignment rule applies. To give **every** field the same default, repeat it once per field:

```python run
Vector.__new__.__defaults__ = (0,) * len(Vector._fields)
print(Vector())
```

<div class="callout note">
<span class="callout-title">The back door doesn't update <code>_field_defaults</code></span>

Assigning `__new__.__defaults__` changes the behavior of the constructor, but the class's `_field_defaults` dict isn't told about it:

```python run
print(Vector._field_defaults)
```

Tools that rely on `_field_defaults` will think there are no defaults. Another reason to prefer `defaults=` when you can.

</div>

<div class="callout tip">
<span class="callout-title">No mutable defaults</span>

The usual warning from the functions section applies here too: a default is created **once** and shared by every instance that uses it. `defaults=([],)` would give every record the *same* list. Use immutable defaults such as numbers, strings, `None` or tuples.

</div>

## Modern alternative: `typing.NamedTuple`

With class syntax, docstrings and defaults are written exactly where you'd expect them, and you can add methods too:

```python run
from typing import NamedTuple
from math import hypot

class Vector2(NamedTuple):
    """A 2D vector from an origin point to an end point."""
    x: float
    y: float
    origin_x: float = 0
    origin_y: float = 0

    def length(self):
        return hypot(self.x - self.origin_x, self.y - self.origin_y)

v = Vector2(3, 4)
print(v, v.length())
print(Vector2.__doc__)
print(Vector2._field_defaults)
print(isinstance(v, tuple))
```

As with functions, once one field has a default, every field after it needs one too; otherwise the class definition fails with a `TypeError`. (Per-field docstrings still have to be set afterwards, e.g. `Vector2.x.__doc__ = '...'`.)

<div class="takeaways">

## Key takeaways

- A named tuple's class docstring (`Cls.__doc__`) and each field's docstring (`Cls.field.__doc__`) can be assigned; `help()` shows them.
- Defaults apply to the **rightmost** fields, just like function defaults.
- On Python 3.7+, use `namedtuple(..., defaults=(...))`; inspect them with `_field_defaults`.
- Older techniques: a prototype instance plus `_replace`, or assigning `Cls.__new__.__defaults__` (which doesn't update `_field_defaults`).
- Never use mutable default values.
- `typing.NamedTuple` lets you write docstrings, defaults and methods in normal class syntax.

</div>
