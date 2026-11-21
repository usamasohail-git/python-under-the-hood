---
title: Back to Instance Properties
summary: Fix the descriptor memory leak with a `WeakKeyDictionary`, then handle unhashable instances with `id()` keys, weakref callbacks and `__weakref__` in `__slots__`.
minutes: 18
---

## Fix 1: a `WeakKeyDictionary`

The leaky descriptor from two lessons ago used a plain `dict` keyed by instance. Swapping in a `WeakKeyDictionary` is a one-line change:

```python run
import ctypes, gc, weakref

def ref_count(address):
    return ctypes.c_long.from_address(address).value

class IntegerValue:
    def __init__(self):
        self.values = weakref.WeakKeyDictionary()

    def __set__(self, instance, value):
        self.values[instance] = int(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return self.values.get(instance)

class Point:
    x = IntegerValue()

p = Point()
p.x = 100.1
print(p.x, ref_count(id(p)))
print(Point.x.values.keyrefs())
```

The strong count stays at 1: the descriptor holds only a weak reference. When the point goes away, so does its entry:

```python run
del p
gc.collect()
print(Point.x.values.keyrefs())
```

This is close to a perfect general solution: no instance storage (so `__slots__` classes work, provided they support weak references, see below) and no leak. Its one limitation is that instances must be **hashable**.

## Fix 2: unhashable instances, keyed by `id`

If a class defines `__eq__` but not `__hash__`, its instances can't be dictionary keys. But `id(instance)` is an integer, which is always hashable, and it's unique among objects that are alive at the same time. So let's key a regular dict by `id`:

```python run
class IntegerValue:
    def __init__(self):
        self.values = {}

    def __set__(self, instance, value):
        self.values[id(instance)] = int(value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return self.values.get(id(instance))

class Point:
    x = IntegerValue()

    def __init__(self, x):
        self.x = x

    def __eq__(self, other):
        return isinstance(other, Point) and self.x == other.x

p = Point(10.1)
p.x = 20.2
print(p.x, Point.x.values)
print('strong refs:', ref_count(id(p)))
```

An integer key holds no reference to the point, so there's no leak. But there's a new problem:

```python run
del p
gc.collect()
print(Point.x.values)
```

The point is gone, but its entry isn't. The dictionary fills up with dead entries, and worse, CPython **reuses** memory addresses. A brand-new `Point` could be created at the same address and would appear to already have a value for `x`, one that belonged to a dead object. We need to know when an instance dies so we can remove its entry.

## Weakref callbacks

Weak references can tell us exactly that. `weakref.ref(obj, callback)` registers a function that Python calls (with the now-dead weakref as its argument) when the object is about to be destroyed:

```python run
def obj_destroyed(ref):
    print(f'{ref} is being destroyed')

p = Point(10.1)
w = weakref.ref(p, obj_destroyed)
print('deleting p...')
del p
gc.collect()
print('done')
```

The callback ran during `del p`, the moment the last strong reference disappeared.

So the plan is: in `__set__`, store a weakref with a callback *next to* the value, and in the callback, delete the entry. The callback only receives the dead weakref, not the object (which is gone) or its id, so we find the entry by searching for the value whose weakref **is** the one that fired:

```python run
class IntegerValue:
    def __init__(self):
        self.values = {}

    def __set__(self, instance, value):
        self.values[id(instance)] = (weakref.ref(instance, self._remove_object),
                                     int(value))

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        value_tuple = self.values.get(id(instance))
        return value_tuple[1] if value_tuple else None

    def _remove_object(self, weak_ref):
        reverse_lookup = [key for key, value in self.values.items()
                          if value[0] is weak_ref]
        if reverse_lookup:
            del self.values[reverse_lookup[0]]

class Point:
    x = IntegerValue()

p = Point()
p.x = 10.1
print(p.x, Point.x.values)
del p
gc.collect()
print(Point.x.values)
```

The dictionary now cleans itself up, and it works for unhashable instances.

<div class="callout tip">
<span class="callout-title">Skipping the search</span>

The linear search runs once per destroyed object. If that matters, capture the key when you create the weakref, for example `weakref.ref(instance, lambda ref, key=id(instance): self.values.pop(key, None))`. The default argument freezes the id at the moment `__set__` runs. `weakref.finalize(instance, self.values.pop, id(instance), None)` is another option, with a friendlier API.

</div>

## `__weakref__` and `__slots__`

