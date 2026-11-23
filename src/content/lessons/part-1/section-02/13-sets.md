---
title: Sets
summary: Unordered collections of unique, hashable items. Fast membership tests, set algebra, set comprehensions, frozenset, and why {} is not an empty set.
minutes: 11
---

## Creating sets

A `set` is an unordered collection of **unique** items. Write the items in curly braces, or pass any iterable to `set()`. Duplicates simply disappear:

```python run
primes = {2, 3, 5, 7, 7, 3}
print(primes, len(primes))
print(sorted(set('mississippi')))
print(set([1, 1, 2, 3, 3, 3]))
```

(Here and below, sets of strings are wrapped in `sorted()` before printing. String hashes change from one run of Python to the next, so the display order of a string set can change too.)

### `{}` is a dict, not a set

Curly braces were used for dictionaries long before sets got a literal syntax, so empty braces still mean an empty **dict**. The only way to write an empty set is `set()`:

```python run
print(type({}), type(set()))
print(set())
```

A **set comprehension** uses braces around a comprehension:

```python run
words = ['apple', 'Avocado', 'banana', 'Blueberry', 'cherry']
initials = {w[0].lower() for w in words}
print(sorted(initials))
```

## Items must be hashable

Sets are implemented as **hash tables**: each item's hash decides where it is stored. Items therefore must be hashable, which in practice means immutable: numbers, strings, tuples of hashable items, `frozenset`s. Lists, dicts and sets can't be members:

```python run
ok = {1, 'two', (3, 4)}
print(len(ok))
try:
    {[1, 2], [3]}
except TypeError as ex:
    print('TypeError:', ex)
```

Because a set has no order, there's no indexing or slicing either. `s[0]` is a `TypeError`.

## Fast membership tests

The hash table is the reason sets exist. `x in my_list` checks items one by one, whereas `x in my_set` jumps straight to where `x` would be. For large collections the difference is dramatic:

```python run
import timeit

data_list = list(range(100_000))
data_set = set(data_list)
print('list:', timeit.timeit(lambda: 99_999 in data_list, number=100))
print('set: ', timeit.timeit(lambda: 99_999 in data_set, number=100))
```

The exact timings vary, but the set lookup is faster by orders of magnitude. If you test membership repeatedly, convert to a set first.

Removing duplicates is the other everyday use. If you need to keep the original order, `dict.fromkeys` does it, because dictionaries remember insertion order:

```python run
items = [3, 1, 3, 2, 1, 5]
print(sorted(set(items)))
print(list(dict.fromkeys(items)))   # unique, original order kept
```

## Set algebra

Sets support the operations you know from mathematics, both as operators (both sides must be sets) and as methods (which accept any iterable):

| Operation | Operator | Method |
|---|---|---|
| union: in either | `a \| b` | `a.union(it)` |
| intersection: in both | `a & b` | `a.intersection(it)` |
| difference: in `a` but not `b` | `a - b` | `a.difference(it)` |
| symmetric difference: in exactly one | `a ^ b` | `a.symmetric_difference(it)` |
| subset / superset | `a <= b`, `a >= b` | `a.issubset(it)`, `a.issuperset(it)` |
| no common items | | `a.isdisjoint(it)` |

```python run
a = {1, 2, 3, 4}
b = {3, 4, 5}
print(a | b, a & b, a - b, b - a, a ^ b)
print({1, 2} <= a, {1, 2} < a, a.isdisjoint({9}))
print(a.union([10, 11]))        # methods accept any iterable
```

A practical example: which required fields are missing?

```python run
required = {'name', 'email', 'age'}
submitted = {'name': 'Ada', 'age': 36}
print(sorted(required - submitted.keys()))
```

(Dictionary key views behave like sets, so `-` works with them directly.)

## Modifying a set

| Method | What it does |
|---|---|
| `s.add(x)` | add one item |
| `s.update(iterable)` | add every item (also `\|=`) |
| `s.remove(x)` | remove `x`; `KeyError` if missing |
| `s.discard(x)` | remove `x` if present; no error otherwise |
| `s.pop()` | remove and return an arbitrary item |
| `s.clear()` | remove everything |

```python run
s = {1, 2}
s.add(3)
s.add(2)              # already there: no effect
s.update([4, 5])
s.discard(10)         # silently ignored
print(s)
try:
    s.remove(10)
except KeyError as ex:
    print('KeyError:', ex)
s -= {1, 2}           # in-place difference
print(s)
```

## Iterating

You can loop over a set, but don't depend on the order. Sort it when order matters:

```python run
tags = {'python', 'sets', 'hashing'}
for tag in sorted(tags):
    print(tag)
```

Like lists, sets can't be resized while you loop over them. Python detects it and raises an error:

```python run
nums = {1, 2, 3, 4}
try:
    for n in nums:
        if n % 2 == 0:
            nums.discard(n)
except RuntimeError as ex:
    print('RuntimeError:', ex)
nums = {n for n in {1, 2, 3, 4} if n % 2}
print(nums)
```

## `frozenset`: the immutable set

A `frozenset` has all the non-modifying operations of a set but none of the mutating methods. Because it's immutable, it's hashable, so it can go inside another set or serve as a dictionary key:

```python run
fs = frozenset([1, 2, 3])
print(fs | {4}, 2 in fs)
groups = {frozenset({'ann', 'bo'}), frozenset({'cy'})}
print(frozenset({'bo', 'ann'}) in groups)
try:
    fs.add(4)
except AttributeError as ex:
    print('AttributeError:', ex)
```

<div class="callout note">
<span class="callout-title">Equal values, one member</span>

Sets use `==` (together with the hash) to decide uniqueness. Since `1 == 1.0 == True` and they hash equally, `{1, 1.0, True}` has only one element: the first one inserted.

```python run
print({1, 1.0, True})
```

</div>

<div class="callout note">
<span class="callout-title">Where to go deeper</span>

[Part 3 · Sets](/part-3/section-05/) explains how sets are built on hash tables, covers every set operation and frozensets in depth, and looks at practical uses. Hashability and its link to mutability come back in [Part 1 · Variables and Memory](/part-1/section-03/).

</div>

<div class="takeaways">

## Key takeaways

- A set holds unique, hashable items with no order: no indexing, and don't rely on print order.
- `{}` is an empty **dict**; the empty set is `set()`.
- Membership tests (`x in s`) are fast, which makes sets ideal for lookups and de-duplication.
- `|`, `&`, `-` and `^` give union, intersection, difference and symmetric difference.
- `discard` is the forgiving version of `remove`; don't change a set while looping over it.
- `frozenset` is the immutable, hashable variant.

</div>
