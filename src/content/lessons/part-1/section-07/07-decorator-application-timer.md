---
title: Decorator Application - Timer
summary: A reusable @timed decorator that reports how long a call took, used to compare three ways of computing Fibonacci numbers.
minutes: 12
---

## A timing decorator

Measuring how long a function takes is a perfect job for a decorator: the "before" step records the time, the "after" step computes and reports the difference, and the function itself doesn't change.

```python run
from functools import wraps
from time import perf_counter

def timed(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        start = perf_counter()
        result = fn(*args, **kwargs)
        elapsed = perf_counter() - start

        args_ = [repr(a) for a in args]
        kwargs_ = [f'{k}={v!r}' for k, v in kwargs.items()]
        args_str = ', '.join(args_ + kwargs_)
        print(f'{fn.__name__}({args_str}) took {elapsed:.6f}s to run.')
        return result

    return inner
```

`perf_counter()` is the right clock for this: it's monotonic (it never jumps backwards when the system clock is adjusted) and has the highest available resolution. Its absolute value is meaningless; only differences between two readings matter.

We'll time three ways of computing the *n*-th Fibonacci number, `1, 1, 2, 3, 5, 8, 13, ...`, counting from `fib(1) = 1`.

## 1. Recursion

The textbook definition translates directly into code:

```python run
def calc_recursive_fib(n):
    if n <= 2:
        return 1
    return calc_recursive_fib(n - 1) + calc_recursive_fib(n - 2)

print(calc_recursive_fib(3), calc_recursive_fib(6))
```

Notice that we're not decorating this function directly. Instead we wrap it in a separate function and time that:

```python run
@timed
def fib_recursed(n):
    return calc_recursive_fib(n)

fib_recursed(20)
fib_recursed(25)
```

Why the extra function? Watch what happens if we decorate the recursive function itself:

```python run
@timed
def fib_recursed_2(n):
    if n <= 2:
        return 1
    return fib_recursed_2(n - 1) + fib_recursed_2(n - 2)

fib_recursed_2(5)
```

Inside the function body, the name `fib_recursed_2` is looked up in the global scope when the call happens, and by then it refers to the **decorated** version. So every recursive call is timed and printed, not just the outer one. That's not what we wanted here, but it's also a vivid picture of how wasteful the naive recursion is: `fib_recursed_2(2)` and `fib_recursed_2(1)` are computed over and over again. The number of calls roughly grows by 60% for every increase of `n` by 1, which is why even `fib(30)` is noticeably slow.

## 2. A loop

Keep just the last two numbers and step forward:

```python run
@timed
def fib_loop(n):
    fib_1, fib_2 = 1, 1
    for _ in range(3, n + 1):
        fib_1, fib_2 = fib_2, fib_1 + fib_2
    return fib_2

print(fib_loop(6))
fib_loop(25)
```

The loop does about *n* additions instead of an exponential number of calls.

## 3. `functools.reduce`

`reduce(f, sequence, initial)` repeatedly applies `f(accumulated, item)`. We can carry the pair `(current, previous)` as the accumulated value and advance it once per step; the items of the sequence are ignored, we only use it to control the number of steps:

```text
(1, 0) → (1, 1) → (2, 1) → (3, 2) → (5, 3) → …     each step: (a, b) → (a + b, a)
```

Starting from `(1, 0)`, `n - 1` steps leave `fib(n)` in the first position:

```python run
from functools import reduce

@timed
def fib_reduce(n):
    initial = (1, 0)
    steps = range(n - 1)
    fib_n = reduce(lambda prev, _: (prev[0] + prev[1], prev[0]), steps, initial)
    return fib_n[0]

print(fib_reduce(6))
fib_reduce(25)
```

## Comparing them

```python run
fib_recursed(25)
fib_loop(25)
fib_reduce(25)
```

The recursive version is the easiest to read, and by far the slowest: typically more than a thousand times slower than the other two for `n = 25`, and the gap widens quickly as `n` grows. (In the memoization lesson we'll make it fast without giving up the recursive style.)

A single measurement is noisy, especially for very short calls. Run each a few times and you'll see the numbers wobble:

```python run
for _ in range(3):
    fib_loop(5_000)
for _ in range(3):
    fib_reduce(5_000)
```

The plain loop is typically faster than `reduce`. The `reduce` version builds a new tuple and calls a lambda at every step, and function calls are relatively expensive in Python. The lesson: just because something *can* be written in a clever functional style doesn't mean it *should* be. Given similar performance, prefer the version that's easiest to understand.

<div class="callout tip">
<span class="callout-title">For serious benchmarks, use `timeit`</span>

Our decorator is great for quick checks while developing. For careful comparisons, the standard library's `timeit` module runs a statement many times, turns off garbage collection during the measurement, and gives more trustworthy numbers: `timeit.timeit(lambda: fib_loop.__wrapped__(1000), number=1000)`. (Using `__wrapped__`, set by `functools.wraps`, calls the undecorated function so we don't print a line per run.) In the next lessons we'll also build a decorator that averages several runs.

</div>

<div class="callout modern">
<span class="callout-title">Nanosecond clocks</span>

Since Python 3.7, `time.perf_counter_ns()` returns the same clock as an integer number of nanoseconds. It avoids floating-point rounding when you subtract very large readings, which can matter for extremely short timings.

</div>

<div class="takeaways">

## Key takeaways

- A timing decorator records `perf_counter()` before and after calling the function and reports the difference.
- Decorating a recursive function directly decorates every recursive call, since the body looks up the (now decorated) global name.
- Naive recursive Fibonacci repeats the same work exponentially; a loop is linear.
- Clever isn't always better: the plain loop beats `reduce` and is easier to read.
- Single timings are noisy; repeat measurements, or use `timeit`.

</div>
