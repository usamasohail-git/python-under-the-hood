---
title: Getters and Setters
summary: How `__get__` tells class access from instance access, how `__set__` intercepts assignment, and why one descriptor instance is shared by every instance of the owner class.
minutes: 12
---

## What `__get__` receives

`__get__(self, instance, owner_class)` gets three arguments:

- `self` is the descriptor object (the `TimeUTC()` stored in the class)
- `instance` is the object the attribute was accessed through, or `None` when it was accessed through the class
- `owner_class` is the class the attribute was accessed through

Let's print them:

```python run
from datetime import datetime, timezone

class TimeUTC:
    def __get__(self, instance, owner_class):
        print(f'__get__: self={self}, instance={instance}, owner_class={owner_class}')
        return datetime.now(timezone.utc).isoformat()

class Logger1:
    current_time = TimeUTC()

class Logger2:
    current_time = TimeUTC()

Logger1.current_time
Logger2.current_time
print()
l1 = Logger1()
print('l1 is', hex(id(l1)))
l1.current_time
```

From the class, `instance` is `None`. From `l1`, `instance` is `l1` itself. `owner_class` is `Logger1` either way. Notice also that `Logger1` and `Logger2` each got their *own* `TimeUTC` object (different addresses), because each class statement created one.

## Returning the descriptor for class access

Because `__get__` can tell the two cases apart, it can behave differently in each. The convention, followed by `property` and almost every descriptor in the standard library, is:

- accessed from the **class** → return the descriptor itself
- accessed from an **instance** → compute the instance's value

```python run
class TimeUTC:
    def __get__(self, instance, owner_class):
        if instance is None:
            return self          # Logger.current_time gives you the descriptor
        return datetime.now(timezone.utc).isoformat()

class Logger:
    current_time = TimeUTC()

print(Logger.current_time)
print(Logger().current_time)
```

This is exactly what properties do:

```python run
class Logger:
    @property
    def current_time(self):
        return datetime.now(timezone.utc).isoformat()

print(Logger.current_time)
print(Logger().current_time)
```

Returning `self` is what lets you inspect or configure a descriptor later via `Logger.current_time`. You'll use it constantly.

## One descriptor, many instances

Here's the subtle part. The descriptor is a **class attribute**, so there is exactly **one** descriptor object, shared by every instance of the class:

```python run
class TimeUTC:
    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        print(f'__get__ running in descriptor at {hex(id(self))}')
        return datetime.now(timezone.utc).isoformat()

class Logger:
    current_time = TimeUTC()

l1, l2 = Logger(), Logger()
l1.current_time
l2.current_time
```

Same address both times. For `TimeUTC` that's harmless, since it keeps no state. But if a descriptor stores state on `self`, that state is shared by all instances:

```python run
class Countdown:
    def __init__(self, start):
        self.start = start + 1

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        self.start -= 1
        return self.start

class Rocket:
    countdown = Countdown(10)

rocket1, rocket2 = Rocket(), Rocket()
print(rocket1.countdown)
print(rocket2.countdown)
print(rocket1.countdown)
```

We wanted two independent countdowns and got one shared countdown: 10, 9, 8. Keep this in mind for everything that follows.

## Intercepting assignment with `__set__`

`__set__(self, instance, value)` runs when you assign to the attribute **through an instance**. It has no `owner_class` parameter, and there's no "class version" of it: `Point2D.x = 100` simply replaces the class attribute and doesn't call `__set__` at all.

```python run
class IntegerValue:
    def __set__(self, instance, value):
        print(f'__set__: instance={instance}, value={value}')

    def __get__(self, instance, owner_class):
        if instance is None:
            print('__get__ from class')
        else:
            print(f'__get__: instance={instance}')

class Point2D:
    x = IntegerValue()
    y = IntegerValue()

Point2D.x
p = Point2D()
p.x
p.x = 100
```

Our `__get__` returns nothing yet, so `p.x` evaluates to `None`. Which brings up the real question: **where should the value 100 be stored?**

## The tempting mistake: store it in the descriptor

Many examples online store the value on the descriptor itself:

```python run
class IntegerValue:
    def __set__(self, instance, value):
        self._value = int(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return self._value

class Point2D:
    x = IntegerValue()
    y = IntegerValue()

p1 = Point2D()
p1.x, p1.y = 1.1, 2.2
print(p1.x, p1.y)
```

That looks right, until a second point appears:

```python run
p2 = Point2D()
print('p2 before setting anything:', p2.x, p2.y)
p2.x = 100.9
print('p1.x after setting p2.x:', p1.x)
```

`p2` "inherited" `p1`'s values, and setting `p2.x` changed `p1.x`. There is one `IntegerValue` object for `x`, so there is one `_value` for *all* points. Storage on `self` is per-**class**, not per-instance.

This is exactly why `__get__` and `__set__` receive the `instance` argument: the descriptor has to use it to keep each instance's data separate. The next lessons look at the ways to do that.

<div class="takeaways">

## Key takeaways

- `__get__(self, instance, owner_class)`: `instance` is `None` for class access, and the instance otherwise.
- By convention, return `self` (the descriptor) when `instance is None`, just like `property` does.
- `__set__(self, instance, value)` intercepts assignment through an instance. Assigning through the class just replaces the class attribute.
- A descriptor is a class attribute, so **one descriptor object is shared by all instances**. State kept on `self` is shared state.
- To hold per-instance values, the descriptor must store them in a way that's keyed by `instance`.

</div>
