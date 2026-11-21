---
title: Copying Sequences
summary: A shallow copy creates a new container that shares its elements with the original. A deep copy recursively copies the elements too.
minutes: 15
---

## Why copy at all?

Copying is about **protection**. If you hand a list to a function that might mutate it, or you want to modify a version of some data while keeping the original intact, you need a second, independent object. As we've seen, plain assignment never copies anything: it only adds another name for the same object.

## Ways to make a shallow copy of a list

All of the following produce a new list with the same elements:

```python run
import copy

l1 = [1, 2, 3]

copies = {
    'loop': [],
    'comprehension': [item for item in l1],
    'copy()': l1.copy(),
    'list()': list(l1),
    'slice [:]': l1[:],
    'copy.copy()': copy.copy(l1),
}
for item in l1:
    copies['loop'].append(item)

for how, c in copies.items():
    print(f'{how:14} {c}  same object? {c is l1}')
```

They are all equivalent. In practice, `l.copy()`, `list(l)` and `l[:]` are the common choices. `list()` has one extra talent: it accepts **any** iterable, so it's also how you turn a tuple, set or generator into a list (which is a conversion, not strictly a copy).

## Immutable sequences return themselves

Try the same tricks on a tuple or a string and you'll find that no copy is made:

```python run
t1 = (1, 2, 3)
s1 = 'python'

print(tuple(t1) is t1, t1[:] is t1, copy.copy(t1) is t1)
print(str(s1) is s1, s1[:] is s1)
```

This is a safe optimization. You can't change the "copy", and you can't change the original, so two separate objects would only waste memory. (If you need a list version you can modify, convert explicitly: `list(t1)`.)

## Shallow means shared elements

Every technique above makes a **shallow** copy: the new container is a fresh object, but each slot in it refers to exactly the same element object as the corresponding slot in the original.

```python run
v1 = [0, 0]
v2 = [0, 0]
line1 = [v1, v2]
line2 = line1.copy()

print(line1 is line2)
print(line1[0] is line2[0], line1[1] is line2[1])
```

Here's what that looks like in memory:

<figure class="diagram">
<svg viewBox="0 0 560 200" role="img" aria-label="line1 and line2 are separate lists, but both point to the same two inner lists v1 and v2">
<defs>
<marker id="cp1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="cp2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<text x="20" y="22" class="d-sub">NAMES</text>
<text x="170" y="22" class="d-sub">OUTER LISTS</text>
<text x="400" y="22" class="d-sub">SHARED ELEMENTS</text>
<rect x="20" y="45" width="90" height="40" rx="8" class="d-name"/><text x="38" y="70" class="d-text">line1</text>
<rect x="20" y="120" width="90" height="40" rx="8" class="d-name"/><text x="38" y="145" class="d-text">line2</text>
<rect x="170" y="40" width="150" height="50" rx="8" class="d-obj"/><text x="182" y="60" class="d-sub">list</text><text x="182" y="80" class="d-text">[ • , • ]</text>
<rect x="170" y="115" width="150" height="50" rx="8" class="d-obj"/><text x="182" y="135" class="d-sub">list (the copy)</text><text x="182" y="155" class="d-text">[ • , • ]</text>
<rect x="400" y="40" width="140" height="50" rx="8" class="d-obj-hl"/><text x="412" y="60" class="d-sub">list v1</text><text x="412" y="80" class="d-text">[0, 0]</text>
<rect x="400" y="115" width="140" height="50" rx="8" class="d-obj-hl"/><text x="412" y="135" class="d-sub">list v2</text><text x="412" y="155" class="d-text">[0, 0]</text>
<path d="M110 65 L166 65" class="d-arrow" marker-end="url(#cp1)"/>
<path d="M110 140 L166 140" class="d-arrow" marker-end="url(#cp1)"/>
<path d="M320 60 L396 60" class="d-arrow-hl" marker-end="url(#cp2)"/>
<path d="M320 75 C360 80, 360 130, 396 135" class="d-arrow-hl" marker-end="url(#cp2)"/>
<path d="M320 135 C360 130, 360 80, 396 72" class="d-arrow-hl" marker-end="url(#cp2)"/>
<path d="M320 150 L396 150" class="d-arrow-hl" marker-end="url(#cp2)"/>
</svg>
<figcaption>A shallow copy duplicates only the outer list. Both outer lists reference the same inner lists, so a change made through one is visible through the other.</figcaption>
</figure>

