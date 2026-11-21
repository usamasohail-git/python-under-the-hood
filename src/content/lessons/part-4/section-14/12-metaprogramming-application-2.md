---
title: Metaprogramming - Application 2
summary: Implementing singletons, first with __new__ and then with a metaclass __call__, and fixing the inheritance bug that a class attribute cache introduces.
minutes: 13
---

## Singletons in Python

A **singleton** is a class that only ever has one instance: every "creation" returns the same object. You've used several already. Calling their types gives back the existing object every time:

```python run
NoneType = type(None)
print(NoneType() is None)
print(bool([]) is bool('') is False)
```

Whether singletons are good design is debated (a module-level object is often all you need, since a module is only imported once). But implementing one is an excellent exercise in controlling instance creation, so let's do it two ways.

## Version 1: `__new__`

`__new__` decides what object a call returns, so it can return a cached instance instead of making a new one:

```python run
class Hundred:
    _existing_instance = None          # a class attribute

    def __new__(cls):
        if cls._existing_instance is None:
            print('creating new instance...')
            instance = super().__new__(cls)
            instance.name = 'hundred'
            instance.value = 100
            cls._existing_instance = instance
        else:
            print('instance exists already, using that one...')
        return cls._existing_instance

h1 = Hundred()
h2 = Hundred()
print(h1 is h2, h1.value)
```

It works, but every singleton class must repeat this logic. And remember the trap from the `__new__` lesson: if the class also defines `__init__`, it runs again on the cached object at every call.

## Version 2: a metaclass `__call__`

What actually happens when you write `Hundred()`? You're **calling** the class object. Calling any object runs the `__call__` method defined on its *type*, and the type of a class is its metaclass. So `Hundred()` runs `type.__call__(Hundred)`, which is the code that calls `__new__` and then `__init__`.

That gives us a single place to intercept creation for any class, before `__new__` or `__init__` ever run:

```python run
class Singleton(type):
    def __call__(cls, *args, **kwargs):
        print(f'Request received to create an instance of {cls.__name__}...')
        return super().__call__(*args, **kwargs)     # the normal __new__ + __init__

class Hundred(metaclass=Singleton):
    value = 100

h = Hundred()
print(h.value)
```

Note that `__call__` in the metaclass receives the **class** as its first argument, conventionally named `cls`. Defining `__call__` in `Hundred` itself would do something else entirely: make *instances* of `Hundred` callable.

Now let's cache the instance. A first idea is to store it on the class, as in version 1:

```python run
class Singleton(type):
    def __call__(cls, *args, **kwargs):
        if getattr(cls, 'existing_instance', None) is None:
            print(f'Creating {cls.__name__} for the first time...')
            cls.existing_instance = super().__call__(*args, **kwargs)
        else:
            print(f'Using existing {cls.__name__}...')
        return cls.existing_instance

class Hundred(metaclass=Singleton):
    value = 100

class Thousand(metaclass=Singleton):
    value = 1000

h1, h2 = Hundred(), Hundred()
t1, t2 = Thousand(), Thousand()
print(h1 is h2, t1 is t2, h1 is t1)
```

## The inheritance bug

Metaclasses are inherited, so a subclass of a singleton should be a singleton too, with its own instance:

```python run
class HundredFold(Hundred):
    value = 100 * 100

hf = HundredFold()
print(type(hf).__name__, hf.value)
```

The metaclass claimed a `HundredFold` already existed, and handed back the `Hundred` instance! The check `getattr(cls, 'existing_instance', None)` found the attribute through **inheritance**: `HundredFold` has no `existing_instance` of its own, so the lookup continued to `Hundred`, which does.

Caching per class requires storage that isn't subject to inheritance. A dictionary keyed by class, kept on the metaclass, does the job:

```python run
class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in Singleton._instances:
            print(f'Creating {cls.__name__} for the first time...')
            Singleton._instances[cls] = super().__call__(*args, **kwargs)
        else:
            print(f'Using existing {cls.__name__}...')
        return Singleton._instances[cls]

class Hundred(metaclass=Singleton):
    value = 100

class Thousand(metaclass=Singleton):
    value = 1000

class HundredFold(Hundred):
    value = 100 * 100

h1, h2 = Hundred(), Hundred()
t1, t2 = Thousand(), Thousand()
hf1, hf2 = HundredFold(), HundredFold()
print(h1 is h2, t1 is t2, hf1 is hf2, h1 is hf1)
print(h1.value, t1.value, hf1.value)
```

Each class now gets exactly one instance, subclasses included. And because `__call__` returns the cached object **without** calling `super().__call__` again, `__init__` runs only once per class. That's an advantage over the `__new__` version.

<div class="callout tip">
<span class="callout-title">Simpler alternatives</span>

If all you need is "one shared object", create it at module level (`config = Config()`) and import it. Modules are cached in `sys.modules`, so every importer gets the same object. Or wrap a factory function with `@functools.cache` (3.9+), so it builds the object on the first call and returns the same one afterwards. Reach for the metaclass when the *class itself* must enforce the rule, including for subclasses.

</div>

<div class="takeaways">

## Key takeaways

- A singleton returns the same instance every time it's "instantiated". `None`, `True` and `False` behave this way.
- `__new__` can return a cached instance, but then `__init__` reruns on every call.
- `Cls()` runs `type(Cls).__call__(Cls)`. Overriding `__call__` in a metaclass intercepts instance creation before `__new__` and `__init__`.
- Don't cache per-class state in a class attribute if subclasses must have their own: inheritance will find the parent's value. Key a dictionary by class instead.

</div>
