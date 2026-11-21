---
title: Decorators - Part 2
summary: Decorators that take arguments, like @lru_cache(maxsize=8), are really decorator factories, an extra outer function that returns the decorator.
minutes: 15
---

## Decorators with parameters

We've already used decorators that take arguments: `@wraps(fn)` and `@lru_cache(maxsize=8)`. How do they work? The `@` syntax only ever passes **one** argument to a decorator: the function being decorated. Let's find out by trying to add a parameter to our timer.

## A timer that averages several runs

As we saw, one timing is noisy. Here's a version that runs the function 10 times and reports the average:

```python run
from time import perf_counter

def calc_fib_recurse(n):
    return 1 if n < 3 else calc_fib_recurse(n - 1) + calc_fib_recurse(n - 2)

def timed(fn):
    def inner(*args, **kwargs):
        total_elapsed = 0
        for _ in range(10):
            start = perf_counter()
            result = fn(*args, **kwargs)
            total_elapsed += perf_counter() - start
        print(f'Avg run time: {total_elapsed / 10:.6f}s')
        return result
    return inner

@timed
def fib(n):
    return calc_fib_recurse(n)

fib(20)
```

That `10` is hard-coded. The obvious fix is to add a parameter:

```python run
def timed(fn, num_reps):
    def inner(*args, **kwargs):
        total_elapsed = 0
        for _ in range(num_reps):
            start = perf_counter()
            result = fn(*args, **kwargs)
            total_elapsed += perf_counter() - start
        print(f'Avg run time: {total_elapsed / num_reps:.6f}s ({num_reps} reps)')
        return result
    return inner

def fib(n):
    return calc_fib_recurse(n)

fib = timed(fib, 5)     # the long form works...
fib(20)
```

...but the `@` syntax no longer can. `@timed` would call `timed(fib)` with a single argument, and `@timed(5)` would call `timed(5)` before the function even exists:

```python run
try:
    @timed
    def fib(n):
        return calc_fib_recurse(n)
except TypeError as ex:
    print('TypeError:', ex)
```

## When does a decorator run?

To see the way out, look carefully at what the `@` line actually does. Add some prints:

```python run
def dec(fn):
    print('running dec')
    def inner(*args, **kwargs):
        print('running inner')
        return fn(*args, **kwargs)
    return inner

@dec
def my_func():
    print('running my_func')
```

`dec` ran as soon as `my_func` was **defined**, because `@dec` means `my_func = dec(my_func)`. Calling `my_func` runs only the closure:

```python run
my_func()
```

Here's the key insight: the thing after `@` is an **expression**, evaluated first, and its *result* is the decorator. So far that expression was just a name, `dec`. But it can also be a function **call** that *returns* a decorator.

## Decorator factories

A function that returns a decorator is called a **decorator factory**:

```python run
def dec_factory():
    print('running dec_factory')
    def dec(fn):
        print('running dec')
        def inner(*args, **kwargs):
            print('running inner')
            return fn(*args, **kwargs)
        return inner
    return dec

@dec_factory()
def my_func(a, b):
    print(a, b)
```

Note the parentheses in `@dec_factory()`. Python first **calls** `dec_factory()`, which returns `dec`, and then applies `dec` to `my_func`. Both prints appear at definition time. Calling the function runs `inner`:

```python run
my_func(10, 20)
```

All of these are equivalent ways of writing the same decoration:

```python
@dec_factory()
def my_func(): ...

# --- or ---
dec = dec_factory()
@dec
def my_func(): ...

# --- or ---
def my_func(): ...
my_func = dec_factory()(my_func)
```

## Passing arguments to the factory

Now the payoff. Since we *call* the factory, we can pass it arguments. They become local variables of the factory, and therefore **free variables** available to both the decorator and its inner closure:

```python run
def dec_factory(a, b):
    def dec(fn):
        def inner(*args, **kwargs):
            print('running decorator inner')
            print('free vars:', a, b)
            return fn(*args, **kwargs)
        return inner
    return dec

@dec_factory(10, 20)
def my_func():
    print('python rocks')

my_func()
print(my_func.__code__.co_freevars)
```

