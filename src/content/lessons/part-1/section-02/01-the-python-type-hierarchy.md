---
title: The Python Type Hierarchy
summary: A map of the built-in types you'll meet throughout these four parts (numbers, collections, callables and singletons) and how Python itself groups them.
minutes: 10
---

## Why a map?

Python has many built-in types, and they aren't a flat list. They fall into families that share behavior: every *sequence* can be indexed and sliced, every *mapping* looks values up by key, every *callable* can be called with `()`. Knowing which family a type belongs to tells you most of what you can do with it.

Here is the part of the hierarchy that the rest of the material explores in depth:

<figure class="diagram">
<svg viewBox="0 0 640 430" role="img" aria-label="Tree of Python built-in types: numbers, collections, callables and singletons">
<rect x="10" y="10" width="140" height="34" rx="8" class="d-name"/><text x="80" y="32" text-anchor="middle" class="d-text">Numbers</text>
<rect x="30" y="58" width="120" height="28" rx="6" class="d-obj"/><text x="40" y="77" class="d-sub">Integral</text>
<text x="44" y="104" class="d-text">int, bool</text>
<rect x="30" y="118" width="120" height="28" rx="6" class="d-obj"/><text x="40" y="137" class="d-sub">Non-integral</text>
<text x="44" y="164" class="d-text">float, complex</text>
<text x="44" y="184" class="d-text">Decimal, Fraction</text>
<rect x="170" y="10" width="300" height="34" rx="8" class="d-name"/><text x="320" y="32" text-anchor="middle" class="d-text">Collections</text>
<rect x="170" y="58" width="96" height="28" rx="6" class="d-obj"/><text x="180" y="77" class="d-sub">Sequences</text>
<text x="176" y="104" class="d-sub">mutable</text><text x="176" y="122" class="d-text">list</text>
<text x="176" y="144" class="d-sub">immutable</text><text x="176" y="162" class="d-text">tuple, str</text>
<rect x="276" y="58" width="90" height="28" rx="6" class="d-obj"/><text x="286" y="77" class="d-sub">Sets</text>
<text x="282" y="104" class="d-sub">mutable</text><text x="282" y="122" class="d-text">set</text>
<text x="282" y="144" class="d-sub">immutable</text><text x="282" y="162" class="d-text">frozenset</text>
<rect x="376" y="58" width="94" height="28" rx="6" class="d-obj"/><text x="386" y="77" class="d-sub">Mappings</text>
<text x="382" y="104" class="d-text">dict</text>
<rect x="490" y="10" width="140" height="34" rx="8" class="d-name"/><text x="560" y="32" text-anchor="middle" class="d-text">Singletons</text>
<text x="504" y="70" class="d-text">None</text>
<text x="504" y="90" class="d-text">NotImplemented</text>
<text x="504" y="110" class="d-text">Ellipsis (...)</text>
<rect x="10" y="230" width="620" height="34" rx="8" class="d-name"/><text x="320" y="252" text-anchor="middle" class="d-text">Callables</text>
<text x="24" y="292" class="d-text">user-defined functions</text>
<text x="24" y="314" class="d-text">generator functions</text>
<text x="24" y="336" class="d-text">classes</text>
<text x="250" y="292" class="d-text">instance methods</text>
<text x="250" y="314" class="d-text">class instances with __call__</text>
<text x="470" y="292" class="d-text">built-in functions</text>
<text x="470" y="314" class="d-text">built-in methods</text>
<text x="24" y="380" class="d-sub">Everything that can be called with (): it's a family defined by behavior, not by one base class.</text>
</svg>
<figcaption>The subset of Python's type hierarchy covered in depth across Parts 1–4.</figcaption>
</figure>

## Numbers

Numbers split into **integral** numbers (whole numbers) and **non-integral** ones.

- `int`: integers of any size. Python integers never overflow.
- `bool`: `True` and `False`. Surprisingly, `bool` is a *subclass of `int`*: `True` behaves like `1` and `False` like `0`.
- `float`: real numbers stored in binary (a C `double` under the hood), so most decimal fractions are approximations.
- `complex`: numbers with a real and an imaginary part, like `3+4j`.
- `Decimal` (module `decimal`): decimal arithmetic with precision you control, useful for money.
- `Fraction` (module `fractions`): exact rational numbers such as 1/3.

```python run
from decimal import Decimal
from fractions import Fraction

print(isinstance(True, int), True + True)
print(0.1 + 0.2 == 0.3)                                    # binary floats are approximate
print(Decimal('0.1') + Decimal('0.2') == Decimal('0.3'))   # decimal arithmetic is exact here
print(Fraction(1, 3) * 3 == 1)                             # 1/3 is exact as a Fraction
```

