---
title: Enumerations
summary: An enumeration is a class whose instances are a fixed set of named constants. Members can be looked up by value or by name, iterated in definition order, and compared by identity.
minutes: 18
---

## Why enumerations?

Suppose a job can be pending, running or completed. The quickest approach is to pass strings around:

```python
job_status = 'pending'
if job_status == 'pnding':      # typo: silently never true
    ...
```

Nothing catches the typo, nothing documents which strings are allowed, and any function that receives a status has to trust the caller. Module-level constants (`PENDING = 'pending'`) help a little, but they're still just strings: you can't list all the valid statuses, and `'pending'` from anywhere looks exactly like `PENDING`.

An **enumeration** fixes this. It is a class with a fixed set of **members**. Each member has a **name** and an associated **value**, and the members are the *only* instances the class will ever have.

## Defining an enumeration

To create one, subclass `enum.Enum` and assign class attributes. Every attribute assigned in the class body becomes a member:

```python run
import enum

class Color(enum.Enum):
    red = 1
    green = 2
    blue = 3

class Status(enum.Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'

class UnitVector(enum.Enum):
    V1D = (1, )
    V2D = (1, 1)
    V3D = (1, 1, 1)
```

Values can be anything: integers, strings, tuples, even arbitrary objects. Upper-case names are the usual convention, because members are constants, but Python doesn't enforce it.

## Members are instances of the enumeration

`Status.PENDING` is not the string `'pending'`. It is an **instance of `Status`** that *carries* `'pending'` as its value:

```python run
print(repr(Status.PENDING))
print(type(Status.PENDING))
print(isinstance(Status.PENDING, Status))
print(Status.PENDING.name, Status.PENDING.value)
```

Every member has a `name` (the attribute name, a string) and a `value` (whatever you assigned).

Because each member is created once, when the class is built, there is exactly one `Status.PENDING` object in the whole program. That makes **identity** the natural way to compare members. `==` works too, but `is` states the intent precisely and is a little faster:

```python run
print(Status.PENDING is Status.PENDING)
print(Status.PENDING == Status.PENDING)
print(Status.PENDING == 'pending')    # a member is not equal to its value
```

The last line matters: a plain `Enum` member is never equal to its raw value. That's a feature. It forces code to say `Status.PENDING` instead of passing magic strings around. (Later we'll meet `IntEnum` and `StrEnum`, which deliberately relax this rule.)

Ordering comparisons are **not** defined, since "is `RUNNING` greater than `PENDING`?" usually has no meaning:

```python run
class Constants(enum.Enum):
    ONE = 1
    TWO = 2
    THREE = 3

try:
    Constants.ONE > Constants.TWO
except TypeError as ex:
    print('TypeError:', ex)
```

You'll see how to add ordering yourself in the lesson on customizing enumerations.

## Looking up members

There are three ways to get hold of a member.

**By attribute**, the usual way when you know the member while writing the code: `Status.PENDING`.

**By value**, by *calling* the class. The enumeration doesn't create a new object; it finds the existing member with that value:

```python run
print(Status('pending'))
print(UnitVector((1, 1)))
print(Status('pending') is Status.PENDING)

try:
    Status('invalid')
except ValueError as ex:
    print('ValueError:', ex)
```

**By name**, with square brackets. The enumeration class implements `__getitem__` (through its metaclass), so it works like a dictionary keyed by member name. A missing name raises `KeyError`. `getattr` works too, since members are class attributes:

```python run
print(Status['PENDING'])
print(getattr(Status, 'PENDING'))
print(getattr(Status, 'OK', None))

try:
    Status['pending']           # names are case-sensitive
except KeyError as ex:
    print('KeyError:', ex)
```

Why have both attribute access and `Status['PENDING']`? Because names often arrive as *data*. Here a status comes back in a JSON payload from some API:

```python run
import json

payload = '{"name": "Alex", "status": "PENDING"}'
data = json.loads(payload)

status = Status[data['status']]
print(repr(status), status is Status.PENDING)
```

Choose the lookup that matches your data: `Status[...]` when the input holds member **names**, `Status(...)` when it holds **values**.

## Membership and iteration

The `in` operator tells you whether something belongs to the enumeration:

```python run
print(Status.PENDING in Status)
print('PENDING' in Status)      # a name is not a member
print('pending' in Status)      # a value: see the callout below
```

<div class="callout modern">
<span class="callout-title">Containment by value (Python 3.12+)</span>

