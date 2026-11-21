---
title: Sequence Types
summary: A sequence is an ordered collection whose items are reached by integer position. Lists, tuples, strings and ranges all share the same core operations.
minutes: 14
---

## What makes a sequence

A **sequence** is a collection whose items are ordered by position: there is a first item, a second item, and so on. Python numbers those positions starting at `0`, so the first item has index `0`, the second has index `1`, and the last has index `len(seq) - 1`.

Python ships with several built-in sequence types:

| Mutable | Immutable |
|---|---|
| `list` | `tuple` |
| `bytearray` | `str` |
| `array.array` | `bytes` |
| `collections.deque` (mostly) | `range` |

The two columns differ only in whether you can change the sequence after it's created. For immutable ones you can read items but not replace, add or remove them:

```python run
t = (1, 2, 3)
print(t[0])
try:
    t[0] = 100
except TypeError as ex:
    print('TypeError:', ex)
```

Remember from Part 1 that a container holds **references**. An immutable sequence can't change *which* objects it refers to, but if one of those objects is mutable, the object itself can still change:

```python run
t = ([1, 2], 3, 4)
t[0][0] = 100     # mutating the list inside, not the tuple
t
```

## Iterables vs sequences

An **iterable** is anything you can loop over with `for`. Every sequence is iterable, but not every iterable is a sequence. A `set` is iterable, yet it has no positions, so the order you see is an implementation detail and `s[0]` makes no sense:

```python run
t = (10, 'a', 1+3j)
s = {10, 'a', 1+3j}

print([c for c in t])     # always the tuple's order
print([c for c in s])     # some order, not guaranteed
try:
    s[0]
except TypeError as ex:
    print('TypeError:', ex)
```

You can ask Python whether a type follows the sequence protocol with the abstract base classes in `collections.abc`:

```python run
from collections.abc import Sequence, MutableSequence

for obj in ([1, 2], (1, 2), 'ab', range(3), {1, 2}):
    print(f'{type(obj).__name__:6} Sequence={isinstance(obj, Sequence)!s:5} '
          f'MutableSequence={isinstance(obj, MutableSequence)}')
```

## Operations every sequence supports

### Membership, length, min and max

`in` and `not in` scan the sequence for an equal element. For most sequences this is a linear search; `range` is smart enough to answer with arithmetic for integers.

```python run
print('a' in ['a', 'b', 100])
print(100 in range(200))
print(len('python'), len([1, 2, 3]), len({10, 20, 30}), len({'a': 1, 'b': 2}))
```

`len` also works on many non-sequences (sets and dicts above). `min` and `max` work on any iterable whose elements can be **ordered** with `<`:

```python run
print(min([100, 300, 200]), max([100, 300, 200]))
print(min('python'), max('python'))      # characters compare by code point
print(min(range(10, 200)), max(range(10, 200)))
```

Mixed types are fine as long as every pair is comparable. Integers, floats and `Decimal` all compare with each other, but strings and integers don't, and complex numbers have no ordering at all:

```python run
from decimal import Decimal

t = 10, 20.5, Decimal('30.5')
print(min(t), max(t))

for data in (['a', 10, 1000], [1+1j, 2+2j]):
    try:
        min(data)
    except TypeError as ex:
        print('TypeError:', ex)
```

### Concatenation and repetition

`+` joins two sequences and `*` repeats one an integer number of times. The result is a **new** object of the same type, which is why you can't concatenate a tuple with a list: Python wouldn't know which type to return.

```python run
print([1, 2, 3] + [4, 5, 6])
print((1, 2, 3) + (4, 5, 6))
print('abc' * 3, [0] * 5)

try:
    (1, 2, 3) + [4, 5, 6]
except TypeError as ex:
    print('TypeError:', ex)
```

Convert to a common type first when you really need to mix them:

```python run
print((1, 2, 3) + tuple([4, 5, 6]))
print(''.join(tuple('abc') + ('d', 'e', 'f')))
```

### Finding an element

`seq.index(x)` returns the position of the first item equal to `x`. Optional `start` and `stop` arguments restrict the search. If nothing is found you get a `ValueError`, so catch it when "not found" is a normal outcome:

```python run
s = "gnu's not unix"
print(s.index('n'), s.index('n', 2), s.index('n', 8))
print(s.count('n'))

try:
    s.index('n', 13)
except ValueError as ex:
    print('ValueError:', ex)
```

These searches make no assumptions about order: they walk the sequence item by item. If your data is sorted, the `bisect` module can find positions much faster with binary search.

### Slicing

Every built-in sequence supports slicing, and a slice returns the **same type** as the sequence being sliced (even a `range`). A whole lesson is coming up on slicing; for now, a taste:

```python run
s = 'python'
l = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
r = range(11)

print(s[0:3], s[4:1000], s[:3], s[3:])
print(l[0:3], l[::2], s[::-1])
print(r[:5], list(r[:5]))
```

Notice that `s[4:1000]` didn't complain: slice bounds are clipped to the sequence, unlike plain indexing.

## Hashing

Immutable sequences are usually **hashable**, which means they can be dictionary keys or set members. Mutable sequences are not, because a hash must never change during an object's lifetime:

```python run
print(hash((1, 2, 3)) == hash((1, 2, 3)))
print(hash(range(10)) == hash(range(10)))

for obj in ([1, 2, 3], (1, 2, [10, 20])):
    try:
        hash(obj)
    except TypeError as ex:
        print('TypeError:', ex)
```

The second case is the important one: a tuple is only hashable if **all** of its elements are hashable. A tuple containing a list could still change, so Python refuses to hash it. (Sets behave the same way: `set` is unhashable, `frozenset` is hashable.) Hashing gets its own treatment in Part 3.

<div class="callout note">
<span class="callout-title">Hash values change between runs</span>

For strings and bytes, Python randomizes hashing each time the interpreter starts, so `hash('123')` prints a different number in every session. That's why the cells above compare hashes instead of printing them.

</div>

## The repetition trap

Concatenation and repetition copy **references**, not objects. With immutable items you'll never notice. With mutable items it causes one of the most common bugs in Python:

```python run
x = [[0, 0]]
m = x * 3
print(m, m[0] is m[1] is m[2])

m[0][0] = 100
print(m)
print(x)
```

`m` holds three references to the *same* inner list (and so does `x`), so changing "one" row changes them all. If you want independent rows, build each one separately, for example with a comprehension:

```python run
m = [[0, 0] for _ in range(3)]
m[0][0] = 100
m
```

<div class="takeaways">

## Key takeaways

- A sequence is an iterable whose items are ordered and indexed from `0`. Sets and dicts are iterable but not sequences.
- All sequences support `in`, `len`, `min`/`max` (if items are orderable), `+`, `*`, `index`, `count` and slicing.
- `+`, `*` and slicing return a new object of the same type.
- Immutable sequences are hashable only if every element is hashable.
- `[[0]] * 3` repeats one reference three times. Use a comprehension to create independent mutable items.

</div>
