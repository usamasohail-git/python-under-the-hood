---
title: Metaclass Parameters
summary: Extra keyword arguments in a class header are passed to the metaclass's __prepare__, __new__ and __init__, and, if you forward them, on to __init_subclass__.
minutes: 10
---

## Keyword arguments in the class header

Positional entries in a class header are base classes. Keyword entries are something else: `metaclass=` is one, and **any other keyword** is passed along to the metaclass. So you can configure a metaclass per class:

```python run
class Metaclass(type):
    def __new__(mcls, name, bases, cls_dict, arg1, arg2, arg3=None):
        print(f'{name}: arg1={arg1}, arg2={arg2}, arg3={arg3}')
        return super().__new__(mcls, name, bases, cls_dict)

class MyClass(metaclass=Metaclass, arg1=10, arg2=20, arg3=30):
    pass

class MyOtherClass(metaclass=Metaclass, arg1=10, arg2=20):
    pass
```

They're ordinary keyword parameters, with defaults and errors as usual:

```python run
try:
    class Broken(metaclass=Metaclass, arg1=10):
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

## Where exactly do they go?

The class statement calls `Metaclass(name, bases, ns, **kwargs)`. That goes through `type.__call__`, which forwards the keywords to **both** `__new__` and `__init__`. Python also passes them to `__prepare__` before the body runs (next lesson). `type.__init__` accepts and ignores them, so you only need to declare them where you use them.

`type.__new__` is different. If you forward the keywords to it, it passes them on to `__init_subclass__` of the parent class, and `object.__init_subclass__` accepts no keywords:

```python run
class Forwarding(type):
    def __new__(mcls, name, bases, ns, **kwargs):
        return super().__new__(mcls, name, bases, ns, **kwargs)   # forwards kwargs

try:
    class Thing(metaclass=Forwarding, color='red'):
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

So the rule is: a metaclass **consumes** the keywords it understands and forwards only the rest (if any) to `super().__new__`.

## A practical example: extra class attributes

Here's a metaclass that turns header keywords into class attributes. Using `**kwargs` makes any keyword acceptable:

```python run
class AutoClassAttrib(type):
    def __new__(mcls, name, bases, cls_dict, **kwargs):
        cls = super().__new__(mcls, name, bases, cls_dict)   # kwargs consumed, not forwarded
        for attr_name, attr_value in kwargs.items():
            setattr(cls, attr_name, attr_value)
        return cls

class Account(metaclass=AutoClassAttrib, account_type='Savings', apr=0.5):
    pass

print(Account.account_type, Account.apr)
```

Alternatively, we could add the entries to `cls_dict` *before* calling `super().__new__`. The end result is the same here, but the difference matters for things like `__slots__` or descriptors with `__set_name__`, which must be in the namespace when `type.__new__` runs:

```python run
class AutoClassAttrib(type):
    def __new__(mcls, name, bases, cls_dict, **kwargs):
        cls_dict.update(kwargs)
        return super().__new__(mcls, name, bases, cls_dict)

class Account(metaclass=AutoClassAttrib, account_type='Checking', apr=0.1):
    pass

print(Account.account_type, Account.apr)
```

## Passing keywords when calling a metaclass directly

Since a metaclass is just a callable, the same keywords work when you call it yourself, which is handy for building classes in a loop:

```python run
classes = [AutoClassAttrib(f'Tier{n}', (), {}, level=n) for n in range(1, 4)]
print([(c.__name__, c.level) for c in classes])
```

<div class="callout note">
<span class="callout-title">Without a metaclass</span>

If no metaclass needs them, class keywords go to the parent's `__init_subclass__`, as in the `Plugin` registry from the previous lesson (`class CsvExporter(Plugin, name='csv')`). That's usually the simpler way to parameterize a family of classes. Class keyword arguments have existed since Python 3.0, but before 3.6 `type.__new__` and `type.__init__` rejected them, so a metaclass had to override both methods to accept any. Since 3.6 `type.__init__` ignores them, and `__init_subclass__` is there to receive them.

</div>

<div class="takeaways">

## Key takeaways

- Keyword arguments in a class header (other than `metaclass`) are passed to the metaclass's `__prepare__`, `__new__` and `__init__`.
- Declare them as normal parameters (`arg1, arg2=None`) or collect them with `**kwargs`.
- Consume them in your metaclass: forwarding them to `type.__new__` sends them to `__init_subclass__`, which rejects unknown keywords.
- The same keywords work when calling the metaclass directly: `Meta(name, bases, ns, key=value)`.

</div>
