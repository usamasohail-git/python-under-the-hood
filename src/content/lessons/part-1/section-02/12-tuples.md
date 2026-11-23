---
title: Tuples
summary: Immutable sequences built by commas, not parentheses. Packing and unpacking, tuples as dictionary keys and records, and the limits of tuple immutability.
minutes: 11
---

## The comma makes the tuple

A `tuple` is an ordered, **immutable** sequence. You usually write one with parentheses, but it's actually the **comma** that creates it. The parentheses only group:

```python run
point = (3, 4)
also_point = 3, 4
print(point, also_point, type(also_point))
print(point == also_point)
```

That has a famous consequence for one-element tuples:

```python run
not_a_tuple = (1)
a_tuple = (1,)
also_a_tuple = 1,
print(type(not_a_tuple), type(a_tuple), type(also_a_tuple))
```

`(1)` is just the integer `1` in brackets, like `(2 + 3)`. The trailing comma is what you need. The empty tuple is the one exception: `()` on its own is a tuple.

The `tuple()` constructor turns any iterable into a tuple:

```python run
print((), tuple(), tuple('abc'), tuple([1, 2, 3]), tuple(range(3)))
```

## Indexing, slicing and operations

Tuples support everything a read-only sequence does: indexing, slicing, `len`, `in`, `+`, `*`, `min`, `max` and iteration. Slicing a tuple gives a new tuple:

```python run
t = (10, 20, 30, 40, 50)
print(t[0], t[-1], t[1:3], t[::-1])
print(len(t), 30 in t, t + (60,), (0,) * 3)
```

There are only two methods, because a tuple can't change:

| Method | What it does |
|---|---|
| `t.count(x)` | how many items equal `x` |
| `t.index(x)` | position of the first item equal to `x` (`ValueError` if missing) |

```python run
t = (1, 2, 2, 3, 2)
print(t.count(2), t.index(3))
```

There's no `append`, no `sort` and no item assignment:

```python run
try:
    t[0] = 99
except TypeError as ex:
    print('TypeError:', ex)
print(sorted(t))     # sorted() works, but returns a list
```

## Packing and unpacking

Writing `a, b, c` on the right of `=` **packs** values into a tuple. Writing names on the left **unpacks** an iterable into them. Together they give Python its neat swap idiom:

```python run
record = 'Ada', 1815, 'London'      # packing
name, year, city = record           # unpacking
print(name, year, city)

a, b = 1, 2
a, b = b, a                         # swap without a temporary variable
print(a, b)
```

The number of names must match the number of values, unless you use a starred name to collect "the rest" into a list:

```python run
first, *rest = (1, 2, 3, 4)
print(first, rest)
head, *middle, tail = 'python'
print(head, middle, tail)
try:
    x, y = (1, 2, 3)
except ValueError as ex:
    print('ValueError:', ex)
```

Unpacking also works in `for` loops, and functions use tuples to return several values:

```python run
def min_max(values):
    return min(values), max(values)    # returns one tuple

lo, hi = min_max([4, 9, 1, 7])
print(lo, hi)

for name, score in [('ann', 90), ('bo', 78)]:
    print(f'{name}: {score}')
```

## Tuples as records

Lists are typically used for many items *of the same kind*; tuples are often used as fixed-size **records**, where each position has a meaning: `(x, y)`, `(name, year, city)`. Because the structure never changes, position `1` always means "year".

For readability you can give the positions names with `collections.namedtuple` (or `typing.NamedTuple`). A named tuple is still a tuple, so indexing and unpacking keep working:

```python run
from collections import namedtuple

Point = namedtuple('Point', 'x y')
p = Point(3, 4)
print(p, p.x, p[1])
x, y = p
print(x + y, isinstance(p, tuple))
```

## Hashable, so they can be keys

Because tuples are immutable, a tuple of hashable items is itself hashable. That means it can be a dictionary key or a set member, which lists can't be:

```python run
distances = {('Paris', 'Rome'): 1420, ('Rome', 'Oslo'): 2560}
print(distances[('Paris', 'Rome')])

try:
    {['Paris', 'Rome']: 1420}
except TypeError as ex:
    print('TypeError:', ex)
```

## Immutable, but only one level deep

A tuple fixes **which objects** it contains. If one of those objects is mutable, that object can still change:

```python run
t = (1, [2, 3])
t[1].append(4)
print(t)
try:
    hash(t)
except TypeError as ex:
    print('TypeError:', ex)
```

The tuple still holds the same list, so in that sense it never changed, but its value did. Such a tuple isn't hashable, because the list inside isn't.

<div class="callout note">
<span class="callout-title">Why choose a tuple over a list?</span>

Use a tuple when the collection shouldn't change: it documents the intent, protects the data from accidental modification, and lets you use it as a key. Tuples are also slightly lighter than lists, and tuple literals of constants can be built once when the code is compiled.

</div>

<div class="callout modern">
<span class="callout-title">Changing a named tuple: `copy.replace` (Python 3.13)</span>

You can't modify a named tuple, but you can make a modified copy. Named tuples have long had `_replace`; Python 3.13 adds the generic `copy.replace`, which also works for dataclasses and several other types:

```python run
import copy
p2 = copy.replace(p, y=10)
print(p, p2)
```

</div>

<div class="callout note">
<span class="callout-title">Where to go deeper</span>

[Part 1 · Tuples as Data Records](/part-1/section-08/) covers tuples as records, extended unpacking and named tuples in depth. Shared references and what "immutable" really guarantees are explained in [Part 1 · Variables and Memory](/part-1/section-03/).

</div>

<div class="takeaways">

## Key takeaways

- The comma makes a tuple: `(1)` is an `int`, `(1,)` is a tuple; `()` is the empty tuple.
- Tuples support indexing, slicing and the read-only sequence operations, plus `count` and `index`.
- Packing and unpacking (`a, b = b, a`, `first, *rest = t`) are everyday tuple idioms.
- Tuples work well as fixed-structure records; `namedtuple` adds field names.
- A tuple of hashable items is hashable, so it can be a dict key or a set member.
- Immutability is shallow: a mutable object inside a tuple can still change.

</div>
