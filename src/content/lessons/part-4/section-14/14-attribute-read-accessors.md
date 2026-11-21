---
title: Attribute Read Accessors
summary: Every attribute read goes through __getattribute__; __getattr__ is only the fallback when that raises AttributeError. Knowing the exact rules lets you build dynamic attributes without infinite recursion.
minutes: 18
---

## Two hooks for reading attributes

Python gives a class two special methods to customize `obj.name`:

- **`__getattribute__(self, name)`** is called for **every** attribute read on the instance. `object` provides the default, which implements the normal lookup (descriptors, instance dictionary, class attributes).
- **`__getattr__(self, name)`** is a **fallback**. It's called only when the normal lookup fails with `AttributeError`. `object` doesn't define it at all.

Most of the time you leave `__getattribute__` alone and implement `__getattr__` to handle attributes that don't exist.

## The precise rules

When Python evaluates `obj.name` (or `getattr(obj, 'name')`):

1. It calls `type(obj).__getattribute__(obj, 'name')`. The method is looked up on the **type**, never on the instance.
2. The default `object.__getattribute__` searches in this order:
   1. a **data descriptor** (has `__set__` or `__delete__`) named `name` in the class or its bases (MRO) → return `descriptor.__get__(obj, type(obj))`;
   2. the instance's `__dict__` → return the value stored there;
   3. a **non-data descriptor** (such as a function) or plain class attribute in the MRO → call its `__get__` if it has one, otherwise return it as is;
   4. otherwise raise `AttributeError`.
3. If step 1 raised `AttributeError`, **from anywhere inside it**, including a property getter, and `type(obj)` defines `__getattr__`, Python calls `type(obj).__getattr__(obj, 'name')` and uses its result (or its exception).
4. Any other exception from `__getattribute__` propagates unchanged, and `__getattr__` is not called.

And one important exception to all of this: **implicit special method lookups bypass both hooks**. `len(obj)`, `obj + 1`, `repr(obj)`, `with obj:` and friends look the method up directly on the type.

Let's check each rule.

## `__getattr__` runs only on failure

```python run
class Person:
    def __init__(self):
        self.name = 'Alex'

    def __getattr__(self, name):
        print(f'__getattr__ called for {name!r}')
        return 'not found!'

p = Person()
print(p.name)       # found normally: no __getattr__
print(p.age)        # missing: falls back
```

Without `__getattr__`, the second read would have raised `AttributeError: 'Person' object has no attribute 'age'`.

`getattr(obj, name, default)` and `hasattr` go through the same machinery, so they see the fallback too:

```python run
print(getattr(p, 'anything', 'default'), hasattr(p, 'whatever'))
```

## The property gotcha (rule 3)

The fallback is triggered by **any** `AttributeError` escaping `__getattribute__`, even one raised deep inside a property because of a bug:

```python run
class Account:
    def __init__(self):
        self.transactions = [100, -30]

    @property
    def balance(self):
        return self.transactions.total()     # bug: lists have no .total()

    def __getattr__(self, name):
        print(f'__getattr__ called for {name!r}')
        return 0

print(Account().balance)
```

The list raised `AttributeError: 'list' object has no attribute 'total'` inside the getter. That exception escaped `__getattribute__` while it was looking up `balance`, so Python concluded that `balance` "doesn't exist" and asked `__getattr__`, which quietly returned `0`. The real bug vanished. Keep property code simple in classes that define `__getattr__`, and consider logging inside `__getattr__` while debugging.

## Special methods bypass the hooks

```python run
class Anything:
    def __getattr__(self, name):
        print(f'__getattr__({name!r})')
        return lambda *args: 42

a = Anything()
print(a.__len__())          # explicit attribute access: goes through __getattr__

try:
    len(a)                  # implicit lookup on the type: bypasses it
except TypeError as ex:
    print('TypeError:', ex)
```

This is why a proxy class built on `__getattr__` must define special methods (`__len__`, `__iter__`, `__repr__`…) explicitly if it wants to forward them.

Also, because the hooks are looked up on the type, assigning a `__getattr__` to an instance does nothing:

```python run
class Plain:
    pass

obj = Plain()
obj.__getattr__ = lambda name: 'from instance'
print(hasattr(obj, 'missing'))
```

## Avoiding infinite recursion

Suppose a missing `attr` should fall back to `_attr`. This version looks reasonable:

```python
class Person:
    def __getattr__(self, name):
        alt_name = '_' + name
        return getattr(self, alt_name)     # if _age is missing too...
```

If `_age` doesn't exist either, `getattr(self, '_age')` fails, which calls `__getattr__('_age')`, which tries `__age`, then `___age`, forever, until Python raises `RecursionError` (or, in the browser, the WebAssembly stack overflows and crashes the interpreter). Here is the same code with a guard that stops after a few steps so we can watch it spiral:

