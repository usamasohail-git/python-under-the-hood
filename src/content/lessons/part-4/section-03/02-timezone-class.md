---
title: TimeZone Class
summary: A small TimeZone class with validated input, read-only name and offset properties, value-based equality and a helpful repr.
minutes: 14
---

## What a time zone needs

Each account has a preferred time zone, and the confirmation-code parser needs one to display times. All we need to know about a time zone is:

- a **name**, like `'MST'`
- an **offset** from UTC, like -7 hours, or -2 hours 15 minutes

The standard library's `datetime.timezone` could hold this too, but writing our own small class is a good warm-up in properties and validation, and it gives us exactly the interface we want.

The offset will be stored as a `timedelta`, because then converting a UTC time is just addition: `dt_utc + tz.offset`. Callers, though, think in "hours and minutes", so the initializer takes those separately and combines them.

## timedelta and signs

Before writing the class, check how `timedelta` combines hours and minutes. It simply **adds** them:

```python run
from datetime import timedelta

print(timedelta(hours=-2, minutes=-15))   # -2:15
print(timedelta(hours=-2, minutes=15))    # -1:45, not -2:15!
print(timedelta(hours=5, minutes=30))     # +5:30 (e.g. India)
```

A negative `timedelta` prints in a slightly odd normalized form (`-1 day, 21:45:00` means "minus 2 hours 15 minutes"), but the arithmetic is right. The thing to remember is that for a negative offset, **both** parts must be negative. We'll document that rather than try to guess what the caller meant.

## Validation

What can go wrong when someone creates a time zone?

- The name is `None`, empty or only whitespace.
- The hours or minutes aren't integers. `numbers.Integral` accepts `int` (and anything registered as an integral type), while rejecting `1.5` or `'3'`.
- The minutes are outside -59...59.
- The combined offset is outside the range real time zones use: -12:00 to +14:00.

Every check raises `ValueError` with a clear message. Since nothing in an account should be able to change a time zone afterwards, `name` and `offset` are **read-only properties**: there's a getter and no setter, backed by "private" `_name` and `_offset` attributes.

```python run
import numbers
from datetime import timedelta


class TimeZone:
    def __init__(self, name, offset_hours, offset_minutes):
        if name is None or len(str(name).strip()) == 0:
            raise ValueError('Timezone name cannot be empty.')
        self._name = str(name).strip()

        if not isinstance(offset_hours, numbers.Integral):
            raise ValueError('Hour offset must be an integer.')
        if not isinstance(offset_minutes, numbers.Integral):
            raise ValueError('Minutes offset must be an integer.')
        if offset_minutes < -59 or offset_minutes > 59:
            raise ValueError('Minutes offset must be between -59 and 59 (inclusive).')

        offset = timedelta(hours=offset_hours, minutes=offset_minutes)
        if offset < timedelta(hours=-12) or offset > timedelta(hours=14):
            raise ValueError('Offset must be between -12:00 and +14:00.')

        self._offset_hours = offset_hours
        self._offset_minutes = offset_minutes
        self._offset = offset

    @property
    def offset(self):
        return self._offset

    @property
    def name(self):
        return self._name
```

The name is stored before the offsets are checked, but that's harmless: if `__init__` raises, the half-built object is simply discarded and the caller never gets a reference to it. No invalid `TimeZone` can escape.

```python run
tz1 = TimeZone('ABC', -2, -15)
print(tz1.name, tz1.offset)

for args in [('', 0, 0), ('X', 1.5, 0), ('X', 0, 75), ('X', -13, 0)]:
    try:
        TimeZone(*args)
    except ValueError as ex:
        print(args, '->', ex)
```

The properties really are read-only:

```python run
try:
    tz1.name = 'XYZ'
except AttributeError as ex:
    print('AttributeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Python 3.11+ error message</span>

Older Python versions report assigning to a getter-only property as `can't set attribute`. Since 3.11 the message names the property and the class: `property 'name' of 'TimeZone' object has no setter`.

</div>

Using the offset is just addition. Here's the current UTC time converted to our made-up zone:

```python run
from datetime import datetime, timezone

now_utc = datetime.now(timezone.utc)
print(now_utc)
print(now_utc + tz1.offset)
```

<div class="callout modern">
<span class="callout-title">Don't use utcnow()</span>

Older code gets the current UTC time with `datetime.utcnow()`. It returns a *naive* datetime (no `tzinfo`), which is easy to mix up with local time, and it's deprecated since Python 3.12. Use `datetime.now(timezone.utc)` (or `datetime.now(datetime.UTC)` on 3.11+), which returns an *aware* datetime.

</div>

## Equality and repr

Two `TimeZone` objects with the same name and offset should be considered equal: we'll want that for tests, and for comparing an account's time zone to an expected one. By default, `==` on instances of your own class falls back to identity:

```python run
TimeZone('ABC', -1, -30) == TimeZone('ABC', -1, -30)
```

We'll also want a readable representation instead of `<__main__.TimeZone object at 0x...>`. Special methods like these are the topic of the next section; for now, `__eq__` decides what `==` means and `__repr__` what the REPL shows. Here is the complete class:

```python run
import itertools
import numbers
from collections import namedtuple
from datetime import datetime, timedelta, timezone

class TimeZone:
    def __init__(self, name, offset_hours, offset_minutes):
        if name is None or len(str(name).strip()) == 0:
            raise ValueError('Timezone name cannot be empty.')
        self._name = str(name).strip()

        if not isinstance(offset_hours, numbers.Integral):
            raise ValueError('Hour offset must be an integer.')
        if not isinstance(offset_minutes, numbers.Integral):
            raise ValueError('Minutes offset must be an integer.')
        if offset_minutes < -59 or offset_minutes > 59:
            raise ValueError('Minutes offset must be between -59 and 59 (inclusive).')

        offset = timedelta(hours=offset_hours, minutes=offset_minutes)
        # real-world UTC offsets range from -12:00 to +14:00
        if offset < timedelta(hours=-12) or offset > timedelta(hours=14):
            raise ValueError('Offset must be between -12:00 and +14:00.')

        self._offset_hours = offset_hours
        self._offset_minutes = offset_minutes
        self._offset = offset

    @property
    def offset(self):
        return self._offset

    @property
    def name(self):
        return self._name

    def __eq__(self, other):
        return (isinstance(other, TimeZone) and
                self.name == other.name and
                self._offset_hours == other._offset_hours and
                self._offset_minutes == other._offset_minutes)

    def __repr__(self):
        return (f"TimeZone(name='{self.name}', "
                f"offset_hours={self._offset_hours}, "
                f"offset_minutes={self._offset_minutes})")
```

```python run
tz1 = TimeZone('ABC', -1, -30)
tz2 = TimeZone('ABC', -1, -30)
tz3 = TimeZone('ABC', 1, 30)

print(tz1 == tz2, tz1 is tz2, tz1 == tz3, tz1 == 'ABC')
tz1
```

`__eq__` checks `isinstance` first, so comparing with something that isn't a `TimeZone` (like the string `'ABC'`) is simply `False` rather than an `AttributeError`.

<div class="callout note">
<span class="callout-title">Equality removes hashability</span>

Defining `__eq__` without `__hash__` makes instances **unhashable**: Python sets `__hash__` to `None`, because objects that compare equal must have equal hashes and the default identity-based hash would break that rule. So `TimeZone` objects can't be dictionary keys or set members as written. We don't need that here; the next section shows how to add a matching `__hash__`.

</div>

```python run
try:
    {tz1}
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="takeaways">

## Key takeaways

- Store the offset as a `timedelta` so time conversion is a simple addition. `timedelta` adds hours and minutes, so a negative offset needs both parts negative.
- Validate everything in `__init__` and raise `ValueError`; an object whose initializer raises never escapes.
- Getter-only properties (`name`, `offset`) make values read-only; assigning raises `AttributeError`.
- `__eq__` gives value-based equality (and makes instances unhashable unless you also define `__hash__`); `__repr__` gives a useful representation.
- Use `datetime.now(timezone.utc)`, not the deprecated `utcnow()`.

</div>
