---
title: Customizing and Extending Enumerations
summary: Enumerations are still classes, so you can give them methods, properties and special methods, share behavior through member-less base classes, and use __new__ to attach several attributes to each member.
minutes: 25
---

## Enumerations are still classes

An enumeration follows some special rules, but it is still a class, and its members are instances of it. Anything you define in the class body that isn't a plain value assignment (methods, properties, class methods, special methods) is **not** turned into a member. It becomes ordinary class behavior that every member shares:

```python run
from enum import Enum

class Color(Enum):
    red = 1
    green = 2
    blue = 3

    def purecolor(self, value):
        return {self: value}

print(list(Color))                       # the method is not a member
print(Color.red.purecolor(100))
print(Color.blue.purecolor(200))
```

Inside the method, `self` is the member it was called on, exactly as with any instance method.

## Custom representations

Members get a default `repr` like `<Color.red: 1>` and a default `str` like `Color.red`. Both can be overridden:

```python run
class Color(Enum):
    red = 1
    green = 2
    blue = 3

    def __repr__(self):
        return f'{self.name} ({self.value})'

    def __str__(self):
        return self.name.upper()

print(repr(Color.red))
print(str(Color.red))
print(f'Paint it {Color.green}')
```

<div class="callout modern">
<span class="callout-title">`format()` follows `__str__` (Python 3.12+)</span>

f-strings and `format()` call `__format__`. Since 3.12, an enumeration's `__format__` uses `str()`, so overriding `__str__` is enough to control both, as above. Before 3.12, enumerations that mixed in another type (such as `class C(int, Enum)`) formatted as the raw *value* instead, so `f'{member}'` and `str(member)` could disagree.

</div>

## Adding ordering

Plain members don't support `<` or `>`. When an ordering does make sense, define it. Return `NotImplemented` for objects you don't know how to compare, so Python can try the reflected operation and finally raise a proper `TypeError`:

```python run
class Number(Enum):
    ONE = 1
    TWO = 2
    THREE = 3

    def __lt__(self, other):
        if isinstance(other, Number):
            return self.value < other.value
        return NotImplemented

print(Number.ONE < Number.TWO)
print(Number.THREE > Number.TWO)         # Python reflects this to TWO < THREE

try:
    Number.ONE <= Number.TWO
except TypeError as ex:
    print('TypeError:', ex)
```

`>` works because Python reflects it into `__lt__` with the operands swapped, but `<=` has no fallback. Rather than writing three more methods, decorate the class with `functools.total_ordering`, which derives `<=`, `>` and `>=` from `__lt__` and `__eq__`:

```python run
from functools import total_ordering

@total_ordering
class Number(Enum):
    ONE = 1
    TWO = 2
    THREE = 3

    def __lt__(self, other):
        if isinstance(other, Number):
            return self.value < other.value
        return NotImplemented

print(Number.ONE <= Number.TWO, Number.THREE >= Number.TWO)
print(sorted([Number.THREE, Number.ONE, Number.TWO]))
print(max(Number))
```

## Custom equality and the hash trap

You can also redefine `==`. Here a `Number` member compares equal to a matching `int`:

```python run
class Number(Enum):
    ONE = 1
    TWO = 2

    def __eq__(self, other):
        if isinstance(other, Number):
            return self is other
        if isinstance(other, int):
            return self.value == other
        return NotImplemented

print(Number.ONE == Number.ONE, Number.ONE == 1, Number.ONE == 2)

try:
    hash(Number.ONE)
except TypeError as ex:
    print('TypeError:', ex)
```

The members are **no longer hashable**. That's the general Python rule: a class that defines `__eq__` without `__hash__` gets `__hash__ = None`, because objects that compare equal must hash equal and Python can't guess how. If you override `__eq__`, define a matching `__hash__` too. To keep `Number.ONE == 1` consistent with hashing, hash the value:

```python run
class Number(Enum):
    ONE = 1
    TWO = 2

    def __eq__(self, other):
        if isinstance(other, Number):
            return self is other
        if isinstance(other, int):
            return self.value == other
        return NotImplemented

    def __hash__(self):
        return hash(self.value)

lookup = {Number.ONE: 'one'}
print(lookup[Number.ONE], lookup[1])     # 1 == Number.ONE and hash(1) == hash(Number.ONE)
```

If what you really want is "members that behave like integers", the built-in `IntEnum` (below) already does all of this for you.

## Truthiness

By default **every member is truthy**, whatever its value, because members are ordinary objects:

```python run
class State(Enum):
    READY = 1
    BUSY = 0

print(bool(State.READY), bool(State.BUSY))
```

That's easy to trip over if you expect `BUSY = 0` to be falsy. Define `__bool__` when the truth value should follow the member's value:

