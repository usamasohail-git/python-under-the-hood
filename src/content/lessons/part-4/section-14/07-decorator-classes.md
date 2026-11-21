---
title: Decorator Classes
summary: A class with __call__ can act as a decorator, but its instances aren't functions, so they need a __get__ method to work as methods.
minutes: 11
---

## Not to be confused with class decorators

A **class decorator** decorates a class. A **decorator class** is a class whose *instances* are used as decorators. The two can be combined, but they're different ideas. This lesson is about the second: implementing a decorator as a class instead of a closure.

## From closure to class

Here's a simple logging decorator written as a function:

```python run
from functools import wraps

def logger(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        print(f'Log: {fn.__name__} called.')
        return fn(*args, **kwargs)
    return wrapped

@logger
def say_hello():
    return 'hello'

say_hello()
```

To turn it into a class, store the function in `__init__` and run it in `__call__`. The instance keeps its state in attributes instead of a closure:

```python run
import functools

class Logger:
    def __init__(self, fn):
        self.fn = fn
        functools.update_wrapper(self, fn)   # copy __name__, __doc__, ... like @wraps

    def __call__(self, *args, **kwargs):
        print(f'Log: {self.fn.__name__} called.')
        return self.fn(*args, **kwargs)

@Logger
def say_hello():
    return 'hello'

print(say_hello())
print(type(say_hello).__name__, say_hello.__name__)
```

`@Logger` means `say_hello = Logger(say_hello)`, so the name now refers to a `Logger` **instance**, a callable object rather than a function. Classes are convenient when the decorator needs a lot of state or helper methods (a call counter, a cache with a `clear()` method, and so on).

## The problem: methods

Try decorating a method:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    @Logger
    def say_hello(self):
        return f'{self.name} says hello!'

p = Person('David')
try:
    p.say_hello()
except TypeError as ex:
    print('TypeError:', ex)
```

The log line printed, but `self` never arrived. Why? Recall how methods work: a **function** is a non-data descriptor. When you access `p.say_hello`, Python finds the function in the class and calls its `__get__`, which returns a bound method that inserts `p` as the first argument. Our `Logger` instance has no `__get__`, so `p.say_hello` returns the `Logger` object itself, unbound:

```python run
print(type(p.say_hello).__name__)
```

## The fix: implement `__get__`

Give `Logger` a `__get__` method so that it behaves like a function when accessed through an instance. `types.MethodType(callable, obj)` creates a bound method from any callable:

```python run
from types import MethodType

class Logger:
    def __init__(self, fn):
        self.fn = fn
        functools.update_wrapper(self, fn)

    def __call__(self, *args, **kwargs):
        print(f'Log: {self.fn.__name__} called.')
        return self.fn(*args, **kwargs)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self                       # accessed on the class: no binding
        return MethodType(self, instance)     # bind this callable to the instance

class Person:
    def __init__(self, name):
        self.name = name

    @Logger
    def say_hello(self):
        return f'{self.name} says hello!'

p = Person('David')
print(type(p.say_hello).__name__)
p.say_hello()
```

Now `p.say_hello` is a bound method whose underlying callable is the `Logger` instance. Calling it calls `Logger.__call__(p)`, which forwards `p` to the original function.

Plain functions still work, because `__get__` only comes into play when the object is found as a class attribute and accessed through an instance or class:

```python run
@Logger
def say_bye():
    return 'bye'

say_bye()
```

## Static and class methods

To combine a decorator class with `@staticmethod` or `@classmethod`, apply yours **first** (closest to the `def`), so that it wraps a plain function, and let the built-in decorator wrap the result:

```python run
class Person:
    @classmethod
    @Logger
    def cls_method(cls):
        return f'class method of {cls.__name__}'

    @staticmethod
    @Logger
    def static_method():
        return 'static method'

print(Person.cls_method())
print(Person().static_method())
```

<div class="callout note">
<span class="callout-title">Why does the order matter?</span>

`@classmethod` produces a descriptor whose `__get__` binds the class. If `Logger` wrapped that descriptor instead, `Logger.__call__` would receive a `classmethod` object it can't call usefully. Wrapping the plain function first keeps each layer simple: `Logger` decorates a function, and `classmethod` turns the result into a class method.

</div>

<div class="takeaways">

## Key takeaways

- A decorator class stores the function in `__init__` and runs it in `__call__`. Use `functools.update_wrapper(self, fn)` to keep the metadata.
- The decorated name refers to an instance of the class, not a function.
- To decorate methods, implement `__get__`: return `self` when `instance is None`, otherwise `MethodType(self, instance)`.
- Put your decorator closest to the `def` and `@staticmethod`/`@classmethod` above it.

</div>
