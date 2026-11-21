---
title: Using as Instance Properties
summary: Two ways to keep per-instance values in a data descriptor (in the instance itself, or in a dictionary inside the descriptor) and the memory leak the second one causes.
minutes: 14
---

## Option 1: store the value in the instance

The descriptor is shared, but every instance has its own `__dict__`. So let's have the descriptor write the value into the instance it receives:

```python run
class IntegerValue:
    def __set__(self, instance, value):
        instance.stored_value = int(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return getattr(instance, 'stored_value', None)

class Point1D:
    x = IntegerValue()

p1, p2 = Point1D(), Point1D()
p1.x = 10.1
p2.x = 20.2
print(p1.x, p2.x)
print(p1.__dict__, p2.__dict__)
```

Each point now keeps its own value. But the name `stored_value` is hard-coded, and that breaks the moment a class has **two** such attributes:

```python run
class Point2D:
    x = IntegerValue()
    y = IntegerValue()

p = Point2D()
p.x = 10.1
print(p.__dict__)
p.y = 20.2
print(p.__dict__)
print(p.x, p.y)
```

`x` and `y` write to the same key, so setting `y` overwrote `x`. Each descriptor needs its **own** storage name.

## Passing the name in

The simplest fix is to tell each descriptor its name when we create it:

```python run
class IntegerValue:
    def __init__(self, name):
        self.storage_name = '_' + name

    def __set__(self, instance, value):
        setattr(instance, self.storage_name, int(value))

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return getattr(instance, self.storage_name, None)

class Point2D:
    x = IntegerValue('x')
    y = IntegerValue('y')

p1, p2 = Point2D(), Point2D()
p1.x, p1.y = 10.1, 20.2
p2.x, p2.y = 100.1, 200.2
print(p1.__dict__, p2.__dict__)
print(p1.x, p1.y, p2.x, p2.y)
```

This works, and it's a perfectly reasonable design in many codebases. It has three weaknesses, though:

1. **The name is written twice** (`x = IntegerValue('x')`), and nothing stops you from typing `x = IntegerValue('y')` by accident.
2. **It can clash.** If the class (or a subclass) also uses an attribute called `_x` for something else, the descriptor silently overwrites it.
3. **It needs an instance `__dict__`.** A class that defines `__slots__` (without `'__dict__'`) has no per-instance dictionary, so `setattr(instance, '_x', ...)` fails.

The first problem has a neat solution, `__set_name__`, coming in a later lesson. For now, let's try to avoid touching the instance at all.

## Option 2: store values in the descriptor, keyed by instance

Storing a single value on the descriptor was wrong because it's shared. But a **dictionary** on the descriptor, with one entry per instance, is shared in a useful way: one descriptor, one entry per point. We just use the instance itself as the key (which assumes instances are hashable, the default for custom classes):

```python run
class IntegerValue:
    def __init__(self):
        self.values = {}

    def __set__(self, instance, value):
        self.values[instance] = int(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return self.values.get(instance)

class Point2D:
    x = IntegerValue()
    y = IntegerValue()

p1, p2 = Point2D(), Point2D()
p1.x, p1.y = 10.1, 20.2
p2.x, p2.y = 100.1, 200.2
print(p1.x, p1.y, p2.x, p2.y)
print(p1.__dict__)        # the instances stay empty
```

Each descriptor keeps a small table of instances and their values:

```python run
for point, value in Point2D.x.values.items():
    print(hex(id(point)), '->', value)
print('p1 is', hex(id(p1)), ' p2 is', hex(id(p2)))
```

No naming problem, no clashes, and it would even work with `__slots__`. So, are we done?

## The hidden cost: a memory leak

A dictionary key is a **strong reference**. Every instance we've ever assigned `x` on is now referenced by `Point2D.x.values`, and that reference never goes away.

Let's measure it. Python frees an object as soon as its **reference count** drops to 0. We can read the count straight from memory with `ctypes` (the same trick used in the memory-management lessons; it's only safe while the object is still alive):

```python run
import ctypes

def ref_count(address):
    return ctypes.c_long.from_address(address).value

p = Point2D()
p_id = id(p)
print('after creation:     ', ref_count(p_id))
p.x = 100.1
print('after setting p.x:  ', ref_count(p_id))
```

Setting `p.x` added a reference: the dictionary key. Now delete our variable:

```python run
del p
print("'p' in globals():", 'p' in globals())
print('ref count now:   ', ref_count(p_id))
print('still a key?     ', any(id(k) == p_id for k in Point2D.x.values))
```

The name is gone, but the count is still 1, so the object was **not** destroyed. Our code can never reach it again, yet the descriptor's dictionary keeps it alive for as long as the class exists. Create and discard a million points and you keep a million dead points in memory. That's a memory leak.

<div class="callout note">
<span class="callout-title">Reading a reference count by address</span>

`ref_count(p_id)` is meaningful only while some object still lives at that address. Here it's safe because the dictionary keeps the point alive. Once an object is freed, that memory may be reused, and the number you read is garbage.

</div>

What we need is a way for the descriptor to *refer to* an instance without *keeping it alive*. That's precisely what **weak references** are for, and they're the subject of the next lesson.

<div class="takeaways">

## Key takeaways

- A descriptor can store per-instance values **in the instance** (`setattr`/`getattr` under a storage name) or **in itself** (a dictionary keyed by instance).
- Storing in the instance needs a unique name per descriptor, risks clashing with other attributes, and requires an instance `__dict__` (no pure `__slots__`).
- Storing in a dictionary keyed by instance avoids those problems but needs hashable instances.
- Plain dictionary keys are **strong references**, so they keep every instance alive: a memory leak.

</div>