```python run
class Person:
    attempts = []

    def __getattr__(self, name):
        Person.attempts.append(name)
        if len(Person.attempts) > 5:
            raise RuntimeError('stopping: this would recurse forever')
        return getattr(self, '_' + name)

try:
    Person().age
except RuntimeError as ex:
    print(ex)
print(Person.attempts)
```

The fix is to perform the inner lookup with the **default** mechanism, bypassing our hook. `super().__getattribute__(name)` runs `object.__getattribute__`, which never calls `__getattr__`:

```python run
class Person:
    def __init__(self, age=None):
        if age is not None:
            self._age = age

    def __getattr__(self, name):
        alt_name = '_' + name
        print(f'Could not find {name}, trying {alt_name}...')
        try:
            return super().__getattribute__(alt_name)
        except AttributeError:
            raise AttributeError(f'Could not find {name} or {alt_name}') from None

print(Person(100).age)

try:
    Person().age
except AttributeError as ex:
    print('AttributeError:', ex)
```

## Example: attributes with defaults

A class that behaves a bit like `defaultdict`: a missing attribute is created with a default value. Once it's set, normal lookup finds it and `__getattr__` isn't consulted again:

```python run
class DefaultClass:
    def __init__(self, attribute_default=None):
        self._attribute_default = attribute_default

    def __getattr__(self, name):
        print(f'{name} not found, creating it with the default...')
        default = super().__getattribute__('_attribute_default')
        setattr(self, name, default)
        return default

class Person(DefaultClass):
    def __init__(self, name):
        super().__init__('Unavailable')
        self.name = name

p = Person('Raymond')
print(p.name)
print(p.age)
print(p.age)          # now a real attribute: no message
p.age = 42
print(vars(p))
```

## Overriding `__getattribute__`

Overriding `__getattribute__` intercepts **everything**, including method lookups and `__dict__`, so it needs more care. Here we block access to "private" names that start with a single underscore. Double-underscore names must stay accessible, or even `p.__dict__` and `p.__class__` would break. The properties read the private values through `super().__getattribute__`, which skips our check:

```python run
class Person:
    def __init__(self, name, age):
        self._name = name
        self._age = age

    def __getattribute__(self, name):
        if name.startswith('_') and not name.startswith('__'):
            raise AttributeError(f'Forbidden access to {name}')
        return super().__getattribute__(name)

    @property
    def name(self):
        return super().__getattribute__('_name')

    @property
    def age(self):
        return super().__getattribute__('_age')

p = Person('Python', 42)
print(p.name, p.age, p.__dict__)

try:
    p._name
except AttributeError as ex:
    print('AttributeError:', ex)
```

Assignments like `self._name = name` in `__init__` still work: they go through `__setattr__`, the subject of the next lesson.

Methods are attributes too, so a call like `m.say_hello()` first reads `say_hello` through `__getattribute__`:

```python run
class MyClass:
    def __getattribute__(self, name):
        print(f'__getattribute__({name!r})')
        return super().__getattribute__(name)

    def say_hello(self):
        return 'hello'

MyClass().say_hello()
```

## Class-level accessors live on the metaclass

Reading `Account.apr` is an attribute read on the **class object**, so it's handled by `type(Account).__getattribute__`, the metaclass's method. To customize class attribute access, define the hooks on a metaclass:

```python run
class MetaLogger(type):
    def __getattr__(cls, name):
        print(f'class-level __getattr__ for {name!r}')
        return 'Not Found'

class Account(metaclass=MetaLogger):
    apr = 10

print(Account.apr)
print(Account.apy)
```

<div class="callout modern">
<span class="callout-title">Module `__getattr__` (3.7)</span>

Since Python 3.7 (PEP 562), a **module** can define a top-level function `__getattr__(name)`, called when `module.name` isn't found, plus `__dir__()`. It's commonly used to emit deprecation warnings for renamed names or to import heavy submodules lazily, both of which used to require replacing the module object with a class instance.

</div>

<div class="takeaways">

## Key takeaways

- `obj.name` calls `type(obj).__getattribute__`, which by default checks data descriptors, then the instance `__dict__`, then non-data descriptors and class attributes.
- `__getattr__` is called only when `__getattribute__` raises `AttributeError`, from anywhere, including inside a property. Other exceptions propagate.
- Implicit special method lookups (`len(obj)`, operators, `repr`) bypass both hooks; the hooks themselves are looked up on the type.
- Inside the hooks, read attributes with `super().__getattribute__(name)` to avoid infinite recursion.
- Overriding `__getattribute__` affects every read, including methods and `__dict__`. To customize class attribute access, define the hooks on a metaclass.

</div>
