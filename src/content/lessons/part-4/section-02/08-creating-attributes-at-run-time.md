---
title: Creating Attributes at Run-Time
summary: Attributes, including functions, can be attached to a single instance at run time, and types.MethodType turns a function into a method bound to that instance.
minutes: 11
---

## Per-instance attributes, again

You've seen that assigning to an instance attribute affects only that instance:

```python run
class Person:
    pass

p1 = Person()
p2 = Person()
p1.name = 'Alex'

print(p1.__dict__, p2.__dict__)
```

What if the value we attach is a function? Since it's stored in the **instance** namespace, not the class, it's not turned into a bound method. It stays a plain function:

```python run
p1.say_hello = lambda: 'Hello!'

print(p1.__dict__)
print(p1.say_hello)
print(p1.say_hello())
print(p2.__dict__)
```

No instance is passed, which is why the lambda takes no parameters. The function also has no way of knowing which object it's attached to, so it can't use `p1.name`. And `p2` knows nothing about it.

## Binding a method to one instance

Can we give a single instance a *real* method, one that receives the instance as its first argument? Yes, but we have to build the method object ourselves. Method objects are of type `types.MethodType`, and you create one by calling it with a function and the object to bind:

```python run
from types import MethodType

class Person:
    def __init__(self, name):
        self.name = name

p1 = Person('Eric')
p2 = Person('Alex')

def say_hello(self):
    return f'{self.name} says hello!'

print(say_hello(p1), say_hello(p2))   # usable as a plain function too
```

Now bind `say_hello` to `p1` only:

```python run
p1_say_hello = MethodType(say_hello, p1)
print(p1_say_hello)
print(p1_say_hello())
```

That's a bound method of `p1`, just like the ones Python creates from class functions. But creating it doesn't attach it to anything: `p1` doesn't have an attribute for it yet.

```python run
try:
    p1.p1_say_hello()
except AttributeError as ex:
    print('AttributeError:', ex)
```

To make it callable through `p1`, store it in the instance namespace, under any name you like:

```python run
p1.say_hello = p1_say_hello

print(p1.__dict__)
print(p1.say_hello())
print(getattr(p1, 'say_hello')())
print(p2.__dict__)
```

The lookup finds `say_hello` in `p1.__dict__` and returns the stored method object unchanged. Since it's already bound, calling it passes `p1` automatically. `p2` is unaffected.

The two steps usually happen in one line:

```python run
p3 = Person('Maria')
p3.say_hello = MethodType(lambda self: f'{self.name} says hi', p3)
p3.say_hello()
```

<div class="callout note">
<span class="callout-title">Instance attributes win over class methods</span>

Because the instance namespace is searched first, a method stored on an instance shadows a method of the same name defined in the class, for that one instance. (This holds for ordinary methods; special methods like `__len__` or `__str__` are looked up on the **class** by Python's operators, so attaching them to an instance has no effect on `len(obj)` or `str(obj)`.)

</div>

## Example: plug-in behavior per instance

Why would you want this? One use is a "plug-in" design: every instance is called the same way, but each one can be given its own implementation, without subclassing.

```python run
from types import MethodType

class Person:
    def __init__(self, name):
        self.name = name

    def register_do_work(self, func):
        setattr(self, '_do_work', MethodType(func, self))

    def do_work(self):
        do_work_method = getattr(self, '_do_work', None)
        if do_work_method is None:
            raise AttributeError('You must first register a do_work method')
        return do_work_method()
```

`register_do_work` is an ordinary instance method that builds a bound method from the function it receives and stores it on `self` (that is, on whichever instance it was called on). `do_work` provides a stable public interface: it looks up the registered method, using `getattr` with a default so a missing registration produces a clear error.

```python run
math_teacher = Person('Eric')
english_teacher = Person('John')

try:
    math_teacher.do_work()
except AttributeError as ex:
    print(ex)
```

Register a different worker for each teacher:

```python run
def work_math(self):
    return f'{self.name} will teach differentials today.'

def work_english(self):
    return f'{self.name} will analyze Hamlet today.'

math_teacher.register_do_work(work_math)
english_teacher.register_do_work(work_english)

print(math_teacher.__dict__)
print(math_teacher.do_work())
print(english_teacher.do_work())
```

Both instances share the class's `do_work`, but each one delegates to its own bound method.

<div class="takeaways">

## Key takeaways

- Attributes, including functions, can be added to individual instances at run time.
- A function stored on an instance is **not** bound: it's called with exactly the arguments you pass.
- `types.MethodType(func, obj)` creates a method bound to `obj`; store it on the instance to call it through dotted notation.
- Methods stored on an instance shadow class methods of the same name for that instance (but not special methods used by operators and built-ins).

</div>
