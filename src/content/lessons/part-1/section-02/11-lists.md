---
title: Lists
summary: Python's workhorse mutable sequence. Creating, slicing and modifying lists, list comprehensions, sorting, and the shared-reference traps behind [[]] * 3.
minutes: 13
---

## Creating lists

A `list` is an ordered, **mutable** sequence that can hold objects of any type. You create one with square brackets or with the `list()` constructor, which accepts any iterable:

```python run
empty = []
nums = [3, 1, 4, 1, 5]
mixed = [1, 'two', 3.0, None, [5, 6]]
print(nums, mixed)
print(list('abc'), list(range(4)), list())
```

A **list comprehension** builds a list from an iterable in one expression, optionally with a filter:

```python run
squares = [n * n for n in range(6)]
evens = [n for n in range(10) if n % 2 == 0]
pairs = [(x, y) for x in 'ab' for y in (1, 2)]
print(squares)
print(evens)
print(pairs)
```

Read the nested form left to right, like nested `for` loops: the first `for` is the outer loop.

## Indexing and slicing

Lists support the same indexing and slicing as strings. Slices are **new lists** (shallow copies):

```python run
letters = ['a', 'b', 'c', 'd', 'e']
print(letters[0], letters[-1])
print(letters[1:3], letters[::-1])
copy = letters[:]
print(copy == letters, copy is letters)
```

Because lists are mutable, you can also **assign** to an index or a slice. Slice assignment can even change the length of the list:

```python run
letters[0] = 'A'
letters[1:3] = ['x', 'y', 'z']    # replace 2 items with 3
print(letters)
letters[1:4] = []                  # delete a range
print(letters)
del letters[0]
print(letters)
```

## The most useful methods

| Method | What it does | Returns |
|---|---|---|
| `lst.append(x)` | add one item at the end | `None` |
| `lst.extend(iterable)` | add every item from an iterable | `None` |
| `lst.insert(i, x)` | insert before index `i` | `None` |
| `lst.pop()` / `lst.pop(i)` | remove and return the last item / item `i` | the item |
| `lst.remove(x)` | remove the first item equal to `x` | `None` |
| `lst.index(x)`, `lst.count(x)` | position of the first `x` / how many | `int` |
| `lst.sort()`, `lst.reverse()` | reorder in place | `None` |
| `lst.copy()`, `lst.clear()` | shallow copy / empty the list | new list / `None` |

```python run
stack = [1, 2]
stack.append(3)
stack.extend([4, 5])
stack.insert(0, 0)
print(stack)
print(stack.pop(), stack.pop(0), stack)
stack.remove(3)
print(stack, stack.index(4), stack.count(9))
```

`append` versus `extend` trips many people up. `append` adds its argument as **one** item:

```python run
a = [1, 2]
a.append([3, 4])
b = [1, 2]
b.extend([3, 4])
print(a, len(a))
print(b, len(b))
```

Operators work too: `+` concatenates into a new list, `*` repeats, and `in` tests membership (by scanning the list).

```python run
print([1, 2] + [3], [0] * 4, 2 in [1, 2, 3])
print(len([1, 2, 3]), min([4, 2, 8]), max([4, 2, 8]), sum([4, 2, 8]))
```

## Sorting: `sort()` versus `sorted()`

`lst.sort()` sorts the list **in place** and returns `None`. `sorted(iterable)` returns a **new** list and works on any iterable. Both accept `key=` and `reverse=`:

```python run
words = ['pear', 'fig', 'banana', 'kiwi']
print(sorted(words, key=len))
print(sorted(words, reverse=True))
print(words)                 # unchanged by sorted()

result = words.sort()
print(result, words)         # sort() returned None; words changed
```

Writing `words = words.sort()` is a common bug: it replaces your list with `None`.

## Mutability and shared references

A variable doesn't hold a list; it refers to one. Assigning a list to another name makes **two names for the same list**, so a change through one is visible through the other:

```python run
a = [1, 2, 3]
b = a
b.append(4)
print(a, a is b)

c = a.copy()           # or a[:] or list(a)
c.append(5)
print(a, c)
```

### The `[[]] * 3` trap

Repetition copies **references**, not objects. With immutable items like numbers that's harmless, but with a list inside, every row is the same object:

```python run
grid = [[]] * 3
grid[0].append('x')
print(grid)
print(grid[0] is grid[1])
```

Use a comprehension so that each row is a new list:

```python run
grid = [[] for _ in range(3)]
grid[0].append('x')
print(grid)
```

### Shallow copies

`copy()`, `[:]` and `list()` create a new outer list but keep the same inner objects. For nested mutable data, use `copy.deepcopy`:

```python run
import copy

nested = [[1, 2], [3, 4]]
shallow = nested.copy()
deep = copy.deepcopy(nested)
nested[0].append(99)
print(shallow)
print(deep)
```

## Iterating, and not mutating while you do it

Loop directly over the items, using `enumerate` for positions and `zip` to walk two lists together:

```python run
names = ['ann', 'bo', 'cy']
ages = [31, 25, 40]
for i, name in enumerate(names, start=1):
    print(i, name)
for name, age in zip(names, ages):
    print(f'{name} is {age}')
```

Removing items from a list while looping over it skips elements, because the loop's position advances while the items shift left:

```python run
nums = [1, 2, 2, 3, 4, 4]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)          # two even numbers survived
```

Build a new list instead (or loop over a copy, `for n in nums[:]:`):

```python run
nums = [1, 2, 2, 3, 4, 4]
nums = [n for n in nums if n % 2 != 0]
print(nums)
```

<div class="callout tip">
<span class="callout-title">Lists are great at the end, slow at the front</span>

`append` and `pop()` at the end are fast. `insert(0, x)` and `pop(0)` have to shift every other item. If you need a queue, use `collections.deque`, which is fast at both ends.

</div>

<div class="callout note">
<span class="callout-title">Where to go deeper</span>

[Part 2 · Sequences](/part-2/section-02/) digs into mutable sequences, slicing internals, in-place concatenation (`+=` versus `+` on lists), copying and sorting. For why `b = a` shares a list and how references work, see [Part 1 · Variables and Memory](/part-1/section-03/).

</div>

<div class="takeaways">

## Key takeaways

- Lists are ordered and mutable: you can assign to indices and slices, and slices are new lists.
- `append` adds one item; `extend` adds every item of an iterable.
- `lst.sort()` sorts in place and returns `None`; `sorted()` returns a new list.
- Assignment shares the list. `copy()` is shallow; use `copy.deepcopy` for nested data.
- `[[]] * 3` creates three references to **one** list; use `[[] for _ in range(3)]`.
- Don't remove items from a list while iterating over it; build a new list with a comprehension.

</div>