Why have so many? A float can't store one third exactly: `0.333…` would need infinitely many digits. If you need `1/3 + 1/3 + 1/3` to be *exactly* `1`, you need `Fraction`.

Python also describes these families formally in the `numbers` module, so you can ask about a family rather than a specific type:

```python run
import numbers

for value in (7, True, 2.5, 3+4j, Fraction(1, 3), Decimal('1.5')):
    print(f'{value!r:>22}  Integral={isinstance(value, numbers.Integral)!s:5}  '
          f'Real={isinstance(value, numbers.Real)!s:5}  Number={isinstance(value, numbers.Number)}')
```

Notice that `Decimal` is a `Number` but deliberately *not* a `Real`: it doesn't mix freely with floats. Part 1 · Section 04 covers all of these types in detail.

## Collections

Collections hold other objects. There are three big groups:

- **Sequences**: ordered and indexable by position. `list` is mutable; `tuple` and `str` are immutable.
- **Sets**: unordered collections of unique items. `set` is mutable; `frozenset` is its immutable twin.
- **Mappings**: look up values by key. The built-in mapping is `dict`.

Sets and dictionaries are closely related: both are **hash tables**. A set is essentially a dictionary that only stores keys. That's why both need their elements or keys to be hashable, and why both offer very fast membership tests. Part 3 is all about them.

The `collections.abc` module defines these families too, which is handy for checking what an object supports:

```python run
from collections.abc import Sequence, MutableSequence, Set, MutableSet, Mapping

samples = {'list': [1, 2], 'tuple': (1, 2), 'str': 'ab',
           'set': {1, 2}, 'frozenset': frozenset({1, 2}), 'dict': {'a': 1}}

for name, obj in samples.items():
    kinds = [abc.__name__ for abc in (Sequence, MutableSequence, Set, MutableSet, Mapping)
             if isinstance(obj, abc)]
    print(f'{name:>9}: {", ".join(kinds)}')
```

## Callables

A **callable** is anything you can call with parentheses. This family is defined by *behavior*, and it's bigger than you might expect:

- user-defined functions (`def` and `lambda`)
- generator functions (functions that `yield`), which you'll study in Part 2. Calling one returns a generator object, which is iterable but not itself callable
- classes: calling a class creates an instance
- instance methods: functions bound to an object
- class instances that define `__call__`
- built-in functions like `len` and `open`, and built-in methods like `list.append`

The built-in `callable()` tells you whether an object can be called:

```python run
def greet(name):
    return f'Hello, {name}'

def countdown(n):
    while n > 0:
        yield n
        n -= 1

class Multiplier:
    def __init__(self, factor):
        self.factor = factor
    def __call__(self, x):            # makes *instances* callable
        return x * self.factor

double = Multiplier(2)
things = [greet, countdown, Multiplier, double, double.__call__, len, [].append, 42, 'text']

for obj in things:
    print(f'{type(obj).__name__:>26}  callable: {callable(obj)}')

print(double(21))
```

`Multiplier` (the class) and `double` (an instance) are both callable, but for different reasons: calling the class builds an object, and calling the instance runs `__call__`. Part 4 explains how this works.

## Singletons

A few objects exist exactly once in a running program:

- `None`: "no value". Every reference to `None` points to the same object.
- `NotImplemented`: a special value that operator methods like `__eq__` or `__add__` return to say "I don't know how to handle that type". You'll meet it in Part 4.
- `Ellipsis`, also written `...`: used in slicing by some libraries, and often as a placeholder.

```python run
a = None
b = None
print(a is b, type(None).__name__)
print(... is Ellipsis, type(...).__name__)
print(type(NotImplemented).__name__)
```

Because each exists only once, you test for them with `is`: `if x is None:`.

<div class="callout note">
<span class="callout-title">Only a subset</span>

The real hierarchy is larger: `bytes` and `bytearray`, `range`, `memoryview`, modules, code objects, and more. The diagram shows the types this material studies in depth; the others appear where they're useful.

</div>

<div class="takeaways">

## Key takeaways

- Numbers are integral (`int`, `bool`) or non-integral (`float`, `complex`, `Decimal`, `Fraction`). `bool` is a subclass of `int`.
- Collections are sequences (mutable `list`; immutable `tuple`, `str`), sets (`set`, `frozenset`) and mappings (`dict`). Sets and dicts are both hash tables.
- Callables are anything you can call: functions (including generator functions), classes, methods, built-ins, and instances with `__call__`.
- `None`, `NotImplemented` and `Ellipsis` are singletons, so compare them with `is`.
- The `numbers` and `collections.abc` modules let you test which family an object belongs to.

</div>
