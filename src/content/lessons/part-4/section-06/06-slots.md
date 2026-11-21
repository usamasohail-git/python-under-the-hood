---
title: Slots
summary: Declaring __slots__ replaces the per-instance __dict__ with fixed storage for a known set of attributes, saving memory at the cost of dynamic attributes and weak references.
minutes: 15
---

## Instances normally carry a dictionary

By default, every instance of a class stores its attributes in its own dictionary, `__dict__`. That's what lets you add any attribute to any object at any time:

```python run
class Location:
    def __init__(self, name, longitude, latitude):
        self.name = name
        self.longitude = longitude
        self.latitude = latitude

loc = Location('Mumbai', 19.0760, 72.8777)
loc.map_link = 'https://maps.example.com/mumbai'   # added on the fly
print(loc.__dict__)
```

That flexibility has a cost. A dictionary is a hash table, built to grow and to hold arbitrary keys. If your program creates hundreds of thousands of small objects that always have the same few attributes, all that per-instance machinery adds up.

## Declaring `__slots__`

A class can instead declare up front, in a class attribute called `__slots__`, exactly which instance attributes it will have. Python then reserves a fixed place for each of them inside the instance and **does not create an instance `__dict__`**:

```python run
class Location:
    __slots__ = 'name', '_longitude', '_latitude'

    def __init__(self, name, longitude, latitude):
        self._longitude = longitude
        self._latitude = latitude
        self.name = name

    @property
    def longitude(self):
        return self._longitude

    @property
    def latitude(self):
        return self._latitude

loc = Location('Mumbai', 19.0760, 72.8777)
print(loc.name, loc.longitude, loc.latitude)
```

`__slots__` can be any iterable of strings: a tuple, a list, or a single string for a single slot. Inside the class everything looks normal; `self.name = name` works just as before. The differences show up from the outside.

### No instance dictionary, no new attributes

```python run
try:
    loc.__dict__
except AttributeError as ex:
    print('AttributeError:', ex)

try:
    loc.map_link = 'https://maps.example.com/mumbai'
except AttributeError as ex:
    print('AttributeError:', ex)
```

Only the names listed in `__slots__` can be set on an instance. That's a restriction, but sometimes it's a welcome one: a typo like `loc.nmae = 'Delhi'` now fails immediately instead of silently creating a new attribute.

### Slots can be empty

A slot can be deleted and set again. A slot that has never been assigned (or was deleted) simply has no value, so reading it raises `AttributeError`:

```python run
del loc.name
try:
    print(loc.name)
except AttributeError as ex:
    print('AttributeError:', ex)

loc.name = 'Mumbai'
print(loc.name)
```

### The class itself is unaffected

`__slots__` only changes **instances**. The class still has its normal namespace, and you can still add class attributes to it:

```python run
Location.map_service = 'Example Maps'
print(Location.map_service, loc.map_service)
print([k for k in Location.__dict__ if not k.startswith('__')])
```

Look at the class namespace: it contains an entry for **each slot**. These are *member descriptors*, objects that know how to get, set and delete one fixed position in the instance's memory:

```python run
print(Location.__dict__['name'])
print(type(Location.__dict__['name']))
```

When you write `loc.name`, the lookup finds that descriptor on the class, and the descriptor reads the value from its slot in `loc`. Properties work through the same descriptor protocol, which you'll study in detail later.

## What you gain: memory

How much smaller is a slotted instance? `sys.getsizeof` isn't a reliable guide here, because it doesn't include everything an instance owns. Measuring actual allocations with `tracemalloc` is more honest. Let's create 10,000 instances of each kind of class with three attributes:

```python run
import tracemalloc

class Plain:
    def __init__(self, a, b, c):
        self.a, self.b, self.c = a, b, c

class Slotted:
    __slots__ = 'a', 'b', 'c'

    def __init__(self, a, b, c):
        self.a, self.b, self.c = a, b, c

def bytes_per_instance(cls, n=10_000, touch_dict=False):
    tracemalloc.start()
    objs = [cls(1, 2, 3) for _ in range(n)]
    if touch_dict:
        for obj in objs:
            obj.__dict__            # force the dict to be created
    size, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return round(size / n)

print('plain:             ', bytes_per_instance(Plain))
print('plain, dict in use:', bytes_per_instance(Plain, touch_dict=True))
print('slotted:           ', bytes_per_instance(Slotted))
```

The slotted instances are clearly the smallest. (The exact numbers depend on the platform: this page runs a 32-bit WebAssembly build, so on a typical 64-bit machine every number is larger, but the ratio is similar.) Note the middle line too: a regular instance gets noticeably bigger once its `__dict__` is actually used as a dictionary. Slots never pay that price, because there is no dictionary at all.

