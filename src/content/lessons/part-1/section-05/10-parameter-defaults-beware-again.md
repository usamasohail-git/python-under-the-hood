---
title: Parameter Defaults - Beware Again
summary: A mutable default like [] or {} is one object shared by every call. Learn to recognize the bug, fix it with None, and see when the sharing is deliberate.
minutes: 10
---

## Mutable defaults are shared

The previous lesson showed that a default is evaluated **once**, when the function is defined. Combine that with a **mutable** object, such as a list, dict or set, and you get one of Python's most famous traps: every call that uses the default gets *the very same object*, and any change made to it sticks around for the next call.

## A grocery list helper

We want a helper that adds consistently formatted items to a grocery list:

```python run
def add_item(name, quantity, unit, grocery_list):
    grocery_list.append(f'{name} ({quantity} {unit})')
    return grocery_list

store_1 = []
store_2 = []
add_item('bananas', 2, 'units', store_1)
add_item('grapes', 1, 'bunch', store_1)
add_item('python', 1, 'medium-rare', store_2)
print(store_1)
print(store_2)
```

That works. To make it more convenient, let's say that if no list is passed, the function should start a new one, and give `grocery_list` a default of `[]`:

```python run
def add_item(name, quantity, unit, grocery_list=[]):
    grocery_list.append(f'{name} ({quantity} {unit})')
    return grocery_list

store_1 = add_item('bananas', 2, 'units')
add_item('grapes', 1, 'bunch', store_1)
print(store_1)
```

Still looks right. Now start a second list:

```python run
store_2 = add_item('milk', 1, 'gallon')
print(store_2)
print(store_1 is store_2)
```

The "new" list already contains the bananas and grapes! Here's what happened:

1. When `def` ran, Python created **one** empty list and stored it as the default.
2. The first call used that default list, appended bananas, and returned it, so `store_1` *is* the default list. Grapes went into the same list.
3. The call for milk also used the default, which is the same list object, now holding three items.

The function object holds on to that list, and you can watch it grow:

```python run
print(add_item.__defaults__)
```

<div class="callout note">
<span class="callout-title">It's not a bug in Python</span>

This behavior follows directly from two facts you already know: defaults are evaluated once, and a mutable object can be changed in place. Python never copies an object for you, so every call that falls back on the default shares it. Linters such as `pylint` and `ruff` flag mutable defaults for exactly this reason.

</div>

## The fix: `None` again

Use `None` as the default and create the new list **inside** the function, where the code runs on every call:

```python run
def add_item(name, quantity, unit, grocery_list=None):
    if grocery_list is None:
        grocery_list = []
    grocery_list.append(f'{name} ({quantity} {unit})')
    return grocery_list

store_1 = add_item('bananas', 2, 'units')
add_item('grapes', 1, 'bunch', store_1)
store_2 = add_item('milk', 1, 'gallon')
print(store_1)
print(store_2)
```

Why `is None` and not the shorter `if not grocery_list:`? Because an empty list is falsy too. With `not`, a caller who passes in their own empty list would have it silently replaced by a new one, and their list would never receive the item:

```python run
def add_item_buggy(name, quantity, unit, grocery_list=None):
    if not grocery_list:              # also true for the caller's empty list!
        grocery_list = []
    grocery_list.append(f'{name} ({quantity} {unit})')
    return grocery_list

my_list = []
add_item_buggy('eggs', 12, 'units', my_list)
print('buggy:  ', my_list)

my_list = []
add_item('eggs', 12, 'units', my_list)
print('correct:', my_list)
```

## When sharing is what you want: a cache

Occasionally the "one object for all calls" behavior is exactly what you need. A classic example is **memoization**: remembering results so they are never computed twice. Here is a recursive factorial that announces each real computation:

```python run
def factorial(n):
    if n < 1:
        return 1
    print(f'calculating {n}!')
    return n * factorial(n - 1)

print(factorial(3))
print(factorial(3))
```

The second call repeats all the work. Now give it a dictionary default that survives between calls:

```python run
def factorial(n, cache={}):
    if n < 1:
        return 1
    if n in cache:
        return cache[n]
    print(f'calculating {n}!')
    result = n * factorial(n - 1)
    cache[n] = result
    return result

print(factorial(3))
print(factorial(3))
print(factorial(5))
```

The second `factorial(3)` is a single dictionary lookup, and `factorial(5)` only computes `5!` and `4!`, reusing the cached `3!`.

It works, but it has drawbacks: the cache is part of the public signature (a caller could pass their own `cache` by accident), and the intent is easy to miss. Closures and decorators, covered in the next sections, offer cleaner ways to do the same thing.

<div class="callout modern">
<span class="callout-title">Modern Python: `functools.cache` (3.9+)</span>

The standard library already provides memoization as a decorator. `functools.lru_cache` has existed since Python 3.2, and `functools.cache` (3.9+) is its unbounded, simpler form:

```python run
from functools import cache

@cache
def factorial(n):
    if n < 1:
        return 1
    print(f'calculating {n}!')
    return n * factorial(n - 1)

print(factorial(3))
print(factorial(5))
print(factorial.cache_info())
```

You'll see how decorators like this work in Section 07.

</div>

<div class="takeaways">

## Key takeaways

- A mutable default (`[]`, `{}`, `set()`) is created once and shared by every call that uses it.
- Use `None` as the default and create the mutable object inside the function, testing with `is None`.
- Sharing a default on purpose (for a cache) works, but `functools.cache` or a closure is usually clearer.

</div>