```python run
class State(Enum):
    READY = 1
    BUSY = 0

    def __bool__(self):
        return bool(self.value)

request_state = State.BUSY
if request_state:
    print('Launching next query')
else:
    print('Not ready for another query yet')
```

## Extending enumerations with base classes

You can't subclass an enumeration that has members, but you **can** subclass one without them. That makes a member-less enumeration the perfect place for shared behavior. Here is a reusable ordered enumeration:

```python run
@total_ordering
class OrderedEnum(Enum):
    """Members are ordered by their values, so values must be comparable."""

    def __lt__(self, other):
        if isinstance(other, self.__class__):
            return self.value < other.value
        return NotImplemented

class Number(OrderedEnum):
    ONE = 1
    TWO = 2
    THREE = 3

class Dimension(OrderedEnum):
    D1 = 1,
    D2 = 1, 1
    D3 = 1, 1, 1

print(Number.ONE < Number.THREE, Number.ONE >= Number.ONE)
print(Dimension.D1 < Dimension.D3, Dimension.D1 >= Dimension.D2)

try:
    Number.ONE < Dimension.D1
except TypeError as ex:
    print('TypeError:', ex)
```

The concrete enumerations only list their members; ordering comes for free. Note that `isinstance(other, self.__class__)` refuses to compare a `Number` with a `Dimension`, even though both are `OrderedEnum`s.

## Several attributes per member

The standard library's `http.HTTPStatus` is an enumeration whose members carry more than one piece of information:

```python run
from http import HTTPStatus

print(repr(HTTPStatus(404)))
print(HTTPStatus.NOT_FOUND.value, HTTPStatus.NOT_FOUND.name, HTTPStatus.NOT_FOUND.phrase)
print(HTTPStatus.NOT_FOUND.is_client_error)      # added in 3.12
```

Let's build something similar for our own status codes. A first attempt stores a tuple and exposes its parts through properties:

```python run
class AppStatus(Enum):
    OK = (0, 'No problem!')
    FAILED = (1, 'Something broke.')

    @property
    def code(self):
        return self.value[0]

    @property
    def phrase(self):
        return self.value[1]

print(AppStatus.OK.code, AppStatus.OK.phrase)

try:
    AppStatus(0)
except ValueError as ex:
    print('ValueError:', ex)
```

The properties work, but the value is still the whole tuple, so looking a member up by its code fails. We want the value to be just the code.

The fix is to take control of member creation with `__new__`. When the class is built, the assigned tuple is unpacked and passed to `__new__` as arguments. Inside it we create the member object ourselves, set the special attribute **`_value_`** (which becomes `.value`) and attach any other attributes:

```python run
class AppStatus(Enum):
    OK = (0, 'No problem!')
    FAILED = (1, 'Something broke.')

    def __new__(cls, code, phrase):
        member = object.__new__(cls)
        member._value_ = code
        member.phrase = phrase
        return member

print(AppStatus.OK.value, AppStatus.OK.name, AppStatus.OK.phrase)
print(repr(AppStatus(1)))
```

Now the value is just the code, and `AppStatus(1)` works. The pattern is generic enough to live in a member-less base class:

```python run
class TwoValueEnum(Enum):
    def __new__(cls, value, phrase):
        member = object.__new__(cls)
        member._value_ = value
        member.phrase = phrase
        return member

class AppStatus(TwoValueEnum):
    OK = (0, 'No problem!')
    FAILED = (1, 'Something broke.')

print(repr(AppStatus.FAILED), AppStatus.FAILED.phrase)
```

<div class="callout note">
<span class="callout-title">Why `__new__` and not `__init__`?</span>

`__init__` also receives the unpacked tuple and can set extra attributes, but by the time it runs the member's value has already been registered as the whole tuple. Even assigning `self._value_` there changes `.value` without updating the value-to-member lookup table, so `AppStatus(0)` still fails in 3.13. Use `__init__` when the value should stay the full tuple, and `__new__` when the value must be one specific part.

</div>

## Flexible lookups with `_missing_`

When `Status(value)` finds no member, the enumeration calls the class method **`_missing_(value)`** before giving up. Return a member to accept the value, or `None` to get the usual `ValueError`. A common use is case-insensitive lookup:

```python run
class Status(Enum):
    PENDING = 'pending'
    RUNNING = 'running'

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.lower():
                    return member
        return None

print(repr(Status('RUNNING')), repr(Status('Pending')))

try:
    Status('done')
except ValueError as ex:
    print('ValueError:', ex)
```

If `_missing_` returns something that is neither a member nor `None`, Python raises a `TypeError` naming the method, so a buggy hook can't smuggle a non-member into your code.

## What becomes a member?