<div class="callout modern">
<span class="callout-title">Regular instances got leaner</span>

Older Python versions created a full dictionary for every instance, so slots used to save much more memory than they do now. Python 3.3 introduced key-sharing dictionaries for instances of the same class, and 3.11 and 3.12 went further: a regular instance stores its attribute values inline and only creates a real `dict` when you access `__dict__` (or add many attributes). Slots are still the smallest option, but the gap has shrunk.

</div>

## What you gain: speed (a little)

Attribute access via a slot is a direct read at a known offset, while a regular attribute normally needs a dictionary lookup. Let's time both, taking the best of several runs so that warm-up effects don't distort the result:

```python run
from timeit import repeat

p, s = Plain(1, 2, 3), Slotted(1, 2, 3)

def best(stmt):
    return min(repeat(stmt, globals=globals(), number=200_000, repeat=5))

print(f"plain:   {best('p.a = 5; p.a'):.4f}s")
print(f"slotted: {best('s.a = 5; s.a'):.4f}s")
```

Slots usually come out slightly ahead, but on modern Python the gap is small (often around 10% or less in this micro-benchmark), and it varies from run to run. Since 3.11, the interpreter *specializes* attribute access at each place in the code and caches where the value lives, so regular instances are fast too. In older versions slots had a clearer (if still modest) speed advantage. Today, choose slots for memory and for a fixed attribute set, not for speed.

## What you give up

### Dynamic attributes

You've already seen this: no attribute can be added unless it's listed in `__slots__`. Libraries or code that attach attributes to arbitrary objects won't work with your instances.

### Class attributes with the same name

A slot and a class attribute can't share a name, because the slot's descriptor *is* the class attribute. That means you can't use a class attribute as a default value for a slot:

```python run
try:
    class Config:
        __slots__ = 'debug',
        debug = False
except ValueError as ex:
    print('ValueError:', ex)
```

Set defaults in `__init__` instead.

### Weak references

Weak references (the `weakref` module), used for caches and observers that shouldn't keep objects alive, need a place in the instance to store their bookkeeping. Regular classes have one, called `__weakref__`. Slotted classes don't, unless you ask for it:

```python run
import weakref

try:
    weakref.ref(loc)
except TypeError as ex:
    print('TypeError:', ex)

class WeakLocation:
    __slots__ = 'name', '__weakref__'

    def __init__(self, name):
        self.name = name

w = WeakLocation('Pune')
r = weakref.ref(w)
print(r() is w)
```

Listing `'__weakref__'` in `__slots__` adds that one pointer per instance and restores weak-reference support. The next lesson shows the same trick with `'__dict__'`.

<div class="callout note">
<span class="callout-title">Watch the trailing comma</span>

A plain string in `__slots__` is treated as **one** slot name: `__slots__ = 'name'` declares a single slot called `name`. Parentheses alone don't make a tuple, so `__slots__ = ('name')` is that same string. It works, but it invites mistakes when the class grows. Write single-name slots as a real tuple, `('name',)` or `'name',`, so every version of the declaration is a sequence of names.

</div>

## When to use slots

Use `__slots__` when you'll create **many** instances of a small class whose attributes are known in advance: points, records, nodes of a large tree or graph. For a handful of objects the savings are irrelevant, and the loss of flexibility isn't worth it.

<div class="callout modern">
<span class="callout-title">Slotted dataclasses (3.10+)</span>

Since Python 3.10, `@dataclass(slots=True)` generates `__slots__` from the field annotations for you:

```python run
from dataclasses import dataclass

@dataclass(slots=True)
class Point:
    x: float
    y: float

pt = Point(1.0, 2.0)
print(Point.__slots__, hasattr(pt, '__dict__'), pt)
```

</div>

<div class="takeaways">

## Key takeaways

- `__slots__ = (...)` lists an instance's attributes up front. Instances then store them in fixed slots and get **no `__dict__`**.
- You can't add attributes that aren't listed; slots can be deleted and re-assigned. The class namespace is unaffected and holds one member descriptor per slot.
- Slotted instances use less memory, measurably so with `tracemalloc`. The speed advantage is small on Python 3.11+.
- Trade-offs: no dynamic attributes, no class attribute with a slot's name (so no class-level defaults), and no weak references unless `'__weakref__'` is one of the slots.
- Use slots for many small objects with a fixed set of attributes. `@dataclass(slots=True)` (3.10+) does it for you.

</div>
