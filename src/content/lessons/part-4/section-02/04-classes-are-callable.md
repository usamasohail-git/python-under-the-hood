---
title: Classes are Callable
summary: Calling a class builds a new instance with its own namespace, separate from the class namespace; type() reports its class reliably.
minutes: 8
---

## Calling a class

One of the things Python sets up for every class is the ability to call it. Calling a class creates a new object, an **instance** of that class:

```python run
class Program:
    language = 'Python'

    def say_hello():
        print(f'Hello from {Program.language}!')

p = Program()
print(type(p))
print(isinstance(p, Program))
```

Each call produces a **new, distinct** object:

```python run
p1 = Program()
p2 = Program()
print(p1 is p2, type(p1) is type(p2))
```

## Instances have their own namespace

An instance gets a namespace of its own, separate from the class's. It's also available as `__dict__`, and for a brand-new instance it's empty:

```python run
print(p.__dict__)
print(len(Program.__dict__) > 0)
```

So `p.__dict__` is empty, while `Program.__dict__` holds `language`, `say_hello` and the rest. Yet the instance can still reach the class attributes:

```python run
p.language
```

`language` isn't in `p.__dict__`, so where did it come from? When Python can't find an attribute in the instance's namespace, it looks in the **class**. That lookup rule is the subject of the next lesson.

Like classes, instances also have attributes that aren't stored in their `__dict__`. `__class__` is one: it's provided by the type machinery, not stored per instance.

```python run
print(p.__class__)
print('__class__' in p.__dict__)
```

## `type()` versus `__class__`

Both `type(p)` and `p.__class__` tell you the class of `p`, and usually they agree:

```python run
type(p) is p.__class__
```

So which should you use? Prefer `type(obj)`, for the same reason you write `len(obj)` rather than `obj.__len__()`: the built-in asks the interpreter directly, while the attribute is just a name that can be redefined. Here's a class that lies about its class:

```python run
class MyClass:
    __class__ = str

m = MyClass()
print(type(m))
print(m.__class__)
```

Defining `__class__` in the class body creates an ordinary class attribute that shadows the built-in one, so `m.__class__` now says `str`. But `type(m)` reads the object's real type from the interpreter's internal pointer, and it isn't fooled.

<div class="callout note">
<span class="callout-title">Where `isinstance` looks</span>

`isinstance` checks the real type first, then also consults `__class__`. So `isinstance(m, MyClass)` is `True`, and here `isinstance(m, str)` is also `True`. Proxy objects (like the ones `unittest.mock` creates) use this deliberately, to pass `isinstance` checks for the object they stand in for.

```python run
print(isinstance(m, MyClass), isinstance(m, str))
```

</div>

## Creation and initialization

Calling a class actually does two things: it **creates** a new object (via the special method `__new__`), and then **initializes** it (via `__init__`). Right now our classes don't define either, so the defaults inherited from `object` are used: a blank object is created and nothing else happens. Lesson 7 shows how to hook into the initialization step with your own `__init__`.

<div class="takeaways">

## Key takeaways

- Calling a class creates a new, distinct instance each time.
- Each instance has its own namespace (`instance.__dict__`), separate from the class namespace.
- If an attribute isn't found on the instance, Python looks for it in the class.
- Prefer `type(obj)` to `obj.__class__`: the attribute can be overridden, the built-in can't be fooled.

</div>
