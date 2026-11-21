---
title: Copying Sets
summary: Shallow copies with copy(), set() and unpacking share their elements with the original; deepcopy copies the elements too.
minutes: 8
---

## Shallow vs deep, once more

Sets follow the same copying rules as every other container:

- a **shallow copy** is a new set object whose elements are the **same objects** as in the original;
- a **deep copy** is a new set whose elements are themselves (recursively) copied.

For a set of strings or numbers the distinction doesn't matter, because those elements are immutable and sharing them is harmless. It only matters when the elements can change, so we need a set element that is **mutable but still hashable**.

## A mutable, hashable element

A plain class does the job. Instances that don't define `__eq__` and `__hash__` use the defaults inherited from `object`, which are based on **identity**. So every instance is hashable, and changing its attributes doesn't change its hash:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Person(name={self.name!r})'

p1 = Person('John')
p2 = Person('Eric')
s1 = {p1, p2}

def names(s):
    return sorted(p.name for p in s)   # a stable way to display the set

names(s1)
```

<div class="callout note">
<span class="callout-title">Why this is safe here</span>

Mutating an object that sits in a set is dangerous if its hash depends on the state you change: the object would be filed in the wrong slot and lookups would stop finding it. Our `Person` hashes by identity, which never changes, so mutating `name` is fine.

</div>

## Three ways to make a shallow copy

```python run
s2 = s1.copy()     # the copy method
s3 = {*s1}         # unpacking into a new set literal
s4 = set(s1)       # the set constructor

print(s2 is s1, s3 is s1, s4 is s1)
print(s2 == s1 == s3 == s4)
```

Four distinct set objects, all equal. But they share their elements, which we can prove by mutating one person:

```python run
p1.name = 'John Cleese'
for s in (s1, s2, s3, s4):
    print(names(s))
```

All four sets "changed", because none of them really did: each still holds a reference to the same `p1`, and it's `p1` that changed. Structural changes, on the other hand, are independent:

```python run
s2.add(Person('Graham'))
print(len(s1), len(s2))
```

## Deep copies

`copy.deepcopy` copies the container *and* its elements:

```python run
from copy import deepcopy

s5 = deepcopy(s1)
print(s5 is s1)
print(names(s5))

p1.name = 'Terry Jones'
print(names(s1))   # sees the change: holds the original p1
print(names(s5))   # doesn't: holds its own copy of p1
```

The deep copy took a snapshot of the people as they were when it was made. Later mutations of the originals don't reach it.

<div class="callout tip">
<span class="callout-title">Which one do you need?</span>

Most of the time sets hold immutable things (numbers, strings, tuples of those), and then a shallow `s.copy()` is all you ever need. Reach for `deepcopy` only when the elements are mutable objects whose state you want to freeze in the copy.

</div>

<div class="takeaways">

## Key takeaways

- `s.copy()`, `set(s)` and `{*s}` all make **shallow** copies: a new set referring to the same element objects.
- Adding or removing elements in a shallow copy doesn't affect the original; mutating a shared element is visible through both.
- `copy.deepcopy(s)` also copies each element, so later changes to the originals don't show up in the copy.
- Mutating set elements is only safe when their hash doesn't depend on the state you change.

</div>
