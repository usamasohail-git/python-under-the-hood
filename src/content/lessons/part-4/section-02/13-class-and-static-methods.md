---
title: Class and Static Methods
summary: "@classmethod binds a function to the class whether it's called from the class or an instance; @staticmethod never binds at all."
minutes: 16
---

## Three ways a function can behave

So far, a function defined in a class behaves differently depending on how you reach it:

```python run
class Person:
    def hello(arg='default'):
        print(f'Hello, with arg={arg}')

Person.hello()       # through the class: plain function

p = Person()
p.hello()            # through an instance: p is passed in
```

Through the class, nothing is passed; through an instance, the instance is passed. Sometimes neither is what we want:

- A function that needs the **class** (to read class attributes or create instances), however it's called. That's a **class method**.
- A function that needs **neither** the class nor the instance, but logically belongs with the class. That's a **static method**.

## Class methods

Decorating a function with `@classmethod` makes Python always pass the **class** as the first argument, whether you call it through the class or through an instance:

```python run
class MyClass:
    def hello():
        print('hello...')

    def instance_hello(arg):
        print(f'hello from {arg}')

    @classmethod
    def class_hello(arg):
        print(f'hello from {arg}')

m = MyClass()
```

`hello` takes no parameters, so it only works through the class. `instance_hello` is the opposite: through the class, nobody supplies its argument:

```python run
MyClass.hello()
try:
    m.hello()
except TypeError as ex:
    print('TypeError:', ex)

m.instance_hello()
try:
    MyClass.instance_hello()
except TypeError as ex:
    print('TypeError:', ex)
```

The class method works both ways, and receives the class both times:

```python run
MyClass.class_hello()
m.class_hello()
```

The binding is visible in the reprs: the class method is bound to the **class** on both routes, while the instance method is a plain function through the class and bound to the instance through an instance:

```python run
print(MyClass.class_hello)
print(m.class_hello)
print(MyClass.instance_hello)
print(m.instance_hello)
```

By convention the first parameter of a class method is called `cls` (as the first parameter of an instance method is called `self`).

A very common use of class methods is the **alternative constructor**: a second way of creating instances, for example from a different input format. Because it receives `cls`, it can call `cls(...)` to build the instance:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    @classmethod
    def from_string(cls, text):
        x, y = text.split(',')
        return cls(float(x), float(y))

pt = Point.from_string('1.5, -2')
print(type(pt).__name__, pt.x, pt.y)
```

The standard library is full of these: `dict.fromkeys`, `datetime.fromisoformat`, `int.from_bytes`. Using `cls` rather than hard-coding `Point` means the method also works for subclasses, which you'll appreciate in the inheritance section.

<div class="callout note">
<span class="callout-title">Not Java's `static`</span>

If you come from Java or C#, a Python **class method** is closer to a Java `static` method: it belongs to the class and is called through it. Python's **static** method is something else, described next.

</div>

## Static methods

A function decorated with `@staticmethod` is never bound to anything. It's called with exactly the arguments you pass, from the class or from an instance:

```python run
class MyClass:
    def instance_hello(self):
        print(f'Instance method bound to {self}')

    @classmethod
    def class_hello(cls):
        print(f'Class method bound to {cls}')

    @staticmethod
    def static_hello():
        print('Static method not bound to anything')

m = MyClass()
m.instance_hello()
MyClass.class_hello()
m.class_hello()

print(MyClass.static_hello)
print(m.static_hello)
MyClass.static_hello()
m.static_hello()
```

Use a static method for a helper that is specific to the class but doesn't use its state, such as a validation or conversion function. Keeping it in the class keeps the class self-contained. If the helper is useful outside the class, a module-level function is often the better home.

In the class namespace, the decorated functions are stored wrapped in `classmethod` and `staticmethod` objects. Like functions and properties, these are descriptors: they decide what you get back when the attribute is looked up.

```python run
for name in ('instance_hello', 'class_hello', 'static_hello'):
    print(name, type(MyClass.__dict__[name]).__name__)
```

## Example: a timer

Let's build a `Timer` class that uses all three kinds of methods. Requirements:

- one time zone, shared by **all** timers, that can be changed in one place
- a way to get the current time in UTC and in the configured time zone
- start/stop/elapsed for each individual timer

The shared time zone is a class attribute, and changing it is a job for a **class method**: it modifies class state and needs no instance.

```python run
from datetime import datetime, timezone, timedelta

