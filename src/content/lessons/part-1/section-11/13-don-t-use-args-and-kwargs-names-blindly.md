---
title: Don't Use args and kwargs Names Blindly
summary: The star is what collects extra arguments; the names args and kwargs are only a convention. Use meaningful names when the values have meaning.
minutes: 6
---

## The star does the work, not the name

`*args` and `**kwargs` appear so often that they can look like special syntax. They aren't. The `*` and `**` are what matter: a `*name` parameter collects extra positional arguments into a **tuple**, and a `**name` parameter collects extra keyword arguments into a **dict**. The names themselves are ordinary parameter names:

```python run
def f(*whatever, **anything_else):
    print(whatever, anything_else)

f(1, 2, x=3)
```

So `args` and `kwargs` are a **convention**. Conventions are valuable when they communicate something, and these communicate one specific thing: "arbitrary arguments that I don't interpret myself". When your function *does* know what the extra arguments are, a descriptive name is much better.

## When `*args, **kwargs` is the right choice

A decorator is the classic case. The wrapper has no idea what arguments the decorated function takes; it just passes everything through:

```python run
def audit(f):
    def inner(*args, **kwargs):
        print(f'Called {f.__name__}')
        return f(*args, **kwargs)
    return inner

@audit
def say_hello(name):
    return f'Hello {name}'

say_hello('Polly')
```

Here the generic names are honest: `inner` really doesn't care what's inside them.

## When a meaningful name is better

Now consider a function that multiplies any number of values:

```python run
from functools import reduce
from operator import mul

@audit
def product(*values):
    return reduce(mul, values)

product(1, 2, 3, 4)
```

`*values` tells the reader (and anyone looking at `help(product)`) what to pass. `*args` would say nothing at all.

Here's a function that counts how many times any of several values appear in a sequence. Compare the two signatures:

```python
def count_multi(lst, *args): ...           # args of what?
def count_multi(lst, *item_values): ...    # values to look for
```

```python run
def count_multi(lst, *item_values):
    return sum(lst.count(value) for value in item_values)

l = 1, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10
count_multi(l, 1, 6, 7)
```

`1` appears twice, `6` twice and `7` once, so the total is 5.

The same applies to `**`. A class that accepts arbitrary extra attributes is far clearer with a name that says so:

```python run
class Person:
    def __init__(self, name, age, **custom_attributes):
        self.name = name
        self.age = age
        for attr_name, attr_value in custom_attributes.items():
            setattr(self, attr_name, attr_value)

parrot = Person('Polly', 101, status='stiff', vooms=False)
print(vars(parrot))
```

`vars(obj)` returns the instance's attribute dictionary, so we can see that the extra keyword arguments became real attributes.

The names also show up when you inspect a function, so good names are documentation you get for free:

```python run
import inspect
print(inspect.signature(count_multi))
print(inspect.signature(Person))
```

<div class="callout modern">
<span class="callout-title">Related modern features</span>

- **Type hints (3.5+):** an annotation on a star parameter describes *each element*: `def product(*values: float)` means every positional argument should be a float. Since 3.12 you can describe the exact keyword arguments with `**kwargs: Unpack[SomeTypedDict]`.
- **Positional-only parameters (3.8+):** a `/` in the signature makes the parameters before it positional-only, so a `**options` parameter can safely accept a key with the same name: `def f(name, /, **options)` lets callers write `f('x', name='y')`.

```python run
def f(name, /, **options):
    return name, options

f('x', name='y')
```

</div>

<div class="takeaways">

## Key takeaways

- The `*` and `**` collect extra arguments; `args` and `kwargs` are just conventional names.
- Keep the generic names for pass-through code like decorators, where the arguments have no meaning to you.
- When the collected values have a meaning (`*values`, `*item_values`, `**custom_attributes`), name them for it.
- Good parameter names show up in signatures and `help()`, documenting your function for free.

</div>