<figure class="diagram">
<svg viewBox="0 0 560 190" role="img" aria-label="Three nested layers: the factory takes the parameters, the decorator takes the function, the inner closure takes the call arguments">
<rect x="10" y="10" width="540" height="170" rx="10" class="d-obj"/>
<text x="25" y="32" class="d-sub">FACTORY · timed(num_reps) · called once, by @timed(5)</text>
<rect x="35" y="45" width="490" height="120" rx="10" class="d-name"/>
<text x="50" y="67" class="d-sub">DECORATOR · decorator(fn) · called once, with the function</text>
<rect x="60" y="80" width="440" height="70" rx="8" class="d-obj-hl"/>
<text x="75" y="102" class="d-sub">CLOSURE · inner(*args, **kwargs) · called on every call</text>
<text x="75" y="128" class="d-text">free variables: num_reps, fn</text>
</svg>
<figcaption>A parameterized decorator has three layers. Each layer captures what the outer layers received.</figcaption>
</figure>

## The finished timer

Wrap the timing decorator in a factory that takes `num_reps`. By convention, the factory gets the nice public name (`timed`), and the decorator inside is often just called `decorator`:

```python run
from functools import wraps

def timed(num_reps=1):
    def decorator(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            total_elapsed = 0
            for _ in range(num_reps):
                start = perf_counter()
                result = fn(*args, **kwargs)
                total_elapsed += perf_counter() - start
            avg = total_elapsed / num_reps
            print(f'{fn.__name__}: avg run time {avg:.6f}s ({num_reps} reps)')
            return result
        return inner
    return decorator

@timed(5)
def fib(n):
    return calc_fib_recurse(n)

@timed()             # default: 1 rep. The parentheses are still required!
def fib_single(n):
    return calc_fib_recurse(n)

print(fib(20))
print(fib_single(20))
```

Forgetting the parentheses is a classic mistake. `@timed` without `()` calls `timed(oops)`, so the *function* becomes `num_reps`, and what gets bound to the name `oops` is the middle-layer `decorator` function. Nothing fails at definition time; the code just quietly does the wrong thing:

```python run
@timed
def oops(n):
    return n

print(oops)       # the factory's inner 'decorator' function, not our 'oops'
print(oops(5))    # "decorates" 5 and returns a closure, instead of returning 5
```

## Bonus: a decorator that works with or without arguments

`lru_cache` accepts both `@lru_cache` and `@lru_cache(maxsize=8)`. A common way to support both is to make the function the first, optional parameter, and the settings **keyword-only**:

```python run
def timed(fn=None, *, num_reps=1):
    if fn is None:
        # called as @timed(num_reps=...): return a decorator for later
        return lambda f: timed(f, num_reps=num_reps)

    @wraps(fn)
    def inner(*args, **kwargs):
        total_elapsed = 0
        for _ in range(num_reps):
            start = perf_counter()
            result = fn(*args, **kwargs)
            total_elapsed += perf_counter() - start
        print(f'{fn.__name__}: avg {total_elapsed / num_reps:.6f}s ({num_reps} reps)')
        return result
    return inner

@timed
def f1(n):
    return calc_fib_recurse(n)

@timed(num_reps=3)
def f2(n):
    return calc_fib_recurse(n)

f1(15), f2(15)
```

Making `num_reps` keyword-only avoids ambiguity: `@timed(3)` would be an error instead of silently treating `3` as the function.

<div class="takeaways">

## Key takeaways

- `@expr` evaluates `expr` first and uses the **result** as the decorator, called with the function.
- A **decorator factory** is a function that returns a decorator. Use it as `@factory(args)`; the arguments become free variables of the decorator and its closure.
- A parameterized decorator has three layers: factory (parameters), decorator (the function), closure (the call's arguments).
- The factory runs once, the decorator runs once at definition time, and the closure runs on every call.
- `@factory()` needs its parentheses, unless you write the decorator to support both forms (function as optional first argument, settings keyword-only).

</div>
