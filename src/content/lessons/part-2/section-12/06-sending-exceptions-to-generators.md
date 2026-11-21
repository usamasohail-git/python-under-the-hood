---
title: Sending Exceptions to Generators
summary: throw() raises any exception inside a suspended generator, which can handle it and carry on, finish, or let it propagate - handy for using exceptions as control signals.
minutes: 15
---

## throw()

`send()` delivers a value at the paused `yield`. `close()` delivers a `GeneratorExit` there. The general tool behind both ideas is **`throw()`**: it raises **any exception you choose** inside the generator, exactly at the `yield` where it's suspended.

```python run
def gen():
    try:
        while True:
            received = yield
            print(received)
    finally:
        print('generator cleaning up...')

g = gen()
next(g)
g.send('hello')
try:
    g.throw(ValueError('custom message'))
except ValueError as ex:
    print('caller got ValueError:', ex)
```

The `ValueError` appeared *inside* the generator, as if the `yield` line itself had raised it. Nothing in the generator caught it, so the `finally` ran and the exception propagated out of `throw()` to the caller.

<div class="callout modern">
<span class="callout-title">Use the single-argument form</span>

Older code (and older notebooks) write `g.throw(ValueError, 'custom message')`, passing the type and the value separately, sometimes plus a traceback. That three-argument signature `throw(type, value, tb)` is **deprecated since Python 3.12** and emits a `DeprecationWarning`. Pass an exception instance (`g.throw(ValueError('msg'))`) or just a class (`g.throw(ValueError)`), which Python instantiates for you.

</div>

## Four possible outcomes

What `throw()` returns depends on what the generator does with the exception. There are four cases.

**1. The generator handles it and yields again.** Then `throw()` returns that yielded value, just like `send()` would, and the generator stays alive:

```python run
from inspect import getgeneratorstate

def gen():
    while True:
        try:
            received = yield
            print(received)
        except ValueError as ex:
            print('ValueError handled:', ex)

g = gen()
next(g)
result = g.throw(ValueError('bad value'))
print('throw returned:', result)
g.send('still working')
print(getgeneratorstate(g))
```

`throw` returned `None` because the next `yield` (back at the top of the loop) yields nothing.

**2. The generator doesn't handle it.** The exception propagates to the caller and the generator is closed:

```python run
def gen():
    while True:
        received = yield
        print(received)

g = gen()
next(g)
try:
    g.throw(ValueError('unhandled'))
except ValueError as ex:
    print('caller got:', ex)
print(getgeneratorstate(g))
```

**3. The generator handles it and returns.** The generator finishes, so the caller gets `StopIteration` (carrying any return value):

```python run
def gen():
    try:
        while True:
            received = yield
            print(received)
    except ValueError as ex:
        print('ValueError handled, exiting:', ex)
        return 'stopped'

g = gen()
next(g)
try:
    g.throw(ValueError('time to go'))
except StopIteration as ex:
    print('StopIteration, value =', ex.value)
print(getgeneratorstate(g))
```

**4. The generator handles it and raises a different exception.** The new exception propagates to the caller, and the generator is closed:

```python run
def gen():
    try:
        while True:
            received = yield
            print(received)
    except ValueError as ex:
        raise ZeroDivisionError('not really...')

g = gen()
next(g)
try:
    g.throw(ValueError('original'))
except ZeroDivisionError as ex:
    print('caller got ZeroDivisionError:', ex)
    print('caused while handling:', repr(ex.__context__))
print(getgeneratorstate(g))
```

Because the new exception was raised while handling the `ValueError`, Python chains them: the original is kept in `__context__`, and an uncaught traceback would show both. Write `raise ... from None` to suppress that chain when the original isn't useful to the caller.

## Exceptions as control signals

Exceptions aren't only for errors. `StopIteration` and `GeneratorExit` are already used purely for control flow, and `throw()` lets you define your own signals. Here a database-writer coroutine stays open across several transactions. The caller sends records with `send()`, and tells it to commit or roll back the current transaction by throwing custom exceptions:

```python run
class CommitException(Exception):
    pass

class RollbackException(Exception):
    pass

def write_to_db():
    print('opening database connection...')
    print('start transaction...')
    try:
        while True:
            try:
                data = yield
                print('writing data to database...', data)
            except CommitException:
                print('committing transaction...')
                print('opening next transaction...')
            except RollbackException:
                print('aborting transaction...')
                print('opening next transaction...')
    finally:
        print('generator closing...')
        print('aborting transaction...')
        print('closing database connection...')

sql = write_to_db()
next(sql)
sql.send(100)
sql.throw(CommitException)
sql.send(200)
sql.throw(RollbackException)
sql.send(300)
sql.throw(CommitException)
sql.close()
```

The inner `try` sits *inside* the loop, so after handling a commit or rollback the coroutine loops back to `yield` and waits for more data (outcome 1). The outer `try/finally` guarantees the connection is closed whenever the coroutine ends, whether by `close()` or by an unexpected error. Anything not committed when it closes is rolled back.

## throw() vs close()

`close()` is essentially `throw(GeneratorExit)` plus some bookkeeping on the caller's side. Compare them on a generator that catches `GeneratorExit` and exits:

```python run
def gen():
    try:
        while True:
            received = yield
    except GeneratorExit:
        print('received GeneratorExit...')
    finally:
        print('closing down...')

g = gen()
next(g)
g.close()                      # quiet: close() expects the generator to stop
print('---')
g = gen()
next(g)
try:
    g.throw(GeneratorExit)     # the generator returned, so throw() raises StopIteration
except StopIteration:
    print('caller has to handle StopIteration')
```

With `close()`, Python knows the generator is supposed to stop, so it silences the resulting `GeneratorExit` or `StopIteration`. With `throw()`, you're just raising an exception like any other, and it's your job as the caller to deal with whatever comes back. In practice: use `close()` to shut a generator down, and `throw()` for everything else.

<div class="takeaways">

## Key takeaways

- `g.throw(exc)` raises `exc` inside the generator at the paused `yield`. Use an instance or a class; the three-argument form is deprecated since 3.12.
- If the generator handles it and yields, `throw()` returns the yielded value and the generator keeps running.
- If it doesn't handle it, or raises a new exception, that exception reaches the caller and the generator closes.
- If it handles it and returns, the caller gets `StopIteration`.
- Custom exception classes thrown into a coroutine make clean control signals (commit, rollback, flush, …).
- `close()` is like `throw(GeneratorExit)`, but it silences the expected outcome for you.

</div>
