---
title: Inheriting from type
summary: Subclass type and override __new__ to run your own code every time a class is built, adding attributes or checking the namespace before the class exists.
minutes: 10
---

## A custom class factory

If classes are built by calling `type(name, bases, namespace)`, we can build them with a **subclass** of `type` instead. Inheriting gives us all of `type`'s machinery for free; we only override the part we want to customize.

Which method? We want to step in while the *class object* is being created, so we override `__new__`. Recall from the `__new__` lesson that calling a class `X(args)` means `X.__new__(X, args)` followed by `__init__`. When `X` is a subclass of `type`, the "instance" being created is a class, and the arguments are `name`, `bases` and the namespace dict.

First a quick reminder that `__new__` receives exactly what the call received:

```python run
class Test:
    def __new__(cls, *args, **kwargs):
        print(f'creating a {cls.__name__} with', args, kwargs)
        return super().__new__(cls)

t = Test(10, 20, kw='a')
```

Now a subclass of `type` that adds a `circ` method to every class it creates:

```python run
import math

class CustomType(type):
    def __new__(mcls, name, bases, class_dict):
        print(f'CustomType is building {name!r}')
        cls = super().__new__(mcls, name, bases, class_dict)   # type does the real work
        cls.circ = lambda self: 2 * math.pi * self.r            # then we add to it
        return cls
```

The first parameter is named `mcls` (or `metacls`) by convention, to make it clear that it's the metaclass and not the class being built. The return value of `super().__new__` is the new class, which we customize and return.

## Using it by hand

Let's build `Circle` exactly as in the previous lesson, but call `CustomType` instead of `type`:

```python run
class_body = """
def __init__(self, x, y, r):
    self.x = x
    self.y = y
    self.r = r

def area(self):
    return math.pi * self.r ** 2
"""
class_dict = {}
exec(class_body, globals(), class_dict)

Circle = CustomType('Circle', (), class_dict)
```

Now `type(Circle)` is no longer `type`:

```python run
print(type(Circle))
print(isinstance(Circle, CustomType), isinstance(Circle, type), issubclass(CustomType, type))
```

`Circle` is an instance of `CustomType`, and therefore also an instance of `type`. It works like any class, and it has the extra method we injected:

```python run
c = Circle(0, 0, 1)
print(c.area(), c.circ())
print('circ' in vars(Circle))
```

## `__new__` or `__init__` in a metaclass?

`type.__call__` runs `__new__` and then `__init__` for classes, just as `object` does for ordinary instances. So a metaclass can override either one:

- **`__new__(mcls, name, bases, ns)`** runs *before* the class exists. Use it when you need to change the name, the bases or the namespace (for example, add `__slots__`, which only works if it's in the namespace when the class is built).
- **`__init__(cls, name, bases, ns)`** runs *after* the class exists. It's enough for adding attributes, registering the class or validating it.

```python run
class Registering(type):
    registry = []

    def __init__(cls, name, bases, ns):
        super().__init__(name, bases, ns)
        Registering.registry.append(name)

Shape = Registering('Shape', (), {})
Square = Registering('Square', (Shape,), {})
print(Registering.registry, type(Square).__name__)
```

Building classes with `exec` and an explicit call is tedious, though. In the next lesson, you'll see how to make an ordinary `class` statement use your metaclass.

<div class="takeaways">

## Key takeaways

- Subclass `type` to customize how classes are built; delegate the real work to `super().__new__(mcls, name, bases, ns)`.
- In a metaclass, the "instance" is a class: `type(Circle)` becomes your metaclass, and `isinstance(Circle, type)` stays `True`.
- Override `__new__` to change things before the class exists (name, bases, namespace); override `__init__` to act on the finished class.
- By convention, name the first parameter `mcls` in a metaclass's `__new__` and `cls` in its `__init__`.

</div>
