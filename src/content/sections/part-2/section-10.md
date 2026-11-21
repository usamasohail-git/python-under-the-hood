---
summary: How the with statement guarantees cleanup, how to write your own context managers as classes or generators, and how to juggle many of them at once.
---

Almost every program acquires something it must later give back: an open file, a lock, a temporary setting, a redirected output stream, a timer that has to be stopped. Forgetting the "give back" half, or skipping it because an exception jumped past it, is one of the most common sources of subtle bugs. Python's answer is the **context manager** and the `with` statement: you describe setup and teardown once, and the language guarantees the teardown runs no matter how the block ends.

In this section you'll learn:

- why `try`/`finally` guarantees cleanup, and how `with` packages that guarantee into a reusable object
- the context manager protocol: `__enter__`, `__exit__`, and how `__exit__` can see and even suppress exceptions
- the trap of returning a *lazy* iterator from inside a `with` block, and how to avoid it
- objects that are context managers *and* something else (iterators, for example)
- common patterns: open/close, change/reset, start/stop, plus re-entrant managers
- how a generator with a single `yield` already has the shape of a context manager
- `contextlib.contextmanager`, `redirect_stdout`, `suppress`, `chdir` (3.11) and friends
- managing several resources at once: nested `with`, parenthesized multi-item `with` (3.10) and `contextlib.ExitStack`
