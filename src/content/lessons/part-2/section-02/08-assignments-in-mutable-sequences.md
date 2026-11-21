---
title: Assignments in Mutable Sequences
summary: Assigning an iterable to a slice can replace, delete or insert elements in place. Extended slices can replace elements too, but only one-for-one.
minutes: 12
---

## Slices on the left of `=`

You've used slices to *read* parts of a sequence. On a mutable sequence you can also **assign** to a slice. The rule is simple: the slice selects a block of positions, and that block is replaced by the items of an iterable on the right. Depending on the sizes involved, that one operation can replace, delete or insert elements, all without creating a new list.

## Replacing

The replacement doesn't have to be the same length as the slice. The list grows or shrinks to fit:

```python run
l = [1, 2, 3, 4, 5]
before = id(l)
print(l[0:3])

l[0:3] = ['a', 'b', 'c', 'd']
print(l, id(l) == before)
```

The right-hand side can be **any iterable**, not only a list. A string, for example, is an iterable of characters:

```python run
l = [1, 2, 3, 4, 5]
l[0:3] = 'python'
l
```

If you wanted the string as a single element, wrap it: `l[0:3] = ['python']`.

## Deleting

Deletion is just replacement with an empty iterable:

```python run
l = [1, 2, 3, 4, 5]
l[0:1] = []        # remove the first element
print(l)
l[0:2] = []        # remove the next two
print(l)
```

In everyday code you'd write `del l[0:2]`, which does the same thing, but it helps to see that deletion is a special case of slice assignment.

## Inserting

To insert without replacing anything, assign to an **empty** slice at the insertion point. `l[1:1]` starts at 1 and stops before 1, so it selects zero elements located just before index 1:

```python run
l = [1, 2, 3, 4, 5]
print(l[1:2], l[1:1])     # a one-element slice vs an empty one

before = id(l)
l[1:1] = 'abc'
print(l, id(l) == before)
```

Assigning to `l[1:2]` would have replaced the `2`; assigning to the empty slice `l[1:1]` slides the new items in front of it. A couple of handy variations:

```python run
l = [3, 4]
l[:0] = [1, 2]            # prepend
l[len(l):] = [5, 6]       # append (like extend)
l
```

## Extended slices: one-for-one only

You can assign to an extended slice (one with a step), and it mutates in place too:

```python run
l = [1, 2, 3, 4, 5]
print(l[::2])
l[::2] = ['a', 'b', 'c']
l
```

But there is a strict rule. The positions chosen by an extended slice aren't a contiguous block, so Python can't grow or shrink the list to fit. The right-hand side must have **exactly** as many items as the slice selects:

```python run
l = [1, 2, 3, 4, 5]
for rhs in (['a', 'b'], ['a', 'b', 'c', 'd'], []):
    try:
        l[::2] = rhs
    except ValueError as ex:
        print('ValueError:', ex)
```

So you can't delete or insert with an extended-slice *assignment*. (Insertion with a step makes no sense anyway, since inserting needs an empty slice.) You can, however, delete with `del`, which knows how to close the gaps:

```python run
l = [1, 2, 3, 4, 5]
del l[::2]
l
```

One corner case: a slice written with an explicit step of `1`, like `l[0:2:1]`, behaves like an ordinary slice and can change the list's length.

## Unordered right-hand sides

Since any iterable works, you can assign from a set or a dictionary. Just remember that the items arrive in whatever order the iterable produces them; for a set that order isn't something you should rely on:

```python run
l = [1, 2, 3, 4, 5]
l[3:3] = {'x': 1, 'y': 2}     # iterating a dict yields its keys, in insertion order
l
```

## Immutable sequences

None of this works on tuples or strings: they don't support item or slice assignment at all.

```python run
t = (1, 2, 3, 4, 5)
try:
    t[0:3] = (10, 20)
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="takeaways">

## Key takeaways

- `seq[i:j] = iterable` replaces the selected block with the iterable's items, growing or shrinking the list as needed.
- Assigning an empty iterable deletes; assigning to an empty slice like `seq[i:i]` inserts.
- The right-hand side can be any iterable; a string contributes its individual characters.
- Extended slices (`seq[::k]` with `k != 1`) require a right-hand side of exactly the same length. Use `del seq[::k]` to remove them.
- All of these mutate the list in place; immutable sequences don't support them.

</div>
