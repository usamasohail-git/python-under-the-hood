---
title: Context Managers in Python
summary: The with statement runs setup code, hands you an object, and guarantees the cleanup code runs however the block ends. Here's the protocol behind it.
minutes: 18
---

## The problem: cleanup that must always happen

A huge amount of code follows the same three-step shape:

1. **set up** some resource (open a file, acquire a lock, change a setting)
2. **use** it
3. **clean up** (close the file, release the lock, restore the setting)

Step 3 is the fragile one. If step 2 raises an exception or returns early, a naive version of step 3 simply never runs. Python's tool for "run this no matter what" is the `finally` clause of a `try` statement:

```python run
try:
    10 / 2
except ZeroDivisionError:
    print('division failed')
finally:
    print('finally ran (no error)')

try:
    1 / 0
except ZeroDivisionError:
    print('division failed')
finally:
    print('finally ran (after an error)')
```

`finally` runs on the happy path, after a handled exception, and even when the `try` or `except` block leaves the function with `return`:

```python run
def my_func():
    try:
        1 / 0
    except ZeroDivisionError:
        return 'returned from except'
    finally:
        print('finally runs before the function actually returns')

my_func()
```

So the correct, hand-written way to make sure a file gets closed looks like this:

```python run
f = open('test.txt', 'w')
try:
    f.write('some data')
    1 / 0                      # something goes wrong half-way
except ZeroDivisionError:
    print('an exception occurred...')
finally:
    f.close()
    print('file closed?', f.closed)
```

It works, but you have to remember it every single time, and the cleanup logic is repeated at every place that opens a file. We'd like to write the setup/cleanup pair **once**, attach it to an object, and have the language call it for us.

## The `with` statement

That's exactly what a **context manager** plus the `with` statement gives you:

```python run
with open('test.txt', 'w') as file:
    print('inside with: closed?', file.closed)
print('after with: closed?', file.closed)
```

The file object returned by `open()` is a context manager. Entering the `with` block gives us the file; leaving the block, in whatever way, closes it. Leaving via `return`:

```python run
def test():
    with open('test.txt', 'w') as file:
        print('inside with: closed?', file.closed)
        return file           # jump straight out of the block

file = test()
print('after return: closed?', file.closed)
```

And leaving via an exception:

```python run
try:
    with open('test.txt', 'w') as f:
        print('inside with: closed?', f.closed)
        raise ValueError('boom')
except ValueError as ex:
    print('caught:', ex)
print('after with: closed?', f.closed)
```

The cleanup happened even though the exception kept propagating (we caught it *outside* the `with` so the cell can carry on).

## The protocol: `__enter__` and `__exit__`

Any object can be used in a `with` statement if its class defines two special methods:

- `__enter__(self)` runs when the block is entered. Whatever it returns is bound to the name after `as` (if there is one). It may return the resource, the manager itself, or nothing at all.
- `__exit__(self, exc_type, exc_value, traceback)` runs when the block is left, for any reason. If the block finished normally, all three arguments are `None`. If an exception escaped the block, they describe it: the exception class, the exception instance, and its traceback object.

The return value of `__exit__` matters: a **truthy** value tells Python "I've handled it, **suppress** the exception"; a falsy value (including the implicit `None`) lets the exception continue propagating.

Roughly, `with EXPR as target: BODY` behaves like this:

```python
mgr = EXPR
exit_ = type(mgr).__exit__          # looked up on the class, before entering
value = type(mgr).__enter__(mgr)
target = value
try:
    BODY
except BaseException as ex:
    if not exit_(mgr, type(ex), ex, ex.__traceback__):
        raise                       # not suppressed: re-raise
else:
    exit_(mgr, None, None, None)
```

Two consequences worth remembering: `__exit__` only runs if `__enter__` **succeeded** (an exception inside `__enter__` happens before the `try`), and the special methods are looked up on the **type**, just like other dunder methods.

## Writing a context manager

Let's write one that just reports what's happening:

```python run
class MyContext:
    def __enter__(self):
        print('entering context...')
        return 'the return object'

    def __exit__(self, exc_type, exc_value, exc_tb):
        print('exiting context...')
        if exc_type:
            print(f'*** error occurred: {exc_type.__name__}: {exc_value}')
        return False          # do not suppress exceptions

with MyContext() as obj:
    print('inside the block, obj =', repr(obj))
```

Now raise inside the block. `__exit__` still runs, sees the exception, and because it returns `False` the exception keeps going:

