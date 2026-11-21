---
title: Generators and Context Managers
summary: A generator that yields exactly once already has the shape of setup, use, cleanup. A small wrapper class turns it into a real context manager.
minutes: 14
---

## A generator with the right shape

Look at what a generator does when it has a single `yield` inside `try`/`finally`:

```python run
def my_gen():
    try:
        print('creating context and yielding object')
        lst = [1, 2, 3, 4, 5]
        yield lst
    finally:
        print('exiting context and cleaning up')
```

Calling it runs nothing; it only creates the generator object. The first `next()` runs the code up to the `yield` (the **setup**) and hands us a value. The generator is now *paused*, keeping all its local state:

```python run
gen = my_gen()       # nothing printed: the body hasn't started
lst = next(gen)      # setup runs, and we receive the "as" object
print(lst)
```

The second `next()` resumes after the `yield`, runs the `finally` block (the **cleanup**), and then the function ends, which makes `next()` raise `StopIteration`:

```python run
try:
    next(gen)
except StopIteration:
    print('generator finished')
```

Setup, hand over an object, pause while the caller works, cleanup. That's precisely the life cycle of a context manager. The first `next()` plays the role of `__enter__` and the second plays `__exit__`.

## Wrapping the generator in a class

So let's write a context manager that drives a generator: `__enter__` calls `next()` once and returns the yielded value; `__exit__` calls `next()` again to run the cleanup, and swallows the expected `StopIteration`:

```python run
class GenCtxManager:
    def __init__(self, gen_func):
        self._gen = gen_func()

    def __enter__(self):
        return next(self._gen)

    def __exit__(self, exc_type, exc_value, exc_tb):
        try:
            next(self._gen)
        except StopIteration:
            pass
        return False

with GenCtxManager(my_gen) as lst:
    print('working with', lst)
```

The setup and cleanup code now lives together, in order, in one readable function, instead of being split across two methods. That's the big win of this approach.

## Passing arguments

`GenCtxManager` calls the generator function with no arguments, which isn't very useful. Forward `*args` and `**kwargs`:

```python run
class GenCtxManager:
    def __init__(self, gen_func, *args, **kwargs):
        self._gen = gen_func(*args, **kwargs)

    def __enter__(self):
        return next(self._gen)

    def __exit__(self, exc_type, exc_value, exc_tb):
        try:
            next(self._gen)
        except StopIteration:
            pass
        return False

def open_file(fname, mode):
    print('opening file...')
    f = open(fname, mode)
    try:
        yield f
    finally:
        print('closing file...')
        f.close()

with GenCtxManager(open_file, 'test.txt', 'w') as f:
    print('writing to file...')
    f.write('testing...')

with open('test.txt') as f:
    print(f.read())
```

Notice that `open()` is called **before** the `try`. If opening fails there's nothing to close, so the `finally` shouldn't run; if opening succeeds, the `try` guarantees the close.

## What about exceptions?

Raise an exception inside the block and see what happens:

```python run
try:
    with GenCtxManager(open_file, 'test.txt', 'w') as f:
        raise ValueError('oops')
except ValueError as ex:
    print('propagated:', ex)
```

The file got closed and the error propagated, so this looks fine at first. But look closer: `__exit__` resumed the generator with a plain `next()`, so from the generator's point of view the `yield` **returned normally**. The generator never learns that anything went wrong, so it can't log the error, roll back a transaction, or decide to handle it:

```python run
def transaction():
    print('begin')
    try:
        yield
        print('commit')        # should only happen on success!
    except Exception as ex:
        print('rollback because of', repr(ex))
        raise

try:
    with GenCtxManager(transaction):
        raise ValueError('bad data')
except ValueError:
    pass
```

It printed `commit` for a block that failed. To do this properly, `__exit__` should re-raise the exception **inside** the generator, at the paused `yield`. Generators have a method for exactly that: `gen.throw(exc)`.

```python run
class GenCtxManager:
    def __init__(self, gen_func, *args, **kwargs):
        self._gen = gen_func(*args, **kwargs)

    def __enter__(self):
        return next(self._gen)

    def __exit__(self, exc_type, exc_value, exc_tb):
        if exc_type is None:
            try:
                next(self._gen)
            except StopIteration:
                return False
            raise RuntimeError("generator didn't stop")
        try:
            self._gen.throw(exc_value)      # raise it at the yield
        except StopIteration:
            return True                     # generator swallowed it
        except BaseException as ex:
            if ex is exc_value:
                return False                # re-raised as-is: let it propagate
            raise
        raise RuntimeError("generator didn't stop after throw()")

try:
    with GenCtxManager(transaction):
        raise ValueError('bad data')
except ValueError as ex:
    print('propagated:', ex)

with GenCtxManager(transaction):
    print('doing work')
```

Now the generator's `except` clause runs on failure and `commit` only prints on success. This is getting fiddly, and there are still edge cases left (what if the generator yields twice? what if it never yields?). The next lesson shows the standard library tool that handles all of them.

<div class="callout note">
<span class="callout-title">Why `throw()`?</span>

`gen.throw(exc)` resumes a paused generator by raising `exc` at the `yield` where it stopped, as if that line had raised it. If the generator catches it and finishes, `throw()` raises `StopIteration`; if the generator lets it escape (or raises something else), `throw()` raises that exception in the caller. You'll see `throw()` and `close()` again when we look at generator-based coroutines.

</div>

<div class="takeaways">

## Key takeaways

- A generator with one `yield` naturally splits into setup (before the `yield`), the yielded object, and cleanup (after it).
- The first `next()` acts as `__enter__`; the second acts as `__exit__` and ends with `StopIteration`.
- A wrapper class can turn such a generator into a context manager, and `*args, **kwargs` let you pass arguments through.
- Resuming with `next()` hides exceptions from the generator. Use `gen.throw(exc)` so the generator's own `try`/`except`/`finally` sees what happened.
- Put the resource acquisition before `try`, and the release in `finally`.

</div>
