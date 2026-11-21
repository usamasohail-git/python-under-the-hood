---
title: Class Decorators
summary: A class decorator receives the finished class and returns it (or a replacement). It can add attributes, or wrap every method, as long as it handles static methods, class methods and properties correctly.
minutes: 16
---

## Decorating a class

The `@` syntax works on classes exactly as on functions: `@dec` above `class C:` means `C = dec(C)`, run right after the class has been created. A class decorator receives the class object and returns something, normally the same class after modifying it.

```python run
def savings(cls):
    cls.account_type = 'savings'
    return cls

def checking(cls):
    cls.account_type = 'checking'
    return cls

class Account:
    pass

@savings
class Bank1Savings(Account):
    pass

@checking
class Bank1Checking(Account):
    pass

print(Bank1Savings.account_type, Bank1Checking.account_type)
```

A decorator factory removes the duplication, just like parameterized function decorators:

```python run
def account_type(type_):
    def decorator(cls):
        cls.account_type = type_
        return cls
    return decorator

@account_type('Savings')
class Bank2Savings:
    pass

@account_type('Checking')
class Bank2Checking:
    pass

print(Bank2Savings.account_type, Bank2Checking.account_type)
```

We can inject methods as well as data. A function assigned to a class attribute becomes a method, bound to instances through the descriptor protocol, no matter when it was attached:

```python run
def hello(cls):
    cls.hello = lambda self: f'{self} says hello!'
    return cls

@hello
class Person:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return self.name

print(Person('Guido').hello())
```

## Logging every method

A more useful decorator: log every call to every method of a class, without decorating each method by hand. First the function decorator:

```python run
from functools import wraps

def func_logger(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        result = fn(*args, **kwargs)
        print(f'log: {fn.__qualname__} -> {result!r}')
        return result
    return inner
```

A first attempt at the class decorator applies `func_logger` to everything callable in the class namespace. We iterate over a copy (`list(...)`) because we modify the class while looping:

```python run
def class_logger(cls):
    for name, obj in list(vars(cls).items()):
        if callable(obj):
            print('decorating:', name)
            setattr(cls, name, func_logger(obj))
    return cls

@class_logger
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f'Hello, my name is {self.name} and I am {self.age}'

p = Person('John', 78)
p.greet()
```

## Static methods, class methods and properties

That version breaks on anything that isn't a plain function. `@staticmethod`, `@classmethod` and `@property` don't store functions in the class namespace; they store **descriptor objects** that wrap a function:

```python run
class Person:
    @staticmethod
    def static_method():
        pass

    @classmethod
    def class_method(cls):
        pass

    @property
    def name(self):
        return 'x'

for key in ('static_method', 'class_method', 'name'):
    obj = Person.__dict__[key]
    print(f'{key:14}', type(obj).__name__, callable(obj))
```

A `classmethod` object isn't callable, so it was silently skipped. A `staticmethod` object **is** callable, so our decorator would replace it with a plain function, and it would stop being static. Calling it on an instance would then pass the instance as an unexpected argument:

```python run
@class_logger
class Broken:
    @staticmethod
    def add(a, b):
        return a + b

print(Broken.add(1, 2))          # still works through the class
try:
    Broken().add(1, 2)           # but now self is passed too
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Static methods became callable in 3.10</span>

Since Python 3.10, `staticmethod` objects are callable (and copy the wrapped function's `__name__`, `__doc__` and so on). On older versions `callable(Person.__dict__['static_method'])` was `False`, so a decorator like the one above skipped static methods instead of breaking them. Either way the fix is the same: check for `staticmethod` and `classmethod` **before** checking for callables.

</div>

The fix is to unwrap these objects, decorate the underlying function and rewrap it. Both `staticmethod` and `classmethod` expose the original function as `__func__`. A property exposes `fget`, `fset` and `fdel`, and its `getter()`, `setter()` and `deleter()` methods return a *copy* of the property with one function replaced:

```python run
import inspect

def class_logger(cls):
    for name, obj in list(vars(cls).items()):
        if isinstance(obj, (staticmethod, classmethod)):
            wrapper_type = type(obj)
            setattr(cls, name, wrapper_type(func_logger(obj.__func__)))
        elif isinstance(obj, property):
            for attr, method in (('fget', 'getter'), ('fset', 'setter'), ('fdel', 'deleter')):
                fn = getattr(obj, attr)
                if fn is not None:
                    obj = getattr(obj, method)(func_logger(fn))
            setattr(cls, name, obj)
        elif inspect.isroutine(obj):
            setattr(cls, name, func_logger(obj))
    return cls
```

The last branch uses `inspect.isroutine` instead of `callable`. Nested classes and callable instances are callable too, but replacing them with a function would break them. `isroutine` is `True` only for functions and method-like objects. Let's try every kind of member:

```python run
@class_logger
class MyClass:
    @staticmethod
    def static_method(a, b):
        return a + b

    @classmethod
    def cls_method(cls):
        return cls.__name__

    def inst_method(self):
        return 'instance'

    @property
    def name(self):
        return 'getter'

    @name.setter
    def name(self, value):
        pass

    def __add__(self, other):
        return 'added'

    class Other:              # a nested class: left alone
        def __call__(self):
            return 'other called'

    other = Other()           # a callable instance: left alone

m = MyClass()
MyClass.static_method(1, 2)
m.static_method(1, 2)
MyClass.cls_method()
m.inst_method()
m.name
m.name = 'new'
m + m
print(m.other(), type(MyClass.Other).__name__)
```

Every routine is logged, including `__add__` (triggered by `m + m`). Static and class methods still behave as such, both the property's getter and its setter (the one returning `None`) are wrapped, and the nested class and the callable instance are untouched.

## When to reach for a class decorator

Class decorators are explicit (you see `@class_logger` right above the class), easy to stack and easy to remove. Their limitation is that they apply to **one class only**: a subclass of `MyClass` isn't decorated unless you decorate it too. That trade-off is the subject of the lesson comparing them with metaclasses.

<div class="callout note">
<span class="callout-title">You already use class decorators</span>

`@dataclass`, `@functools.total_ordering` and `@enum.unique` are all class decorators from the standard library. Each one receives the finished class, inspects its namespace and adds or checks methods.

</div>

<div class="takeaways">

## Key takeaways

- `@dec` above a class means `C = dec(C)`, applied right after the class is created. Return the class (or a replacement).
- Class decorators can add data attributes and methods, or wrap existing methods.
- Static methods, class methods and properties are descriptor objects. Unwrap them (`__func__`, `fget`/`fset`/`fdel`), decorate the function, and rewrap them.
- Since 3.10 `staticmethod` objects are callable, so test for them **before** testing `callable`.
- Use `inspect.isroutine` to avoid wrapping nested classes and callable instances. A class decorator doesn't apply to subclasses.

</div>
