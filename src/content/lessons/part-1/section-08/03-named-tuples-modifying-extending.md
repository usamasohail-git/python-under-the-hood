---
title: Named Tuples - Modifying, Extending
summary: "You can't change a named tuple, but you can build a modified copy with `_replace`, and create an extended class from an existing one's `_fields`."
minutes: 12
---

## "Modifying" means making a new tuple

A named tuple is a tuple, so it's immutable. "Changing" one works the same way as "changing" a string: you build a **new** object with the values you want and re-bind the name to it.

```python run
from collections import namedtuple

Point2D = namedtuple('Point2D', 'x y')
pt = Point2D(10, 0)

try:
    pt.x = 0
except AttributeError as ex:
    print('AttributeError:', ex)

print(hex(id(pt)))
pt = Point2D(0, pt.y)       # new x, keep the old y
print(pt, hex(id(pt)))
```

Different id: `pt` now refers to a different object. With two fields that's painless. With eight, it isn't:

```python run
Stock = namedtuple('Stock', 'symbol year month day open high low close')
djia = Stock('DJIA', 2018, 1, 25, 26_313, 26_458, 26_260, 26_393)

# change only the close price... by retyping everything else
djia = Stock(djia.symbol, djia.year, djia.month, djia.day,
             djia.open, djia.high, djia.low, 26_394)
djia
```

Tedious, and easy to get wrong. Let's look for something better.

## Attempt 1: unpacking

If the field you want to change is the last one, extended unpacking plus argument unpacking does the job:

```python run
*values, _ = djia        # everything except close, as a list
print(values)
djia = Stock(*values, 26_393)
djia
```

But a field in the middle can't be isolated this way. `*before, day, *after = djia` is rejected before it even runs, because two starred names would be ambiguous:

```python run
try:
    compile('*before, day, *after = djia', '<test>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

## Attempt 2: slicing

Slicing a named tuple returns a plain tuple, and tuples can be concatenated:

```python run
new_values = djia[:3] + (26,) + djia[4:]      # replace day (index 3)
print(new_values)
print(Stock(*new_values))
```

Instead of unpacking into the constructor, the class method `_make` accepts any iterable directly:

```python run
print(Stock._make(new_values))
print(Stock._make(['AAPL', 2018, 1, 25, 170, 171, 169, 170.5]))
```

Now change two fields in the middle, year (index 1) and day (index 3):

```python run
new_values = djia[:1] + (2019,) + djia[2:3] + (26,) + djia[4:]
Stock._make(new_values)
```

It works, but you have to count indices, and nobody reading it can tell what changed.

## The right way: `_replace`

Every named tuple has a `_replace` method. It takes **keyword arguments** named after fields and returns a **copy** with just those fields replaced:

```python run
djia2 = djia._replace(year=2019, day=26)
print(djia2)
print(djia)                       # the original is untouched
print(djia2 is djia)
```

Readable, no index arithmetic, and any number of fields at once. A misspelled field name is caught immediately:

```python run
try:
    djia._replace(dya=26)
except TypeError as ex:
    print('TypeError:', ex)
```

(Before Python 3.13 this raised a `ValueError` instead of a `TypeError`. If you write code that must run on older versions too, catch both.)

<div class="callout modern">
<span class="callout-title">New in Python 3.13: copy.replace()</span>

Python 3.13 added a general-purpose `copy.replace(obj, **changes)` function. Named tuples support it (they now define `__replace__`), as do dataclasses, `datetime` objects and others. It's the same operation as `_replace`, with one spelling for all these types:

```python run
import copy
copy.replace(djia, close=27_000)
```

</div>

## Extending a named tuple

Sometimes you want a new record type with all the fields of an existing one plus a few more, say, `Stock` plus `previous_close`. You might reach for inheritance, but subclassing a tuple to add *fields* is awkward (the storage is fixed in `__new__`). If all you need is more data fields, build a new named tuple from the old one's `_fields`:

```python run
print(Stock._fields)

StockExt = namedtuple('StockExt', Stock._fields + ('previous_close',))
print(StockExt._fields)
```

`_fields` is a tuple of strings, which is a valid field-name sequence, so tuple concatenation is all it takes. (If you prefer strings, `' '.join(Stock._fields) + ' previous_close'` works too.)

To upgrade an existing `Stock` instance, unpack it into the new constructor, or concatenate and use `_make`:

```python run
djia_ext = StockExt(*djia, 25_000)
print(djia_ext)
print(StockExt._make(djia + (25_000,)) == djia_ext)
```

<div class="callout note">
<span class="callout-title">Equality between different named tuple classes</span>

Named tuples inherit `==` from `tuple`, which compares **values only**, not the class. So `Point2D(1, 2) == (1, 2)` is `True`, and so is a comparison between two unrelated named tuple classes with the same values:

```python run
Vector2D = namedtuple('Vector2D', 'dx dy')
print(Point2D(1, 2) == (1, 2), Point2D(1, 2) == Vector2D(1, 2))
```

Keep this in mind if you use named tuples as dictionary keys or in sets: a `Point2D` and a plain tuple with the same values are the same key.

</div>

## Modern alternative: frozen dataclasses

If you want a record that is immutable but **not** a tuple, `dataclasses` (Python 3.7+) gives you `frozen=True` and `dataclasses.replace`. Inheritance is the natural way to add fields there:

```python run
from dataclasses import dataclass, replace, FrozenInstanceError

@dataclass(frozen=True)
class Point:
    x: int
    y: int

@dataclass(frozen=True)
class Point3(Point):
    z: int = 0

p = Point(1, 2)
try:
    p.x = 10
except FrozenInstanceError as ex:
    print('FrozenInstanceError:', ex)

print(replace(p, x=10))
print(Point3(1, 2, 3))
print(Point(1, 2) == (1, 2))      # dataclasses compare only with their own class
```

The trade-off: a dataclass instance is not a sequence, so it can't be indexed, unpacked or passed to code expecting a tuple. Choose a named tuple when tuple behavior is useful, and a dataclass when you want a regular class with less boilerplate (and, with `frozen=False`, a mutable one).

<div class="takeaways">

## Key takeaways

- Named tuples are immutable: "modifying" one means creating a new instance.
- Slicing and unpacking can build the new values, but get unreadable quickly.
- `Cls._make(iterable)` builds an instance from any iterable.
- `instance._replace(field=value, ...)` is the clean way to get a modified copy. In 3.13, `copy.replace()` does the same.
- To extend, create a new class from `Old._fields + ('new_field',)`, then convert with `New(*old, extra)` or `New._make(old + (extra,))`.
- Named tuples compare equal to any tuple with the same values; frozen dataclasses don't.

</div>
