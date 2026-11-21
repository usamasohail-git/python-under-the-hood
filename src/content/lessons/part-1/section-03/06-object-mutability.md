---
title: Object Mutability
summary: Mutable objects can change their internal state in place. Immutable objects never change, though what they contain might.
minutes: 10
---

## State and mutation

Every object has a type, a memory address and some **internal state** (its data). Changing that state *in place*, without creating a new object, is called **mutation**.

- An object whose state can change is **mutable**.
- An object whose state can never change is **immutable**.

| Immutable | Mutable |
|---|---|
| `int`, `float`, `complex`, `bool` | `list` |
| `str`, `bytes` | `dict` |
| `tuple`, `frozenset` | `set`, `bytearray` |
| `None` | most user-defined classes |

## Mutating a list

```python run
my_list = [1, 2, 3]
print(my_list, hex(id(my_list)))

my_list.append(4)
print(my_list, hex(id(my_list)))
```

Same address, different contents: `append` mutated the existing list.

Compare that with concatenation:

```python run
my_list_1 = [1, 2, 3]
print(my_list_1, hex(id(my_list_1)))

my_list_1 = my_list_1 + [4]
print(my_list_1, hex(id(my_list_1)))
```

The address **changed**. `my_list_1 + [4]` builds a brand-new list, and the assignment re-binds the name to it. The original list was never touched.

Dictionaries are mutable too:

```python run
my_dict = dict(key1='value 1')
print(hex(id(my_dict)), my_dict)

my_dict['key1'] = 'modified value 1'
my_dict['key2'] = 'value 2'
print(hex(id(my_dict)), my_dict)
```

## Immutable containers holding mutable objects

A tuple is immutable: you can't add, remove or replace its elements.

```python run
t = (1, 2, 3)
try:
    t[0] = 100
except TypeError as ex:
    print('TypeError:', ex)
```

But a tuple's elements are **references**. If those references point at mutable objects, the objects can still change:

```python run
a = [1, 2]
b = [3, 4]
t = (a, b)

a.append(3)
b.append(5)
t
```

Did the tuple change? **No.** It still holds exactly the same two references, to the same two list objects. What changed is the *contents of those lists*. The tuple's own state, "reference to list #1, reference to list #2", is exactly what it was.

<div class="callout tip">
<span class="callout-title">Test yourself</span>

Before running the next cell, predict: will the address of `t` change?

```python run
print(hex(id(t)))
t[0].append(99)
print(hex(id(t)), t)
```

</div>

This subtlety matters later: a tuple that contains a list cannot be used as a dictionary key, because it isn't truly unchangeable. You'll see why in Part 3 on hashing.

<div class="takeaways">

## Key takeaways

- Mutating an object changes its state in place, and its `id()` stays the same.
- Operations like `+` on lists create **new** objects; methods like `.append()` mutate.
- An immutable container can hold references to mutable objects. The container doesn't change, but the objects it references can.

</div>
