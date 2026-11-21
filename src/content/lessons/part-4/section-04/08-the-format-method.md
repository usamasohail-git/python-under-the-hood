---
title: The __format__ Method
summary: "`format(obj, spec)` and the part after the colon in `f'{obj:spec}'` call `__format__`, which lets a class interpret its own format specifications, usually by delegating to the formatting of the values it holds."
minutes: 11
---

## The third string conversion

Besides `repr()` and `str()`, there's a third way to turn an object into a string: `format(value, format_spec)`. The *format specification* is a small string that says how the value should look:

```python run
from datetime import datetime

a = 0.1
print(format(a, '.20f'))         # 20 decimal places: floats aren't exact!
print(format(1234567, ','))      # thousands separator
print(format(255, '#x'))         # hexadecimal with prefix
print(format('hi', '*^10'))      # centered, padded with *

d = datetime(2019, 6, 13, 3, 43)
print(format(d, '%a %Y-%m-%d  %I:%M %p'))
```

Each type interprets the spec in its own way. Numbers and strings share the *format specification mini-language* (alignment, width, precision, `,`, `x`, …), while `datetime` treats its spec as a `strftime` pattern. That's possible because `format(value, spec)` simply calls `type(value).__format__(value, spec)` and lets the type decide.

## You use it all the time

The part after the colon in an f-string or a `str.format()` field is a format spec, passed straight to `__format__`:

```python run
print(f'{a:.3f} | {1234567:,} | {d:%B %d, %Y}')
print('{:>8.2f}|'.format(3.14159))
```

A conversion flag (`!r`, `!s`) comes *before* the colon and is applied first. So `f'{x!r:>20}'` takes `repr(x)` and then right-aligns that string in 20 characters:

```python run
print(f'[{"hi"!r:>8}]  [{"hi":>8}]')
```

## The default `__format__`

If a class doesn't define `__format__`, it inherits `object.__format__`, which does just one thing: with an empty spec, it returns `str(self)`. Any other spec is an error, because `object` has no idea what it would mean:

```python run
class Person:
    def __init__(self, name):
        self.name = name
    def __str__(self):
        return f'Person({self.name})'

p = Person('Alex')
print(format(p))                 # spec defaults to ''
print(f'{p}')                    # same: f'{p}' is format(p, '')
try:
    f'{p:>20}'
except TypeError as ex:
    print('TypeError:', ex)
```

This is the full story behind "f-strings use `__str__`": an f-string calls `format(p, '')`, and the default `__format__` turns that into `str(p)`. If you want `{p:>20}` to work on the string form, you can write `{p!s:>20}`, which formats the *string* instead of the object.

## Implementing `__format__`

`__format__(self, format_spec)` receives the spec as a string (possibly empty) and must return a string. Writing a full parser for a mini-language is a lot of work, so the usual approach is to **delegate**: pass the spec on to `format()` of a value your object holds.

Here, a `Person`'s spec is used to format its date of birth:

```python run
from datetime import date

class Person:
    def __init__(self, name, dob):
        self.name = name
        self.dob = dob

    def __repr__(self):
        return f'Person(name={self.name!r}, dob={self.dob!r})'

    def __str__(self):
        return f'Person({self.name})'

    def __format__(self, date_format_spec):
        print(f'  __format__ called with {date_format_spec!r}')
        dob = format(self.dob, date_format_spec)
        return f'Person(name={self.name}, dob={dob})'

p = Person('Alex', date(1900, 10, 20))
print(str(p))
print(repr(p))
print(format(p, '%B %d, %Y'))
print(format(p))
print(f'{p:%d/%m/%Y}')
```

With an empty spec, `format(self.dob, '')` falls back to `str(self.dob)`, giving the ISO date. Notice that once you define `__format__`, plain `f'{p}'` goes through **your** method, not `__str__`. If you want the two to agree, return `str(self)` when the spec is empty.

## Applying a spec to each component

Another common pattern: a container-like object applies the spec to each of its values. This gives a `Vector` all of the float formatting options for free:

```python run
class Vector:
    def __init__(self, *components):
        self.components = components

    def __str__(self):
        return f'({", ".join(str(c) for c in self.components)})'

    def __format__(self, spec):
        if not spec:
            return str(self)
        return f'({", ".join(format(c, spec) for c in self.components)})'

v = Vector(1, 2.5, -3.14159)
print(f'{v}')
print(f'{v:.2f}')
print(f'{v:+08.3f}')
print(f'{v:.1%}')
try:
    f'{v:%Y}'
except ValueError as ex:
    print('ValueError:', ex)
```

An invalid spec is reported by the delegated `format()` call, with the error raised by the component's own type (here the `int` 1, the first component). You can also invent your own codes: for instance, check whether the spec ends in `'p'` and render polar coordinates, delegating the rest of the spec to the numbers.

<div class="callout modern">
<span class="callout-title">`datetime.utcnow()` is deprecated</span>

Older notebooks get "now" with `datetime.utcnow()`. Since Python 3.12 that method is deprecated, because it returns a *naive* datetime that doesn't know it's in UTC. Use `datetime.now(timezone.utc)` (with `from datetime import timezone`) instead. Formatting it works exactly the same way.

</div>

<div class="takeaways">

## Key takeaways

- `format(obj, spec)`, `f'{obj:spec}'` and `'{:spec}'.format(obj)` all call `type(obj).__format__(obj, spec)`.
- Each type defines its own spec language: the mini-language for numbers and strings, `strftime` codes for dates.
- `object.__format__` returns `str(self)` for an empty spec and raises `TypeError` for anything else.
- Conversion flags run first: `f'{x!r:>20}'` formats the `repr` string.
- Implement `__format__` by delegating the spec to the values your object holds, and make it return a string.

</div>