class Timer:
    tz = timezone.utc          # shared by all instances

    @classmethod
    def set_tz(cls, offset, name):
        cls.tz = timezone(timedelta(hours=offset), name)

Timer.set_tz(-7, 'MST')
t1, t2 = Timer(), Timer()
print(t1.tz, t2.tz)

Timer.set_tz(-8, 'PST')
print(t1.tz, t2.tz)
```

Getting the current UTC time needs neither the class nor an instance: a **static method**. Getting the current time in the configured zone needs the class attribute `tz`, but no instance: a **class method**.

```python run
class Timer:
    tz = timezone.utc

    @staticmethod
    def current_dt_utc():
        return datetime.now(timezone.utc)

    @classmethod
    def set_tz(cls, offset, name):
        cls.tz = timezone(timedelta(hours=offset), name)

    @classmethod
    def current_dt(cls):
        return datetime.now(cls.tz)

t = Timer()
print(Timer.current_dt_utc().tzinfo, t.current_dt_utc().tzinfo)

t.set_tz(-7, 'MST')           # called via an instance, still sets the class attribute
print(Timer.tz, Timer.current_dt().tzinfo)
print('tz' in t.__dict__)
```

Because `set_tz` is bound to the class even when called through `t`, it changes `Timer.tz` for everybody rather than creating an instance attribute.

<div class="callout modern">
<span class="callout-title">Always use aware UTC datetimes</span>

`datetime.utcnow()` returns a *naive* datetime (no `tzinfo`), which is easy to mix up with local time, and it's deprecated since Python 3.12. Use `datetime.now(timezone.utc)` (or `datetime.now(datetime.UTC)` on 3.11+), which returns an *aware* datetime that knows it's UTC.

</div>

Finally, the timing itself is per timer, so it uses **instance methods** and **properties**. Internally everything is stored in UTC; the properties convert to the shared time zone only when the times are displayed.

```python run
class TimerError(Exception):
    """A custom exception used by the Timer class."""

class Timer:
    tz = timezone.utc

    def __init__(self):
        self._time_start = None
        self._time_end = None

    @staticmethod
    def current_dt_utc():
        return datetime.now(timezone.utc)

    @classmethod
    def set_tz(cls, offset, name):
        cls.tz = timezone(timedelta(hours=offset), name)

    @classmethod
    def current_dt(cls):
        return datetime.now(cls.tz)

    def start(self):
        self._time_start = self.current_dt_utc()
        self._time_end = None

    def stop(self):
        if self._time_start is None:
            raise TimerError('Timer must be started before it can be stopped.')
        self._time_end = self.current_dt_utc()

    @property
    def start_time(self):
        if self._time_start is None:
            raise TimerError('Timer has not been started.')
        return self._time_start.astimezone(self.tz)

    @property
    def end_time(self):
        if self._time_end is None:
            raise TimerError('Timer has not been stopped.')
        return self._time_end.astimezone(self.tz)

    @property
    def elapsed(self):
        if self._time_start is None:
            raise TimerError('Timer must be started before an elapsed time is available')
        end = self._time_end if self._time_end is not None else self.current_dt_utc()
        return (end - self._time_start).total_seconds()
```

Instance methods can call static and class methods through `self` (`self.current_dt_utc()`), and read class attributes through `self` (`self.tz`), thanks to the normal lookup rules.

```python run
from time import sleep

t1 = Timer()
try:
    t1.stop()
except TimerError as ex:
    print('TimerError:', ex)

t1.start()
sleep(0.2)
t1.stop()
print(f'Start: {t1.start_time}')
print(f'End:   {t1.end_time}')
print(f'Elapsed at least 0.2s: {t1.elapsed >= 0.2}')
```

Change the time zone once, and every timer reports its times in the new zone. The elapsed time doesn't change, since it never depended on the zone:

```python run
Timer.set_tz(-7, 'MST')
print(f'Start: {t1.start_time}')
print(f'End:   {t1.end_time}')
print(t1.start_time.tzname())
```

<div class="takeaways">

## Key takeaways

- **Instance methods** receive the instance (`self`); through the class they're plain functions.
- **Class methods** (`@classmethod`) always receive the class (`cls`), whether called through the class or an instance. Use them for class-level state and alternative constructors.
- **Static methods** (`@staticmethod`) receive nothing extra. Use them for helpers that belong with the class but need neither the class nor an instance.
- A class method called through an instance still modifies the **class**, not the instance.
- Prefer aware datetimes: `datetime.now(timezone.utc)` instead of the deprecated `utcnow()`.

</div>
