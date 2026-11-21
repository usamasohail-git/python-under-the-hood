---
title: Yield From - Closing and Return
summary: Closing a delegator also closes its active subgenerator, and the value a subgenerator returns becomes the result of the yield from expression.
minutes: 13
---

## Closing the subgenerator directly

Here's a subgenerator that announces when it shuts down, and a delegator with some code after its `yield from`:

```python run
from inspect import getgeneratorstate, getgeneratorlocals

def subgen():
    try:
        while True:
            received = yield
            print(received)
    finally:
        print('subgen: closing...')

def delegator():
    s = subgen()
    yield from s
    yield 'delegator: subgen closed'
    print('delegator: closing...')

d = delegator()
next(d)
s = getgeneratorlocals(d)['s']
d.send('hello')
s.send('python')        # we can talk to the subgenerator directly, too
```

What if we close the **subgenerator** behind the delegator's back?

```python run
s.close()
print('delegator:', getgeneratorstate(d), '| subgen:', getgeneratorstate(s))
```

The subgenerator is closed, but the delegator doesn't know yet: it's still suspended at the `yield from`. The next time we resume it, `yield from` tries to forward the request, finds the subgenerator finished, and treats that like any other finished subgenerator. The delegator carries on after the `yield from`:

```python run
print(next(d))
try:
    next(d)
except StopIteration:
    print('StopIteration')
```

## Closing the delegator

The more common case: the caller closes the **delegator**. `yield from` forwards the close to the subgenerator first, then the delegator closes too:

```python run
d = delegator()
next(d)
s = getgeneratorlocals(d)['s']
d.close()
print('delegator:', getgeneratorstate(d), '| subgen:', getgeneratorstate(s))
```

Notice that `'delegator: subgen closed'` was **not** yielded this time. After closing the subgenerator, `yield from` re-raises `GeneratorExit` inside the delegator, so the delegator stops as well (and any `finally` in the delegator would run). Closing the outermost generator of a delegation chain therefore cleanly shuts down the whole chain, innermost first.

## yield from is an expression

A generator can `return` a value, and we saw that the value travels on the `StopIteration` exception. `yield from` catches that exception for you, and the return value becomes the **value of the `yield from` expression**:

```python run
def subgen():
    yield 1
    yield 2
    return 100

def delegator():
    result = yield from subgen()
    print('subgen returned:', result)
    yield 'delegator suspended'

d = delegator()
print(next(d))
print(next(d))
print(next(d))
```

On the third `next()` the subgenerator returned `100`; `yield from` turned that into `result`, and the delegator went on to its own `yield`.

This is the key to using subgenerators as coroutines: a subgenerator can do some work over many `send()` calls, then **report a result** to its delegator when it finishes. For that, the subgenerator needs a way to know when to finish. A common convention is a **sentinel** value such as `None`:

```python run
def averager():
    total, count = 0, 0
    while True:
        value = yield
        if value is None:            # sentinel: we're done
            return total / count if count else None
        total += value
        count += 1

def grouper(results, key):
    while True:
        results[key] = yield from averager()

results = {}
g = grouper(results, 'temps')
next(g)
for v in [20, 22, 27]:
    g.send(v)
g.send(None)                         # averager returns; grouper stores it and starts a new one
print(results)
```

The caller only ever talks to `grouper`, yet every value goes straight into `averager`. When the sentinel arrives, `averager` returns its result, `yield from` hands it to `grouper`, which stores it and immediately delegates to a fresh `averager`, ready for the next group.

## What happens to the return value on close?

If we close the subgenerator **directly** and it returns a value while handling `GeneratorExit`, there's no `yield from` to receive it. Before Python 3.13 that value was simply lost; now `close()` returns it:

```python run
def subgen():
    try:
        while True:
            yield
    except GeneratorExit:
        return 'subgen: return value'

s = subgen()
next(s)
print(s.close())
```

When you close a **delegator**, though, the subgenerator's return value isn't used: the delegator is shutting down, so it doesn't continue after the `yield from`. If you need a result at shutdown, have the subgenerator return on a sentinel (as above) rather than on close.

<div class="callout modern">
<span class="callout-title">Don't return from finally</span>

Older examples sometimes put `return value` inside a `finally` block of the subgenerator. That silently discards any exception in flight, including `GeneratorExit`, which is rarely what you want. Python 3.14 makes it a `SyntaxWarning` ([PEP 765](https://peps.python.org/pep-0765/)). Return from the normal flow, or from an `except GeneratorExit:` handler, as shown here.

</div>

<div class="takeaways">

## Key takeaways

- If the subgenerator is closed directly, the delegator stays suspended and resumes after `yield from` the next time it's driven.
- Closing the delegator closes its active subgenerator first, then raises `GeneratorExit` in the delegator so it closes too.
- `result = yield from subgen` captures the subgenerator's return value (the `StopIteration.value`).
- A sentinel value is a clean way to tell a subgenerator to finish and report its result.
- In Python 3.13+, `close()` returns the value a generator returns while handling `GeneratorExit`.

</div>
