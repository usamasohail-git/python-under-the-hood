---
title: Decorator Application (Decorating Classes)
summary: A decorator can take a class instead of a function, modify it, and return it. We use this to add debug info and complete a class's comparison operators, then meet functools.total_ordering.
minutes: 15
---

## Classes are objects too

A decorator receives an object and returns an object. So far that object was a function, but a `class` statement also just creates an object and binds it to a name. That means this works:

```python
@my_class_decorator
class Thing:
    ...

# is the same as

class Thing:
    ...
Thing = my_class_decorator(Thing)
```

A class decorator usually doesn't wrap the class in a closure. Instead it **modifies the class in place** (adds or replaces attributes) and returns that same class.

## Monkey patching

Changing a class (or module) at run time, after it has been defined, is called **monkey patching**. Classes written in Python, including many in the standard library, can be patched. Built-in types implemented in C, like `str` or `list`, can't.

```python run
from fractions import Fraction

Fraction.is_integral = lambda self: self.denominator == 1

f1, f2 = Fraction(1, 2), Fraction(10, 5)
print(f1.is_integral(), f2.is_integral())

try:
    str.shout = lambda self: self.upper()
except TypeError as ex:
    print('TypeError:', ex)
```

Every `Fraction`, including ones created earlier, now has an `is_integral` method, because methods are looked up on the class at call time.

<div class="callout tip">
<span class="callout-title">Just because you can...</span>

Patching a library class changes it for **all** code in the program, which can surprise other people's code and break when the library is updated. Do it only for a good reason (tests and well-defined plug-in points are common ones). Patching special methods like `__len__` on an *instance* also doesn't work as you might hope, since Python looks those up on the class.

</div>

Let's undo our patch so it doesn't leak into anything else:

```python run
del Fraction.is_integral
print(hasattr(Fraction(1, 2), 'is_integral'))
```

## Patching with a function: a class decorator

Put the patch inside a function that takes the class and returns it, and you have a class decorator:

```python run
def dec_speak(cls):
    cls.speak = lambda self: 'This is a very late parrot.'
    return cls

@dec_speak
class Parrot:
    def __init__(self):
        self.state = 'late'

polly = Parrot()
polly.speak()
```

A decorator earns its keep when it's **reusable** across many classes. Here's a more useful one.

## Example: adding debug information

When debugging, it's handy to dump an object's class, identity and attributes. `vars(obj)` returns an instance's attribute dictionary. This decorator adds a `debug()` method to any class:

```python run
from datetime import datetime, timezone

def debug_info(cls):
    def info(self):
        results = [
            f'time: {datetime.now(timezone.utc)}',
            f'class: {self.__class__.__name__}',
            f'id: {hex(id(self))}',
        ]
        results.extend(f'{k}: {v}' for k, v in vars(self).items())
        return results

    cls.debug = info
    return cls

@debug_info
class Person:
    def __init__(self, name, birth_year):
        self.name = name
        self.birth_year = birth_year

@debug_info
class Automobile:
    def __init__(self, make, model, year, top_speed_mph):
        self.make = make
        self.model = model
        self.year = year
        self.top_speed_mph = top_speed_mph
        self.current_speed = 0

print(Person('John', 1939).debug())

car = Automobile('Ford', 'Model T', 1908, 45)
car.current_speed = 20
for line in car.debug():
    print(line)
```

## Example: completing the comparison operators

Here's a `Point` class. Out of the box, `==` compares identity and `<` isn't supported at all:

```python run
from math import sqrt

class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __abs__(self):
        return sqrt(self.x ** 2 + self.y ** 2)

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

p1, p2 = Point(2, 3), Point(2, 3)
print(p1 == p2)          # False: different objects
try:
    p1 < p2
except TypeError as ex:
    print('TypeError:', ex)
```

Let's define `==` (same coordinates) and `<` (closer to the origin). Returning the special value `NotImplemented` for unsupported types tells Python to try the other operand, and eventually raise a proper `TypeError`:

```python run
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __abs__(self):
        return sqrt(self.x ** 2 + self.y ** 2)

    def __eq__(self, other):
        if isinstance(other, Point):
            return self.x == other.x and self.y == other.y
        return NotImplemented

    def __lt__(self, other):
        if isinstance(other, Point):
            return abs(self) < abs(other)
        return NotImplemented

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

p1, p2, p4 = Point(2, 3), Point(2, 3), Point(1, 2)
print(p1 == p2, p1 < p4, p1 > p4)
try:
    p1 <= p4
except TypeError as ex:
    print('TypeError:', ex)
```

