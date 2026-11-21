---
title: Custom JSON Encoding
summary: Pass a default function to dumps to serialize types JSON doesn't support, and organize it as a single-dispatch generic function as the number of types grows.
minutes: 15
---

## The problem: a datetime in a log record

Dates and times are everywhere in real data, and JSON has no type for them:

```python run
import json
from datetime import datetime

current = datetime(2024, 3, 15, 22, 26, 35, 671836)
try:
    json.dumps({'time': current, 'message': 'testing'})
except TypeError as ex:
    print('TypeError:', ex)
```

We have to choose a text representation. The usual choice is **ISO 8601**: `YYYY-MM-DDTHH:MM:SS`, optionally with fractional seconds and a UTC offset. It sorts correctly as text, is unambiguous, and nearly every language can parse it. `datetime` objects produce it with `isoformat()` (unlike `str()`, which uses a space instead of the `T`):

```python run
print(str(current))
print(current.isoformat())
print(current.isoformat(timespec='seconds'))   # drop the fractional part
print(current.strftime('%Y-%m-%dT%H:%M:%S'))  # same thing, spelled out
```

<div class="callout modern">
<span class="callout-title">Prefer aware datetimes</span>

Older code uses `datetime.utcnow()` to get "now in UTC". It returns a *naive* datetime (no time zone attached), which is easy to misinterpret, and it's **deprecated since Python 3.12**. Use `datetime.now(timezone.utc)` instead; its `isoformat()` ends in `+00:00`, so the serialized value says which time zone it's in. The examples here use fixed datetimes so the output is reproducible.

</div>

```python run
from datetime import timezone
print(datetime(2024, 3, 15, 22, 26, 35, tzinfo=timezone.utc).isoformat())
```

We could call `.isoformat()` ourselves before every `dumps`, but our data normally *contains* `datetime` objects, often deep inside nested structures. We want `dumps` to do the conversion for us.

## The default argument

`dump` and `dumps` accept a `default` callable. Whenever the encoder meets an object it doesn't know how to serialize, it calls `default(obj)` and serializes **whatever that returns** instead. The return value can be anything JSON-serializable: a string, a number, a list, a dict.

```python run
def format_iso(dt):
    return dt.isoformat()

log_record = {
    'time1': datetime(2024, 3, 15, 22, 26, 35),
    'time2': datetime(2024, 3, 15, 22, 27, 0),
    'message': 'Testing...',
}
json.dumps(log_record, default=format_iso)
```

`default` is only called for objects the encoder can't already handle. Strings, numbers and the rest never reach it, so `format_iso` is only ever handed datetimes... until something else unsupported appears:

```python run
log_record = {
    'time': datetime(2024, 3, 15, 22, 26, 35),
    'message': 'Testing...',
    'other': {'a', 'b', 'c'},
}
try:
    json.dumps(log_record, default=format_iso)
except AttributeError as ex:
    print('AttributeError:', ex)
```

The encoder passed the set to `format_iso`, which had no idea what to do with it.

## A dispatching default function

The fix is to check the type and handle each case. The important rule: if you **don't** recognize the object, **raise `TypeError`**. That's what the encoder itself does, and it keeps errors loud. If your function just falls off the end, it returns `None`, and the unknown object is silently written as `null`:

```python run
def sloppy(arg):
    if isinstance(arg, datetime):
        return arg.isoformat()

print(json.dumps({'x': 1 + 2j}, default=sloppy))   # data silently lost!
```

```python run
def custom_json_formatter(arg):
    if isinstance(arg, datetime):
        return arg.isoformat()
    if isinstance(arg, (set, frozenset)):
        return sorted(arg)
    raise TypeError(f'Object of type {type(arg).__name__} is not JSON serializable')

print(json.dumps(log_record, default=custom_json_formatter))
try:
    json.dumps({'x': 1 + 2j}, default=custom_json_formatter)
except TypeError as ex:
    print('TypeError:', ex)
```

(Sorting the set gives stable output; `list(arg)` would also work, in arbitrary order.)

## Custom objects

Now add our own class. One approach is a convention: if an object has a `toJSON()` method, call it; otherwise fall back to its attribute dictionary, `vars(obj)`. A `Point` doesn't need any special support then:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
        self.create_dt = datetime(2024, 1, 1, 9, 0, 0)

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'

    def toJSON(self):
        return {'name': self.name, 'age': self.age, 'created': self.create_dt}


