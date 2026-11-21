---
title: Metaclasses
summary: The metaclass keyword makes a normal class statement build its class with your subclass of type. Metaclasses are inherited, and their methods belong to the class, not its instances.
minutes: 12
---

## The `metaclass` keyword

In the previous lesson, using a custom metaclass meant extracting the body, running it with `exec` and calling the metaclass ourselves. The `class` statement already does all of that. It just needs to know **which callable** to use instead of `type`, and you tell it with the `metaclass` keyword in the class header.

By default the metaclass is `type`, so these two definitions are identical:

```python run
import math

class Circle(metaclass=type):
    def __init__(self, x, y, r):
        self.x, self.y, self.r = x, y, r

    def area(self):
        return math.pi * self.r ** 2

print(type(Circle), Circle(0, 0, 1).area())
```

Now plug in a custom one. Python collects the name, bases and namespace, then calls `CustomType(name, bases, namespace)` for us:

```python run
class CustomType(type):
    def __new__(mcls, name, bases, class_dict):
        print(f'Using {mcls.__name__} to create class {name}...')
        cls = super().__new__(mcls, name, bases, class_dict)
        cls.circ = lambda self: 2 * math.pi * self.r
        return cls

class Circle(metaclass=CustomType):
    def __init__(self, x, y, r):
        self.x, self.y, self.r = x, y, r

    def area(self):
        return math.pi * self.r ** 2
```

The message is printed when the `class` statement runs, not when we create a circle. Metaclass code runs **once per class**, at definition time:

```python run
c = Circle(0, 0, 1)
print(c.area(), c.circ())
print(type(Circle).__name__)
```

## How Python picks the metaclass

The metaclass doesn't have to be given explicitly. Python determines it like this:

1. If the header has `metaclass=M`, start with `M`; otherwise start with `type`.
2. Look at the metaclass of every base class. The winner must be the **most derived** of all these candidates, a metaclass that is a subclass of all the others.
3. If no candidate is a subclass of all the others, the class can't be created: `TypeError: metaclass conflict`.

The practical consequence of step 2 is that **metaclasses are inherited**. A subclass of `Circle` is also built by `CustomType`, without saying so:

```python run
class Ring(Circle):
    def __init__(self, x, y, r, width):
        super().__init__(x, y, r)
        self.width = width

print(type(Ring).__name__, hasattr(Ring, 'circ'))
```

The message printed again: `CustomType.__new__` ran for `Ring` too. That's both the strength of metaclasses (a rule applies to a whole hierarchy automatically) and their main cost (you can't opt out, and two unrelated metaclasses can't be combined). We'll come back to the conflict case in the lesson comparing metaclasses with class decorators.

## The metaclass doesn't have to be a class

Python simply **calls** whatever you pass as `metaclass`, with `(name, bases, namespace)`. Any callable works, even a function:

```python run
def shouting(name, bases, ns):
    upper = {k.upper() if not k.startswith('__') else k: v for k, v in ns.items()}
    return type(name, bases, upper)

class Config(metaclass=shouting):
    debug = True
    level = 3

print(Config.DEBUG, Config.LEVEL, type(Config))
```

This is a curiosity more than a technique. The resulting class's real metaclass is `type`, so nothing is inherited by subclasses. In practice, metaclasses are subclasses of `type`.

## Metaclass methods belong to the class

A method defined on a metaclass is a method of the **class object**, because the class is an instance of the metaclass. Instances of the class don't see it, since attribute lookup on an instance searches the class and its bases, never the metaclass:

```python run
class Describable(type):
    def describe(cls):
        return f'{cls.__name__} with attributes {sorted(k for k in vars(cls) if not k.startswith("__"))}'

class Point(metaclass=Describable):
    x = 0
    y = 0

print(Point.describe())

try:
    Point().describe()
except AttributeError as ex:
    print('AttributeError:', ex)
```

This is how the special methods of a metaclass work too. `len(Point)` would call `Describable.__len__`, and `Point()` calls `Describable.__call__`, which is inherited from `type` and is what runs `__new__` and `__init__`. The singleton application later in this section overrides `__call__` to control instance creation.

<div class="callout tip">
<span class="callout-title">Use them sparingly</span>

Metaclasses are the right tool for a small set of problems: framework-level rules that must apply to every subclass, or control over things that only exist before the class is created. For most other jobs a class decorator, `__init_subclass__` or a descriptor is simpler and easier to read. Don't invent problems so that you can use a metaclass.

</div>

<div class="takeaways">

## Key takeaways

- `class C(metaclass=M):` makes Python call `M(name, bases, namespace)` instead of `type(...)`.
- Metaclass code runs once per class, when the `class` statement executes.
- Python chooses the most derived metaclass among the explicit one and those of the bases, so metaclasses are inherited. Incompatible metaclasses raise a conflict `TypeError`.
- Methods defined on a metaclass are available on the class (`Point.describe()`), not on its instances.
- Any callable can be passed as `metaclass`, but only a `type` subclass carries over to subclasses.

</div>