`p1 > p4` worked even though we never wrote `__gt__`. When the left operand doesn't support `>`, Python tries the **reflected** operation on the right operand: `p4 < p1`. But nothing reflects `<=` into `<` or `==`, so `<=` (and `>=`) still fail.

Given `==` and `<`, the others follow logically:

- `a <= b` is `a < b or a == b`
- `a > b` is `not (a < b) and a != b`
- `a >= b` is `not (a < b)`

That's a job for a reusable class decorator. Here's a simple (deliberately naive) version:

```python run
def complete_ordering(cls):
    # look in the class's own namespace: dir(cls) would also show the
    # inherited object.__eq__ and object.__lt__, which every class has
    if '__eq__' in vars(cls) and '__lt__' in vars(cls):
        cls.__le__ = lambda self, other: self < other or self == other
        cls.__gt__ = lambda self, other: not (self < other) and not (self == other)
        cls.__ge__ = lambda self, other: not (self < other)
    return cls

Point = complete_ordering(Point)

p1, p2, p3 = Point(1, 1), Point(3, 4), Point(3, 4)
print(abs(p1), abs(p2), abs(p3))
print(p1 < p2, p1 <= p2, p1 > p2, p1 >= p2, p2 > p3, p2 >= p3)
```

And because it's a decorator, any class with `__eq__` and `__lt__` can use it:

```python run
@complete_ordering
class Grade:
    def __init__(self, score, max_score):
        self.score = score
        self.max_score = max_score
        self.score_percent = round(score / max_score * 100)

    def __repr__(self):
        return f'Grade({self.score}, {self.max_score})'

    def __eq__(self, other):
        if isinstance(other, Grade):
            return self.score_percent == other.score_percent
        return NotImplemented

    def __lt__(self, other):
        if isinstance(other, Grade):
            return self.score_percent < other.score_percent
        return NotImplemented

g1, g2, g3 = Grade(10, 100), Grade(20, 30), Grade(5, 50)
print(g1 <= g2, g1 == g3, g2 > g3)
```

<div class="callout note">
<span class="callout-title">Why "naive"?</span>

Our lambdas use the operators `<` and `==` directly and never return `NotImplemented`. Comparing a `Grade` with, say, a string then produces confusing errors from deep inside the lambda instead of a clean `TypeError`, and in some combinations operator reflection can even bounce back and forth. A robust version calls `self.__lt__(other)` itself and passes `NotImplemented` through. That's fiddly to get right for every operator, which is exactly why the standard library does it for us.

</div>

## `functools.total_ordering`

`functools.total_ordering` is the production-quality version of our decorator. Define `__eq__` plus **any one** of `__lt__`, `__le__`, `__gt__` or `__ge__`, and it fills in the rest, handling `NotImplemented` correctly:

```python run
from functools import total_ordering

@total_ordering
class Grade:
    def __init__(self, score, max_score):
        self.score = score
        self.max_score = max_score
        self.score_percent = round(score / max_score * 100)

    def __repr__(self):
        return f'Grade({self.score}, {self.max_score})'

    def __eq__(self, other):
        if isinstance(other, Grade):
            return self.score_percent == other.score_percent
        return NotImplemented

    def __gt__(self, other):         # this time we only define >
        if isinstance(other, Grade):
            return self.score_percent > other.score_percent
        return NotImplemented

g1, g2 = Grade(80, 100), Grade(60, 100)
print(g1 >= g2, g1 > g2, g1 <= g2, g1 < g2)

try:
    g1 < 'A+'
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Dataclasses: a class decorator you'll use every day</span>

Since Python 3.7, `@dataclasses.dataclass` is the most common class decorator of all. It reads the class's annotated fields and **generates** `__init__`, `__repr__` and `__eq__`, and with `order=True` also all four ordering methods (comparing fields as tuples, in order):

```python run
from dataclasses import dataclass

@dataclass(order=True)
class Version:
    major: int
    minor: int

print(Version(3, 13), Version(3, 9) < Version(3, 13))
```

Note it's used as `@dataclass(order=True)`: a decorator factory, just like the ones from the previous lessons.

</div>

<div class="takeaways">

## Key takeaways

- A class decorator receives a class, usually modifies it (adds or replaces attributes), and returns it: `Cls = dec(Cls)`.
- **Monkey patching** changes classes at run time. Python classes can be patched; C built-ins like `str` can't. Use it sparingly.
- Comparison methods should return `NotImplemented` for unsupported types. Python reflects `a > b` into `b < a` automatically, but doesn't derive `<=` or `>=`.
- `functools.total_ordering` derives the missing ordering methods from `__eq__` plus one of `<`, `<=`, `>`, `>=`.
- `@dataclass(order=True)` generates init, repr, equality and ordering for data-holding classes.

</div>
