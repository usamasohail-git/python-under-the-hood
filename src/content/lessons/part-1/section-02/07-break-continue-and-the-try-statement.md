---
title: Break, Continue and the Try Statement
summary: A finally clause always runs, even when break or continue leaves the try block early, and how that combines with the loop's else clause.
minutes: 9
---

## A quick reminder: `try` / `except` / `finally`

A `try` statement lets you run code that might fail and handle the failure:

- the `except` block runs only if the matching exception is raised in the `try` block
- the `finally` block runs **no matter what**: success, handled exception, or not

```python run
a = 10
b = 1
try:
    a / b
except ZeroDivisionError:
    print('division by 0')
finally:
    print('this always executes')
```

```python run
a = 10
b = 0
try:
    a / b
except ZeroDivisionError:
    print('division by 0')
finally:
    print('this always executes')
```

`finally` is where clean-up goes: closing a file, releasing a lock, resetting some state. Its whole point is that it can't be skipped.

So what happens when a loop uses `try`, and a `continue` or `break` tries to leave the `try` block early?

## `continue` inside `try`

Each iteration below increments `a` and decrements `b`, then divides. On the second pass `b` is `0`:

```python run
a = 0
b = 2

while a < 3:
    print('-------------')
    a += 1
    b -= 1
    try:
        res = a / b
    except ZeroDivisionError:
        print(f'{a}, {b} - division by 0')
        res = 0
        continue
    finally:
        print(f'{a}, {b} - always executes')

    print(f'{a}, {b} - main loop')
```

Follow the second iteration (`2, 0`):

1. `a / b` raises `ZeroDivisionError`, so the `except` block runs.
2. `continue` wants to jump back to the loop's condition...
3. ...but before control leaves the `try` statement, the `finally` block runs.
4. Then the jump happens, and the `main loop` line is skipped for that iteration.

## `break` inside `try`

The same rule applies to `break`. The `finally` block runs, *then* the loop ends:

```python run
a = 0
b = 2

while a < 3:
    print('-------------')
    a += 1
    b -= 1
    try:
        res = a / b
    except ZeroDivisionError:
        print(f'{a}, {b} - division by 0')
        res = 0
        break
    finally:
        print(f'{a}, {b} - always executes')

    print(f'{a}, {b} - main loop')
```

The third iteration never happens, but `always executes` still printed for the iteration that broke out.

<div class="callout note">
<span class="callout-title">Same for `return`</span>

`finally` also runs when a `return` leaves the `try` block. The function returns only after the clean-up code is done:

```python run
def divide(a, b):
    try:
        return a / b
    finally:
        print('cleaning up')

print(divide(10, 4))
```

</div>

## Adding the loop's `else`

Recall that a loop's `else` block runs only when the loop ends without `break`. That combines nicely with the code above: the `else` becomes the "no errors happened" branch.

When a division by zero occurs, we `break`, so `else` is skipped:

```python run
a = 0
b = 2

while a < 3:
    print('-------------')
    a += 1
    b -= 1
    try:
        res = a / b
    except ZeroDivisionError:
        print(f'{a}, {b} - division by 0')
        res = 0
        break
    finally:
        print(f'{a}, {b} - always executes')

    print(f'{a}, {b} - main loop')
else:
    print('\n\nno errors were encountered!')
```

Start `b` higher so it never reaches zero during the three iterations, and the loop ends normally, so `else` runs:

```python run
a = 0
b = 5

while a < 3:
    print('-------------')
    a += 1
    b -= 1
    try:
        res = a / b
    except ZeroDivisionError:
        print(f'{a}, {b} - division by 0')
        res = 0
        break
    finally:
        print(f'{a}, {b} - always executes')

    print(f'{a}, {b} - main loop')
else:
    print('\n\nno errors were encountered!')
```

<div class="callout tip">
<span class="callout-title">Try it</span>

Change `break` to `continue` in the first of these two cells and predict the output before running. Is `no errors were encountered!` printed? (Yes: `continue` doesn't end the loop, so the loop still finishes normally, even though an error was handled.)

</div>

<div class="callout modern">
<span class="callout-title">`break`/`continue` *inside* `finally`</span>

Everything above puts `break` and `continue` in the `try` or `except` blocks, which is fine. Putting them (or `return`) **inside the `finally` block itself** is a different story: they silently cancel any exception that is still propagating. `continue` in `finally` was a `SyntaxError` before Python 3.8; since 3.8 it is allowed. Python 3.14 now emits a `SyntaxWarning` for `break`, `continue` and `return` in `finally` (PEP 765), because they so often hide bugs. Keep `finally` blocks for clean-up only.

</div>

<div class="takeaways">

## Key takeaways

- `finally` always runs, including when `break`, `continue` or `return` leaves the `try` block.
- The order is: `except` (if any) → `finally` → then the jump (`continue`/`break`/`return`) takes effect.
- Combined with a loop `else`, `break`-on-error gives you a clean "completed without errors" branch.
- Don't put `break`, `continue` or `return` inside a `finally` block: it can swallow exceptions.

</div>
