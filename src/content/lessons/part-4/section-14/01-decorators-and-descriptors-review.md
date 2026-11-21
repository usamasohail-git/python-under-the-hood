---
title: Decorators and Descriptors - Review
summary: Decorators and descriptors are already metaprogramming. One rewrites a callable from the outside, the other takes over the dot operator.
minutes: 10
---

## What metaprogramming means

Most code works on data: numbers, strings, records. **Metaprogramming** is code that works on *code*: it creates, inspects or modifies functions and classes while the program runs. In Python this is possible because functions and classes are ordinary objects. You can pass them to functions, store attributes on them and replace them with something else.

You already know two metaprogramming tools. Before going further, let's review them through that lens, because everything in this section builds on them.

## Decorators: changing a function without touching its body

A decorator takes a callable and returns a replacement for it. Here's a tiny debugger that reports every call:

```python run
from functools import wraps

def debugger(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        print(f'{fn.__qualname__}', args, kwargs)
        return fn(*args, **kwargs)
    return inner

@debugger
def func_1(*args, **kwargs):
    pass

@debugger
def func_2(*args, **kwargs):
    pass

func_1(10, 20, kw='a')
func_2(10)
```

Neither function knows it is being debugged. The behavior lives in one place, `debugger`, and if you change how it reports, every decorated function picks up the change. That is the metaprogramming idea in a nutshell: **write the behavior once and apply it to many pieces of code**.

Remember that `@debugger` is only syntax. It means `func_1 = debugger(func_1)`, run right after the `def` statement creates the function. Later in this section the same syntax will be applied to whole classes.

## Descriptors: taking over the dot operator

With a plain class, `p.x` reads straight from the instance dictionary:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(10, 20)
p.x = 100
print(p.x, p.__dict__)
```

A **data descriptor** (an object with `__get__` and `__set__`, stored as a class attribute) lets us intercept those reads and writes. Here we use one to enforce integer coordinates without writing a pair of property methods for each field:

```python run
class IntegerField:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name, None)

    def __set__(self, instance, value):
        if not isinstance(value, int):
            raise TypeError(f'{self.name} must be an integer.')
        instance.__dict__[self.name] = value

class Point:
    x = IntegerField()
    y = IntegerField()

    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(10, 20)
print(p.x, p.y)

try:
    p.x = 10.5
except TypeError as ex:
    print('TypeError:', ex)
```

The interface of `Point` didn't change at all: callers still write `p.x`. But the meaning of the dot for `x` and `y` is now defined by `IntegerField`. Because `IntegerField` is a data descriptor, it wins over the instance dictionary even though the value is stored there under the same name.

Notice `__set_name__`. Python calls it automatically, once per descriptor, while the `Point` class is being created, passing the owner class and the attribute name. That is our first glimpse of a **class creation hook**: code that runs as a side effect of the `class` statement. We'll see exactly where it fits in the class creation pipeline later in this section.

<div class="callout note">
<span class="callout-title">Why `instance is None`?</span>

When the descriptor is accessed on the class itself (`Point.x`), `__get__` is called with `instance=None`. Returning the descriptor in that case is the convention, and it makes introspection like `Point.x.name` work.

</div>

```python run
print(type(Point.x).__name__, Point.x.name)
```

## The toolbox ahead

Decorators and descriptors modify functions and attributes. The rest of this section adds tools that act on **classes and instances themselves**:

| Tool | Runs when… | Typical use |
| --- | --- | --- |
| `__new__` | an instance is being created | immutable subclasses, caching, singletons |
| class decorator | right after a class is created | add or wrap methods on one class |
| `__init_subclass__` (3.6+) | each time a subclass is created | registries, validating subclasses |
| metaclass | the class object itself is built | control the namespace, creation and instantiation of a whole hierarchy |
| `__getattr__` / `__setattr__` | attributes are read or written | proxies, dynamic records, read-only objects |

The more powerful the tool, the more surprising it is for whoever reads your code. A good rule for the whole section: **use the least powerful tool that solves the problem**.

<div class="takeaways">

## Key takeaways

- Metaprogramming is code that creates or modifies code. Python makes it easy because functions and classes are objects.
- A decorator replaces a callable with a modified one. `@dec` above a `def` means `f = dec(f)`.
- A data descriptor (`__get__` + `__set__`) redefines what the dot does for one attribute, and takes priority over the instance dictionary.
- `__set_name__` is called automatically while the owner class is being created. It's one of several class creation hooks you'll meet in this section.
- Prefer the simplest tool that works. Metaclasses are the heaviest option.

</div>
