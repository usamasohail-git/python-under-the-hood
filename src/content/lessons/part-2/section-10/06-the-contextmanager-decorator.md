---
title: The contextmanager Decorator
summary: contextlib.contextmanager turns a one-yield generator function into a full context manager, and contextlib ships ready-made managers such as redirect_stdout, suppress and chdir.
minutes: 18
---

## From wrapper class to decorator

In the previous lesson we wrapped a generator in a class to get a context manager. The generator function has to follow one structure:

```python
def gen(args):
    # setup
    try:
        yield obj        # what __enter__ would return
    finally:
        # cleanup
```

Here's a slimmed-down version of the wrapper class, taking a generator **object** this time:

```python run
class GenContextManager:
    def __init__(self, gen):
        self.gen = gen

    def __enter__(self):
        return next(self.gen)

    def __exit__(self, exc_type, exc_value, exc_tb):
        print('calling next to perform cleanup in generator')
        try:
            next(self.gen)
        except StopIteration:
            pass
        return False

def open_file(fname, mode='r'):
    print('opening file...')
    f = open(fname, mode)
    try:
        yield f
    finally:
        print('closing file...')
        f.close()

file_gen = open_file('test.txt', 'w')
with GenContextManager(file_gen) as f:
    f.write('Sir Spamalot')
```

Having to create the generator and wrap it every time is clumsy. A **decorator** can do both steps for us: it replaces the generator function with a function that creates the generator *and* wraps it:

```python run
def context_manager_dec(gen_fn):
    def helper(*args, **kwargs):
        gen = gen_fn(*args, **kwargs)
        return GenContextManager(gen)
    return helper

@context_manager_dec
def open_file(fname, mode='r'):
    print('opening file...')
    f = open(fname, mode)
    try:
        yield f
    finally:
        print('closing file...')
        f.close()

with open_file('test.txt') as f:
    print(f.readlines())
```

Now `open_file(...)` looks and behaves just like a class-based manager. It's still not robust (no exception handling, no checks that the generator yields exactly once), but the idea is complete.

## `contextlib.contextmanager`

Writing context managers from generators was one of the original design goals of the `with` statement (PEP 343), so the standard library ships a robust version of this decorator:

```python run
from contextlib import contextmanager

@contextmanager
def open_file(fname, mode='r'):
    print('opening file...')
    f = open(fname, mode)
    try:
        yield f
    finally:
        print('closing file...')
        f.close()

with open_file('test.txt') as f:
    print(f.readlines())
```

What it does on top of our version:

- If the block raises, the exception is **thrown into the generator** at the `yield` (using `gen.throw()`), so `except` and `finally` clauses in the generator see it.
- If the generator catches the exception and doesn't re-raise it, the exception is **suppressed**; if it lets it escape, it propagates normally.
- If the generator doesn't yield, or yields more than once, you get a clear `RuntimeError`.

```python run
@contextmanager
def transaction():
    print('begin')
    try:
        yield
    except Exception as ex:
        print('rollback because of', repr(ex))
        raise                      # remove this line to suppress the error
    else:
        print('commit')

with transaction():
    print('doing work')

try:
    with transaction():
        raise ValueError('bad data')
except ValueError as ex:
    print('propagated:', ex)
```

<div class="callout tip">
<span class="callout-title">Always put the `yield` in a `try`</span>

If the block raises, the exception reappears *at the `yield`*. Any cleanup code after a bare `yield` is then skipped. Unless the cleanup is truly optional, wrap the `yield` in `try`/`finally`.

</div>

## Example: a timer

The yielded object can be anything, for example a dictionary that the generator fills in **after** the block finishes. Since the caller holds a reference to the same dict, it sees the results:

```python run
from time import perf_counter

@contextmanager
def timer():
    stats = {}
    start = stats['start'] = perf_counter()
    try:
        yield stats
    finally:
        end = stats['end'] = perf_counter()
        stats['elapsed'] = end - start

with timer() as stats:
    sum(range(1_000_000))
print(sorted(stats))
print(f"elapsed: {stats['elapsed']:.4f} s")
```

## Example: redirecting stdout

The change/reset pattern from earlier reads very naturally as a generator:

```python run
import sys

@contextmanager
def out_to_file(fname):
    current_stdout = sys.stdout
    file = open(fname, 'w')
    sys.stdout = file
    try:
        yield None
    finally:
        file.close()
        sys.stdout = current_stdout

with out_to_file('test.txt'):
    print('line 1')
    print('line 2')

with open('test.txt') as f:
    print(f.readlines())
```

`contextlib` already has this one too: `redirect_stdout` takes any open file-like object (not a file name). Combined with `io.StringIO`, it's a handy way to **capture** printed output as a string:

```python run
from contextlib import redirect_stdout
import io

buffer = io.StringIO()
with redirect_stdout(buffer):
    print('Look on the bright side of life')
    help(len)
captured = buffer.getvalue()
print(captured.splitlines()[0])
print(len(captured), 'characters captured')
```

## A context manager is also a decorator

Managers created with `@contextmanager` inherit from `contextlib.ContextDecorator`, so they can also **decorate a function**: each call of the function runs inside a fresh `with`:

```python run
@contextmanager
def announce(name):
    print(f'-> entering {name}')
    try:
        yield
    finally:
        print(f'<- leaving {name}')

@announce('compute')
def compute(x):
    print('computing...')
    return x * 2

compute(21)
```

## More tools in `contextlib`

A few small managers cover very common needs:

```python run
from contextlib import suppress, nullcontext, chdir
import os, tempfile

# suppress: ignore specific exceptions (and only those)
with suppress(FileNotFoundError):
    os.remove('no-such-file.txt')
print('carried on after the missing file')

# nullcontext: a do-nothing manager, handy for "maybe use a manager"
def process(lock=None):
    with lock if lock is not None else nullcontext():
        return 'processed'
print(process())

# chdir (3.11+): change the working directory, restore it on exit
start = os.getcwd()
scratch = tempfile.mkdtemp()
with chdir(scratch):
    open('notes.txt', 'w').close()
    print(os.listdir('.'))
print(os.getcwd() == start)
```

`suppress(E)` is equivalent to `try: ... except E: pass`, but reads as intent. Use it only for errors you genuinely expect and don't care about.

<div class="callout modern">
<span class="callout-title">Modern Python</span>

`contextlib.chdir` arrived in Python 3.11 (`contextlib.suppress` dates from 3.4, `nullcontext` from 3.7). For coroutines, `contextlib.asynccontextmanager` (3.7) decorates an `async def` generator to produce an **async** context manager for `async with`, and since 3.10 `nullcontext` and `aclosing` support `async with` too.

</div>

<div class="takeaways">

## Key takeaways

- A decorator can turn a one-yield generator function into a context-manager factory; `contextlib.contextmanager` is the robust, standard version.
- Code before `yield` is the setup, the yielded value is what `as` binds, code after it is the cleanup.
- Exceptions from the block are raised **at the `yield`**: wrap it in `try`/`finally` for guaranteed cleanup, or `try`/`except` to react. Catching without re-raising suppresses the error.
- `@contextmanager` managers can also be used as function decorators.
- `contextlib` provides `redirect_stdout`, `suppress`, `closing`, `nullcontext`, `chdir` (3.11) and `asynccontextmanager`.

</div>