```python run
try:
    with MyContext() as obj:
        raise ValueError('something bad')
except ValueError as ex:
    print('propagated out of the with:', repr(ex))
```

Change `__exit__` to return `True` and the exception is swallowed:

```python run
class Swallower(MyContext):
    def __exit__(self, exc_type, exc_value, exc_tb):
        super().__exit__(exc_type, exc_value, exc_tb)
        return True           # suppress any exception

with Swallower():
    raise ValueError('this never escapes')
print('reached here without an exception')
```

<div class="callout tip">
<span class="callout-title">Suppress deliberately, not by accident</span>

Returning `True` unconditionally hides *every* error, including typos (`NameError`) and bugs. If a manager suppresses anything, it should check `exc_type` and suppress only what it really means to handle. Most managers return `False` or `None`. The standard library's `contextlib.suppress(SomeError)` does selective suppression for you (see the lesson on the `contextmanager` decorator).

</div>

## `with` does not create a scope

A `with` block is not a function, so names bound inside it, including the `as` target, are ordinary variables of the surrounding scope and still exist afterward:

```python run
with MyContext() as obj:
    inside = 'set inside the block'
print(obj)
print(inside)
```

The object stays reachable, but the manager may have changed its state on exit. That's exactly what happens to a closed file. Here's the same idea with a home-made resource:

```python run
class Resource:
    def __init__(self, name):
        self.name = name
        self.state = None

class ResourceManager:
    def __init__(self, name):
        self.name = name
        self.resource = None

    def __enter__(self):
        print('entering context')
        self.resource = Resource(self.name)
        self.resource.state = 'created'
        return self.resource

    def __exit__(self, exc_type, exc_value, exc_tb):
        print('exiting context')
        self.resource.state = 'destroyed'
        return False

with ResourceManager('spam') as res:
    print(f'{res.name} = {res.state}')
print(f'{res.name} = {res.state}')
```

## Our own file manager

Files already are context managers, but rebuilding one is good practice. Note how `__init__` only *stores configuration*; the resource is acquired in `__enter__`:

```python run
class File:
    def __init__(self, name, mode):
        self.name = name
        self.mode = mode

    def __enter__(self):
        print('opening file...')
        self.file = open(self.name, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_value, exc_tb):
        print('closing file...')
        self.file.close()
        return False

def write_parrot():
    with File('test.txt', 'w') as f:
        f.write('This is a late parrot!')
        return f              # early return: the file is still closed

f = write_parrot()
print('closed?', f.closed)
```

`__enter__` doesn't have to return the resource. Returning `self` gives the caller access to the manager's attributes too:

```python run
class File:
    def __init__(self, name, mode):
        self.name = name
        self.mode = mode

    def __enter__(self):
        self.file = open(self.name, self.mode)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.file.close()
        return False

with File('test.txt', 'r') as file_ctx:
    print(file_ctx.file.readline())
    print(file_ctx.name, file_ctx.mode)
```

## Typical patterns

Once you look for the "set up / tear down" shape, you'll see it everywhere:

| Pattern | Examples |
|---|---|
| Open / close | files, sockets, database connections |
| Lock / release | `threading.Lock`, semaphores |
| Change / reset | decimal precision, `sys.stdout`, the current directory |
| Start / stop | timers, transactions, profiling |
| Enter / exit | HTML tags, indentation levels |

We'll build several of these in the coming lessons.

<div class="callout modern">
<span class="callout-title">Modern Python</span>

Since Python 3.11, using an object that lacks the protocol in a `with` statement raises a clear `TypeError` (older versions raised `AttributeError: __enter__`). Python 3.11 also added `sys.exception()`, a simpler way to get the exception currently being handled. There is also an **asynchronous** version of the protocol, `__aenter__`/`__aexit__`, used with `async with` inside coroutines (for example to open network connections); it works the same way, except the two methods are awaited.

</div>

```python run
try:
    with 42:
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="takeaways">

## Key takeaways

- `try`/`finally` guarantees cleanup; a context manager packages that guarantee into a reusable object used with `with`.
- `__enter__` runs on entry and its return value is bound by `as`; `__exit__(exc_type, exc_value, tb)` runs on exit, however the block ends.
- If the block raised, `__exit__` receives the exception details; returning a truthy value suppresses the exception, anything else lets it propagate.
- `__exit__` only runs if `__enter__` succeeded.
- `with` does not create a new scope: the `as` variable lives on after the block.
- Acquire resources in `__enter__`, not `__init__`, and release them in `__exit__`.

</div>
