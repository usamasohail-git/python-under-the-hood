---
title: Additional Uses
summary: Context managers aren't only for files. Use them to change and restore settings, time code, redirect output, wrap output in tags, and track nesting levels.
minutes: 16
---

## Beyond open/close

The file example is the **open / close** pattern. Two others are just as common:

- **change / reset**: temporarily change some state, then put it back exactly as it was
- **start / stop**: start something on entry, stop it on exit (and record what happened)

This lesson builds a manager for each, then some more playful ones.

## Change / reset: decimal precision

The `decimal` module keeps a *context* of arithmetic settings (precision, rounding mode, which errors raise). By default every `Decimal` operation uses the current thread's global context:

```python run
import decimal

decimal.getcontext()
```

You can modify that context directly, but then the change applies everywhere until you undo it:

```python run
old_prec = decimal.getcontext().prec
decimal.getcontext().prec = 4
print(decimal.Decimal(1) / decimal.Decimal(3))
decimal.getcontext().prec = old_prec      # easy to forget, and skipped on an exception
print(decimal.Decimal(1) / decimal.Decimal(3))
```

That's the save / change / restore dance that a context manager does for us:

```python run
class precision:
    def __init__(self, prec):
        self.prec = prec

    def __enter__(self):
        ctx = decimal.getcontext()
        self.saved_prec = ctx.prec        # save on entry, not in __init__
        ctx.prec = self.prec

    def __exit__(self, exc_type, exc_value, exc_tb):
        decimal.getcontext().prec = self.saved_prec
        return False

with precision(3):
    print(decimal.Decimal(1) / decimal.Decimal(3))
print(decimal.Decimal(1) / decimal.Decimal(3))
```

Why save the old value in `__enter__` rather than `__init__`? Because the manager might be created at one moment and entered later, after someone else changed the precision. Saving at entry restores what was in effect *when the block started*, which is what "reset" should mean.

The standard library already provides a more complete version: `decimal.localcontext()` gives you a **copy** of the current context to modify freely, and reinstates the original on exit:

```python run
with decimal.localcontext() as ctx:
    ctx.prec = 3
    ctx.rounding = decimal.ROUND_DOWN
    print(decimal.Decimal(2) / decimal.Decimal(3))
print(decimal.Decimal(2) / decimal.Decimal(3))
```

<div class="callout modern">
<span class="callout-title">Python 3.11+</span>

`localcontext()` accepts the settings as keyword arguments, so the common case is a one-liner: `with decimal.localcontext(prec=3): ...`.

</div>

```python run
with decimal.localcontext(prec=5):
    print(decimal.Decimal(1) / decimal.Decimal(7))
```

## Start / stop: timing a block

A timer starts the clock on entry and stops it on exit. This time `__enter__` returns the manager itself, so we can read the result **after** the block, remembering that the `as` name outlives the `with`:

```python run
from time import perf_counter

class Timer:
    def __init__(self):
        self.elapsed = 0

    def __enter__(self):
        self.start = perf_counter()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.stop = perf_counter()
        self.elapsed = self.stop - self.start
        return False

with Timer() as timer:
    total = sum(i * i for i in range(500_000))
print(f'elapsed: {timer.elapsed:.4f} s')
```

The exact number depends on your machine. Because `__exit__` runs even on an exception, the timer records how long the block ran before it failed, too.

## Change / reset: redirecting `print`

`print` writes to whatever object `sys.stdout` refers to. Swap that object for an open file and every `print` goes to the file instead; swap it back afterwards. Forgetting to swap back would silence the rest of the program, which is a strong argument for a context manager:

```python run
import sys

class OutToFile:
    def __init__(self, fname):
        self._fname = fname

    def __enter__(self):
        self._current_stdout = sys.stdout
        self._file = open(self._fname, 'w')
        sys.stdout = self._file

    def __exit__(self, exc_type, exc_value, exc_tb):
        sys.stdout = self._current_stdout
        self._file.close()
        return False

with OutToFile('test.txt'):
    print('Line 1')
    print('Line 2')

print('back to normal output')
with open('test.txt') as f:
    print(f.readlines())
```

The two `print` calls inside the block produced nothing on screen; their text ended up in the file. (The standard library's `contextlib.redirect_stdout` does the same job; we'll use it in the lesson on the `contextmanager` decorator.)

## Enter / exit: HTML tags

Context managers nest naturally, and each level exits in reverse order of entry, just like matching brackets. That makes them a neat fit for anything with an opening and a closing marker:

```python run
class Tag:
    def __init__(self, tag):
        self._tag = tag

    def __enter__(self):
        print(f'<{self._tag}>', end='')

    def __exit__(self, exc_type, exc_value, exc_tb):
        print(f'</{self._tag}>', end='')
        return False

with Tag('p'):
    print('some ', end='')
    with Tag('b'):
        print('bold', end='')
    print(' text', end='')
print()
```

## Re-entrant managers: nested lists

So far we've created a fresh manager for every `with`. A manager can also be entered **again** while it's already active, if it's written for it. Here `__enter__` and `__exit__` adjust an indentation level, and return `self` so the same object can be used in an inner `with`:

```python run
class ListMaker:
    def __init__(self, title, prefix='- ', indent=3):
        self._prefix = prefix
        self._indent = indent
        self._current_indent = 0
        print(title)

    def __enter__(self):
        self._current_indent += self._indent
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self._current_indent -= self._indent
        return False

    def print(self, arg):
        print(' ' * self._current_indent + self._prefix + str(arg))

with ListMaker('Items') as lm:
    lm.print('Item 1')
    with lm:
        lm.print('item 1a')
        lm.print('item 1b')
    lm.print('Item 2')
    with lm:
        lm.print('item 2a')
        with lm:
            lm.print('item 2a-i')
```

And because these are all just objects with two methods, they compose. Send the whole list to a file by wrapping it in `OutToFile`:

```python run
with OutToFile('my_list.txt'):
    with ListMaker('Items') as lm:
        lm.print('Item 1')
        with lm:
            lm.print('item 1a')
        lm.print('Item 2')

with open('my_list.txt') as f:
    print(f.read(), end='')
```

<div class="callout note">
<span class="callout-title">Single-use, reusable, re-entrant</span>

The standard library distinguishes three kinds of managers. **Single-use** ones work only once (a file can't be reopened by entering it again; most `@contextmanager` managers are single-use too). **Reusable** ones can be entered many times, one after another, like `threading.Lock`. **Re-entrant** ones can also be entered while already active, like `threading.RLock` or our `ListMaker`. Whether a manager supports this depends entirely on how its two methods treat its state.

</div>

<div class="takeaways">

## Key takeaways

- Common patterns: **open/close**, **change/reset** (save old state in `__enter__`, restore in `__exit__`), and **start/stop**.
- Returning `self` from `__enter__` lets you read results such as elapsed time after the block.
- Redirecting `sys.stdout` must always be undone, which is exactly what `__exit__` guarantees.
- Nested `with` blocks exit in reverse order, like matching tags.
- A manager is **re-entrant** only if its methods are written to stack up and unwind state; `decimal.localcontext()` is the standard way to change decimal settings temporarily.

</div>
