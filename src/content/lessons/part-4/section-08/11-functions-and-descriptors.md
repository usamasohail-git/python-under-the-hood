---
title: Functions and Descriptors
summary: Every function is a non-data descriptor. Its `__get__` returns the function itself for class access and a bound method for instance access, which is how methods get their `self`.
minutes: 13
---

## Functions have `__get__`

Plain functions implement the descriptor protocol. Specifically, they have a `__get__` method and no `__set__`, which makes them **non-data descriptors**:

```python run
def add(a, b):
    return a + b

print(hasattr(add, '__get__'), hasattr(add, '__set__'))
```

What does `__get__` return? Called with `instance=None`, it returns the function itself:

```python run
import sys

me = sys.modules['__main__']
print(add.__get__(None, me) is add)
```

## Class access vs instance access

That matters once a function lives in a class. Every `def` in a class body creates an ordinary function stored as a class attribute, so the descriptor rules from this section apply to it:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def say_hello(self):
        return f'{self.name} says hello'

p = Person('Alex')
print(Person.say_hello)     # __get__(None, Person): the plain function
print(p.say_hello)          # __get__(p, Person): a bound method
```

- `Person.say_hello` calls `__get__(None, Person)`, which returns the **function**. Calling it requires you to pass `self` yourself: `Person.say_hello(p)`.
- `p.say_hello` calls `__get__(p, Person)`, which returns a **bound method**: a small object that remembers both the function and the instance.

We can make the same call by hand:

```python run
bound = Person.say_hello.__get__(p, Person)
print(bound)
print(bound(), '|', p.say_hello(), '|', Person.say_hello(p))
```

## Inside a bound method

A method object stores the two things it needs in `__func__` and `__self__`. Calling it calls `__func__(__self__, *args, **kwargs)`:

```python run
m = p.say_hello
print(m.__func__ is Person.say_hello)
print(m.__self__ is p)
print(m.__func__(m.__self__))
```

Because a new method object is created on every attribute access, two accesses give two different (but equal) objects:

```python run
print(p.say_hello is p.say_hello, p.say_hello == p.say_hello)
```

The method type is available as `types.MethodType`, and you can create bound methods directly with it:

```python run
import types

def greet(self):
    return f'{self.name} says hi!'

m = types.MethodType(greet, p)     # bind greet to p
print(type(m) is type(p.say_hello))
print(m)
print(m())
```

## Writing our own function descriptor

With `MethodType` we can imitate what functions do: return the raw function for class access and a bound method for instance access.

```python run
class MyFunc:
    def __init__(self, func):
        self._func = func

    def __get__(self, instance, owner_class):
        if instance is None:
            print('__get__ called from class')
            return self._func
        print('__get__ called from an instance')
        return types.MethodType(self._func, instance)

def hello(self):
    print(f'{self.name} says hello!')

class Person:
    def __init__(self, name):
        self.name = name

    say_hello = MyFunc(hello)

print(Person.say_hello)
p = Person('Alex')
print(p.say_hello)
p.say_hello()
print(p.say_hello.__func__ is hello)
```

Every access went through our `__get__`. Python's real function type does the same thing in C (and doesn't print anything).

## Consequences of being a *non-data* descriptor

Since functions are non-data descriptors, an **instance attribute with the same name shadows a method**:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def say_hello(self):
        return f'{self.name} says hello'

p = Person('Alex')
p.say_hello = lambda: 'instance attribute wins'
print(p.say_hello())
print(Person('Eric').say_hello())
del p.say_hello
print(p.say_hello())
```

That's occasionally useful (patching one object in a test), but mostly it's a reason to avoid giving data attributes the same names as methods. Also note that a function stored in the *instance* isn't bound: the lambda above takes no `self`.

## The same mechanism everywhere

`staticmethod`, `classmethod` and `property` are all descriptors with different `__get__` behaviors:

```python run
class Demo:
    def method(self): pass

    @staticmethod
    def static(): pass

    @classmethod
    def klass(cls): pass

d = Demo()
for name in ('method', 'static', 'klass'):
    raw = Demo.__dict__[name]
    print(f'{name:7} stored as {type(raw).__name__:13} d.{name} -> {getattr(d, name)}')
```

- a **function** binds to the instance
- a **`staticmethod`**'s `__get__` returns the underlying function unbound
- a **`classmethod`**'s `__get__` binds to the class (`type(d)`), even when accessed through an instance

<div class="takeaways">

## Key takeaways

- Functions are **non-data descriptors**: they have `__get__` but no `__set__`.
- `Class.func` returns the plain function; `obj.func` calls `func.__get__(obj, Class)`, which returns a **bound method**.
- A bound method holds `__func__` (the function) and `__self__` (the instance) and calls `__func__(__self__, ...)`; `types.MethodType(func, obj)` builds one by hand.
- Because methods are non-data descriptors, instance attributes with the same name shadow them.
- `staticmethod` and `classmethod` are descriptors too; only their `__get__` differs.

</div>
