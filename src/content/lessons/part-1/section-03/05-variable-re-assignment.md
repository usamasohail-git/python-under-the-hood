---
title: Variable Re-Assignment
summary: Re-assigning a variable never changes the old object. Python points the name at a different object.
minutes: 6
---

## Re-assignment creates a new binding

Watch the address of `a` as we re-assign it:

```python run
a = 10
print(hex(id(a)))

a = 15
print(hex(id(a)))
```

The address changed. Python did **not** overwrite the `10` with `15`. It made the name `a` point at a different object, the integer `15`.

The same is true even when the new value is computed from the old one:

```python run
a = 5
print('before:', hex(id(a)))

a = a + 1
print('after: ', hex(id(a)))
```

Here's what `a = a + 1` does, step by step:

1. Evaluate the right-hand side: look up the object `a` refers to (`5`), add `1`, and get the object `6`.
2. Bind the name `a` to that result.

The integer object `5` itself is never modified. In fact, **integers can't be modified at all**: they are *immutable*. We'll study that properly in the next lesson.

## A surprise

Now look at this:

```python run
a = 10
b = 10
print(hex(id(a)))
print(hex(id(b)))
```

Two separate assignments, yet both names point to **the same object**. Python didn't create two `10` objects. It reused one. We'll explain exactly why in the lessons on **shared references** and **interning**. For now, notice that this is only safe *because* integers are immutable: nothing done through `a` can ever change the `10` that `b` sees.

<div class="takeaways">

## Key takeaways

- Assignment binds a name to an object. Re-assignment re-binds the name; the old object is untouched.
- `a = a + 1` computes a new object and re-binds `a` to it.
- Python may reuse one object for several names when that's safe (immutable objects).

</div>
