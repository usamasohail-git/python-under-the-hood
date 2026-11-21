---
title: Mutable Sequence Types
summary: Mutable sequences can replace, add and remove items in place. Knowing which operations mutate and which create new objects is what keeps aliases from surprising you.
minutes: 12
---

## Mutating vs re-binding

A mutable sequence such as a `list` lets you change its contents **in place**: the object keeps the same identity (`id`), but its internal state changes. That is very different from building a new list and pointing the name at it, even when the final contents look identical.

Throughout this lesson, watch the `id` values. If the id is unchanged, the operation mutated the existing object.

## Replacing items

Assigning to an index replaces one element:

```python run
l = [1, 2, 3, 4, 5]
before = id(l)
l[0] = 'a'
print(l, id(l) == before)
```

You can also replace a whole slice, and the replacement doesn't need to be the same length. (The lesson on assignments in mutable sequences covers this in detail.)

```python run
l = [1, 2, 3, 4, 5]
before = id(l)
l[0:2] = ['a', 'b', 'c', 'd', 'e']
print(l, id(l) == before)
```

## Clearing: `clear()` vs `= []`

These two lines both leave `l` looking empty:

```python run
l = [1, 2, 3, 4, 5]
before = id(l)
l.clear()
print(l, id(l) == before)    # same object, now empty

l = [1, 2, 3, 4, 5]
before = id(l)
l = []
print(l, id(l) == before)    # a brand-new empty list
```

The difference matters as soon as some other name refers to the same list:

```python run
suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs']
alias = suits
suits = []                    # re-bind: alias still sees the old list
print(suits, alias)

suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs']
alias = suits
suits.clear()                 # mutate: every reference sees the change
print(suits, alias)
```

Choose deliberately. If a list is shared (passed into a function, stored in an object, used as a cache), `clear()` empties it for everyone, while `= []` only changes what *your* name points to.

## Adding items: `append`, `extend`, `insert`

`append(x)` adds one object to the end. Compare it with `l = l + [x]`, which builds a new list:

```python run
l = [1, 2, 3]
before = id(l)
l.append(4)
print(l, id(l) == before)

l = [1, 2, 3]
before = id(l)
l = l + [4]
print(l, id(l) == before)
```

`extend(iterable)` appends every item of **any** iterable, not just lists. With an ordered source (a tuple, string, range) the order is preserved; with a set, it's whatever order the set iterates in:

```python run
l = [1, 2, 3]
l.extend(('a', 'b'))
l.extend('xy')
l.extend(range(7, 9))
l
```

A common slip is using `append` when you meant `extend`. `append` adds its argument as a single element, even if that argument is a list:

```python run
a = [1, 2]
a.append([3, 4])
b = [1, 2]
b.extend([3, 4])
print(a, b)
```

`insert(i, x)` places `x` **at** index `i`, shifting the old item at `i` and everything after it one place to the right:

```python run
l = [1, 2, 3, 4]
l.insert(1, 'a')
l.insert(100, 'end')     # an index past the end just appends
l
```

## Removing items: `pop`, `remove`, `del`

`pop(i)` removes the item at index `i` and **returns** it. With no argument it pops the last item, which is cheap; popping from the front has to shift every other element.

```python run
l = [1, 2, 3, 4]
print(l.pop(1), l)
print(l.pop(), l)
```

`remove(x)` deletes the first element *equal to* `x` (and raises `ValueError` if there isn't one). The `del` statement deletes by index or slice:

```python run
l = [10, 20, 30, 20, 40]
l.remove(20)          # only the first 20
print(l)
del l[0]
print(l)
del l[1:]
print(l)
```

## Reversing

`reverse()` reverses a list in place. The slice `l[::-1]` produces a reversed **copy** and leaves the original alone:

```python run
l = [1, 2, 3, 4]
before = id(l)
l.reverse()
print(l, id(l) == before)

l = [1, 2, 3, 4]
r = l[::-1]
print(l, r, r is l)
```

There is also the built-in `reversed(l)`, which returns a lazy iterator over the list in reverse order without copying it.

## Copying

`copy()` returns a new list with the same elements. A full slice `l[:]` does exactly the same thing:

```python run
l = [1, 2, 3, 4]
l2 = l.copy()
l3 = l[:]
print(l2, l2 is l, l3, l3 is l)
```

Both are **shallow** copies: the new list is a separate object, but its elements are the same objects as before. That subtlety gets its own lesson shortly.

<div class="callout tip">
<span class="callout-title">Methods that mutate return None</span>

`append`, `extend`, `insert`, `remove`, `clear`, `reverse` and `sort` all mutate the list and return `None`. Writing `l = l.append(4)` therefore throws your list away. (`pop` is the exception: it returns the removed item.)

</div>

<div class="takeaways">

## Key takeaways

- Mutating operations keep the same `id`; operations like `+` and slicing create new lists.
- `l.clear()` empties the list for every reference to it; `l = []` only re-binds one name.
- `append` adds one object, `extend` adds each item of any iterable, `insert(i, x)` puts `x` at position `i`.
- `pop` removes and returns by index, `remove` deletes by value, `del` deletes by index or slice.
- `copy()` and `[:]` both make shallow copies; `reverse()` mutates while `[::-1]` copies.

</div>
