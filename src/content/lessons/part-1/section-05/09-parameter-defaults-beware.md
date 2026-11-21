---
title: Parameter Defaults - Beware
summary: Default values are evaluated once, when the def statement runs, not on every call. A "current time" default shows why, and None is the fix.
minutes: 9
---

## When is a default computed?

A `def` statement is an ordinary statement that Python *executes*: it builds a function object and binds it to a name. Default values are part of that function object, so their expressions are evaluated **right then, exactly once**, when the `def` runs (for a module, that's when the module is first imported). They are **not** re-evaluated each time you call the function.

Most of the time you never notice, because defaults are usually constants like `0`, `'n/a'` or `None`. It matters as soon as the default expression has a value that changes over time, or (next lesson) when it's a mutable object.

## A logger with a timestamp

Suppose we want a `log` function that prefixes each message with the current UTC time, while letting the caller supply a specific timestamp if they want. A tempting first attempt:

```python run
from datetime import datetime, timezone

def log(msg, *, dt=datetime.now(timezone.utc)):
    print(f'{dt}: {msg}')

log('message 1')
log('message 2', dt='2001-01-01 00:00:00')
```

That looks fine, until we log a few more messages a moment later:

```python run
import time
time.sleep(0.01)          # let a little time pass
log('message 3')
log('message 4')
```

Messages 3 and 4 carry **exactly the same timestamp as message 1**. The expression `datetime.now(timezone.utc)` ran once, while the `def` statement was executing, and that single result was stored with the function. Every call that omits `dt` reuses it.

You can see the stored value: keyword-only defaults live in `__kwdefaults__`, positional ones in `__defaults__`:

```python run
print(log.__kwdefaults__)
```

## Seeing it more clearly

To make "evaluated once" impossible to miss, let's use a default that tells us whenever it's computed:

```python run
def make_default():
    print('  computing the default!')
    return 42

print('before def')
def f(x=make_default()):
    return x
print('after def')

print(f(), f(), f(1))
```

The message appears **during** the definition and never again, no matter how many times `f` is called.

## The fix: default to `None`, decide inside

The standard pattern is to use `None` as a sentinel meaning "not provided", and compute the real default **in the function body**, which does run on every call:

```python run
def log(msg, *, dt=None):
    if dt is None:
        dt = datetime.now(timezone.utc)
    print(f'{dt}: {msg}')

log('message 1')
time.sleep(0.01)
log('message 2')
log('message 3', dt='2001-01-01 00:00:00')
```

Now each call without `dt` gets a fresh timestamp, and the parameter is still optional.

<div class="callout note">
<span class="callout-title">`dt or ...` vs `dt is None`</span>

You'll often see the shortcut `dt = dt or datetime.now(timezone.utc)`. It works here, but it treats **every** falsy value as "missing", not just `None`. For a parameter where `0`, `''` or an empty list is a legitimate value, that silently replaces the caller's value. `if dt is None:` says exactly what you mean, so prefer it.

```python run
def scale(x, factor=None):
    factor = factor or 10        # bug: 0 is a valid factor!
    return x * factor

print(scale(5, 0))
```

</div>

<div class="callout modern">
<span class="callout-title">Modern Python: `utcnow()` is deprecated (3.12+)</span>

Older notebooks use `datetime.utcnow()` for this example. Since Python 3.12 that method is deprecated, because it returns a "naive" datetime with no time zone attached, even though the value is UTC, which is easy to misinterpret. Use `datetime.now(timezone.utc)` (or `datetime.now(datetime.UTC)` on 3.11+) instead, which returns an aware datetime that prints with its `+00:00` offset.

</div>

<div class="takeaways">

## Key takeaways

- Default values are evaluated once, when the `def` statement executes, and stored on the function (`__defaults__`, `__kwdefaults__`).
- Never use a default whose value should be computed at call time, such as the current time.
- Use `None` as the default and compute the real value inside the function with `if param is None:`.

</div>
