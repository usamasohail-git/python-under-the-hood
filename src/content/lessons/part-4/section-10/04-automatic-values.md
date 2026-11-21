---
title: Automatic Values
summary: auto() lets an enumeration choose member values for you. Overriding _generate_next_value_ controls how, and Flag uses the same mechanism to hand out powers of two.
minutes: 18
---

## Letting the enumeration pick values

Often the values of an enumeration don't matter at all: you only care that `WAITING`, `STARTED` and `FINISHED` are distinct. Typing `1, 2, 3` by hand is tedious and error-prone (copy a line, forget to change the number, and you've silently created an alias). `enum.auto()` asks the enumeration to generate each value instead. For a plain `Enum`, the default is consecutive integers starting at 1:

```python run
import enum

class State(enum.Enum):
    WAITING = enum.auto()
    STARTED = enum.auto()
    FINISHED = enum.auto()

for member in State:
    print(member.name, member.value)
```

`auto()` itself is just a placeholder object. While the class body is being processed, the enum machinery replaces each placeholder with a real value.

## Mixing `auto()` with explicit values

You *can* mix generated and hand-written values, but be careful. The default rule is "one more than the **highest** value so far":

```python run
class State(enum.Enum):
    WAITING = 5
    STARTED = enum.auto()
    FINISHED = enum.auto()

print(list(State))
```

That looks fine. Now put the explicit value *after* an `auto()`:

```python run
class State(enum.Enum):
    WAITING = enum.auto()
    STARTED = 1
    FINISHED = enum.auto()

print(list(State))
print(State.__members__)
```

`WAITING` received `1`, and the explicit `STARTED = 1` therefore became an **alias** of `WAITING`. Nothing complained; one of the three states simply vanished. `@enum.unique` at least makes the problem loud:

```python run
try:
    @enum.unique
    class State(enum.Enum):
        WAITING = enum.auto()
        STARTED = 1
        FINISHED = enum.auto()
except ValueError as ex:
    print('ValueError:', ex)
```

The safest habit is not to mix the two styles in one enumeration: either let `auto()` assign every value, or assign them all yourself.

<div class="callout modern">
<span class="callout-title">`auto()` needs numbers by default (3.13)</span>

The default generator adds 1 to the highest previous value, so it only works when the previous values are numbers. In 3.11 and 3.12, following a non-numeric value fell back to an unspecified value with a `DeprecationWarning`. Since **3.13** it raises `TypeError: unable to increment ...`. Since 3.11 you can also use `auto()` *inside* a tuple value, e.g. `B = (auto(), 'label')`.

</div>

```python run
try:
    class Bad(enum.Enum):
        A = 'a'
        B = enum.auto()
except TypeError as ex:
    print('TypeError:', ex)
```

## Customizing generation with `_generate_next_value_`

The values come from a method called `_generate_next_value_`. Defining your own replaces the default. It's called once for each `auto()` with four arguments:

- `name`: the name of the member being created
- `start`: the starting value (1 unless you use the functional API with `start=`)
- `count`: how many members (**including aliases**) have been defined so far
- `last_values`: a list of all values assigned so far, in order

It is called while the class body is still being run, before the class exists, so it takes no `self` or `cls`. Write it as a plain function (or a `staticmethod`):

```python run
class State(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        print(f'{name=} {start=} {count=} {last_values=}')
        return 100 + count

    a = enum.auto()
    b = enum.auto()
    c = enum.auto()

print(list(State))
```

<div class="callout modern">
<span class="callout-title">Define `_generate_next_value_` before the members</span>

The generator must appear in the class body **before** any member that uses `auto()`, because values are produced line by line as the body runs: an earlier `auto()` would already have used the default generator. Current Python (verified on 3.13) refuses that ordering with a `TypeError` rather than letting two generators silently mix. The built-in default is declared as a `staticmethod`; a plain function in the class body still works, as here. Putting your generator in a base class (see below) avoids the ordering issue entirely.

</div>

```python run
try:
    class Late(enum.Enum):
        A = enum.auto()
        def _generate_next_value_(name, start, count, last_values):
            return name
        B = enum.auto()
except TypeError as ex:
    print('TypeError:', ex)
```

## Useful generators

**Values from names.** A very common choice is to derive the value from the member's name:

```python run
class State(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        return name.title()

    WAITING = enum.auto()
    STARTED = enum.auto()
    FINISHED = enum.auto()

for member in State:
    print(member.name, repr(member.value))
```

`StrEnum` (3.11+) has this built in: its `auto()` produces the **lower-cased** member name.

```python run
class Color(enum.StrEnum):
    RED = enum.auto()
    DARK_BLUE = enum.auto()

print(list(Color), Color.RED == 'red')
```

**Unique random values.** Since `last_values` holds everything assigned so far, a generator can avoid duplicates:

```python run
import random

random.seed(0)

class Token(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        while True:
            value = random.randint(1, 100)
            if value not in last_values:
                return value

    a = enum.auto()
    b = enum.auto()
    c = enum.auto()

for member in Token:
    print(member.name, member.value)
```

## Reusing a generator through a base class

`_generate_next_value_` isn't a member, so an enumeration that defines *only* the generator has no members and can be subclassed. Every subclass then gets the same automatic values, and the generator is automatically "defined before" the subclass's members:

```python run
class NameAsString(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        return name.lower()

class Enum1(NameAsString):
    A = enum.auto()
    B = enum.auto()

class Enum2(NameAsString):
    WAIT = enum.auto()
    RUNNING = enum.auto()

print(list(Enum1))
print(list(Enum2))
```

## Discouraging the use of values

Sometimes you want to stop users from relying on a member's value at all. If they write `State(2)` or compare `.value` with `2`, inserting a new member in the middle later would break their code. A neat trick is to make each value a fresh `object()`: it is unique, equal only to itself, and there's no literal anyone could type to match it.

```python run
class ValuelessEnum(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        return object()

    def __repr__(self):
        return f'<{self.__class__.__name__}.{self.name}>'

class State(ValuelessEnum):
    WAIT = enum.auto()
    RUNNING = enum.auto()
    FINISHED = enum.auto()

print(State.WAIT, repr(State.RUNNING))
print(State['FINISHED'] is State.FINISHED)    # names still work
```

Because the behavior lives in the base class, you could later change how values are generated without touching any enumeration built on it.

## `auto()` and aliases

The default generator never produces a duplicate, so it never creates aliases. A custom generator can, and here `count` reveals something subtle: it counts **every** name defined so far, aliases included. This generator makes every odd-numbered entry an alias of the previous one:

```python run
class Aliased(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        print(f'{name}: count={count}, last_values={last_values}')
        if count % 2 == 1:
            return last_values[-1]          # odd: repeat, creating an alias
        return last_values[-1] + 1          # even: a new value

    GREEN = 1
    GREEN_ALIAS = 1
    RED = 10
    CRIMSON = enum.auto()
    BLUE = enum.auto()
    AQUA = enum.auto()

print(list(Aliased))
print(Aliased.CRIMSON, Aliased.AQUA)
```

The generator was called three times, with `count` 3, 4 and 5: the explicit alias `GREEN_ALIAS` was counted too, and `last_values` includes the aliases' values.

## Flags: automatic powers of two

`enum.Flag` is an enumeration whose members can be combined with the bitwise operators `|`, `&`, `^` and `~`. For flags, `auto()` generates **powers of two** (1, 2, 4, 8, ...), so each member occupies its own bit:

```python run
class Perm(enum.Flag):
    R = enum.auto()
    W = enum.auto()
    X = enum.auto()

print([m.value for m in Perm])

rw = Perm.R | Perm.W
print(repr(rw))
print(Perm.W in rw, Perm.X in rw)
print(list(rw), len(rw))
print(repr(~Perm.R))
print(bool(Perm.R & Perm.X))
```

A combination like `Perm.R | Perm.W` is a *pseudo-member*: a `Perm` instance that isn't listed in the class but is built (and cached) on demand.

<div class="callout modern">
<span class="callout-title">`Flag` was reworked in Python 3.11</span>

- Iterating a combined flag (`list(rw)`) and `len(rw)` are new in 3.11.
- Named multi-bit values such as `RWX = 7` are treated as aliases: `list(Perm)` yields only the single-bit members.
- `~` inverts only within the defined flags, so `~Perm.R` is `Perm.W|X`. For `IntFlag`, `~` now also gives a positive result instead of a negative integer.
- Composite `repr`s list members in definition order (`<Perm.R|W: 3>`), and the new `boundary` setting controls invalid values: `Flag` defaults to `STRICT` (raises `ValueError`), while `IntFlag` uses `KEEP`.

</div>

```python run
class Perm(enum.Flag):
    R = 4
    W = 2
    X = 1
    RWX = 7

print(list(Perm), repr(Perm(7)))

try:
    Perm(8)
except ValueError as ex:
    print('ValueError:', str(ex).splitlines()[0])
```

<div class="takeaways">

## Key takeaways

- `auto()` lets the enumeration choose values. For `Enum` the default is one more than the highest value so far, starting at 1.
- Mixing `auto()` with explicit values can silently create aliases; don't mix them, or at least use `@unique`.
- Override `_generate_next_value_(name, start, count, last_values)` to control values. Define it **before** the members (enforced since 3.13), or put it in a member-less base class.
- `count` includes aliases, and `last_values` lists every value assigned so far.
- `StrEnum`'s `auto()` gives the lower-cased name; `Flag`'s gives powers of two.
- Since 3.11, `Flag` combinations are iterable, multi-bit names are aliases, and invalid values raise by default.

</div>