The rule is: names assigned plain values become members, while functions, descriptors (`property`, `classmethod`, `staticmethod`), `__dunder__` names and private `__mangled` names do not. Names of the form `_sunder_` are reserved for the enum machinery (`_value_`, `_missing_`, `_ignore_`, ...). Python 3.11 added two helpers to override that rule explicitly, and `enum.property`, a property that also works for members named like attributes:

```python run
import enum

class Planet(Enum):
    MERCURY = (3.30e23, 2.44e6)
    EARTH = (5.97e24, 6.37e6)

    G = enum.nonmember(6.674e-11)      # a plain class constant, not a member

    def __init__(self, mass, radius):
        self.mass = mass
        self.radius = radius

    @enum.property
    def gravity(self):
        return Planet.G * self.mass / self.radius ** 2

print(list(Planet))
print(Planet.G)
print(round(Planet.EARTH.gravity, 2))
```

<div class="callout modern">
<span class="callout-title">`member`, `nonmember` and `enum.property` (3.11+)</span>

`enum.nonmember(x)` keeps an attribute out of the member list, and `enum.member(x)` forces something (say, a function) to become a member. `enum.property` behaves like `property` on members, but accessing it on the class raises `AttributeError` instead of returning the descriptor; the enum machinery itself uses it for `name` and `value`. Also new in 3.13: a nested class inside an enumeration is no longer turned into a member (3.11 and 3.12 issued a deprecation warning).

</div>

## Built-in variations: `IntEnum`, `StrEnum` and `ReprEnum`

Sometimes members must also *be* their values, for instance to pass them to code that expects plain integers. Mixing a data type into the enumeration does that. `IntEnum` members are real `int`s:

```python run
class Priority(enum.IntEnum):
    LOW = 1
    HIGH = 2

print(Priority.HIGH == 2, Priority.LOW < Priority.HIGH, Priority.HIGH + 1)
print(isinstance(Priority.LOW, int))
print(repr(Priority.HIGH), str(Priority.HIGH), f'{Priority.HIGH:03d}')
```

`StrEnum` (new in 3.11) does the same for strings:

```python run
class Method(enum.StrEnum):
    GET = 'GET'
    POST = 'POST'

print(Method.GET == 'GET', Method.POST.lower(), f'/{Method.GET}')
print(repr(Method.POST), isinstance(Method.GET, str))
```

<div class="callout modern">
<span class="callout-title">`str()` of `IntEnum` changed (3.11), and `ReprEnum`</span>

In Python 3.11, `str(Priority.HIGH)` changed from `'Priority.HIGH'` to `'2'`, so an `IntEnum` or `StrEnum` member prints exactly like the value it stands in for, while `repr()` still shows the enum. That behavior comes from the new base class **`ReprEnum`**, which keeps the enum-style `repr` but uses the mixed-in type's `str` and `format`. A hand-made `class C(int, Enum)` does **not** get this: its `str()` and `format()` both give `'C.NAME'` in 3.12+. Mix in with `ReprEnum` instead (`class C(int, ReprEnum)`) when you want the value-like behavior.

</div>

```python run
class Mixed(int, Enum):
    A = 1

class Clean(int, enum.ReprEnum):
    A = 1

print(str(Mixed.A), f'{Mixed.A}')
print(str(Clean.A), f'{Clean.A}', repr(Clean.A))
```

## `global_enum`: members as module constants

Some standard library modules export enumeration members as module-level names: `re.IGNORECASE` is really a member of `re.RegexFlag`. The `enum.global_enum` decorator (3.11+) does this. It copies the members into the defining module's namespace and changes `repr` to show the *module* name rather than the class name:

```python run
import re, sys

print(repr(re.IGNORECASE), re.IGNORECASE is re.RegexFlag.IGNORECASE)

@enum.global_enum
class Level(Enum):
    LOW = 1
    HIGH = 2

module = sys.modules[Level.__module__]
print(repr(Level.LOW), module.LOW is Level.LOW)
```

It's meant for modules that replace old integer constants with an enumeration, so the familiar names keep working. You'll rarely need it in application code.

<div class="takeaways">

## Key takeaways

- Methods, properties and special methods defined in an enumeration are shared behavior, not members.
- Override `__str__`/`__repr__` for display; since 3.12, `format()` and f-strings follow `__str__`.
- Add ordering with `__lt__` (returning `NotImplemented` for foreign types) plus `@total_ordering`.
- Overriding `__eq__` makes members unhashable unless you also define `__hash__`. Members are truthy unless you define `__bool__`.
- Put shared behavior in a **member-less** base enumeration and subclass it.
- Use `__new__` and `_value_` to choose the value while attaching extra attributes; `_missing_` customizes failed value lookups.
- `IntEnum`, `StrEnum` (3.11) and `ReprEnum` make members behave like their values; `member`, `nonmember`, `enum.property` and `global_enum` are 3.11+ tools for fine control.

</div>