Older notebooks show `'pending' in Status` as `False`, and Python 3.8–3.11 raised a `TypeError` for a non-member operand. Since **Python 3.12**, `in` also accepts a raw **value**: `'pending' in Status` is `True` because some member has that value. A **name** is still not contained, so `'PENDING' in Status` is `False`.

</div>

To check whether a string is a valid member **name**, use the `__members__` mapping. It maps every name to its member, and like any mapping, `in` tests its keys:

```python run
print(repr(Status.__members__))
print('PENDING' in Status.__members__)
print('OK' in Status.__members__)
```

`__members__` is a read-only `mappingproxy`, so you can't add members through it. A `try`/`except KeyError` around `Status[name]` is just as valid; pick whichever reads better.

An enumeration is iterable. Members come out in **definition order**, regardless of their values, and `len()` counts them:

```python run
for member in Status:
    print(member.name, '->', member.value)

class Numbers(enum.Enum):
    THREE = 3
    TWO = 2
    ONE = 1

print(list(Numbers), len(Numbers))
```

## Members are hashable

Every member is hashable, even when its value isn't, so members can always be dictionary keys or set elements. Here the values are objects whose class explicitly disables hashing:

```python run
class Person:
    __hash__ = None

try:
    hash(Person())
except TypeError as ex:
    print('TypeError:', ex)

class Family(enum.Enum):
    person_1 = Person()
    person_2 = Person()

roles = {Family.person_1: 'parent', Family.person_2: 'child'}
print(roles[Family.person_2])
```

The default hash of a member is based on its **name** (which is a string and always hashable), not its value.

Members also work naturally with structural pattern matching (Python 3.10+), because dotted names in a `case` are compared by value:

```python run
def describe(status):
    match status:
        case Status.PENDING:
            return 'waiting to start'
        case Status.RUNNING | Status.COMPLETED:
            return 'started'

print(describe(Status.RUNNING))
```

## Enumerations are immutable

Once the class is built, its set of members is fixed. You can't change a member's value, re-bind a member name, or add members by item assignment:

```python run
try:
    Status.PENDING.value = 10
except AttributeError as ex:
    print('AttributeError:', ex)

try:
    Status.PENDING = 'something else'
except AttributeError as ex:
    print('AttributeError:', ex)

try:
    Status['NEW'] = 100
except TypeError as ex:
    print('TypeError:', ex)
```

There's also no way to create a new member by calling the class: `Status(...)` only ever *looks up* existing ones.

Finally, you can't subclass an enumeration that **already has members**, because the subclass would add new instances to a supposedly closed set. Subclassing an enumeration *without* members is fine, and we'll use that to share behavior later:

```python run
class EnumBase(enum.Enum):
    pass

class EnumExt(EnumBase):        # fine: EnumBase has no members
    ONE = 1
    TWO = 2

print(EnumExt.ONE)

class Closed(enum.Enum):
    ONE = 1

try:
    class Extended(Closed):
        TWO = 2
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">`EnumMeta` is now `EnumType`</span>

The metaclass that builds enumerations was renamed from `EnumMeta` to **`EnumType`** in Python 3.11 (`EnumMeta` remains as an alias), so `type(Status)` now shows `<class 'enum.EnumType'>`. Error messages were also reworded: older notebooks show `can't set attribute` and `Cannot extend enumerations`, while 3.13 says `cannot set attribute 'value'` and `<enum 'Extended'> cannot extend <enum 'Closed'>`.

</div>

```python run
print(type(Status), enum.EnumMeta is enum.EnumType)
```

## A shortcut: the functional API

For quick enumerations you can also call `Enum` directly, much like `namedtuple`. Values default to `1, 2, 3, ...`:

```python run
Direction = enum.Enum('Direction', 'NORTH EAST SOUTH WEST')
print(list(Direction))
print(Direction.SOUTH.value)
```

The class syntax is more common because it also lets you add methods, as you'll see shortly.

<div class="takeaways">

## Key takeaways

- An enumeration is a class whose members are its only instances. Each member has a `name` and a `value`.
- Compare members with `is`. A plain `Enum` member is never equal to its raw value, and `<`/`>` aren't defined.
- Look up by value with `Status(value)` (`ValueError` if missing) and by name with `Status[name]` (`KeyError` if missing).
- Iteration follows definition order. `__members__` maps every name to its member.
- Members are always hashable, the set of members is immutable, and an enumeration with members can't be subclassed.
- Since 3.12, `value in Enum` also checks values; names are never "in" the enumeration.

</div>
