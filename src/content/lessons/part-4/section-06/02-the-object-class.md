---
title: The object Class
summary: Every class in Python inherits from object, which supplies default implementations of __init__, __repr__, __str__, __eq__, __hash__ and other special methods.
minutes: 11
---

## `object` is a class

The built-in name `object` refers to a **class**, the root of every class hierarchy in Python. Like `int`, `str` and `dict`, its type is `type`:

```python run
print(type(object))
print(type(int), type(str), type(dict))
```

Every class inherits from it, whether you write it or not. That includes your own classes and all the built-in types:

```python run
class Person:
    pass

print(issubclass(Person, object))
print(issubclass(int, object), issubclass(dict, object), issubclass(type, object))
```

## Even modules and functions

"Everything is an object" is meant literally. A module is an instance of the module type; a function is an instance of the function type. Both of those types are classes that inherit from `object`:

```python run
import math
import types

def my_func():
    pass

print(type(math), type(math) is types.ModuleType)
print(type(my_func), type(my_func) is types.FunctionType)
print(issubclass(types.ModuleType, object), issubclass(types.FunctionType, object))
print(isinstance(math, object), isinstance(my_func, object))
```

The `types` module is where the standard library exposes types that have no built-in name, such as `FunctionType`, `ModuleType`, `MethodType`, `GeneratorType` and `SimpleNamespace`:

```python run
print([name for name in dir(types) if name.endswith('Type')][:10])
```

## What `object` gives every class

Because every class inherits from `object`, everything defined there is available on every object. It's mostly special methods:

```python run
print([name for name in dir(object)])
```

These defaults are why a class with nothing in it can already be created, printed, compared and hashed. Let's look at a few.

### `__repr__` and `__str__`

The default representation shows the class name and the memory address:

```python run
o = object()
print(repr(o))
print(str(o))

p = Person()
print(repr(p))
```

`Person` doesn't define `__repr__` or `__str__`, so Python finds them further up the chain, in `object`. The default `__str__` simply calls `__repr__`, which is why the two look the same. (The address varies from run to run.)

### `__eq__` and `__hash__`

The default `__eq__` compares **identity**: two objects are equal only if they are the same object. The default `__hash__` is derived from the object's id, so every instance is usable as a dict key or set member:

```python run
p1 = Person()
p2 = Person()

print(p1 == p2, p1 == p1)
print(p1 is p2, p1 is p1)
print(hash(p1) == hash(p1), len({p1, p2, p1}))
```

### `__init__` and `__new__`

`object` also provides the default `__new__`, which creates the instance, and the default `__init__`, which does nothing. That's why a class without an `__init__` can still be called. The defaults accept **no** arguments, though:

```python run
try:
    Person('Alex')
except TypeError as ex:
    print('TypeError:', ex)
```

## Proving it's the same method

When `Person` doesn't define a method, `Person.method` finds the one on `object`: it's literally the same object, which you can confirm with `is` (or by comparing `id()`s):

```python run
print(Person.__eq__ is object.__eq__)
print(Person.__init__ is object.__init__)
print(Person.__repr__ is object.__repr__)
```

As soon as `Person` defines its own version, the lookup stops at `Person` and the method on `object` is no longer used:

```python run
class Person:
    def __init__(self):
        pass

print(Person.__init__ is object.__init__)
print(Person.__init__)
print(object.__init__)
```

Replacing an inherited method like this is called **overriding**, and it's the subject of the next lesson.

## A bare `object()` is very limited

You can create instances of `object` itself, but there's very little you can do with one. In particular, it has no instance dictionary, so you can't give it attributes:

```python run
o = object()
try:
    o.name = 'test'
except AttributeError as ex:
    print('AttributeError:', ex)

print(hasattr(Person(), '__dict__'), hasattr(o, '__dict__'))
```

Instances of your own classes do get a `__dict__`, because `class` statements add one by default. In the last two lessons of this section you'll see how `__slots__` lets you opt out of that dictionary too. Meanwhile, bare `object()` instances do have one popular use: since each one is equal only to itself, `MISSING = object()` makes a unique **sentinel** value that can never be confused with `None` or any real argument.

<div class="callout modern">
<span class="callout-title">Newer entries in `dir(object)`</span>

Python 3.11 added `object.__getstate__`, the default used by `pickle` and `copy`, so it shows up in `dir(object)` on modern versions but not in older notebooks. Error messages have also become more detailed: since 3.13, setting an attribute on an object without a `__dict__` says "... and no \_\_dict\_\_ for setting new attributes".

</div>

<div class="takeaways">

## Key takeaways

- `object` is a class, the root of every hierarchy. Its type is `type`, and every class inherits from it: your own classes, built-ins like `int`, and the types of modules and functions.
- It supplies default special methods: `__repr__` (class name and address), `__str__` (calls `__repr__`), `__eq__` (identity), `__hash__` (based on id), `__new__` and a no-argument `__init__`.
- If a class doesn't define a method, `Class.method is object.method`. Defining it in the class **overrides** the inherited one.
- A plain `object()` has no `__dict__`, so it can't hold attributes; it makes a handy unique sentinel.

</div>
