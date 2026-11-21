---
title: In-Place Concatenation and Repetition
summary: For lists, += and *= mutate the existing object, while + and * build new ones. For immutable sequences the in-place forms quietly fall back to creating a new object.
minutes: 12
---

## `+` and `+=` are different operators

You've probably been told that `a += b` is shorthand for `a = a + b`. For numbers and strings that's effectively true. For lists it is **not**, and the difference can matter a lot.

Plain concatenation builds a new list:

```python run
l1 = [1, 2, 3, 4]
l2 = [5, 6]
before = id(l1)
l1 = l1 + l2
print(l1, id(l1) == before)
```

In-place concatenation mutates the list you already have:

```python run
l1 = [1, 2, 3, 4]
l2 = [5, 6]
before = id(l1)
l1 += l2
print(l1, id(l1) == before)
```

Behind the scenes, `+` calls `__add__`, which returns a new object, while `+=` calls `__iadd__`, which (for lists) extends `self` and returns it.

### Why it matters: aliases

When two names refer to the same list, the two forms give different results:

```python run
a = [1, 2]
b = a
a = a + [3]      # new list: b still sees the old one
print(a, b)

a = [1, 2]
b = a
a += [3]         # mutation: b sees the change
print(a, b)
```

The same applies to a list passed into a function: `items += more` inside the function changes the caller's list, while `items = items + more` doesn't.

### `+=` accepts any iterable

`list.__iadd__` behaves like `extend`, so the right-hand side can be any iterable. Plain `+` is stricter and requires another list:

```python run
l = [1, 2, 3, 4]
l += (5, 6, 7)
l += range(8, 10)
l += 'ab'
print(l)

try:
    [1, 2] + (3, 4)
except TypeError as ex:
    print('TypeError:', ex)
```

That asymmetry is a design choice: `+` has to decide what type the result should be, so it refuses to guess. `+=` already knows the result is the list on the left.

## Immutable sequences fall back to `+`

A tuple can't be mutated, so it has no `__iadd__`. When an in-place method is missing, Python falls back to the regular operator and re-binds the name: `t += u` runs as `t = t + u`.

```python run
t1 = (1, 2, 3)
t2 = (4, 5, 6)
before = id(t1)
t1 += t2
print(t1, id(t1) == before)
```

The `id` changed: a new tuple was created and `t1` now points to it. Strings behave the same way.

## In-place repetition: `*=`

Repetition follows the same pattern. For a list, `*=` mutates; for a tuple it creates a new object:

```python run
l = [1, 2, 3]
before = id(l)
l *= 2
print(l, id(l) == before)

t = (1, 2, 3)
before = id(t)
t *= 2
print(t, id(t) == before)
```

The reference-sharing caveat from the first lesson applies here too: `l *= 3` repeats references to the same element objects, so a list of lists multiplied this way contains aliases.

## A famous puzzle

Put the two ideas together. A tuple holds a list, and we use `+=` on that list *through the tuple*:

```python run
t = ([1, 2], 'x')
try:
    t[0] += [3]
except TypeError as ex:
    print('TypeError:', ex)
print(t)
```

It raised an error **and** the list was changed. How can both be true? `t[0] += [3]` runs in two steps:

1. Fetch `t[0]` and call its `__iadd__([3])`. The list is mutated in place and returned. This succeeds.
2. Store the result back with `t[0] = <result>`. Tuples don't support item assignment, so this raises `TypeError`.

By the time step 2 fails, step 1 has already done its work. The lesson: augmented assignment is "call the in-place method, then assign the result". If you want to mutate a list stored inside a tuple, call the method directly: `t[0].extend([3])` succeeds without any assignment.

<div class="callout note">
<span class="callout-title">Numbers are immutable too</span>

`x += 1` on an integer always creates a new integer object, because `int` has no `__iadd__`. That's why `a = a + 1` and `a += 1` really are equivalent for numbers, and why the difference only shows up with mutable types.

</div>

<div class="takeaways">

## Key takeaways

- `+`/`*` call `__add__`/`__mul__` and return a new object; `+=`/`*=` call `__iadd__`/`__imul__`.
- For lists, `+=` and `*=` mutate in place, so every alias sees the change.
- `list += iterable` accepts any iterable, but `list + x` requires another list.
- Immutable types have no in-place methods, so `t += u` quietly becomes `t = t + u`.
- `t[0] += [x]` on a tuple mutates the list *and* raises `TypeError` on the assignment back.

</div>
