---
title: Properties and Descriptors
summary: "`property` is a data descriptor that delegates to your getter and setter functions. Build a working version of it yourself, decorator syntax included."
minutes: 14
---

## A property, two ways

Here is a validated `age` attribute written with the decorator syntax:

```python run
from numbers import Integral

class Person:
    @property
    def age(self):
        return getattr(self, '_age', None)

    @age.setter
    def age(self, value):
        if not isinstance(value, Integral):
            raise ValueError('age: must be an integer.')
        if value < 0:
            raise ValueError('age: must be a non-negative integer.')
        self._age = value

p = Person()
try:
    p.age = -10
except ValueError as ex:
    print('ValueError:', ex)
p.age = 10
print(p.age, p.__dict__)
```

The decorators are only shorthand for calling `property` with the functions:

```python run
class Person:
    def get_age(self):
        return getattr(self, '_age', None)

    def set_age(self, value):
        if not isinstance(value, Integral):
            raise ValueError('age: must be an integer.')
        if value < 0:
            raise ValueError('age: must be a non-negative integer.')
        self._age = value

    age = property(fget=get_age, fset=set_age)

p = Person()
p.age = 10
print(p.age, p.__dict__)
```

Either way, `age` is a class attribute holding a `property` object. And `property` objects are **data descriptors**:

```python run
prop = Person.age
print(prop)
print(hasattr(prop, '__get__'), hasattr(prop, '__set__'), hasattr(prop, '__delete__'))
```

## Even read-only properties are data descriptors

A property with only a getter still has a `__set__` method. It just refuses to set anything:

```python run
from datetime import datetime, timezone

class TimeUTC:
    @property
    def current_time(self):
        return datetime.now(timezone.utc).isoformat()

t = TimeUTC()
prop = TimeUTC.current_time
print(hasattr(prop, '__get__'), hasattr(prop, '__set__'))
try:
    t.current_time = 'noon'
except AttributeError as ex:
    print('AttributeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Python 3.11: clearer property error messages</span>

Older versions (and older notebooks) report the generic `can't set attribute`. Since Python 3.11 the message names the property and the owner class: `property 'current_time' of 'TimeUTC' object has no setter`. Deleting a property without a deleter similarly says `... has no deleter`.

</div>

Because it is a data descriptor, an instance attribute with the same name can't shadow it. That's what makes a read-only property truly read-only:

```python run
t.__dict__['current_time'] = 'not a time'
print(t.__dict__)
print(t.current_time)        # still the property
```

If `property` were a non-data descriptor, writing to `__dict__` (or a plain assignment) would quietly replace the computed value.

## Building our own `property`

All a property does is store some functions and call them from the descriptor methods. Let's write one:

```python run
class MakeProperty:
    def __init__(self, fget=None, fset=None):
        self.fget = fget
        self.fset = fset

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __get__(self, instance, owner_class):
        print('__get__ called...')
        if instance is None:
            return self
        if self.fget is None:
            raise AttributeError(f'{self.prop_name} is not readable.')
        return self.fget(instance)

    def __set__(self, instance, value):
        print('__set__ called...')
        if self.fset is None:
            raise AttributeError(f'{self.prop_name} is not writable.')
        self.fset(instance, value)

class Person:
    def get_name(self):
        return self._name

    def set_name(self, value):
        self._name = value

    name = MakeProperty(fget=get_name, fset=set_name)

p = Person()
p.name = 'Guido'
p.name
```

The getter and setter are plain functions. The descriptor receives the `instance` and passes it to them as `self`. Because `MakeProperty` defines `__set__`, it's a data descriptor, so shadowing doesn't work here either:

```python run
p.__dict__['name'] = 'Alex'
print(p.__dict__)
p.name
```

## Adding decorator support

For the `@property` / `@x.setter` style we need two things:

1. `@MakeProperty` applied to a function must return a descriptor. It already does: `MakeProperty(func)` passes `func` as `fget`.
2. The descriptor needs a `setter` method that takes the setter function, stores it, and returns a descriptor, which then becomes the class attribute.

```python run
class MakeProperty:
    def __init__(self, fget=None, fset=None):
        self.fget = fget
        self.fset = fset

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        if self.fget is None:
            raise AttributeError(f'{self.prop_name} is not readable.')
        return self.fget(instance)

    def __set__(self, instance, value):
        if self.fset is None:
            raise AttributeError(f'{self.prop_name} is not writable.')
        self.fset(instance, value)

    def setter(self, fset):
        self.fset = fset
        return self

class Person:
    @MakeProperty
    def first_name(self):
        return getattr(self, '_first_name', None)

    @first_name.setter
    def first_name(self, value):
        self._first_name = value

    @MakeProperty
    def last_name(self):
        return getattr(self, '_last_name', None)

p1, p2 = Person(), Person()
p1.first_name = 'Raymond'
p2.first_name = 'Alex'
print(p1.first_name, p2.first_name)
try:
    p1.last_name = 'Hettinger'
except AttributeError as ex:
    print('AttributeError:', ex)
```

Walk through what the class body does for `first_name`:

- `@MakeProperty` on the first `def` evaluates `MakeProperty(first_name_getter)` and binds the name `first_name` to that descriptor.
- `@first_name.setter` on the second `def` calls the descriptor's `setter` method with the new function. It stores it and returns the **same** descriptor, which is re-bound to `first_name`.

`last_name` has no setter, so it's read-only, with our own error message. And since values are stored on the instances (`_first_name`), different `Person` objects keep separate data.

<div class="callout note">
<span class="callout-title">How the real `property` differs</span>

The built-in `property.setter` doesn't modify the property; it returns a **new** property object with the setter added. That's safer: a subclass can do `@Base.prop.setter` to customize a setter without changing the base class's property. The real `property` also supports `deleter`, `__delete__`, and a `doc` string taken from the getter's docstring.

</div>

```python run
class Demo:
    @property
    def x(self):
        """The x value."""
        return 1

original = Demo.__dict__['x']
with_setter = original.setter(lambda self, v: None)
print(with_setter is original, Demo.x.__doc__)
```

<div class="takeaways">

## Key takeaways

- `@property` / `@x.setter` is shorthand for `x = property(fget, fset)`, a class attribute holding a `property` object.
- A `property` is always a **data descriptor**, even with no setter; its `__set__` raises `AttributeError`. That's why instance attributes can't shadow properties.
- Since Python 3.11 the error says `property 'x' of 'C' object has no setter`.
- A property is a descriptor that stores functions and calls them with the instance; you can write a working version in about 20 lines.
- Decorator support only needs a constructor that accepts the getter and a `setter` method that returns a descriptor.

</div>
