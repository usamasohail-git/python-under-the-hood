---
title: Callables
summary: A callable is anything you can put parentheses after. Functions and methods are callables, and so are classes and any object that defines __call__.
minutes: 9
---

## What is a callable?

A **callable** is any object that can be called with the `()` operator, optionally with arguments. A call always produces a value, even if that value is just `None`.

The built-in function `callable()` tells you whether an object can be called:

```python run
print(callable(print))
print(callable(len))
print(callable(callable))   # callable itself is, of course, callable

l = [1, 2, 3]
print(callable(l.append))

s = 'abc'
print(callable(s.upper))
```

Many objects are **not** callable:

```python run
print(callable(10), callable('abc'), callable([1, 2, 3]))

n = 10
try:
    n()
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">Check the object, not its result</span>

`callable(s.upper)` asks about the method object and returns `True`. `callable(s.upper())` *calls* the method first and asks about the result, the string `'ABC'`, which is `False`. Leave out the parentheses when you want to test the callable itself.

</div>

## Every call returns something

Even functions that are used only for their side effects return a value. If a function finishes without a `return` statement, Python returns `None` for it:

```python run
result = print('hello')
print(result)
```

```python run
l = [1, 2, 3]
result = l.append(4)
print(result)
print(l)
```

`append` does its job by **mutating** the list, and returns `None`. Other methods do their job by returning a new value:

```python run
s = 'abc'
result = s.upper()
print(result, s)
```

Because every call produces a value, it is always legal to write `x = something(...)`. Whether that value is useful depends on the callable. A common bug is `l = l.append(4)`, which leaves `l` set to `None`.

## Kinds of callables

Here are the main families of callables in Python:

- **built-in functions**: `print`, `len`, `callable`
- **built-in methods**: `str.upper`, `list.append`
- **user-defined functions**: created with `def` or `lambda`
- **methods**: functions bound to an object
- **classes**: calling a class creates an instance
- **class instances**, if their class defines a `__call__` method
- generators, coroutines and asynchronous generators (functions that are called to create them), which you'll meet later in the series

```python run
def f():
    pass

for obj in [print, 'abc'.upper, f, lambda: None, [].append, int]:
    print(f'{type(obj).__name__:28} callable={callable(obj)}')
```

## Classes are callable

When you write `Decimal('10.5')`, you are **calling the class** `Decimal`:

```python run
from decimal import Decimal

print(callable(Decimal))
a = Decimal('10.5')
print(repr(a), type(a))
```

Calling a class runs a two-step process behind the scenes: first the class's `__new__` method **creates** a new, empty instance; then `__init__` **initializes** it (sets up its attributes). The call returns the new instance. You'll explore `__new__` and `__init__` in detail in the object-oriented part of the series.

The instance that came back, though, is not callable:

```python run
print(callable(a))
```

## Instances can be callable too

Whether an *instance* is callable depends on its class. If the class defines a `__call__` method, then calling the instance runs that method:

```python
my_obj(10)    # really means: type(my_obj).__call__(my_obj, 10)
```

Here's a small counter that remembers its state between calls:

```python run
class Counter:
    def __init__(self):
        print('initializing...')
        self.count = 0

    def __call__(self, x=1):
        self.count += x
        return self.count

counter = Counter()          # calling the class -> __init__ runs
print(callable(counter))
```

```python run
print(counter())
print(counter())
print(counter(10))
print(counter.count)
```

An object like this behaves like a function that carries its own data around. Anywhere Python expects a function, such as the `key` of `sorted` or the function given to `map`, you can pass a callable instance instead:

```python run
class Multiplier:
    def __init__(self, factor):
        self.factor = factor

    def __call__(self, x):
        return x * self.factor

triple = Multiplier(3)
print(triple(5))
print(list(map(triple, [1, 2, 3])))
```

You'll see the same idea (a function plus remembered data) again with closures, decorators, and `functools.partial` later in this section, which itself returns a callable object.

<div class="takeaways">

## Key takeaways

- A callable is any object you can call with `()`. Use `callable(obj)` to check.
- Every call returns a value; when a function has no `return`, the value is `None`.
- Functions, methods, built-ins and classes are all callable. Calling a class creates and initializes an instance.
- An instance is callable if its class defines `__call__`, which lets an object act like a function that keeps state.

</div>
