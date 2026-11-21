---
title: Shared References and Mutability
summary: When two names point at the same object, mutating it through one name is visible through the other.
minutes: 9
---

## What is a shared reference?

A **shared reference** is when two or more names refer to the same object:

```python run
my_var_1 = 'hello'
my_var_2 = my_var_1
print(hex(id(my_var_1)), hex(id(my_var_2)))
```

With an immutable string, sharing is harmless. "Changing" `my_var_2` really re-binds it to a new string:

```python run
my_var_2 = my_var_2 + ' world!'
print(my_var_1, hex(id(my_var_1)))
print(my_var_2, hex(id(my_var_2)))
```

## Shared references to mutable objects

With mutable objects you must be careful:

```python run
my_list_1 = [1, 2, 3]
my_list_2 = my_list_1          # same list, second name

my_list_2.append(4)

print('my_list_2:', my_list_2)
print('my_list_1:', my_list_1)
print(hex(id(my_list_1)), hex(id(my_list_2)))
```

<figure class="diagram">
<svg viewBox="0 0 560 150" role="img" aria-label="Two names my_list_1 and my_list_2 both point at one list object">
<defs><marker id="ah8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<rect x="20" y="25" width="140" height="40" rx="8" class="d-name"/><text x="90" y="50" text-anchor="middle" class="d-text">my_list_1</text>
<rect x="20" y="85" width="140" height="40" rx="8" class="d-name"/><text x="90" y="110" text-anchor="middle" class="d-text">my_list_2</text>
<rect x="320" y="45" width="220" height="60" rx="8" class="d-obj-hl"/><text x="335" y="68" class="d-sub">list · one object</text><text x="335" y="90" class="d-text">[1, 2, 3, 4]</text>
<path d="M160 45 C230 45, 260 62, 316 68" class="d-arrow-hl" marker-end="url(#ah8)"/>
<path d="M160 105 C230 105, 260 88, 316 82" class="d-arrow-hl" marker-end="url(#ah8)"/>
</svg>
<figcaption>One list, two names. <code>append</code> through either name changes the single shared object.</figcaption>
</figure>

There is only one list, and we gave it two names. If you want an independent list, make a copy: `my_list_2 = my_list_1.copy()` or `list(my_list_1)`. (Copying, including shallow vs deep copies, is covered in Part 2.)

## Behind the scenes: Python shares immutable objects for you

Remember this from the lesson on re-assignment?

```python run
a = 10
b = 10
print(hex(id(a)), hex(id(b)))
```

The memory manager is free to create shared references to **immutable** objects on its own, because it's completely safe: there's no way to change `a`'s object through `b`. The only thing you can do to `b` is re-bind it:

```python run
b = 15
print(hex(id(a)), hex(id(b)))
```

For **mutable** objects, Python never does this, because it would not be safe:

```python run
my_list_1 = [1, 2, 3]
my_list_2 = [1, 2, 3]
print(hex(id(my_list_1)), hex(id(my_list_2)))
```

Same contents, two different objects. Appending to one won't touch the other.

<div class="takeaways">

## Key takeaways

- Assigning one variable to another (`b = a`) creates a shared reference, not a copy.
- Mutating a shared mutable object is visible through every name that refers to it.
- Python may share immutable objects automatically (safe), but never mutable ones.

</div>
