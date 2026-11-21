---
title: Using Decorators to Prime Coroutines
summary: Every coroutine must be primed with next() before use, so a small decorator can create and prime it in one step.
minutes: 10
---

## A step you must never forget

Every coroutine has to be primed before you can `send()` to it:

```python
e = echo()
next(e)          # forget this and send() raises TypeError
e.send('hello')
```

"Always do X right after calling this function" is exactly the kind of boilerplate a decorator can absorb. We want a decorator that replaces the generator function with one that:

1. calls the original generator function to **create** the generator, and
2. calls `next()` on it to **prime** it,

then returns the ready-to-use, suspended generator.

## A first version

```python run
import inspect

def coroutine(gen_fn):
    def inner():
        gen = gen_fn()
        next(gen)
        return gen
    return inner

@coroutine
def echo():
    while True:
        received = yield
        print(received)

ec = echo()
print(inspect.getgeneratorstate(ec))
ec.send('hello')
```

Calling `echo()` now gives us a generator that's already **suspended** at its first `yield`, so we can send to it straight away.

## Passing arguments through

Most coroutines take arguments, so the wrapper should forward whatever it receives with `*args, **kwargs`. While we're at it, `functools.wraps` copies the original function's name and docstring onto the wrapper, as with any decorator:

```python run
from functools import wraps
import math

def coroutine(gen_fn):
    @wraps(gen_fn)
    def inner(*args, **kwargs):
        gen = gen_fn(*args, **kwargs)
        next(gen)
        return gen
    return inner

@coroutine
def power_up(p):
    """Receive numbers and yield them raised to the power p."""
    result = None
    while True:
        received = yield result
        result = math.pow(received, p)

squares = power_up(2)
cubes = power_up(3)
print(squares.send(2), squares.send(5))
print(cubes.send(2))
print(power_up.__name__, '-', power_up.__doc__)
```

Each call creates an independent coroutine with its own `p` and its own state. The priming `next()` yields the initial `result` (`None`), which the decorator discards, so the first `send()` already returns a real answer.

## Making a coroutine robust

What happens if we send something that can't be raised to a power?

```python run
try:
    squares.send('abc')
except TypeError as ex:
    print('TypeError:', ex)
print(inspect.getgeneratorstate(squares))
```

The exception escaped the body, so the coroutine is now **closed** and useless: one bad input killed it. For a long-lived coroutine that's often the wrong behavior. If a bad value should just produce "no result", handle it inside the loop:

```python run
@coroutine
def power_up(p):
    result = None
    while True:
        received = yield result
        try:
            result = math.pow(received, p)
        except TypeError:
            result = None

squares = power_up(2)
print(squares.send(2))
print(squares.send('abc'))
print(squares.send(3))
squares.close()
print(inspect.getgeneratorstate(squares))
```

It survives the bad input and keeps working, and we can still shut it down with `close()` when we're done.

<div class="callout note">
<span class="callout-title">When not to auto-prime</span>

An auto-priming decorator runs the body up to the first `yield` **at creation time**. Any setup code before that `yield` (opening a file, printing a banner, connecting to something) happens immediately, not on first use. That's usually what you want for a coroutine, but it's a reason not to slap the decorator onto generators that are meant to be iterated: the first value would be consumed and thrown away by the priming `next()`.

</div>

<div class="callout modern">
<span class="callout-title">A familiar name</span>

Python 3.4–3.10 had a decorator in the standard library called `@asyncio.coroutine`. Despite the name, it did **not** prime anything: it marked a generator as an asyncio coroutine so the event loop would drive it with `yield from`. It was replaced by `async def` and removed in Python 3.11. Native coroutines don't need priming by hand because the event loop starts them for you. The `coroutine` decorator in this lesson is our own helper, a well-known idiom for generator-based coroutines.

</div>

<div class="takeaways">

## Key takeaways

- A priming decorator wraps a generator function, creates the generator, calls `next()` on it once, and returns it ready to `send()` to.
- Forward `*args, **kwargs` so it works with any signature, and use `functools.wraps` to keep the name and docstring.
- An uncaught exception inside a coroutine closes it. Catch expected errors inside the loop if the coroutine should survive bad input.
- Priming runs the code before the first `yield` immediately, so use auto-priming for coroutines, not for generators meant for iteration.

</div>
