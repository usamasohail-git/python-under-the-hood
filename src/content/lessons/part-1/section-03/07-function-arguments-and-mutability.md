---
title: Function Arguments and Mutability
summary: Functions receive references to your objects. Whether the caller sees changes depends entirely on mutability.
minutes: 9
---

## Arguments are passed as references

When you call `f(my_var)`, the function's parameter becomes **another name for the same object**. Nothing is copied. (This is sometimes called *pass by object reference* or *call by sharing*.) What happens next depends on whether the object is mutable.

## Immutable argument: the caller is safe

```python run
def process(s):
    print('initial s   ', hex(id(s)))
    s = s + ' world'
    print('s after "+" ', hex(id(s)))

my_var = 'hello'
print('my_var      ', hex(id(my_var)))
process(my_var)
print('my_var after', hex(id(my_var)), repr(my_var))
```

Inside `process`, `s` starts out pointing at the same string as `my_var`. But strings are immutable, so `s + ' world'` creates a new string and only the *local* name `s` is re-bound to it. The caller's `my_var` still refers to `'hello'`.

## Mutable argument: the caller sees the change

```python run
def modify_list(items):
    print('initial items', hex(id(items)))
    if len(items) > 0:
        items[0] = items[0] ** 2
    items.pop()
    items.append(5)
    print('final items  ', hex(id(items)))

my_list = [2, 3, 4]
print('my_list      ', hex(id(my_list)))
modify_list(my_list)
print(my_list, hex(id(my_list)))
```

The address never changes. `items` and `my_list` are the *same* list, and the function mutated it. This is called a **side effect**: the function changed something outside of itself.

## Immutable container, mutable contents

Even a tuple doesn't fully protect you if it contains mutable objects:

```python run
def modify_tuple(t):
    print('initial t', hex(id(t)))
    t[0].append(100)
    print('final t  ', hex(id(t)))

my_tuple = ([1, 2], 'a')
modify_tuple(my_tuple)
my_tuple
```

<div class="callout note">
<span class="callout-title">Re-binding vs mutating, inside a function</span>

There are two different things a function can do with a parameter:

- **Re-bind it** (`items = [...]`): only the local name changes; the caller never notices.
- **Mutate it** (`items.append(...)`, `items[0] = ...`): the shared object changes; the caller sees it.

```python run
def rebind(items):
    items = [0, 0, 0]       # local name now points elsewhere

def mutate(items):
    items[:] = [0, 0, 0]    # replaces the contents of the shared list

data = [1, 2, 3]
rebind(data); print('after rebind:', data)
mutate(data); print('after mutate:', data)
```

</div>

If you don't want a function to change the caller's list, have it work on a copy (`items = list(items)`) or return a new object instead of mutating.

<div class="takeaways">

## Key takeaways

- A parameter is a new name for the caller's object. No copy is made.
- With immutable objects, the function can only re-bind its local name, so the caller is unaffected.
- With mutable objects, mutations inside the function are visible to the caller (side effects).

</div>
