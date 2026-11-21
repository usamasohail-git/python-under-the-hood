---
title: Descriptors
summary: A descriptor is an object stored as a class attribute that controls what happens when that attribute is read, written or deleted through an instance.
minutes: 12
---

## The problem descriptors solve

Suppose a class needs two attributes that each return a random pick from a fixed set of values. With properties, that's easy enough:

```python run
from random import choice, seed

class Deck:
    @property
    def suit(self):
        return choice(('Spade', 'Heart', 'Diamond', 'Club'))

    @property
    def card(self):
        return choice(tuple('23456789JQKA') + ('10',))

d = Deck()
seed(0)
for _ in range(5):
    print(d.card, d.suit)
```

It works, but look at the two properties: they are the *same* logic with different data. Add a `Dice` class with three dice and you'd write the same property three more times. Properties are tied to one attribute of one class. We want something we can write **once** and plug into any class, as many times as we like.

That something is a **descriptor**.

## The descriptor protocol

A descriptor is simply an object whose class implements one or more of these special methods:

| Method | Called when… |
|---|---|
| `__get__(self, instance, owner_class)` | the attribute is **read** |
| `__set__(self, instance, value)` | the attribute is **assigned** |
| `__delete__(self, instance)` | the attribute is **deleted** with `del` |
| `__set_name__(self, owner_class, name)` | the owning class is **created** (Python 3.6+), telling the descriptor its attribute name |

The crucial rule: these methods only kick in when the descriptor object is stored as a **class attribute**. The class that holds it is called the **owner class**.

<div class="callout note">
<span class="callout-title">`__delete__`, not `__del__`</span>

Don't confuse the descriptor method `__delete__` with `__del__`. `__del__` is a *finalizer* that Python may call when an object itself is about to be destroyed, which has nothing to do with deleting an attribute.

</div>

Descriptors come in two flavors, and the difference matters a lot later in this section:

- a **non-data descriptor** implements only `__get__` (and optionally `__set_name__`)
- a **data descriptor** implements `__set__` and/or `__delete__` (usually together with `__get__`)

## A first non-data descriptor

Here is a descriptor whose value is the current UTC time, computed fresh every time it's read:

```python run
from datetime import datetime, timezone

class TimeUTC:
    def __get__(self, instance, owner_class):
        return datetime.now(timezone.utc).isoformat()

class Logger:
    current_time = TimeUTC()
```

`current_time` is an ordinary class attribute whose value happens to be a `TimeUTC` instance:

```python run
Logger.__dict__['current_time']
```

But when we *access* it through an instance, Python notices that the object has a `__get__` method and calls it, returning its result instead of the `TimeUTC` object:

```python run
log = Logger()
print(log.current_time)
print(Logger.current_time)   # for now, class access calls __get__ too
```

Both lines print a timestamp. We'll see in the next lesson how `__get__` can tell those two kinds of access apart.

<div class="callout modern">
<span class="callout-title">Python 3.12: `datetime.utcnow()` is deprecated</span>

Older code (and older notebooks) use `datetime.utcnow()`. Since Python 3.12 it emits a `DeprecationWarning`, because it returns a *naive* datetime that doesn't record that it's in UTC. Use the timezone-aware `datetime.now(timezone.utc)` instead (Python 3.11 also added the alias `datetime.UTC`). Note that the ISO string now ends in `+00:00`.

</div>

## A reusable descriptor: `Choice`

Back to the deck. The descriptor's `__init__` can take configuration, so one class can serve every "random choice" attribute:

```python run
class Choice:
    def __init__(self, *choices):
        self.choices = choices

    def __get__(self, instance, owner_class):
        return choice(self.choices)

class Deck:
    suit = Choice('Spade', 'Heart', 'Diamond', 'Club')
    card = Choice(*'23456789JQKA', '10')

d = Deck()
seed(0)
for _ in range(5):
    print(d.card, d.suit)
```

The output is identical to the property version, because each read still calls `choice` once, in the same order. But the logic now lives in one place, and reusing it costs one line per attribute:

```python run
class Dice:
    die_1 = Choice(1, 2, 3, 4, 5, 6)
    die_2 = Choice(1, 2, 3, 4, 5, 6)
    die_3 = Choice(1, 2, 3, 4, 5, 6)

seed(0)
dice = Dice()
for _ in range(3):
    print(dice.die_1, dice.die_2, dice.die_3)
```

`Deck` and `Dice` have nothing in common except that they use `Choice`. That's the point: a descriptor packages *attribute behavior* so any class can adopt it.

## Where you've already used descriptors

You have been using descriptors all along without seeing them:

```python run
class Demo:
    @property
    def p(self):
        return 1

    def method(self):
        pass

for name in ('p', 'method'):
    attr = Demo.__dict__[name]
    print(f'{name:7} {type(attr).__name__:9} has __get__: {hasattr(attr, "__get__")}, '
          f'has __set__: {hasattr(attr, "__set__")}')
```

A `property` is a data descriptor, and every plain function is a non-data descriptor. That's how `obj.method` turns into a bound method. We'll take both apart in the last lessons of this section.

<div class="takeaways">

## Key takeaways

- A descriptor is an object implementing `__get__`, `__set__`, `__delete__` and/or `__set_name__`, stored as a **class attribute** of an owner class.
- Reading, writing or deleting that attribute through an instance calls the descriptor's methods instead of the normal behavior.
- **Non-data** descriptors define only `__get__`; **data** descriptors also define `__set__` (or `__delete__`).
- Descriptors let you write attribute logic once and reuse it in many attributes and classes, where a property would have to be repeated.
- `property` and plain functions are descriptors too.

</div>
