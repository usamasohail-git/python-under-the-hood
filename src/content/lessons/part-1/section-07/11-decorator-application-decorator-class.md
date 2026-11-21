---
title: Decorator Application - Decorator Class
summary: Anything callable can be a decorator, including class instances with a __call__ method. Classes make a tidy alternative to nested decorator factories.
minutes: 11
---

## Recap: a decorator factory

A parameterized decorator is a factory that captures some arguments and returns the real decorator:

```python run
def my_dec(a, b):
    def dec(fn):
        def inner(*args, **kwargs):
            print(f'decorated function called: a={a}, b={b}')
            return fn(*args, **kwargs)
        return inner
    return dec

@my_dec(10, 20)
def my_func(s):
    print(f'hello {s}')

my_func('world')
```

What `@` needs is just "something callable that accepts the function". Nothing says it has to be a function created with `def`.

## Callable instances

Any object whose class defines `__call__` can be called like a function:

```python run
class MyClass:
    def __init__(self, a, b):
        self.a = a
        self.b = b

    def __call__(self):
        print(f'MyClass instance called: a={self.a}, b={self.b}')

obj = MyClass(10, 20)
obj()
print(callable(obj))
```

## A class as a decorator factory

Now make `__call__` accept a function and return a wrapper. The class's `__init__` takes the decorator's parameters, and its `__call__` *is* the decorator:

```python run
from functools import wraps

class MyDec:
    def __init__(self, a, b):
        self.a = a
        self.b = b

    def __call__(self, fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            print(f'MyDec instance called: a={self.a}, b={self.b}')
            return fn(*args, **kwargs)
        return inner

@MyDec(10, 20)
def my_func(s):
    print(f'Hello {s}!')

my_func('Python')
```

Step by step, `@MyDec(10, 20)` does this:

1. `MyDec(10, 20)` creates an instance that stores `a` and `b` as attributes.
2. That instance is callable, so Python calls it with the function: `my_func = MyDec(10, 20)(my_func)`.
3. `__call__` returns the `inner` closure, which can reach `a` and `b` through `self` (a free variable of `inner`).

```python run
print(my_func.__name__)
print(my_func.__code__.co_freevars)
```

Compared to three nested functions, the class spreads the layers out: parameters live in `__init__`, decoration in `__call__`. For decorators with several settings, or helper methods, this often reads better.

## The instance itself as the wrapper

There's a second way to use a class. Instead of the class *producing* a closure, the **instance** can *be* the decorated function. `__init__` receives the function and `__call__` runs on every call. A nice bonus: the state is an ordinary attribute you can inspect from outside.

```python run
import functools

class CountCalls:
    def __init__(self, fn):
        functools.update_wrapper(self, fn)   # copy __name__, __doc__, ...
        self.fn = fn
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        return self.fn(*args, **kwargs)

@CountCalls
def add(a, b):
    """Adds two numbers."""
    return a + b

add(1, 2)
add(3, 4)
print(add.count, add.__name__, add.__doc__)
print(type(add))
```

`functools.update_wrapper(wrapper, wrapped)` is the function behind `@wraps`; we call it directly because there's no inner `def` to decorate here.

<div class="callout note">
<span class="callout-title">A catch with methods</span>

A plain function used as a method gets `self` passed automatically. A callable *instance* doesn't, unless its class also implements `__get__` (the descriptor protocol, covered with classes in Part 4):

```python run
class Greeter:
    @CountCalls
    def hello(self):
        return 'hi'

try:
    Greeter().hello()
except TypeError as ex:
    print('TypeError:', ex)
```

The closure-returning style (`MyDec` above, or a plain function decorator) doesn't have this problem, because what ends up in the class is an ordinary function.

</div>

<div class="takeaways">

## Key takeaways

- A decorator can be any callable that accepts a function, including an instance of a class with `__call__`.
- A class can act as a **decorator factory**: `__init__` takes the parameters, `__call__(fn)` returns the wrapper.
- A class can also be the **wrapper**: `__init__(fn)` stores the function, `__call__` runs on each call, and the state is visible as attributes.
- Use `functools.update_wrapper` to copy metadata when there's no inner function to put `@wraps` on.
- Callable instances don't bind `self` when used on methods; prefer closure-returning decorators there.

</div>
