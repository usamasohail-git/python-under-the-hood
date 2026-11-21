---
title: Extended Unpacking
summary: Use * to capture "the rest" of an iterable, * and ** to spread iterables and dictionaries into new containers, and nested patterns to unpack structures in one step.
minutes: 12
---

## "The first one, and everything else"

Plain unpacking needs exactly one name per item. Often you only care about a few items and want to keep the rest together. With slicing you might write:

```python run
l = [1, 2, 3, 4, 5, 6]
a, b = l[0], l[1:]
print(a, b)
```

**Extended unpacking** (Python 3.0+) does it with a starred name, which collects all leftover items into a **list**:

```python run
a, *b = l
print(a, b)
```

Besides being shorter, there is a real difference: slicing only works on sequences that support indexing, while `*` works with **any iterable**, including ones you can't slice:

```python run
a, *b = -10, 5, 2, 100           # a tuple
print(a, b)

a, *b = 'python'                 # a string
print(a, b)

first, *rest = range(5)          # a range
print(first, rest)

first, *rest = (n * n for n in range(5))  # a generator can't be sliced at all
print(first, rest)
```

Notice that the starred name is **always a list**, whatever type you unpacked. If you need a string back, join it: `''.join(rest)`.

## The star can go anywhere (once)

The starred name doesn't have to be last. Python fills the plain names at both ends first, then gives the star whatever is left in the middle, possibly nothing at all:

```python run
s = 'python'
a, b, *c, d = s
print(a, b, c, d)

*init, last = [1, 2, 3]
print(init, last)

a, *middle, z = 'xy'
print(a, middle, z)    # nothing left for the middle
```

Because a starred name means "the rest", there can only be **one** per level. Two would be ambiguous:

```python run
try:
    compile('a, *b, *c = [1, 2, 3, 4]', '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

## Unpacking on the right-hand side

Since Python 3.5, the `*` operator also works *inside* list, tuple and set displays, where it spreads an iterable's items into the new container. This is a neat way to combine iterables of different types:

```python run
l1 = [1, 2, 3]
l2 = [4, 5, 6]
print([*l1, *l2])
print([*l1, *'ABC'])
print((*l1, 'and', *range(2)))
```

### Combining sets

You can't add sets with `+`. You can use `.union()`, or you can unpack several sets straight into a new set literal:

```python run
s1 = {1, 2, 3}
s2 = {3, 4, 5}
s3 = {5, 6, 7}
try:
    s1 + s2
except TypeError as ex:
    print('TypeError:', ex)

print(s1.union(s2, s3))
print({*s1, *s2, *s3})
```

Duplicates disappear, because the result is a set. (The `|` operator, `s1 | s2 | s3`, does the same thing.) A trailing comma lets you unpack into a plain tuple or list on the *left* side too: `*items, = some_set` turns any iterable into a list.

```python run
*items, = {10, 20}
print(type(items), sorted(items))
```

### Dictionaries: `*` gives keys, `**` gives pairs

A single `*` on a dictionary unpacks its keys, just like iterating over it:

```python run
d1 = {'key1': 1, 'key2': 2}
d2 = {'key2': 3, 'key3': 3}
print([*d1, *d2])
print({*d1, *d2})
```

To keep the values too, use **`**`** inside a dictionary literal. That merges the dictionaries. When the same key appears more than once, **the last one wins**:

```python run
print({**d1, **d2})
print({**d2, **d1})
```

This makes `**` a natural fit for "defaults overridden by user settings":

```python run
defaults = {'color': 'blue', 'size': 'M', 'debug': False}
user = {'size': 'L', 'debug': True}
config = {**defaults, **user, 'source': 'merged'}
print(config)
```

`**` can only be used on the right-hand side. There is no `**name = ...` assignment target.

<div class="callout modern">
<span class="callout-title">Modern Python: the dictionary merge operator (3.9+)</span>

Since Python 3.9, dictionaries support `|` for merging and `|=` for updating in place. The rule is the same: the right-hand operand wins.

```python run
print(defaults | user)
settings = dict(defaults)
settings |= {'debug': True}
print(settings)
```

`{**a, **b}` still works everywhere and is handy when you want to add literal keys in the same expression.

</div>

## Nested unpacking

The left-hand side can mirror the structure of the data, unpacking nested iterables in one step:

```python run
a, b, (c, d) = [1, 2, ['X', 'Y']]
print(a, b, c, d)

a, b, (c, d) = [1, 2, 'XY']      # a string is an iterable too
print(a, b, c, d)
```

And each nested level may have its own star. This is allowed, because the second star belongs to the inner pattern, not the outer one:

```python run
a, *b, (c, d, *e) = [1, 2, 3, 'python']
print(a)
print(b)
print(c, d)
print(e)
```

Python unpacks the outer list first: `a` gets 1, the last item `'python'` goes to the inner pattern, and `b` collects what's in between. Then `'python'` is unpacked into `c`, `d` and the list `e`.

Doing the same with slicing is possible, but compare how much harder it is to read:

```python run
l = [1, 2, 3, 'python']
a, b, c, d, e = l[0], l[1:-1], l[-1][0], l[-1][1], list(l[-1][2:])
print(a, b, c, d, e)
```

<div class="takeaways">

## Key takeaways

- `first, *rest = iterable` works on any iterable; the starred name always becomes a list, possibly empty.
- Only one starred name is allowed per level of unpacking, but nested patterns can each have their own.
- On the right-hand side, `*` spreads iterables into lists, tuples and sets; `**` merges dictionaries, with later keys winning.
- In Python 3.9+, `d1 | d2` is the operator form of `{**d1, **d2}`.

</div>