Why can custom objects be weakly referenced when lists can't? Because every normal class gets a slot to hold the list of weak references pointing at the instance, exposed as `__weakref__`:

```python run
class Person:
    pass

print('__weakref__' in Person.__dict__)
print(hasattr(Person.__weakref__, '__get__'), hasattr(Person.__weakref__, '__set__'))

p = Person()
print(p.__weakref__)
w = weakref.ref(p)
print(p.__weakref__)
```

`Person.__weakref__` is itself a data descriptor. It's `None` until a weak reference exists, and then shows (the head of) the object's internal list of weakrefs.

Defining `__slots__` removes both the instance `__dict__` **and** `__weakref__`, so weak references stop working:

```python run
class Person:
    __slots__ = 'name',

p = Person()
print(hasattr(p, '__weakref__'))
try:
    weakref.ref(p)
except TypeError as ex:
    print('TypeError:', ex)
```

The fix is to list `'__weakref__'` as a slot:

```python run
class Person:
    __slots__ = 'name', '__weakref__'

p = Person()
print(hasattr(p, '__weakref__'))
print(weakref.ref(p))
```

So any descriptor that relies on weak references (a `WeakKeyDictionary` or our callback approach) requires `'__weakref__'` in the slots of classes that use `__slots__`.

## Putting it together: `ValidString`

Here is a reusable, validating string descriptor built with the callback technique:

```python run
class ValidString:
    def __init__(self, min_length=0, max_length=255):
        self.data = {}
        self._min_length = min_length
        self._max_length = max_length

    def __set__(self, instance, value):
        if not isinstance(value, str):
            raise ValueError('Value must be a string.')
        if len(value) < self._min_length:
            raise ValueError(f'Value should be at least {self._min_length} characters.')
        if len(value) > self._max_length:
            raise ValueError(f'Value cannot exceed {self._max_length} characters.')
        self.data[id(instance)] = (weakref.ref(instance, self._finalize_instance), value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        value_tuple = self.data.get(id(instance))
        return value_tuple[1] if value_tuple else None

    def _finalize_instance(self, weak_ref):
        reverse_lookup = [key for key, value in self.data.items()
                          if value[0] is weak_ref]
        if reverse_lookup:
            del self.data[reverse_lookup[0]]
```

Use it in two unrelated classes, both with `__slots__` and both unhashable (they define `__eq__`):

```python run
class Person:
    __slots__ = '__weakref__',

    first_name = ValidString(1, 100)
    last_name = ValidString(1, 100)

    def __eq__(self, other):
        return (isinstance(other, Person)
                and self.first_name == other.first_name
                and self.last_name == other.last_name)

class BankAccount:
    __slots__ = '__weakref__',

    account_number = ValidString(5, 255)

    def __eq__(self, other):
        return isinstance(other, BankAccount) and self.account_number == other.account_number

p1, p2 = Person(), Person()
try:
    p1.first_name = ''
except ValueError as ex:
    print('ValueError:', ex)

p1.first_name, p1.last_name = 'Guido', 'van Rossum'
p2.first_name, p2.last_name = 'Raymond', 'Hettinger'
b1, b2 = BankAccount(), BankAccount()
b1.account_number, b2.account_number = 'Savings', 'Checking'

print(p1.first_name, p1.last_name, '|', p2.first_name, p2.last_name)
print(b1.account_number, b2.account_number)
print(len(Person.first_name.data), len(Person.last_name.data), len(BankAccount.account_number.data))
```

And when the objects go, the storage empties:

```python run
del p1, p2, b1, b2
gc.collect()
print(Person.first_name.data, Person.last_name.data, BankAccount.account_number.data)
```

That was a long road, and you won't always need every piece. If your instances are hashable, a `WeakKeyDictionary` is enough. If your classes have an instance `__dict__`, you can store values in the instance itself, and the next two lessons show how to do that cleanly.

<div class="takeaways">

## Key takeaways

- A `WeakKeyDictionary` in the descriptor fixes the leak, but only for hashable, weak-referenceable instances.
- Keying a plain dict by `id(instance)` handles unhashable instances but leaves **dead entries**, which is dangerous because addresses get reused.
- `weakref.ref(obj, callback)` calls `callback(dead_ref)` when `obj` is destroyed; use it to remove the entry.
- Normal classes get a `__weakref__` slot. A class with `__slots__` must include `'__weakref__'` to support weak references.
- Pick the simplest storage strategy that fits your classes: instance `__dict__`, `WeakKeyDictionary`, or `id` keys plus callbacks.

</div>
