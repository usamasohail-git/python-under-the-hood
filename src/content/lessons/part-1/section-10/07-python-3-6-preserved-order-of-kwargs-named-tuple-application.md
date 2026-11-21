---
title: Python 3.6 - Preserved Order of kwargs - Named Tuple Application
summary: Because **kwargs now arrive in the caller's order, a single function call can define both a named tuple's fields and their defaults.
minutes: 10
---

## Ordered keyword arguments

PEP 468, accepted for Python 3.6, guarantees that the `**kwargs` dictionary a function receives lists the keyword arguments **in the order the caller wrote them**:

```python run
def fields(**kwargs):
    for name, value in kwargs.items():
        print(name, '=', value)

fields(zebra=1, apple=2, mango=3)
```

This is a separate promise from "dicts keep insertion order". A dict *could* keep insertion order while the interpreter still collected keyword arguments in some other order. PEP 468 pins down the argument side: the keywords are inserted into `kwargs` in call order.

Why does it matter? Before 3.6, a function that needed the *order* of its keyword arguments couldn't use `**kwargs` at all. It had to ask for something like a list of `(name, value)` pairs or an `OrderedDict`, which is much clumsier to call.

## Application: a named tuple factory with defaults

Recall how a named tuple class is created: you give it a name and an ordered sequence of field names. Defaults are a separate concern. Here's a helper that takes the field names **and** their default values in one go, as keyword arguments:

```python run
from collections import namedtuple

def defaulted_namedtuple(class_name, **fields):
    Struct = namedtuple(class_name, fields.keys())
    Struct.__new__.__defaults__ = tuple(fields.values())
    return Struct
```

Two things happen here:

1. `fields.keys()` gives the field names in the order they were passed, so the tuple's positions match the call.
2. A named tuple's constructor is its `__new__` function. Setting `__defaults__` on it gives **every** parameter a default, in the same order. (This is the same technique you can use on any function: `__defaults__` is the tuple of default values for the last positional parameters.)

```python run
Vector2D = defaulted_namedtuple(
    'Vector2D',
    x1=None, y1=None,
    x2=None, y2=None,
    origin_x=0, origin_y=0,
)

print(Vector2D._fields)
v1 = Vector2D(10, 10, 20, 20)
v1
```

The four values we passed filled `x1` to `y2`, and the two origin fields took their defaults. Keyword arguments work too:

```python run
Vector2D(1, 2, 3, 4, origin_y=-1)
```

This helper only works because the order of `fields` is the order of the call. If the keywords could be shuffled, `Vector2D(10, 10, 20, 20)` might assign `10` to `origin_y`, with no error to warn you.

## The modern way to do the same thing

Python 3.7 added the `defaults` parameter to `namedtuple` (see the 3.8 / 3.7 lesson), so the helper can be written without touching `__new__`:

```python run
def defaulted_namedtuple(class_name, **fields):
    return namedtuple(class_name, fields.keys(), defaults=fields.values())

Vector2D = defaulted_namedtuple('Vector2D', x1=None, y1=None, x2=None, y2=None,
                                origin_x=0, origin_y=0)
print(Vector2D(10, 10, 20, 20))
print(Vector2D._field_defaults)
```

And if you're happy to write a class, `typing.NamedTuple` reads even more naturally. It relies on the same idea: annotations in a class body are recorded in the order you write them.

```python run
from typing import NamedTuple

class Vector2D(NamedTuple):
    x1: float
    y1: float
    x2: float
    y2: float
    origin_x: float = 0
    origin_y: float = 0

Vector2D(10, 10, 20, 20)
```

<div class="callout tip">
<span class="callout-title">Try it</span>

Change the order of the keyword arguments in the `defaulted_namedtuple` call and look at `_fields` again. The fields follow your new order exactly.

</div>

<div class="takeaways">

## Key takeaways

- Since 3.6, `**kwargs` preserve the caller's order (PEP 468), separately from the dict ordering guarantee.
- That lets a function use keyword arguments as an **ordered** specification, for example field names plus defaults.
- `Struct.__new__.__defaults__ = tuple(...)` sets defaults on a named tuple class; since 3.7, `namedtuple(..., defaults=...)` does it directly.
- `typing.NamedTuple` is the class-based way to declare fields, types and defaults in order.

</div>
