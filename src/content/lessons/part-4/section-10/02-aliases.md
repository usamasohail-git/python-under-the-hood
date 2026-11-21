---
title: Aliases
summary: Two member names with the same value don't make two members. The later names become aliases of the first, which is handy for mapping synonyms and easy to forbid with @unique or @verify.
minutes: 12
---

## Same value, same member

Member **names** must be unique within an enumeration. Member **values** don't have to be. But when two names share a value, Python does not create two members. The first name defined with that value becomes the **canonical** member, and every later name with the same value becomes an **alias** for it:

```python run
import enum

class NumSides(enum.Enum):
    Triangle = 3
    Rectangle = 4
    Square = 4
    Rhombus = 4

print(NumSides.Rectangle is NumSides.Square)
print(NumSides.Square is NumSides.Rhombus)
print(NumSides.Square)
print(NumSides.Square.name)
```

`NumSides.Square` is literally the same object as `NumSides.Rectangle`, so its `name` is `'Rectangle'`. An alias is just another name that leads to an existing member.

Why does Python work this way? Recall that `NumSides(4)` looks a member up **by value**. If `Rectangle`, `Square` and `Rhombus` were three separate members, `NumSides(4)` would be ambiguous. Folding them into one member keeps "value → member" a clean one-to-one mapping.

Every way of reaching the member gives you the canonical one:

```python run
print(NumSides(4))
print(NumSides['Square'])
print(NumSides.Rhombus in NumSides)
```

## Aliases are hidden from iteration

Iterating an enumeration yields only the canonical members, and `len()` counts only those:

```python run
print(list(NumSides))
print(len(NumSides))
```

The aliases are still recorded, though. `__members__` lists **every** name, aliases included, and shows that each alias maps to the canonical member:

```python run
for name, member in NumSides.__members__.items():
    print(f'{name:10} -> {member!r}')
```

That gives a simple way to find the aliases: a name is an alias when it differs from the name of the member it maps to.

```python run
aliases = [name for name, member in NumSides.__members__.items() if name != member.name]
aliases
```

## A practical use: normalizing synonyms

Aliases are useful when different sources use different words for the same thing. Suppose our application talks to two external systems that report job status with their own vocabulary:

| Ours | System 1 | System 2 |
|---|---|---|
| `ready` | `ready` | `ready` |
| `running` | `busy` | `processing` |
| `ok` | `finished_no_error` | `ran_ok` |
| `errors` | `finished_with_errors` | `errored` |

One enumeration with aliases translates all of them:

```python run
class Status(enum.Enum):
    ready = 1

    running = 2
    busy = 2
    processing = 2

    ok = 3
    finished_no_error = 3
    ran_ok = 3

    errors = 4
    finished_with_errors = 4
    errored = 4

print(list(Status))                     # only our own statuses
print(Status['busy'], Status['processing'])
print(Status['ran_ok'] is Status.ok)
```

Whatever word comes in, `Status[word]` returns one of *our* four members, and the rest of the code only ever deals with those. The actual values don't matter here (strings would work just as well); they only decide which names are grouped together.

To check whether an incoming word is recognized at all, test it against `__members__`, which includes the aliases:

```python run
for word in ['ran_ok', 'busy', 'crashed']:
    print(word, word in Status.__members__)
```

## Forbidding aliases with `@unique`

Sometimes an alias is a bug: you meant every value to be different and accidentally typed the same one twice. The `@enum.unique` class decorator checks for this when the class is created and raises a `ValueError` listing each alias:

```python run
@enum.unique
class Job(enum.Enum):
    ready = 1
    done_ok = 2
    errors = 3

print(list(Job))

try:
    @enum.unique
    class Job(enum.Enum):
        ready = 1
        waiting = 1
        done_ok = 2
        errors = 3
except ValueError as ex:
    print('ValueError:', ex)
```

The check happens at class-definition time, so the mistake surfaces as soon as the module is imported instead of as a mysterious lookup bug later. If an enumeration should never have aliases, it's worth adding the decorator.

<div class="callout modern">
<span class="callout-title">`@verify` (Python 3.11+)</span>

Python 3.11 added a more general decorator, `enum.verify`, which takes one or more checks. `verify(UNIQUE)` does the same job as `@unique`. `CONTINUOUS` requires integer values with no gaps between the lowest and highest, and `NAMED_FLAGS` (for `Flag` enumerations) requires every combined value to be made of named flags.

</div>

```python run
from enum import verify, UNIQUE, CONTINUOUS

try:
    @verify(UNIQUE)
    class Color(enum.Enum):
        RED = 1
        CRIMSON = 1
except ValueError as ex:
    print('ValueError:', ex)

try:
    @verify(UNIQUE, CONTINUOUS)
    class Level(enum.Enum):
        LOW = 1
        MEDIUM = 2
        HIGH = 4
except ValueError as ex:
    print('ValueError:', ex)
```

`CONTINUOUS` is a good fit for numbered levels or steps, where a missing number almost always means someone forgot a member.

<div class="takeaways">

## Key takeaways

- When several names share a value, the first becomes the canonical member and the rest are **aliases** of it (the very same object).
- Looking up by value or by alias name always returns the canonical member, and its `name` is the canonical name.
- Iteration and `len()` skip aliases; `__members__` lists every name, aliases included.
- Aliases are a neat way to map synonyms from different sources onto one set of members.
- `@enum.unique`, or `@enum.verify(UNIQUE)` since 3.11, rejects aliases when the class is created. `CONTINUOUS` rejects gaps in integer values.

</div>
