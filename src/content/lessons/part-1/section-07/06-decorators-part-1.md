---
title: Decorators - Part 1
summary: A decorator takes a function and returns a replacement, usually a closure. The @ syntax applies it, and functools.wraps keeps the original's name, docstring and signature.
minutes: 14
---

## What is a decorator?

In the previous lesson we wrote `counter(fn)`: a function that takes a function, wraps it in a closure that adds some behavior, and returns that closure. Then we re-bound the original name to the result. That's all a decorator is:

1. A **callable that takes a function** as its argument,
2. and **returns** something to use in its place, usually a closure that calls the original,
3. which we then bind to the **original name**.

Here's our counter again, as a decorator:

```python run
def counter(fn):
    count = 0

    def inner(*args, **kwargs):
        nonlocal count
        count += 1
        print(f'Function {fn.__name__} was called {count} times')
        return fn(*args, **kwargs)

    return inner

def add(a, b=0):
    """Returns the sum of a and b."""
    return a + b

print('before:', hex(id(add)))
add = counter(add)
print('after: ', hex(id(add)))

print(add(1, 2))
print(add(2, 2))
```

The name `add` now points to a **different** function object: the `inner` closure. The original `add` still exists, but only the closure (through its `fn` cell) refers to it.

<figure class="diagram">
<svg viewBox="0 0 560 180" role="img" aria-label="After decoration the name add points to the inner closure, whose cell fn points to the original add function">
<defs>
<marker id="dc1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
<marker id="dc2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<rect x="20" y="65" width="100" height="40" rx="8" class="d-name"/><text x="70" y="90" text-anchor="middle" class="d-text">add</text>
<rect x="190" y="45" width="160" height="80" rx="8" class="d-obj-hl"/><text x="205" y="67" class="d-sub">function · closure</text><text x="205" y="90" class="d-text">inner</text><text x="205" y="112" class="d-sub">cells: count, fn</text>
<rect x="420" y="45" width="125" height="80" rx="8" class="d-obj"/><text x="435" y="67" class="d-sub">function</text><text x="435" y="90" class="d-text">original add</text><text x="435" y="112" class="d-sub">a + b</text>
<path d="M120 85 L186 85" class="d-arrow-hl" marker-end="url(#dc1)"/>
<path d="M350 85 L416 85" class="d-arrow" marker-end="url(#dc2)"/><text x="360" y="77" class="d-sub">fn</text>
<path d="M70 105 C70 160, 470 165, 480 129" class="d-dash"/><text x="200" y="165" class="d-sub">before decoration, add pointed here</text>
</svg>
<figcaption><code>add = counter(add)</code>: the name is re-bound to the closure, and the closure remembers the original function.</figcaption>
</figure>

## The `@` syntax

Writing `func = decorator(func)` after every definition is clunky, so Python has dedicated syntax. These two are equivalent:

```python
@counter
def mult(a, b=1, c=1):
    return a * b * c

# is the same as

def mult(a, b=1, c=1):
    return a * b * c
mult = counter(mult)
```

Python creates the function, immediately passes it to `counter`, and binds the result to the name `mult`. The decorator runs **once, at definition time**; the closure it returns runs on every call.

```python run
@counter
def mult(a: float, b: float = 1, c: float = 1) -> float:
    """Returns the product of a, b and c."""
    return a * b * c

print(mult(1, 2, 3))
print(mult(2, 2, 2))
```

## The problem: we lost the function's identity

Look at what the decorated functions say about themselves:

```python run
print(add.__name__, mult.__name__)
print(mult.__doc__)
help(mult)
```

They both claim to be `inner`, the docstring is gone, and the signature shows `(*args, **kwargs)` instead of the real parameters. The `inspect` module agrees:

```python run
import inspect
print(inspect.signature(mult))
```

That's bad for anyone reading `help()`, for IDEs and documentation tools, and for debugging (tracebacks and logs would mention `inner`).

### Fixing it by hand

We could copy some attributes over ourselves:

```python run
def counter(fn):
    count = 0

    def inner(*args, **kwargs):
        nonlocal count
        count += 1
        print(f'{fn.__name__} was called {count} times')
        return fn(*args, **kwargs)

    inner.__name__ = fn.__name__
    inner.__doc__ = fn.__doc__
    return inner

@counter
def add(a: int, b: int = 10) -> int:
    """Returns the sum of two integers."""
    return a + b

print(add.__name__, '|', add.__doc__)
print(inspect.signature(add))
```

Name and docstring are back, but the signature is still wrong, and there are other attributes (`__qualname__`, `__module__`, `__annotations__`, ...) we'd have to remember too.

## `functools.wraps`

The standard library solves this with `functools.wraps`. It's itself a decorator: you apply it to your inner function, passing in the function being wrapped.

```python run
from functools import wraps

def counter(fn):
    count = 0

    @wraps(fn)
    def inner(*args, **kwargs):
        nonlocal count
        count += 1
        print(f'{fn.__name__} was called {count} times')
        return fn(*args, **kwargs)

    return inner

@counter
def add(a: int, b: int = 10) -> int:
    """Returns the sum of two integers."""
    return a + b

print(add.__name__, '|', add.__doc__)
print(inspect.signature(add))
print(add(1, 2))
help(add)
```

`wraps` copies `__module__`, `__name__`, `__qualname__`, `__doc__` and `__annotations__` from `fn` onto `inner`, merges `fn.__dict__` into `inner.__dict__`, and adds a `__wrapped__` attribute pointing at the original. Tools such as `inspect.signature` and `help` follow `__wrapped__` to report the real signature. It also gives you an escape hatch to call the undecorated function:

```python run
print(add.__wrapped__)
print(add.__wrapped__(1, 2))   # no counting message: this is the original
```

<div class="callout note">
<span class="callout-title">It's still a different function</span>

`wraps` makes the closure *look* like the original. It doesn't make them the same object, and the closure's actual parameters are still `*args, **kwargs`. If you call it with the wrong arguments, the error comes from the inner call to `fn`, not from the wrapper.

</div>

## A template to remember

Almost every decorator you write will follow this shape:

```python
from functools import wraps

def my_decorator(fn):
    # runs once, when the function is decorated
    @wraps(fn)
    def inner(*args, **kwargs):
        # runs on every call: do something before...
        result = fn(*args, **kwargs)
        # ...and/or after
        return result
    return inner
```

Always pass the arguments through with `*args, **kwargs`, always **return** the result of `fn` (forgetting this is a very common bug: the decorated function then returns `None`), and always use `@wraps(fn)`.

<div class="takeaways">

## Key takeaways

- A decorator is a callable that takes a function and returns a replacement, typically a closure that calls the original.
- `@dec` above a `def` means `func = dec(func)`. The decorator runs once at definition time; the closure runs on every call.
- Without help, the decorated function loses its name, docstring, annotations and signature.
- `@functools.wraps(fn)` on the inner function copies that metadata and sets `__wrapped__` to the original.
- Template: accept `*args, **kwargs`, call `fn`, return its result, use `@wraps(fn)`.

</div>
