---
title: Initializing Class Instances
summary: __init__ is an ordinary instance method that Python calls automatically on the freshly created object, so it can set up per-instance state.
minutes: 10
---

## Two steps: create, then initialize

When you call a class, Python does two separate things:

1. It **creates** a new, blank instance. That's the job of the special method `__new__`.
2. It **initializes** that instance, by calling the special method `__init__` on it.

Both can be customized. `__new__` is needed only in special situations (subclassing immutable types, singletons, metaclasses), and comes back later in Part 4. `__init__` is the one you'll write in almost every class.

## `__init__` is an instance method

The crucial point: by the time `__init__` runs, the object **already exists**. `__init__` doesn't build it, it receives it, just like any other instance method, as `self`:

```python run
class Person:
    def __init__(self):
        print(f'Initializing a new Person object: {self}')

p = Person()
print(hex(id(p)))
```

The address printed inside `__init__` is the address of `p`: the same object that the class call returned.

Because `__init__` receives the instance, it can set up the instance's state. Any arguments passed to the class call are forwarded to it:

```python run
class Person:
    def __init__(self, name):
        self.name = name

p = Person('Eric')
p.__dict__
```

Calling the class with the wrong arguments fails with the same kind of error any function call would give:

```python run
try:
    Person()
except TypeError as ex:
    print('TypeError:', ex)
```

## Nothing magic about it

Conceptually, `Person('Eric')` does this:

```python
obj = Person.__new__(Person)    # 1. create a blank instance
obj.__init__('Eric')            # 2. call the bound method __init__
p = obj                         #    the class call returns obj
```

So `__init__` behaves exactly like a method you'd call yourself. This version does the same work, just less conveniently:

```python run
class Person:
    def initialize(self, name):
        self.name = name

p = Person()
print(p.__dict__)
p.initialize('Eric')
print(p.__dict__)
```

The advantage of `__init__` is that Python calls it for you, so an instance can never be used before it's been set up.

<div class="callout note">
<span class="callout-title">`__init__` must return `None`</span>

The class call returns the object created by `__new__`, not whatever `__init__` returns. In fact, `__init__` returning anything other than `None` is an error:

```python run
class Weird:
    def __init__(self):
        return 42

try:
    Weird()
except TypeError as ex:
    print('TypeError:', ex)
```

</div>

## Where per-instance state belongs

`__init__` is the natural place to give each instance its own copy of mutable state, which avoids the shared-class-attribute trap from the data attributes lesson:

```python run
class Account:
    bank = 'Acme'               # shared: same for every account

    def __init__(self, owner):
        self.owner = owner      # per instance
        self.history = []       # a new list for each account

a, b = Account('Alex'), Account('Maria')
a.history.append('deposit')
print(a.history, b.history)
print(a.bank, b.bank)
```

Initializing all instance attributes in `__init__` also makes a class easier to read: one place shows the full list of attributes every instance has. (Python 3.13 even records the names assigned through `self.` in the class's `__static_attributes__`.)

```python run
Account.__static_attributes__
```

<div class="takeaways">

## Key takeaways

- Calling a class first **creates** the instance (`__new__`), then **initializes** it (`__init__`).
- `__init__` is an ordinary instance method: the object already exists and arrives as `self`.
- Arguments passed to the class call are forwarded to `__init__`.
- `__init__` must return `None`; the class call returns the new instance.
- Set up per-instance state, especially mutable state, in `__init__`.

</div>
