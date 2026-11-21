---
title: Reference Counting
summary: CPython tracks how many references point to each object and frees the object the moment that count reaches zero.
minutes: 9
---

## How does Python know when to free memory?

You never call `free()` in Python. Instead, CPython's memory manager keeps a **reference count** in every object: the number of references currently pointing at it.

- `my_var = [1, 2, 3]` creates a list with a reference count of **1**.
- `other_var = my_var` adds a second reference, so the count is **2**.
- When `other_var` is re-bound or deleted, the count drops back to **1**.
- When the count reaches **0**, nothing can reach the object any more, and CPython reclaims its memory immediately.

## Peeking at the reference count

`sys.getrefcount()` reports an object's reference count:

```python run
import sys

my_var = [1, 2, 3, 4]
sys.getrefcount(my_var)
```

You probably expected `1`, but got `2`. Passing `my_var` into `getrefcount()` creates a temporary extra reference, the function's own parameter, for the duration of the call.

To avoid that, we can read the count straight out of memory. In CPython, the first field of every object is its reference count, so given an address, `ctypes` can read it **without** creating a new reference:

```python run
import ctypes

def ref_count(address: int) -> int:
    """Read the reference count stored at an object's memory address."""
    return ctypes.c_long.from_address(address).value

ref_count(id(my_var))
```

Here we pass `id(my_var)`, which is just an integer, so no extra reference to the list is created.

Now add a second reference and watch the count change:

```python run
other_var = my_var
print(hex(id(my_var)), hex(id(other_var)))
print('ref count:', ref_count(id(my_var)))
```

Both names point to the same address, and the count is now 2. Drop one of them:

```python run
other_var = None
print('ref count:', ref_count(id(my_var)))
```

<div class="callout modern">
<span class="callout-title">Modern Python: immortal objects (3.12+)</span>

Some objects are used so often that CPython marks them **immortal**: `None`, `True`, `False`, small integers, and many interned strings. Their reference count is pinned to a huge sentinel value and never changes, which avoids a lot of bookkeeping (and helps free-threaded Python).

```python run
print(sys.getrefcount(None))
print(sys.getrefcount(10))
```

That's why we use a freshly created **list** in this lesson: its count behaves normally.

</div>

<div class="callout note">
<span class="callout-title">Don't do this in real code</span>

Reading memory with `ctypes.from_address` is only for exploring. If the address no longer belongs to a live object, you are reading garbage. Memory management in Python is automatic. We look under the hood only to understand the concepts that follow.

</div>

<div class="takeaways">

## Key takeaways

- CPython stores a reference count in every object and frees the object as soon as the count drops to 0.
- `sys.getrefcount(x)` is always one higher than you expect, because the call itself holds a reference.
- Since Python 3.12, objects like `None` and small ints are *immortal* and report a huge, fixed count.

</div>
