---
title: Attribute Write Accessors
summary: Every attribute assignment calls __setattr__ (and every del calls __delattr__). The default implementation defers to data descriptors, then writes the instance dictionary.
minutes: 13
---

## One hook for writes

Reading has two hooks; writing has one. Every assignment `obj.name = value` becomes

```python
type(obj).__setattr__(obj, 'name', value)
```

and every `del obj.name` becomes `type(obj).__delattr__(obj, 'name')`. There's no "fallback" version: `__setattr__` is called for **every** write, whether or not the attribute already exists, including the assignments in `__init__`.

```python run
class Person:
    def __init__(self, name):
        self.name = name          # goes through __setattr__ too

    def __setattr__(self, name, value):
        print(f'setting {name!r} = {value!r}')
        super().__setattr__(name, value)

p = Person('Guido')
p.age = 70
print(vars(p))
```

## What the default `object.__setattr__` does

1. If the class (or a base) has a **data descriptor** named `name` (an object with `__set__`), call `descriptor.__set__(obj, value)`. Properties and `__slots__` entries are data descriptors.
2. Otherwise, store the value in the instance's `__dict__`, silently **shadowing** any class attribute or non-data descriptor of that name.

`object.__delattr__` follows the same pattern with `__delete__`.

```python run
class NonDataDesc:
    def __get__(self, instance, owner):
        return 'from non-data descriptor'

class DataDesc:
    def __get__(self, instance, owner):
        return 'from data descriptor'

    def __set__(self, instance, value):
        print(f'DataDesc.__set__ got {value!r}')

class MyClass:
    non_data_desc = NonDataDesc()
    data_desc = DataDesc()

    def __setattr__(self, name, value):
        print(f'__setattr__({name!r})')
        super().__setattr__(name, value)

m = MyClass()
m.data_desc = 100          # __setattr__, then the descriptor's __set__
m.non_data_desc = 200      # __setattr__, then stored in the instance dict
print(vars(m))
print(m.data_desc, '|', m.non_data_desc)
```

Overriding `__setattr__` runs **before** any of this, so it can veto, transform or redirect a write before descriptors or the instance dictionary are involved.

## Class attributes: the metaclass again

Assigning `Person.species = 'human'` is a write on the class object, handled by the metaclass's `__setattr__`. The instance-level hook isn't involved:

```python run
class MyMeta(type):
    def __setattr__(cls, name, value):
        print(f'setting class attribute {name!r}')
        super().__setattr__(name, value)

class Person(metaclass=MyMeta):
    def __setattr__(self, name, value):
        print(f'setting instance attribute {name!r}')
        super().__setattr__(name, value)

Person.species = 'human'
p = Person()
p.name = 'Alex'
```

Note that class attributes defined in the class **body** don't trigger the metaclass hook: they're in the namespace before the class even exists.

## Recursion, again

The classic mistake is writing the attribute "normally" inside the hook:

```python
class MyClass:
    def __setattr__(self, name, value):
        if name.startswith('_') and not name.startswith('__'):
            raise AttributeError('Sorry, this attribute is read-only.')
        setattr(self, name, value)        # calls __setattr__ again... forever
```

`setattr(self, name, value)` (or `self.name = value`) calls `__setattr__`, which calls `setattr`, and so on until the stack runs out. As with the read hooks, guard against it with a counter to see the loop safely:

```python run
class MyClass:
    depth = 0

    def __setattr__(self, name, value):
        MyClass.depth += 1          # a class attribute: changing it doesn't call this hook
        if MyClass.depth > 5:
            raise RuntimeError(f'__setattr__ re-entered {MyClass.depth - 1} times')
        setattr(self, name, value)

try:
    MyClass().test = 'test'
except RuntimeError as ex:
    print(ex)
```

The fix is always the same: when you want the *default* behavior, delegate with `super().__setattr__(name, value)`:

```python run
class MyClass:
    def __setattr__(self, name, value):
        if name.startswith('_') and not name.startswith('__'):
            raise AttributeError(f'{name} is read-only.')
        super().__setattr__(name, value)

m = MyClass()
m.test = 'test'
print(vars(m))

try:
    m._secret = 1
except AttributeError as ex:
    print('AttributeError:', ex)
```

## Example: freezing an object after `__init__`

Since `__setattr__` sees every write, it can make instances read-only once they're initialized. `__init__` sets the attributes with `object.__setattr__` directly (bypassing our check), and `__delattr__` closes the other door:

```python run
class Frozen:
    def __init__(self, **fields):
        for name, value in fields.items():
            object.__setattr__(self, name, value)

    def __setattr__(self, name, value):
        raise AttributeError(f'cannot set {name!r}: {type(self).__name__} is frozen')

    def __delattr__(self, name):
        raise AttributeError(f'cannot delete {name!r}: {type(self).__name__} is frozen')

point = Frozen(x=1, y=2)
print(point.x, point.y)

for action in (lambda: setattr(point, 'x', 10), lambda: delattr(point, 'y')):
    try:
        action()
    except AttributeError as ex:
        print('AttributeError:', ex)
```

This is essentially how `@dataclass(frozen=True)` works: it generates a `__setattr__` and `__delattr__` that raise `FrozenInstanceError` (a subclass of `AttributeError`), and its `__init__` uses `object.__setattr__`.

<div class="takeaways">

## Key takeaways

- `obj.name = value` always calls `type(obj).__setattr__`; `del obj.name` calls `__delattr__`. There's no fallback hook for writes.
- The default `object.__setattr__` calls a data descriptor's `__set__` if there is one, otherwise writes the instance `__dict__`.
- To customize writes to class attributes, define `__setattr__` on the metaclass.
- Inside the hook, write with `super().__setattr__(name, value)` (or `object.__setattr__`) to avoid infinite recursion.
- A `__setattr__`/`__delattr__` pair that raises is how frozen objects are implemented.

</div>
