---
title: The __new__ Method
summary: "`__new__` creates the instance and `__init__` initializes it. Overriding `__new__` lets you customize immutable types, return existing objects, or skip `__init__` entirely."
minutes: 14
---

## Two steps: create, then initialize

When you call a class, `Point(10, 20)`, Python does two separate things:

1. It calls `Point.__new__(Point, 10, 20)`. This method's job is to **create and return** a new object.
2. If that object is an instance of `Point`, it then calls `obj.__init__(10, 20)` to **initialize** it. `__init__` must return `None`.

You've overridden `__init__` many times. `__new__` normally comes from `object`, and you rarely need to touch it. But you can call it yourself to see the two steps separately:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = object.__new__(Point)     # step 1: a bare Point, nothing initialized
print(type(p), p.__dict__)

p.__init__(10, 20)            # step 2: initialize it
print(p.__dict__)
```

`object.__new__` only needs the class. It accepts extra arguments but ignores them, as long as the class overrides `__init__` (where those arguments are meant to go). For a class that overrides neither method, extra arguments are an error:

```python run
p = object.__new__(Point, 10, 20)   # accepted (Point has an __init__), but unused
print(p.__dict__)

class Empty:
    pass

try:
    Empty(10, 20)
except TypeError as ex:
    print('TypeError:', ex)
```

## Overriding `__new__`

`__new__` receives the class as its first argument (conventionally `cls`), followed by the same arguments the call received. It must **return** the new object, usually by delegating to the parent's `__new__`:

```python run
class Point:
    def __new__(cls, x, y):
        print('Creating instance...', x, y)
        instance = super().__new__(cls)   # let object do the actual allocation
        return instance                   # forgetting this return is a classic bug

    def __init__(self, x, y):
        print('Initializing instance...', x, y)
        self.x = x
        self.y = y

p = Point(10, 20)
```

### Why a static method?

At the time `__new__` runs, there is no instance yet, so it can't be an instance method. Python automatically turns any function named `__new__` in a class body into a **static method**:

```python run
print(type(Point.__dict__['__new__']))
```

Why static and not a class method? Because the caller must be able to say *which* class to create. When a subclass calls `super().__new__(cls)`, it passes its own `cls` explicitly, so the object created is of the subclass's type. If `__new__` were a class method, `object.__new__` would always be bound to `object`, and there'd be no way to ask it for a `Point`.

## Customizing immutable built-ins

The most common real reason to override `__new__` is subclassing an immutable type like `int`, `str` or `tuple`. Their value is fixed at creation time, so by the time `__init__` runs, it's too late to change it:

```python run
class Squared(int):
    def __new__(cls, x):
        return super().__new__(cls, x ** 2)   # int.__new__ builds the value

result = Squared(4)
print(result, type(result).__name__, isinstance(result, int))
```

The same idea with `__init__` fails, because `int` doesn't define its own `__init__`, and `object.__init__` won't accept the extra argument:

```python run
class SquaredInit(int):
    def __init__(self, x):
        print('calling init...')
        super().__init__(x ** 2)

try:
    SquaredInit(4)
except TypeError as ex:
    print('TypeError:', ex)
```

## Use `super()`, not `object`, so inheritance works

You could call `object.__new__(cls)` directly, but that skips any `__new__` defined by a parent class. With `super()`, each class in the hierarchy gets its turn:

```python run
class Person:
    def __new__(cls, name):
        print(f'Person: instantiating {cls.__name__}...')
        return super().__new__(cls)

    def __init__(self, name):
        print('Person: initializing...')
        self.name = name

class Student(Person):
    def __new__(cls, name, major):
        print(f'Student: instantiating {cls.__name__}...')
        return super().__new__(cls, name)   # Person.__new__ runs too

    def __init__(self, name, major):
        print('Student: initializing...')
        super().__init__(name)
        self.major = major

s = Student('John', 'Math')
print(vars(s))
```

Notice that `Person.__new__` reports `Student`: `cls` is passed down unchanged, so the object really is a `Student`. Python only calls `Student.__init__` automatically; it's `super().__init__` that chains to `Person.__init__`.

## When `__init__` is skipped

Python calls `__init__` only if `__new__` returns an instance of the class that was called (or a subclass). Return something else and `__init__` is silently skipped:

```python run
class Person:
    def __new__(cls, name):
        print(f'Creating instance of {cls.__name__}... not really...')
        return str(name)

    def __init__(self, name):
        print('Init called...')      # never runs
        self.name = name

p = Person('Raymond')
print(repr(p), type(p).__name__)
```

The rule makes sense: `__init__` for a `Person` has no business initializing a `str`, and its signature might not even fit.

The opposite case is a common trap. If `__new__` returns an **existing** instance of the class, `__init__` runs again on it:

```python run
class Cached:
    _instance = None

    def __new__(cls, value):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        print('__init__ running with', value)
        self.value = value

a = Cached(1)
b = Cached(2)          # same object, but __init__ overwrote value!
print(a is b, a.value)
```

Keep this in mind for the singleton application later: if you return a cached object from `__new__`, don't also do work in `__init__`.

## Initializing in `__new__`

Since `__new__` returns the object, it can set it up too, and then you don't need an `__init__` at all:

```python run
class Person:
    def __new__(cls, name, age):
        instance = super().__new__(cls)
        instance.name = name
        instance.age = age
        return instance

p = Person('Guido', 42)
print(p.__dict__)
```

Calling `Person.__new__(Person, 'Guido', 42)` explicitly gives the same result; just remember that a direct call never triggers `__init__`. Splitting work between `__new__` and `__init__` is a matter of style, but the usual convention is: **do creation-time decisions in `__new__`, ordinary setup in `__init__`**.

<div class="callout tip">
<span class="callout-title">Don't modify the class from `__new__`</span>

You *can* attach methods to `cls` inside `__new__` (for example `cls.area = lambda self: ...`), but that code reruns on every instantiation and changes the class for all instances. If you want to modify a class, do it once, when the class is created. That's exactly what class decorators and metaclasses are for.

</div>

<div class="takeaways">

## Key takeaways

- `Cls(args)` first calls `Cls.__new__(Cls, args)` to create the object, then `obj.__init__(args)` to initialize it.
- `__new__` is implicitly a static method; pass the class explicitly, as in `super().__new__(cls)`, and always return the object.
- Override `__new__` to customize immutable types (`int`, `str`, `tuple`), whose value is fixed at creation.
- `__init__` is called only if `__new__` returns an instance of the class. It is called again if `__new__` returns a cached instance.
- Delegate with `super().__new__` rather than `object.__new__` so parent classes get their turn.

</div>
