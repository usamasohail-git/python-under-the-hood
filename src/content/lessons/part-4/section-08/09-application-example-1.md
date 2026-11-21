---
title: Application - Example 1
summary: Reusable type-checking attributes, first as one descriptor per type, then as a single generic `ValidType` descriptor that also works with abstract types like `numbers.Real`.
minutes: 10
---

## Validators, one per type

Data validation is the classic use of descriptors: the check is written once and every attribute that needs it gets it with one line. Here are three validators that use the "same name in the instance `__dict__`" storage pattern from the lookup-resolution lesson:

```python run
class Int:
    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, int):
            raise ValueError(f'{self.prop_name} must be an integer.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)


class Float:
    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, float):
            raise ValueError(f'{self.prop_name} must be a float.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)


class List:
    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, list):
            raise ValueError(f'{self.prop_name} must be a list.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)
```

Any class can now use them, as many times as it needs:

```python run
class Person:
    age = Int()
    height = Float()
    tags = List()
    favorite_foods = List()

p = Person()
for attr, value in [('age', 12.5), ('height', 'abc'), ('tags', 'python')]:
    try:
        setattr(p, attr, value)
    except ValueError as ex:
        print('ValueError:', ex)

p.age, p.tags = 12, ['python']
print(p.__dict__)
```

With properties we'd have written four getter/setter pairs for `Person` alone, and more for every other class. Still, the three descriptor classes are copies of each other that differ only in the type they check. That's our next refactoring target.

## One generic descriptor

Make the type a constructor argument:

```python run
class ValidType:
    def __init__(self, type_):
        self._type = type_

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, self._type):
            raise ValueError(f'{self.prop_name} must be of type {self._type.__name__}')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

class Person:
    age = ValidType(int)
    height = ValidType(float)
    tags = ValidType(list)
    favorite_foods = ValidType(tuple)
    name = ValidType(str)

p = Person()
for attr, value in [('age', 10.5), ('height', 10), ('name', 42)]:
    try:
        setattr(p, attr, value)
    except ValueError as ex:
        print('ValueError:', ex)
```

## Using abstract types

`height = 10` was rejected, because `10` is an `int`, not a `float`. Mathematically, though, integers are real numbers, and a height of 10 is perfectly reasonable. Since `ValidType` uses `isinstance`, it works with **abstract base classes** too, and the `numbers` module defines a hierarchy for exactly this:

```python run
import numbers

print(isinstance(10.1, numbers.Real), isinstance(10, numbers.Real))
print(isinstance(True, numbers.Integral), isinstance(1 + 2j, numbers.Real))

class Person:
    age = ValidType(numbers.Integral)
    height = ValidType(numbers.Real)
    name = ValidType(str)

p = Person()
p.height = 10
p.age = 42
print(p.height, p.age, p.__dict__)
```

Note that `bool` is a subclass of `int`, so `True` passes an `int` or `Integral` check. If that matters for your data, add an explicit `isinstance(value, bool)` rejection.

<div class="callout tip">
<span class="callout-title">Standard-library cousins</span>

Third-party libraries (ORMs such as SQLAlchemy and Django models, or validation libraries) build their field types on exactly this mechanism. In the standard library, `dataclasses` also understands descriptors: a descriptor used as a field's default value has its `__set__` called by the generated `__init__`.

</div>

<div class="takeaways">

## Key takeaways

- Descriptors make validation reusable: one class, one line per validated attribute, in any number of owner classes.
- When several descriptor classes differ only in a value (here, a type), turn that value into a constructor argument.
- `isinstance` checks work with abstract base classes, so `ValidType(numbers.Real)` accepts both `int` and `float`.
- Watch out for `bool`, which is a subclass of `int`.

</div>
