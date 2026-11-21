---
title: The __del__ Method
summary: "`__del__` is a finalizer that runs just before an object is destroyed, not when you write `del`; when that happens is an implementation detail, so prefer context managers or `weakref.finalize` for cleanup."
minutes: 14
---

## A finalizer, not a destructor

`__del__` is called when an object is **about to be destroyed**, giving it a last chance to release resources. It's often called a *destructor*, but *finalizer* is more accurate: `__del__` doesn't destroy anything. Freeing the memory is the interpreter's job, and `__del__` is just a hook it calls beforehand.

The most important fact about `__del__` is what it is **not**: it is not called by the `del` statement. `del x` only removes the name `x` from its namespace, which drops one reference to the object. The object is finalized only when it's actually reclaimed, and *when* that happens depends on the Python implementation:

- **CPython** (which is also what runs in your browser here) uses reference counting, so an object is normally reclaimed the moment its last reference disappears. Objects caught in reference cycles wait for the cyclic garbage collector.
- **Other implementations**, such as PyPy, use different garbage collectors and may finalize objects much later, or (at interpreter exit) not at all.

The language only promises that `__del__` runs *at some point before* the object is reclaimed, if it's reclaimed. Everything you see below is CPython behavior.

## Watching finalization in CPython

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Person({self.name})'

    def __del__(self):
        print(f'__del__ called for {self}')

p = Person('Alex')
p = None                 # last reference gone: finalized right away
print('--')
p = Person('Alex')
del p                    # same thing: del removed the only reference
print('--')
p = Person('Alex')
q = p
del p                    # q still refers to the object: nothing happens
print('after del p')
del q                    # now the last reference is gone
```

The first two cases look like `p = None` and `del p` "call" `__del__`. They don't: they remove the last reference, and CPython finalizes the object immediately as a consequence. With a second name `q` around, `del p` does nothing visible.

## Hidden references: a stored exception

Extra references are easy to create without noticing. Here's a common one: keeping an exception object around.

```python run
import sys

class Person:
    def __init__(self, name):
        self.name = name

    def gen_ex(self):
        raise ValueError('Something went bump...')

    def __repr__(self):
        return f'Person({self.name})'

    def __del__(self):
        print(f'__del__ called for {self}')

p = Person('Alex')
print('refcount:', sys.getrefcount(p) - 1)     # minus the argument's own reference

try:
    p.gen_ex()
except ValueError as ex:
    error = ex                                  # keep the exception

print('refcount:', sys.getrefcount(p) - 1)
```

The count went from 1 to 2. Where does the second reference come from? An exception carries its **traceback**, the traceback keeps the **frames** it passed through alive, and the frame of `gen_ex` still holds its local variable `self`:

```python run
tb = error.__traceback__
print(tb.tb_frame.f_code.co_name)                # the cell's own frame
print(tb.tb_next.tb_frame.f_code.co_name)        # the frame of gen_ex
print(tb.tb_next.tb_frame.f_locals['self'])      # ...which still references our person
del tb
```

So deleting `p` isn't enough. The object is only finalized when the exception goes away:

```python run
del p
print('after del p: no __del__ yet')
del error
print('after del error')
```

This is also why Python automatically deletes the name bound by `except ... as ex` at the end of the `except` block: to avoid exactly this kind of accidental long-lived reference. Assigning it to another name, as we did with `error`, opts back in.

## Reference cycles

Objects that refer to each other keep each other's reference counts above zero, so reference counting alone can't free them. CPython's cyclic garbage collector finds such groups periodically, or when you call `gc.collect()`. (Since Python 3.4, cycles containing objects with `__del__` are collected normally; very old versions left them uncollected in `gc.garbage`.)

```python run
import gc

class Node:
    def __init__(self, name):
        self.name = name
        self.other = None
    def __del__(self):
        print(f'__del__ called for {self.name}')

a, b = Node('a'), Node('b')
a.other, b.other = b, a          # a reference cycle
del a, b
print('names deleted, nothing finalized yet')
gc.collect()
print('after gc.collect()')
```

Without the explicit `gc.collect()`, those two `__del__` calls would happen whenever the collector next ran on its own. That's the point: in general you **can't predict when** a finalizer runs.

## Exceptions inside `__del__` are ignored

`__del__` can run at almost any moment (in the middle of unrelated code, during garbage collection, at interpreter shutdown), so there's no sensible caller to raise an exception to. Python therefore reports it and carries on:

```python run
class Bad:
    def __del__(self):
        raise ValueError('Something went bump...')

b = Bad()
try:
    del b
    print('b deleted')
except ValueError:
    print('exception caught')
else:
    print('no exception seen by our code')
```

The "Exception ignored in: …" report you see is written to `sys.stderr`; the `try` statement never sees an exception. Python 3.8 added `sys.unraisablehook`, which receives such exceptions, so you can capture them, for example in a test:

```python run
caught = []

def hook(unraisable):
    caught.append(repr(unraisable.exc_value))

old_hook, sys.unraisablehook = sys.unraisablehook, hook
try:
    b = Bad()
    del b
finally:
    sys.unraisablehook = old_hook
print(caught)
```

<div class="callout modern">
<span class="callout-title">The report's wording</span>

Older notebooks show the report as `Exception ignored in: <bound method Person.__del__ of ...>`; recent versions show `Exception ignored in: <function Bad.__del__ at 0x...>`. The behavior is the same: the exception is printed to `stderr` and swallowed.

</div>

## What to use instead

Because finalization time is unpredictable, `__del__` is a poor place for important cleanup like closing files, releasing locks or committing transactions. Better tools:

- A **context manager** (`with` statement) for deterministic cleanup at the end of a block. This is the right answer almost every time.
- **`weakref.finalize`** when you really need a callback tied to an object's lifetime. It doesn't need a method on the class, runs at most once, is also called at interpreter exit, and lets you check or trigger it explicitly:

```python run
import weakref

class Resource:
    pass

r = Resource()
fin = weakref.finalize(r, print, 'cleaning up the resource')
print(fin.alive)
del r                       # CPython: last reference gone, callback runs
print(fin.alive)
```

If you do write `__del__`, keep it short, never let it raise, and don't rely on other objects (including module globals) still being available: at interpreter shutdown they may already have been torn down.

<div class="takeaways">

## Key takeaways

- `__del__` is a **finalizer** called just before an object is reclaimed. `del x` only removes a name and one reference.
- In CPython an object is usually reclaimed as soon as its last reference disappears, and cycles when the garbage collector runs. That timing is an implementation detail, not a language guarantee.
- Hidden references (a stored exception's traceback, a cycle, a cache) can delay finalization indefinitely.
- Exceptions raised in `__del__` are printed to `stderr` (via `sys.unraisablehook`) and otherwise ignored.
- For cleanup, prefer context managers, or `weakref.finalize` when it must be tied to an object's lifetime.

</div>
