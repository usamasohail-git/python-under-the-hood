---
title: Simple Function Timer
summary: Build a reusable time_it() helper that can time any function with any arguments, using *args, a keyword-only option and **kwargs.
minutes: 10
---

## The goal

Let's put this section's ideas to work on a practical tool: a function `time_it` that measures how long **any** other function takes. It needs to receive:

- the function to time,
- whatever positional arguments that function needs (any number, possibly none),
- whatever keyword arguments that function needs (any names, possibly none),
- and an option of its own: how many repetitions to run, so we can average out noise.

That shopping list maps directly onto a signature: one regular parameter, `*args`, a keyword-only `rep`, and `**kwargs`.

```python run
def time_it(fn, *args, rep=5, **kwargs):
    print(args, rep, kwargs)

time_it(print, 1, 2, 3, sep='-')
time_it(print, 1, 2, 3, sep='-', rep=2)
```

`rep` is keyword-only because it comes after `*args`. That's essential: every positional value after `fn` belongs to the function being timed, so `rep` can only be recognized by its name. And because `rep` is a named parameter, it is claimed by `time_it` and never ends up in `kwargs`.

## Forwarding the arguments

Inside `time_it` we have a tuple and a dictionary. To call `fn` with the original arguments, we unpack them right back out with `*` and `**`:

```python run
def time_it(fn, *args, rep=5, **kwargs):
    for _ in range(rep):
        fn(*args, **kwargs)

time_it(print, 1, 2, 3, sep='-')
```

```python run
time_it(print, 1, 2, 3, sep='-', end=' *** ', rep=3)
print()
```

`print` received `1, 2, 3` as positional arguments and `sep`/`end` as keyword arguments, exactly as if we had called it directly. `time_it` didn't need to know anything about `print`'s signature.

## Adding the timer

Now we measure. `time.perf_counter()` returns a high-resolution clock value in seconds; the difference between two readings is the elapsed time. We return the average per repetition:

```python run
import time

def time_it(fn, *args, rep=5, **kwargs):
    start = time.perf_counter()
    for _ in range(rep):
        fn(*args, **kwargs)
    end = time.perf_counter()
    return (end - start) / rep
```

Something to time: three ways of computing the powers `n**k` for a range of `k`. Note that they use a keyword-only `end` (required) and `start` (optional), which `time_it` will have to forward correctly:

```python run
def compute_powers_1(n, *, start=1, end):
    # using a for loop
    results = []
    for i in range(start, end):
        results.append(n ** i)
    return results

def compute_powers_2(n, *, start=1, end):
    # using a list comprehension
    return [n ** i for i in range(start, end)]

def compute_powers_3(n, *, start=1, end):
    # using a generator expression
    return (n ** i for i in range(start, end))

print(compute_powers_1(2, end=5))
print(compute_powers_2(2, end=5))
print(list(compute_powers_3(2, end=5)))
```

And now the timings (your numbers will differ; they depend on your machine and browser):

```python run
t1 = time_it(compute_powers_1, 2, end=2000, rep=5)
t2 = time_it(compute_powers_2, n=2, end=2000, rep=5)
t3 = time_it(compute_powers_3, 2, end=2000, rep=5)
print(f'for loop:      {t1:.6f} s')
print(f'comprehension: {t2:.6f} s')
print(f'generator:     {t3:.6f} s')
```

Notice the second call passed `n=2` by name. That's fine: `n` isn't a parameter of `time_it`, so it lands in `kwargs` and is forwarded to `compute_powers_2` as a keyword argument.

The generator version looks impossibly fast, and that's a trap. A generator expression doesn't compute anything when it's created; it produces values only when something iterates over it. So we only timed the creation of a generator object. To compare fairly, we must make it do the work, for example with a small wrapper:

```python run
def consume_powers_3(n, *, start=1, end):
    return list(compute_powers_3(n, start=start, end=end))

t3 = time_it(consume_powers_3, 2, end=2000, rep=5)
print(f'generator, consumed: {t3:.6f} s')
```

Generators get a full treatment in Part 2. The lesson for now: always make sure your timer measures the work you think it measures.

<div class="callout modern">
<span class="callout-title">Making the helper bullet-proof with `/` (3.8+)</span>

Our `time_it` has one blind spot: the names `fn` and `rep` belong to it, so it can never forward keyword arguments with those names. If the timed function itself had a parameter called `fn`, `time_it(f, fn=...)` would fail with "got multiple values for argument 'fn'". Making `fn` positional-only frees the name:

```python run
def time_it(fn, /, *args, rep=5, **kwargs):
    start = time.perf_counter()
    for _ in range(rep):
        fn(*args, **kwargs)
    return (time.perf_counter() - start) / rep

def apply(x, *, fn):
    return fn(x)

print(time_it(apply, 3, fn=abs, rep=2) >= 0)
```

`rep` is still reserved, which is a common trade-off. Library helpers often pick unusual names (or accept options separately) to avoid clashes.

</div>

<div class="callout tip">
<span class="callout-title">For serious measurements: `timeit`</span>

Our hand-rolled timer is a great exercise, but for real benchmarks use the standard library's `timeit` module. It picks a sensible number of repetitions, temporarily turns off garbage collection while timing, and uses the best available clock:

```python run
import timeit
print(timeit.timeit(lambda: compute_powers_2(2, end=2000), number=5) / 5)
```

</div>

<div class="takeaways">

## Key takeaways

- `def wrapper(fn, *args, option=..., **kwargs)` plus `fn(*args, **kwargs)` forwards any call untouched.
- Options belonging to the wrapper must be keyword-only (after `*args`) so they can't be confused with the wrapped function's arguments.
- Make the wrapped function parameter positional-only (`fn, /`) to free its name for forwarding.
- Make sure you time real work: a generator expression does nothing until it's consumed.

</div>
