---
title: Callables
summary: Implementing `__call__` makes instances callable like functions, which gives you "functions with state" and an easy way to write decorators as classes.
minutes: 15
---

## `__call__` makes an instance callable

The parentheses in `f()` are an operator too. When Python sees `obj(...)`, it calls `type(obj).__call__(obj, ...)`. Functions have that method, classes have it (calling a class creates an instance), and your instances get it if you define it:

```python run
class Greeter:
    def __init__(self, greeting):
        self.greeting = greeting

    def __call__(self, name):
        return f'{self.greeting}, {name}!'

hello = Greeter('Hello')
print(type(hello))
print(hello('Alice'))
print(hello.__call__('Bob'))     # what hello('Bob') does behind the scenes
```

`hello` is not a function, yet you use it exactly like one. That's why Python documentation talks about **callables** rather than functions: anything you can put parentheses after is a callable, and most code that accepts a "function" happily accepts any callable.

The built-in `callable()` tells you whether an object can be called:

```python run
class Person:
    def __init__(self, name):
        self.name = name

print(callable(print), callable(len))
print(callable(Person))              # classes are callable
print(callable(Person('Alex')))      # but these instances aren't
print(callable(hello))               # instances of a class with __call__ are
```

## Many "functions" are classes

You've already used callables that aren't functions. `functools.partial` is one:

```python run
from functools import partial

def my_func(a, b, c):
    return a, b, c

p = partial(my_func, 10, 20)
print(p(30))
print(type(partial), type(p))
```

`partial` is a class: calling it creates a `functools.partial` *instance* that remembers the function and the pre-set arguments, and calling that instance runs the function. You can write a simplified version yourself in a few lines:

```python run
class Partial:
    def __init__(self, func, *args, **kwargs):
        self._func = func
        self._args = args
        self._kwargs = kwargs

    def __call__(self, *args, **kwargs):
        return self._func(*self._args, *args, **{**self._kwargs, **kwargs})

p = Partial(my_func, 10, c=99)
print(p(20))
print(p(20, c=30))       # keyword arguments given at call time win
```

## Functions with state: a cache-miss counter

A `defaultdict` calls its *default factory* (a callable with no arguments) whenever a missing key is requested. Suppose we want to count those cache misses. A plain function would need a global counter, which is fragile (the function breaks if the global disappears) and can't count separately for two caches. A closure would work; a class with `__call__` is another clean option, and it keeps the state as visible, named attributes:

```python run
from collections import defaultdict

class DefaultValue:
    def __init__(self, default_value):
        self.default_value = default_value
        self.counter = 0

    def __call__(self):
        self.counter += 1
        return self.default_value

miss_1 = DefaultValue(None)
miss_2 = DefaultValue(0)
cache_1 = defaultdict(miss_1)
cache_2 = defaultdict(miss_2)

cache_1['a'], cache_1['b'], cache_1['a']        # 'a' is only missing once
cache_2['x'], cache_2['y'], cache_2['z']
print(miss_1.counter, miss_2.counter)
print(dict(cache_1), dict(cache_2))
```

Each cache has its own counter object, and nothing depends on a global variable.

## Decorator classes

A decorator is just a callable that takes a function and returns a callable. A class fits that description: `@Profiler` above a function calls `Profiler(fn)`, and the resulting instance replaces the function. When the decorator needs to keep state that callers can inspect, a class is often clearer than a closure.

Let's profile how often a function is called and how long it takes on average. First, a closure attempt that looks reasonable but has a subtle bug:

```python run
from functools import wraps
from time import perf_counter

def profiler(fn):
    counter = 0

    @wraps(fn)
    def inner(*args, **kwargs):
        nonlocal counter
        counter += 1
        return fn(*args, **kwargs)

    inner.counter = counter        # copies the value 0, right now
    return inner

@profiler
def work():
    return sum(range(10_000))

work(), work()
print(work.counter)
```

`inner.counter = counter` stored the **value** the variable had when the decorator ran. Later increments change the closure's cell, not the attribute. You can fix it by exposing accessor functions that read the cell, but it gets convoluted. A class keeps the state on the object, where both the call and the caller can see it:

```python run
from functools import update_wrapper

class Profiler:
    def __init__(self, fn):
        self.fn = fn
        self.counter = 0
        self.total_elapsed = 0
        update_wrapper(self, fn)           # copy __name__, __doc__, ... like @wraps

    def __call__(self, *args, **kwargs):
        self.counter += 1
        start = perf_counter()
        result = self.fn(*args, **kwargs)
        self.total_elapsed += perf_counter() - start
        return result

    @property
    def avg_time(self):
        return self.total_elapsed / self.counter if self.counter else 0

@Profiler
def work(n):
    """Add up the first n integers."""
    return sum(range(n))

print(work(10_000), work(100_000), work(1_000))
print(work.counter, work.avg_time > 0)
print(work.__name__, '|', work.__doc__)
```

The timings change from run to run, so we only check that some time was recorded. Note the `update_wrapper(self, fn)` call: it does for a class instance what `@wraps` does for a closure, so the decorated function keeps its name and docstring.

<div class="callout note">
<span class="callout-title">Decorating methods needs one more piece</span>

A decorator class like `Profiler` works for plain functions, but not yet for methods inside a class. When you look up a function through an instance, the function turns itself into a *bound method* (that's how `self` gets passed). A `Profiler` instance doesn't do that, so `self` would be missing. Supporting it requires implementing `__get__`, which you'll meet with descriptors.

</div>

Which should you choose? For a simple decorator, a closure is shorter and perfectly idiomatic. Reach for a class when the decorator has state or behavior that users should interact with (counters, statistics, a `reset()` method, configuration).

<div class="takeaways">

## Key takeaways

- `obj(...)` calls `type(obj).__call__(obj, ...)`. Define `__call__` and your instances become callables.
- `callable(x)` checks whether `x` can be called. Classes are always callable; their instances are callable only if the class has `__call__`.
- Many "functions" in the standard library (`functools.partial`, for example) are classes with callable instances.
- Callable instances are functions with state: useful as `defaultdict` factories, callbacks and decorators.
- In a decorator class, use `functools.update_wrapper(self, fn)` to keep the wrapped function's metadata.

</div>
