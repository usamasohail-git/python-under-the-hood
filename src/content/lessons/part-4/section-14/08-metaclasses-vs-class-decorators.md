---
title: Metaclasses vs Class Decorators
summary: Metaclasses follow inheritance and decorators don't, but metaclasses can conflict while decorators stack freely. For many jobs, __init_subclass__ gives you inheritance without a metaclass.
minutes: 15
---

## The same job, two ways

Let's take a simple version of the class logger from the class decorators lesson and write it both as a decorator and as a metaclass. To keep it short, this version only wraps plain functions:

```python run
from functools import wraps
import inspect

def func_logger(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        result = fn(*args, **kwargs)
        print(f'log: {fn.__qualname__} -> {result!r}')
        return result
    return inner

def wrap_functions(cls):
    for name, obj in list(vars(cls).items()):
        if inspect.isfunction(obj):
            setattr(cls, name, func_logger(obj))

def class_logger(cls):                     # the class decorator
    wrap_functions(cls)
    return cls

class ClassLogger(type):                   # the metaclass
    def __new__(mcls, name, bases, class_dict):
        cls = super().__new__(mcls, name, bases, class_dict)
        wrap_functions(cls)
        return cls
```

For a single class, the two are interchangeable:

```python run
@class_logger
class Person:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f'Hello, I am {self.name}'

Person('Alex').greet()
```

## Difference 1: inheritance

Now subclass the decorated class:

```python run
class Student(Person):
    def __init__(self, name, number):
        super().__init__(name)
        self.number = number

    def study(self):
        return f'{self.name} studies...'

s = Student('Alex', 'abc')
s.study()
```

Only `Person.__init__` was logged. The decorator ran once, on `Person`, and `Student` is a brand-new class that nobody decorated. Inherited methods (`greet`) stay logged because they're the same wrapped function objects, but anything `Student` defines isn't. You'd have to remember `@class_logger` on every subclass.

With the metaclass, the rule follows the hierarchy, because `Student` inherits its metaclass from `Person`:

```python run
class Person(metaclass=ClassLogger):
    def __init__(self, name):
        self.name = name

class Student(Person):
    def __init__(self, name, number):
        super().__init__(name)
        self.number = number

    def study(self):
        return f'{self.name} studies...'

s = Student('Alex', 'abc')
s.study()
print(type(Person).__name__, type(Student).__name__)
```

## Difference 2: metaclasses don't combine

A class has exactly one metaclass, and it must be compatible with the metaclasses of all its bases. Two unrelated metaclasses can't both apply:

```python run
class Meta1(type):
    pass

class Meta2(type):
    pass

class Base1(metaclass=Meta1):
    pass

class Base2(metaclass=Meta2):
    pass

try:
    class Child(Base1, metaclass=Meta2):
        pass
except TypeError as ex:
    print('TypeError:', ex)

try:
    class Multi(Base1, Base2):
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

Mixing with plain `type` is always fine, because every metaclass is a subclass of `type`; and a metaclass that inherits from both (`class Meta12(Meta1, Meta2)`) resolves the conflict. But if two libraries each want their own metaclass on your class, you have a problem. Decorators have no such limit. You can stack as many as you like (just mind the order):

```python run
def tag(label):
    def decorator(cls):
        cls.tags = getattr(cls, 'tags', ()) + (label,)
        return cls
    return decorator

@tag('outer')
@tag('inner')
class Thing:
    pass

print(Thing.tags)
```

## The modern middle ground: `__init_subclass__`

Very often what we really want from a metaclass is "run this code **every time a subclass is created**". Python 3.6 added a hook for exactly that, defined on an ordinary base class: `__init_subclass__`. It's implicitly a class method and receives the new subclass, along with any keyword arguments from the subclass's header:

```python run
class Logged:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        wrap_functions(cls)

class Person(Logged):
    def __init__(self, name):
        self.name = name

class Student(Person):
    def study(self):
        return f'{self.name} studies...'

Student('Alex').study()
print(type(Student))
```

Both `Person` and `Student` got their methods wrapped, and the metaclass is still plain `type`, so there's nothing to conflict with. Note that `__init_subclass__` runs for **subclasses** of the class that defines it, not for that class itself (`Logged` has no methods to wrap here anyway).

Class keyword arguments go straight to it, which makes subclass registries very tidy:

```python run
class Plugin:
    registry = {}

    def __init_subclass__(cls, name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.registry[name or cls.__name__.lower()] = cls

class CsvExporter(Plugin, name='csv'):
    pass

class JsonExporter(Plugin):
    pass

print(Plugin.registry)
```

## Which tool should you use?

<div class="callout modern">
<span class="callout-title">Prefer the lighter hooks (3.6+)</span>

Python 3.6 added `__init_subclass__` and `__set_name__` (PEP 487) specifically so that common customizations no longer need a metaclass. Many older libraries used metaclasses for registries, validation or naming descriptors; today these are usually written with the two hooks or with a class decorator. Reach for a metaclass only when you need something they can't do.

</div>

- **Class decorator**: for one class, opted into explicitly. Stackable, easy to read, easy to remove. Can also *replace* the class with another object. Runs after the class is fully built.
- **`__init_subclass__`**: for every subclass of a base class, automatically. No metaclass conflicts. Runs after each subclass is built and can read class keyword arguments.
- **`__set_name__`**: for descriptors that need to know their own attribute name or owner.
- **Metaclass**: when you need control that only exists **before** the class is built or at the class level itself, for example:
  - a custom namespace via `__prepare__` (tracking definition order, rejecting duplicates);
  - changing the namespace before creation (`__slots__`, which must be in place when `type.__new__` runs);
  - customizing what calling the class does (`__call__`, as in a singleton);
  - class-level operators or attribute hooks (`len(MyClass)`, `MyClass[key]`, `__getattr__` on the class).

<div class="takeaways">

## Key takeaways

- Metaclasses are inherited, so their behavior applies to every subclass. Class decorators apply only to the class they decorate.
- A class can have only one (most derived) metaclass; unrelated metaclasses conflict. Decorators can be stacked freely.
- `__init_subclass__` (3.6) runs on every subclass creation, accepts class keyword arguments and avoids metaclass conflicts. It's the usual modern replacement for simple metaclasses.
- Use a metaclass only for things the lighter tools can't do: `__prepare__`, pre-creation namespace changes, `__call__`, or class-level special methods.

</div>
