---
title: Decorator Application - Logger, Stacked
summary: A logging decorator, and what happens when you stack several decorators on one function. The order matters.
minutes: 12
---

## A logging decorator

Recording each call to a function, with a timestamp, is another classic decorator job:

```python run
from functools import wraps
from datetime import datetime, timezone

def logged(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        run_dt = datetime.now(timezone.utc)
        result = fn(*args, **kwargs)
        print(f'{fn.__name__}: called {run_dt}')
        return result
    return inner

@logged
def func_1():
    pass

@logged
def func_2():
    pass

func_1()
func_2()
```

In a real application you'd send this to the `logging` module (`logging.getLogger(__name__).info(...)`) rather than `print`, so it can go to a file or a log service. The decorator's structure stays the same.

## Stacking decorators

Suppose we want a function to be both logged *and* timed. We could merge the two decorators into one, but it's much nicer to keep each decorator focused on one job and **stack** them:

```python run
from time import perf_counter

def timed(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        start = perf_counter()
        result = fn(*args, **kwargs)
        print(f'{fn.__name__} ran for {perf_counter() - start:.6f}s')
        return result
    return inner

@timed
@logged
def factorial(n):
    from operator import mul
    from functools import reduce
    return reduce(mul, range(1, n + 1))

factorial(10)
```

Stacked decorators are applied **bottom-up**, the one closest to the `def` first. So the code above is equivalent to:

```python
def factorial(n):
    ...
factorial = timed(logged(factorial))
```

<figure class="diagram">
<svg viewBox="0 0 560 150" role="img" aria-label="timed's closure wraps logged's closure, which wraps the original factorial">
<rect x="10" y="20" width="540" height="115" rx="10" class="d-obj"/>
<text x="25" y="42" class="d-sub">timed's inner (what the name factorial refers to)</text>
<rect x="40" y="55" width="480" height="70" rx="10" class="d-name"/>
<text x="55" y="77" class="d-sub">logged's inner</text>
<rect x="200" y="70" width="200" height="45" rx="8" class="d-obj-hl"/>
<text x="300" y="98" text-anchor="middle" class="d-text">original factorial</text>
</svg>
<figcaption><code>@timed</code> over <code>@logged</code>: the outermost decorator's closure is what callers reach first. Each layer calls the one inside it.</figcaption>
</figure>

### Why is the output "reversed"?

`timed` is the outer layer, so its closure runs first. But look at the order of the output: the log line comes before the timing line. That's because both decorators do their printing **after** calling `fn`:

1. `timed`'s inner starts the clock and calls its `fn`, which is `logged`'s inner.
2. `logged`'s inner records the time and calls its `fn`, the original `factorial`.
3. `factorial` returns. `logged`'s inner prints the log line and returns.
4. Back in `timed`'s inner, the clock stops and the timing line is printed.

Swap the decorators and you swap the layers:

```python run
@logged
@timed
def factorial(n):
    from operator import mul
    from functools import reduce
    return reduce(mul, range(1, n + 1))

factorial(10)
```

Here the timing measures only the factorial itself, and the log line is printed last.

## Seeing the order clearly

Two tiny decorators that print **before** calling `fn` make the order obvious:

```python run
def dec_1(fn):
    def inner():
        print('running dec_1')
        return fn()
    return inner

def dec_2(fn):
    def inner():
        print('running dec_2')
        return fn()
    return inner

@dec_1
@dec_2
def my_func():
    print('running my_func')

my_func()
```

```python run
@dec_2
@dec_1
def my_func():
    print('running my_func')

my_func()
```

The top decorator is the outermost layer, so its "before" code runs first.

## When the order really matters

Imagine API endpoints that must only run for authorized users, and that should be logged. One decorator checks permissions and refuses the call; another logs it. Which one sits outside changes the behavior, not just the order of messages:

```python run
current_user = {'name': 'guest', 'roles': set()}

def authorize(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        if 'admin' not in current_user['roles']:
            print(f'  denied: {fn.__name__}')
            return None
        return fn(*args, **kwargs)
    return inner

def log_call(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        print(f'  log: {fn.__name__} called by {current_user["name"]}')
        return fn(*args, **kwargs)
    return inner

@log_call
@authorize
def delete_everything():
    return 'deleted!'

@authorize
@log_call
def delete_nothing():
    return 'nothing deleted'

print('log outside authorize:')
delete_everything()
print('authorize outside log:')
delete_nothing()
```

With `@log_call` on top, **every** attempt is logged, including the refused one (often what you want for an audit trail). With `@authorize` on top, unauthorized calls are stopped before they ever reach the logger, so only permitted calls are logged.

<div class="callout tip">
<span class="callout-title">Read stacks from the top down</span>

When you *call* a decorated function, the decorators' "before" code runs from top to bottom, and their "after" code runs from bottom to top, like nested parentheses. When the function is *defined*, the decorators are *applied* from bottom to top.

</div>

<div class="takeaways">

## Key takeaways

- Keep decorators small and single-purpose, and combine them by stacking.
- `@a` over `@b` over `def f` means `f = a(b(f))`: applied bottom-up, so `a`'s closure is the outermost layer.
- On a call, outer "before" code runs first; "after" code unwinds in reverse.
- The order can change behavior, for example whether refused calls are logged.

</div>
