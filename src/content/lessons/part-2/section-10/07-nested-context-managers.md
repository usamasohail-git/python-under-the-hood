---
title: Nested Context Managers
summary: Several resources at once - nested with blocks, multi-item with statements, and contextlib.ExitStack for a number of managers only known at run time.
minutes: 20
files: ['file1.txt', 'file2.txt', 'file3.txt']
---

## Three files, three `with` blocks

Suppose we want to "zip" three text files together: line 1 of each, then line 2 of each, and so on. Here are the files:

```python run
for name in ('file1.txt', 'file2.txt', 'file3.txt'):
    with open(name) as f:
        print(f.read())
    print('-' * 12)
```

Each resource needs its own context manager, so the obvious solution nests three `with` statements:

```python run
with open('file1.txt') as f1:
    with open('file2.txt') as f2:
        with open('file3.txt') as f3:
            while True:
                try:
                    f1_row = next(f1).strip('\n')
                    f2_row = next(f2).strip('\n')
                    f3_row = next(f3).strip('\n')
                except StopIteration:
                    break
                else:
                    print(f1_row + ',' + f2_row + ',' + f3_row)
```

It works, and the nesting gives the right guarantees: the files are closed in reverse order (`f3`, then `f2`, then `f1`), and if opening `file3.txt` failed, the two files already open would still be closed.

## Several managers in one `with`

The nesting can be flattened. A single `with` statement may list several managers, separated by commas; it means exactly the same as the nested version:

```python run
with open('file1.txt') as f1, open('file2.txt') as f2, open('file3.txt') as f3:
    for rows in zip(f1, f2, f3):
        print(','.join(row.strip('\n') for row in rows))
```

(Files are iterators of lines, so `zip` does the "advance all three, stop at the shortest" job for us.)

<div class="callout modern">
<span class="callout-title">Python 3.10+: parenthesized context managers</span>

Long multi-item `with` statements used to need backslashes to span several lines. Since Python 3.10 you can wrap the items in parentheses, one per line, with an optional trailing comma.

</div>

```python run
with (
    open('file1.txt') as f1,
    open('file2.txt') as f2,
    open('file3.txt') as f3,
):
    print(next(f1).strip(), next(f2).strip(), next(f3).strip())
```

## When the number of managers isn't fixed

All of these forms share a limitation: the number of managers is written into the source code. What if we have a *list* of file names, of any length, perhaps every `.txt` file in a directory?

To see exactly when things open and close, here's a noisy `open_file` manager:

```python run
from contextlib import contextmanager

@contextmanager
def open_file(f_name):
    print(f'opening file {f_name}')
    f = open(f_name)
    try:
        yield f
    finally:
        print(f'closing file {f_name}')
        f.close()
```

Since a `with` statement only calls `__enter__` and `__exit__`, we can call those methods ourselves. Enter all the managers, remember their exit methods, do the work, then call the exits **in reverse order**, inside a `finally` so they run no matter what:

```python run
f_names = 'file1.txt', 'file2.txt', 'file3.txt'

exits = []
files = []
try:
    for f_name in f_names:
        ctx = open_file(f_name)
        files.append(ctx.__enter__())
        exits.append(ctx.__exit__)

    for rows in zip(*files):
        print(','.join(row.strip('\n') for row in rows))
finally:
    for exit_ in reversed(exits):
        exit_(None, None, None)
```

This handles any number of files, but it's verbose, and it cheats: every `__exit__` is told "no exception happened", even if one did.

## Packaging it: a manager of managers

Let's move that bookkeeping into a context manager of its own. Rather than taking all the managers up front, it returns itself and offers an `enter_context` method that enters a manager and remembers how to exit it:

```python run
class NestedContexts:
    def __init__(self):
        self._exits = []

    def __enter__(self):
        return self

    def enter_context(self, ctx):
        value = ctx.__enter__()
        self._exits.append(ctx.__exit__)
        return value

    def __exit__(self, exc_type, exc_value, exc_tb):
        for exit_ in reversed(self._exits):
            exit_(exc_type, exc_value, exc_tb)
        return False

with NestedContexts() as stack:
    files = [stack.enter_context(open_file(f_name)) for f_name in f_names]
    for rows in zip(*files):
        print(','.join(row.strip('\n') for row in rows))
```

Because managers are registered *during* the block, we're completely flexible: enter them in a loop, inside an `if`, or at any point while the block is running. All of them are exited when the outer block ends.

Our class still has gaps. If one exit method raises, the remaining ones are skipped; if an inner manager suppresses an exception, the outer ones are still told about it. Getting all of that right is surprisingly subtle.

## `contextlib.ExitStack`

The standard library's `ExitStack` is the complete version of `NestedContexts`, with correct exception handling:

```python run
from contextlib import ExitStack

with ExitStack() as stack:
    files = [stack.enter_context(open_file(f_name)) for f_name in f_names]
    for rows in zip(*files):
        print(','.join(row.strip('\n') for row in rows))
```

It also does the right thing when something fails half-way, such as a missing file. Files that were already opened get closed, and the error propagates:

```python run
try:
    with ExitStack() as stack:
        files = [stack.enter_context(open_file(name))
                 for name in ('file1.txt', 'missing.txt', 'file3.txt')]
except FileNotFoundError as ex:
    print('FileNotFoundError:', ex.filename)
```

With the built-in `open` (no announcements) the final version is short and handles any number of files:

```python run
def zip_files(*names):
    with ExitStack() as stack:
        files = [stack.enter_context(open(name)) for name in names]
        for rows in zip(*files):
            yield ','.join(row.strip('\n') for row in rows)

list(zip_files('file1.txt', 'file2.txt', 'file3.txt'))
```

Note that `zip_files` is a generator with the `with` *inside* it, so the files stay open exactly as long as iteration continues, the lesson from the lazy-iterator caveat.

## More `ExitStack` tricks

An `ExitStack` isn't limited to context managers. `stack.callback(fn, *args)` registers any function to call on exit, which is perfect for cleanup that has no manager of its own. Everything runs last-in, first-out:

```python run
with ExitStack() as stack:
    stack.callback(print, 'cleanup registered first, runs last')
    stack.callback(print, 'cleanup registered second, runs first')
    f = stack.enter_context(open_file('file1.txt'))
    print('working...')
```

And `stack.pop_all()` moves all the registered cleanups to a new stack, which is how you say "keep these resources open; setup succeeded, so the caller is now responsible":

```python run
def open_all(names):
    with ExitStack() as stack:
        files = [stack.enter_context(open_file(n)) for n in names]
        # If anything above failed, the with block closes what was opened.
        return files, stack.pop_all()   # success: hand cleanup to the caller

files, cleanup = open_all(['file1.txt', 'file2.txt'])
print('still open:', [not f.closed for f in files])
with cleanup:
    print(next(files[0]).strip())
```

<div class="callout note">
<span class="callout-title">Async version</span>

For async code there's `contextlib.AsyncExitStack`, used with `async with`. Its `enter_async_context` method enters async context managers, and it can also hold ordinary ones.

</div>

<div class="takeaways">

## Key takeaways

- Nested `with` blocks exit in reverse order and clean up correctly even if a later manager fails to enter.
- `with a as x, b as y:` is shorthand for nesting; since 3.10 the items can be wrapped in parentheses across several lines.
- For a number of managers only known at run time, use `contextlib.ExitStack` and its `enter_context` method.
- `ExitStack` also registers plain cleanup functions (`callback`) and can hand its cleanups to someone else (`pop_all`).
- Hand-rolling `__enter__`/`__exit__` calls works but gets exception handling wrong easily; prefer `ExitStack`.

</div>