Replacing a whole element in the copy is fine (that only changes the copy's own slot), but **mutating** a shared element shows up in both:

```python run
line2[1] = ['new']        # re-bind a slot in the copy only
line2[0][0] = 100         # mutate the shared inner list
print(line1)
print(line2)
```

If the elements are immutable (numbers, strings, tuples of immutables), a shallow copy is all you ever need. The trouble only starts with mutable elements.

## Deep copies

A **deep copy** copies the container *and*, recursively, every mutable object inside it. For one level of nesting you can do it by hand:

```python run
v1 = [0, 0]
v2 = [0, 0]
line1 = [v1, v2]
line2 = [item[:] for item in line1]   # copy each inner list too

line1[0][0] = 100
print(line1)
print(line2)
```

But that only goes two levels deep. If the inner lists contained lists, you'd need another layer, and so on: a general solution has to be recursive. It also has to cope with objects that appear more than once, or even refer to themselves. `copy.deepcopy` handles all of that:

```python run
v1 = [11, 12]
v2 = [21, 22]
v3 = [31, 32]
v4 = [41, 42]
plane1 = [[v1, v2], [v3, v4]]
plane2 = copy.deepcopy(plane1)

print(plane1 == plane2)
print(plane1[0] is plane2[0], plane1[0][0] is plane2[0][0])

plane2[0][0][0] = 'changed'
print(plane1)
print(plane2)
```

### Shared and circular references

`deepcopy` keeps a memo of objects it has already copied. If the same object appears twice in the original, it appears twice in the copy as **one** copied object, so the structure is preserved. That memo is also what lets it copy a structure that contains itself without recursing forever:

```python run
shared = [0]
data = [shared, shared]
dup = copy.deepcopy(data)
print(dup[0] is dup[1], dup[0] is shared)

loop = [1, 2]
loop.append(loop)          # a list that contains itself
dup = copy.deepcopy(loop)
print(dup, dup[2] is dup, dup is loop)
```

## Custom classes

The `copy` module works on your own objects too. A shallow copy creates a new instance whose attributes refer to the same objects; a deep copy copies those attributes recursively:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

class Line:
    def __init__(self, p1, p2):
        self.p1 = p1
        self.p2 = p2

    def __repr__(self):
        return f'Line({self.p1!r}, {self.p2!r})'

line1 = Line(Point(0, 0), Point(10, 10))
shallow = copy.copy(line1)
deep = copy.deepcopy(line1)

print(shallow is line1, shallow.p1 is line1.p1)
print(deep is line1, deep.p1 is line1.p1)
```

Classes can customize this behavior by defining `__copy__` and `__deepcopy__`, but the default is right most of the time.

<div class="callout modern">
<span class="callout-title">Python 3.13: copy.replace()</span>

Python 3.13 added `copy.replace(obj, **changes)`, which makes a modified copy of objects that support it: named tuples, dataclasses, `datetime` objects and more. For example, `copy.replace(point, x=5)` on a named tuple returns a new point with `x` changed.

</div>

<div class="takeaways">

## Key takeaways

- `l.copy()`, `list(l)`, `l[:]` and `copy.copy(l)` all make **shallow** copies of a list.
- Copying a tuple or string returns the original object, because copying something immutable gains nothing.
- A shallow copy shares its elements with the original: mutating a shared mutable element is visible in both.
- `copy.deepcopy` copies recursively and correctly handles shared and circular references.
- Both functions work on custom class instances as well as built-in containers.

</div>