class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Point(x={self.x}, y={self.y})'


def custom_json_formatter(arg):
    if isinstance(arg, datetime):
        return arg.isoformat()
    if isinstance(arg, (set, frozenset)):
        return sorted(arg)
    if hasattr(arg, 'toJSON'):
        return arg.toJSON()
    try:
        return vars(arg)
    except TypeError:
        raise TypeError(f'Object of type {type(arg).__name__} is not JSON serializable') from None


log_record = {
    'time': datetime(2024, 3, 15, 22, 26, 35),
    'message': 'Created new point',
    'point': Point(10, 10),
    'created_by': Person('Python', 27),
}
print(json.dumps(log_record, default=custom_json_formatter, indent=2))
```

Notice something subtle: `Person.toJSON()` returned a dictionary that still contained a **`datetime`**, and that worked. Whatever `default` returns is serialized with the same rules, so the encoder called our function again for the nested datetime. Each type only needs to know how to convert *itself* one level down; recursion takes care of the rest.

`vars()` raises `TypeError` for objects without a `__dict__` (like `complex` or `Decimal`), so those still fail loudly.

## Single dispatch

A chain of `isinstance` checks grows awkward as you support more types, and every new type means editing the function. This is exactly what `functools.singledispatch` (from Part 1) is for: a **generic function** that picks an implementation based on the type of its first argument. The undecorated function is the fallback, and each `register` adds a case:

```python run
from functools import singledispatch
from decimal import Decimal
from fractions import Fraction

@singledispatch
def json_format(arg):
    print(f'  fallback for {arg!r}')
    if hasattr(arg, 'toJSON'):
        return arg.toJSON()
    try:
        return vars(arg)
    except TypeError:
        return str(arg)          # last resort: the string representation

@json_format.register
def _(arg: datetime):
    return arg.isoformat()

@json_format.register(set)
@json_format.register(frozenset)
def _(arg):
    return sorted(arg)

@json_format.register
def _(arg: Decimal):
    return f'Decimal({arg})'

print(json.dumps(
    {'a': 1 + 1j, 'b': Decimal('0.5'), 'c': Fraction(1, 3), 'p': Person('Python', 27),
     'tags': {'z', 'y'}},
    default=json_format,
))
```

Read the printed lines: the fallback ran for the complex number, the fraction and the person (once each), while `Decimal`, `set` and the person's nested `datetime` went straight to their registered implementations. This version deliberately falls back to `str()` instead of raising, so every object can be written. That's convenient for logging, but the result can't be loaded back into the original types; decide which behavior your application needs.

Registering a new type is now a separate, local change, and it can even happen in another module:

```python run
@json_format.register
def _(arg: Fraction):
    return {'numerator': arg.numerator, 'denominator': arg.denominator}

json.dumps({'share': Fraction(1, 8)}, default=json_format)
```

<div class="callout modern">
<span class="callout-title">Registering with annotations</span>

Since Python 3.7, `register` can read the type from the first parameter's annotation (`def _(arg: datetime)`) instead of taking it as an argument. Since Python 3.11 the annotation may also be a union, so `def _(arg: set | frozenset)` registers both types at once.

</div>

## Recursion in action

To see that `default` really is applied recursively, nest unsupported objects inside each other:

```python run
print(json.dumps({'pt': Point(Person('Python', 27), 2 + 2j)}, default=json_format, indent=2))
```

The `Point` became its `vars()` dict; inside it, the `Person` used `toJSON()`, whose `datetime` was formatted by its registered function, and the complex number fell back to `str()`.

<div class="takeaways">

## Key takeaways

- `dumps(obj, default=fn)` calls `fn` for every object the encoder doesn't support and serializes the returned value instead.
- `default` is never called for types JSON already handles (str, int, float, bool, None, list, tuple, dict).
- Return value is serialized recursively, so it may itself contain objects that need `default`.
- Raise `TypeError` for types you don't handle; returning `None` silently writes `null`.
- ISO 8601 (`isoformat()`) is the standard text form for dates and times; prefer aware datetimes over the deprecated `utcnow()`.
- `functools.singledispatch` turns the type checks into a clean, extensible generic function.

</div>
