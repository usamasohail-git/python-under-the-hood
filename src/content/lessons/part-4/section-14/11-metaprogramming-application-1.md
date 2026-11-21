---
title: Metaprogramming Application 1
summary: A metaclass that turns a list of field names into slots, read-only properties, equality, hashing and readable representations, removing a pile of boilerplate.
minutes: 16
---

## The boilerplate problem

Simple immutable value classes tend to look like this:

```python
class Point2D:
    __slots__ = ('_x', '_y')

    def __init__(self, x, y):
        self._x = x
        self._y = y

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __eq__(self, other):
        return isinstance(other, Point2D) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))

    def __repr__(self):
        return f'Point2D(x={self.x}, y={self.y})'
```

Now write `Point3D`, `Person`, `Color`… Every class repeats the same pattern; only the field names change. That's a perfect job for metaprogramming: declare the fields once and **generate** the rest.

We'll describe the fields with a class attribute, `_fields`, and write a metaclass, `SlottedStruct`, that reads it. Why a metaclass rather than a decorator? Two reasons. We want the behavior inherited, and `__slots__` only works if it's **in the namespace before the class is created**, which only a metaclass (or rebuilding the class) can arrange.

## A first attempt, and a subtle bug

Here's a version that creates the class first and then adds `__slots__` and one read-only property per field:

```python run
class SlottedStruct(type):
    def __new__(mcls, name, bases, class_dict):
        cls = super().__new__(mcls, name, bases, class_dict)
        cls.__slots__ = [f'_{field}' for field in cls._fields]     # too late!
        for field in cls._fields:
            slot = f'_{field}'
            setattr(cls, field, property(lambda self, attrib=slot: getattr(self, attrib)))
        return cls

class Person(metaclass=SlottedStruct):
    _fields = ['name', 'age']

    def __init__(self, name, age):
        self._name = name
        self._age = age

p = Person('Alex', 19)
print(p.name, p.age)
p.anything = 'oops'
print(p.__dict__)
```

The properties work, but the slots don't: instances still have a `__dict__`, and we could add an arbitrary attribute. `__slots__` is read by `type.__new__` while it lays out the class. Assigning it afterwards just creates an ordinary class attribute that nothing looks at.

Notice also the `attrib=slot` default argument in the lambda. All the lambdas are created in one loop, so if they read `slot` as a free variable, they would all share the loop's single variable and return the **last** field, the classic closures-in-a-loop bug. The default argument captures the current value for each lambda.

## The fixed metaclass

The fix is to put `__slots__` into `class_dict` **before** calling `super().__new__`. While we're there, let's generate `__eq__`, `__hash__`, `__repr__` and `__str__` too:

```python run
class SlottedStruct(type):
    def __new__(mcls, name, bases, class_dict):
        fields = class_dict.get('_fields', [])
        class_dict['__slots__'] = [f'_{field}' for field in fields]   # in place before creation
        cls = super().__new__(mcls, name, bases, class_dict)

        for field in fields:
            setattr(cls, field, property(lambda self, attrib=f'_{field}': getattr(self, attrib)))

        def values(self):
            return tuple(getattr(self, field) for field in fields)

        def __eq__(self, other):
            return isinstance(other, cls) and values(self) == values(other)

        def __hash__(self):
            return hash(values(self))

        def __repr__(self):
            pairs = ', '.join(f'{f}={v!r}' for f, v in zip(fields, values(self)))
            return f'{name}({pairs})'

        def __str__(self):
            return f'{name}{values(self)}'

        for method in (__eq__, __hash__, __repr__, __str__):
            setattr(cls, method.__name__, method)
        return cls
```

The generated methods are closures over `cls`, `name` and `fields`, so each class gets its own versions. Let's use it:

```python run
class Point2D(metaclass=SlottedStruct):
    _fields = ['x', 'y']

    def __init__(self, x, y):
        self._x = x
        self._y = y

class Point3D(metaclass=SlottedStruct):
    _fields = ['x', 'y', 'z']

    def __init__(self, x, y, z):
        self._x, self._y, self._z = x, y, z

p1, p2, p3 = Point2D(1, 2), Point2D(1, 2), Point2D(0, 0)
print(repr(p1), str(p1), p1.x, p1.y)
print(p1 is p2, p1 == p2, p1 == p3, hash(p1) == hash(p2))
print(Point3D(1, 2, 3), Point3D(1, 2, 3) == Point3D(1, 2, 3))
print(len({p1, p2, p3}))       # hashable, and equal points collapse in a set
```

And the slots now really are in effect: no instance dictionary, no stray attributes, and the fields are read-only:

```python run
print(hasattr(p1, '__dict__'))

for attempt in ("p1.z = 10", "p1.x = 100"):
    try:
        exec(attempt)
    except AttributeError as ex:
        print(f'{attempt:12} -> AttributeError: {ex}')
```

## Hiding the metaclass behind a decorator

Writing `metaclass=SlottedStruct` everywhere is a little noisy. A class decorator can take an ordinary class and **rebuild** it with the metaclass, using the class's name, bases and namespace:

```python run
def struct(cls):
    ns = dict(vars(cls))
    ns.pop('__dict__', None)       # descriptors belonging to the old class;
    ns.pop('__weakref__', None)    # the new slotted class must not inherit them
    return SlottedStruct(cls.__name__, cls.__bases__, ns)

@struct
class Color:
    _fields = ['r', 'g', 'b']

    def __init__(self, r, g, b):
        self._r, self._g, self._b = r, g, b

c = Color(255, 128, 0)
print(type(Color).__name__, c, repr(c), hasattr(c, '__dict__'))
```

The class created by the `class` statement is thrown away. The decorator returns a new class with the same contents, built by `SlottedStruct`. It's a neat trick, but it does create the class twice, and anything that captured the original class during creation (a registry in `__init_subclass__`, for instance) would hold the discarded one.

<div class="callout modern">
<span class="callout-title">Use dataclasses for this in real code</span>

This exercise uses nearly everything in this section, but for real code the standard library already has it. `@dataclass(frozen=True)` (3.7+) generates `__init__`, `__repr__`, `__eq__` and `__hash__` and blocks attribute assignment, and `slots=True` (3.10+) adds `__slots__` by rebuilding the class, exactly like our `struct` decorator does. `typing.NamedTuple` is another option for small immutable records.

</div>

```python run
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class Point2D:
    x: int
    y: int

p = Point2D(1, 2)
print(p, p == Point2D(1, 2), hasattr(p, '__dict__'))
```

<div class="takeaways">

## Key takeaways

- Repetitive class patterns can be generated from a short declaration, such as a `_fields` list read by a metaclass.
- `__slots__` must be in the namespace **before** `type.__new__` runs. Setting it afterwards has no effect.
- When creating functions in a loop, capture the loop value with a default argument (`attrib=slot`) or a factory.
- A class decorator can rebuild a class with a different metaclass: `Meta(cls.__name__, cls.__bases__, namespace)`, minus the old `__dict__`/`__weakref__` entries.
- In practice, prefer `@dataclass(frozen=True, slots=True)` for this job.

</div>
