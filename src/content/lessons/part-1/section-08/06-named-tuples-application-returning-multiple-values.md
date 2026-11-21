---
title: Named Tuples - Application - Returning Multiple Values
summary: Return a named tuple instead of a bare tuple, and callers can use the result by name while existing unpacking code keeps working.
minutes: 8
---

## Returning a plain tuple

A function returns a single object, but that object can be a tuple, so returning "several values" is easy:

```python run
from random import randint, random, seed

def random_color():
    red = randint(0, 255)
    green = randint(0, 255)
    blue = randint(0, 255)
    alpha = round(random(), 2)
    return red, green, blue, alpha

seed(42)
print(random_color())

red, green, blue, alpha = random_color()
print(f'{red=}, {green=}, {blue=}, {alpha=}')
```

(The `f'{red=}'` form, Python 3.8+, prints both the expression and its value.)

This is fine when the caller immediately unpacks the result. It's less fine when the result is passed around as one value: `color[3]` says nothing about what it means, and the caller must know the order of the four values.

## Returning a named tuple

Define a named tuple for the result, and return an instance of it:

```python run
from collections import namedtuple

Color = namedtuple('Color', 'red green blue alpha')

def random_color():
    red = randint(0, 255)
    green = randint(0, 255)
    blue = randint(0, 255)
    alpha = round(random(), 2)
    return Color(red, green, blue, alpha)

color = random_color()
print(color)
print(color.alpha)
```

Callers can use fields by name, and the repr tells you what each number is. Because a named tuple **is** a tuple, nothing breaks for callers that already unpack or index:

```python run
r, g, b, a = random_color()      # old-style unpacking still works
print(r, g, b, a)
print(color[0] == color.red)
```

That makes switching a function from a plain tuple to a named tuple a backward-compatible change, as long as you don't change the order or the number of fields.

## The standard library does this too

Python itself uses named tuples (or tuple-like "struct sequences" that behave the same way) for many multi-valued results:

```python run
import sys, time
from urllib.parse import urlsplit

print(sys.version_info)
print(sys.version_info.major, sys.version_info[:2] >= (3, 8))

parts = urlsplit('https://example.com:8080/path?q=1')
print(parts.hostname, parts.port, parts.query)

t = time.gmtime(0)
print(t.tm_year, t[0])
```

`sys.version_info[:2] >= (3, 8)` is a common idiom: it treats the result as a tuple and compares it with another tuple, while `sys.version_info.major` uses it as a record.

## Returning statistics

A more realistic example: a function that summarizes a list of numbers. With a named tuple, the caller decides how much of the result to use, and the code that uses it documents itself.

```python run
from statistics import mean, median

Summary = namedtuple('Summary', 'count minimum maximum mean median')

def summarize(values):
    return Summary(len(values), min(values), max(values), mean(values), median(values))

s = summarize([3, 1, 4, 1, 5, 9, 2, 6])
print(s)
print(s.maximum - s.minimum)

count, *_, middle = s
print(count, middle)
```

## Modern alternative: `typing.NamedTuple`

For return types, the class syntax is especially convenient because the field types document what the function returns, and type checkers and IDEs can use them:

```python run
from typing import NamedTuple

class MinMax(NamedTuple):
    minimum: float
    maximum: float

def min_max(values) -> MinMax:
    return MinMax(min(values), max(values))

result = min_max([3.5, -1, 7])
print(result)
low, high = result
print(low, high, result.maximum)
```

A dataclass would also work as a return value, but callers couldn't unpack it, so for "several values at once" a named tuple is usually the better fit.

<div class="takeaways">

## Key takeaways

- Returning a tuple is Python's way of returning multiple values; callers typically unpack it.
- Returning a **named tuple** gives each value a name, a self-describing repr, and keeps tuple behavior.
- Existing unpacking and indexing code keeps working, so it's a safe upgrade (as long as field order and count stay the same).
- The standard library uses the same pattern (`sys.version_info`, `urlsplit`, `time.gmtime`).
- `typing.NamedTuple` adds type information to the returned record.

</div>
