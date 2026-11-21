---
title: Timing code using timeit
summary: The timeit module runs a snippet many times in its own namespace and returns the total time. Use setup and globals to give it what it needs.
minutes: 11
---

## Why not just use a stopwatch?

You can time code with `time.perf_counter()` before and after, or with a timing decorator. That works, but benchmarking has pitfalls: a single run is noisy, the garbage collector can kick in at a random moment, and the overhead of your own timing loop gets mixed into the result.

The standard library's `timeit` module handles the common cases for you:

- it uses the most precise clock available (`time.perf_counter`)
- it runs the code **many times** and reports the **total**, which smooths out noise
- it **temporarily disables the garbage collector** while timing, so collection pauses don't distort the result
- it can also be run from the command line, without writing any script

## The `timeit` function

The main entry point is `timeit.timeit`. Its important parameters are:

| Parameter | Meaning |
|---|---|
| `stmt` | the code to time, as a string (or a callable) |
| `setup` | code run **once** before timing starts, e.g. imports |
| `number` | how many times to run `stmt`. The default is **1,000,000**! |
| `globals` | a dictionary to use as the namespace the code runs in |

It returns the **total** elapsed time in seconds for all `number` runs, not the average. Divide by `number` for the time per run.

## Its own namespace

Let's time `math.sqrt(2)`. The natural first attempt fails:

```python run
from timeit import timeit
import math

try:
    timeit(stmt='math.sqrt(2)', number=1000)
except NameError as ex:
    print('NameError:', ex)
```

We imported `math` in *our* namespace, but `timeit` compiles the statement into a small function and runs it in a **separate, empty namespace**. It can't see our variables or imports. There are three ways to fix this.

**1. Put the import in the statement.** `stmt` may contain several lines:

```python run
timeit(stmt='import math\nmath.sqrt(2)', number=100_000)
```

It runs, but it measures the wrong thing: the `import` statement is executed on every one of the 100,000 runs. (After the first time it only finds `math` in `sys.modules`, but even that lookup costs time.) A benchmark should isolate exactly the code you care about.

**2. Use `setup`.** Setup code runs once, before timing starts:

```python run
timeit(stmt='math.sqrt(2)', setup='import math', number=100_000)
```

Noticeably faster, because we're now timing only the square root call.

**3. Pass a namespace with `globals`.** Our global namespace already contains `math`, so we can hand it over:

```python run
timeit(stmt='math.sqrt(2)', globals=globals(), number=100_000)
```

This is in the same ballpark as using `setup`. The `globals` argument really shines when the statement needs your own **data or functions**, as you'll see below.

## Does the import style matter?

Now a fair comparison of two import styles:

```python run
n = 500_000
result_1 = timeit(stmt='math.sqrt(2)', setup='import math', number=n)
result_2 = timeit(stmt='sqrt(2)', setup='from math import sqrt', number=n)
print(f'math.sqrt(2): {result_1 / n * 1e9:.1f} ns per call')
print(f'sqrt(2):      {result_2 / n * 1e9:.1f} ns per call')
```

In principle `sqrt(2)` should be a little faster, because `math.sqrt` needs an extra attribute lookup on every call. On older Pythons that showed up as a small but consistent gap. Since 3.11, CPython's specializing interpreter caches lookups like `math.sqrt`, so the two are now nearly identical, and run-to-run noise can even make `math.sqrt` come out ahead. Run the cell a few times and see. Either way, the difference is a few nanoseconds per call at most. That is not a reason to choose one import style over the other. `math.sqrt` tells the reader exactly where the function comes from, which is worth far more than a nanosecond. Optimize only what profiling shows to be a real bottleneck.

## Giving the statement access to your data

`globals()` returns the dictionary of the current module's global names, and `locals()` returns the current local namespace (inside a function, the function's local variables). Passing one of them lets the timed code use your variables:

```python run
import random

l = random.choices(list('python'), k=500)
print('l' in globals())
timeit(stmt='random.choice(l)', globals=globals(), number=100_000)
```

Inside a function, the variables you want are **local**, so `globals()` won't contain them. Pass `locals()` instead:

```python run
def time_with_locals():
    randoms = random.choices(list('python'), k=500)
    return timeit(stmt='random.choice(randoms)', setup='import random',
                  globals=locals(), number=100_000)

print(time_with_locals())

def time_with_globals():
    randoms = random.choices(list('python'), k=500)
    return timeit(stmt='random.choice(randoms)', setup='import random',
                  globals=globals(), number=100_000)

try:
    time_with_globals()
except NameError as ex:
    print('NameError:', ex)
```

Inside `time_with_locals`, `locals()` is a dictionary of that function's local variables, so it contains `randoms`. The second version hands over the module's globals, where `randoms` doesn't exist, and the statement fails with a `NameError`.

Functions you define at module level are globals too, so you can time them by name:

```python run
def pick_random(lst):
    return random.choice(lst)

print('pick_random' in globals())
timeit(stmt='pick_random(l)', globals=globals(), number=100_000)
```

The extra function call adds overhead compared with calling `random.choice` directly, but this pattern is perfect for comparing two of your own implementations side by side.

## Passing a callable, and repeating

`stmt` can also be a callable that takes no arguments. That avoids strings and namespaces entirely:

```python run
data = list(range(1000))
timeit(lambda: sum(data), number=10_000)
```

A single measurement can be skewed by whatever else the machine is doing. `timeit.repeat` runs the whole measurement several times and returns a list. The **minimum** is usually the most meaningful value: it's the run with the least interference.

```python run
from timeit import repeat

times = repeat(lambda: sum(data), number=10_000, repeat=5)
print([round(t, 4) for t in times])
print('best:', round(min(times), 4))
```

<div class="callout note">
<span class="callout-title">From the command line</span>

Outside the browser, you can time a snippet without writing a script at all. The command picks a sensible `number` automatically and reports the best result:

```python
# in a terminal (not runnable here)
$ python -m timeit -s "import math" "math.sqrt(2)"
5000000 loops, best of 5: 45.1 nsec per loop
```

`-s` is the setup code. In IPython or Jupyter, the `%timeit` magic does the same thing.

</div>

<div class="callout tip">
<span class="callout-title">Keep it small here</span>

The default `number` is one million. In the browser, Python runs slower than natively, so always pass a smaller `number` (as in these examples) to keep each cell quick.

</div>

<div class="takeaways">

## Key takeaways

- `timeit(stmt, setup, number, globals)` runs `stmt` `number` times and returns the **total** time; divide by `number` for a per-run figure.
- The statement runs in its own namespace: provide imports with `setup` (run once) and data or functions with `globals=globals()` or `globals=locals()`.
- Don't put setup work like imports in `stmt`, or you time it too.
- `timeit` disables garbage collection while timing; `repeat` plus `min()` gives a more robust result.
- Small differences (nanoseconds per call) rarely justify less readable code.

</div>
