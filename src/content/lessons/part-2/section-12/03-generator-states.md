---
title: Generator States
summary: A closer look at the suspended state - exactly where a generator pauses, what it remembers while paused, and what happens on the way to closed.
minutes: 11
---

## Exactly where does it pause?

The previous lesson gave the big picture: created, running, suspended, closed. To use generators as coroutines you also need to know *precisely* where a suspended generator is frozen, because that's where the next resume will pick up (and, soon, where sent data and thrown exceptions will land).

The rule: when Python reaches `yield <expression>`, it **first evaluates the expression**, then hands the result out and suspends **at the yield itself**. Nothing after the `yield` runs until the generator is resumed.

```python run
def square(i):
    print(f'squaring {i}')
    return i ** 2

def squares(n):
    for i in range(n):
        yield square(i)
        print('right after yield')

sq = squares(5)
next(sq)
```

`square(0)` ran (we see its message), its result was yielded, and the generator stopped. `'right after yield'` has **not** printed yet. It only prints on the next resume, just before the next value is computed:

```python run
next(sq)
```

So each `next()` call runs *from the previous yield to the next one*. Think of the code between two yields as one "step" of the generator.

## What a suspended generator remembers

While suspended, the generator's frame stays alive, holding every local variable and the exact position. `inspect.getgeneratorlocals()` shows the locals, and the frame's `f_lineno` shows where it's paused:

```python run
from inspect import getgeneratorstate, getgeneratorlocals

def countdown(n):
    label = 'T-minus'
    while n > 0:
        yield f'{label} {n}'
        n -= 1
    print('liftoff!')

c = countdown(3)
print(getgeneratorstate(c), getgeneratorlocals(c))
print(next(c))
print(getgeneratorstate(c), getgeneratorlocals(c))
print('paused at line', c.gi_frame.f_lineno, 'of the cell')
```

Before the first `next()`, the only local is the argument `n` (the body hasn't run, so `label` doesn't exist yet). After it, `label` exists and the frame is paused on the `yield` line. This is the whole reason generators make good coroutines: a suspended generator is a **saved computation** you can resume later, and it keeps its own private state between resumes.

## The trip to closed

Keep resuming and watch the last step:

```python run
print(next(c))
print(next(c))
try:
    next(c)
except StopIteration:
    print('StopIteration')
print(getgeneratorstate(c), getgeneratorlocals(c))
```

The final `next()` resumed the generator after its last `yield`: `n` dropped to 0, the loop ended, `'liftoff!'` was printed, and the function returned. **Code after the last `yield` still runs**, but only when someone resumes the generator one more time. If nobody calls `next()` again (for example a loop that `break`s early), that code never runs. Keep that in mind for cleanup code; the next lessons show how `close()` and `try/finally` deal with it.

Once closed, the frame is gone (`getgeneratorlocals` returns `{}`), and every further `next()` immediately raises `StopIteration`.

## Returning a value

A generator can `return` a value. That value doesn't come out of `next()`; it rides on the `StopIteration` exception, in its `.value` attribute:

```python run
def gen():
    yield 1
    return 'done'

g = gen()
print(next(g))
try:
    next(g)
except StopIteration as ex:
    print('returned:', ex.value)
```

A `for` loop silently swallows `StopIteration`, so return values are useless for plain iteration. They become important for coroutines: `yield from` (later in this section) uses exactly this mechanism to pass a result from one generator to another.

## Errors close a generator too

If an exception escapes the body, it propagates to whoever resumed the generator, and the generator is closed:

```python run
def fragile():
    yield 1
    raise ValueError('bad data')
    yield 2                       # never reached

f = fragile()
next(f)
try:
    next(f)
except ValueError as ex:
    print('ValueError:', ex)
print(getgeneratorstate(f))
```

A generator that has failed can't be restarted. If you need a fresh one, call the generator function again.

<div class="callout note">
<span class="callout-title">StopIteration inside a generator</span>

Because `StopIteration` is how a generator signals "finished", Python (since 3.7, [PEP 479](https://peps.python.org/pep-0479/)) converts a `StopIteration` that *escapes from inside* a generator body into a `RuntimeError`. Otherwise a stray `next()` call on an exhausted inner iterator would silently end your generator early. Use `return` to finish a generator, never `raise StopIteration`.

</div>

```python run
def leaky():
    it = iter([])
    yield next(it)     # StopIteration raised inside the body

try:
    next(leaky())
except RuntimeError as ex:
    print('RuntimeError:', ex)
```

<div class="takeaways">

## Key takeaways

- On `yield expr`, the expression is evaluated first, then the value is handed out and the generator suspends **at the yield**. The code after it runs on the next resume.
- A suspended generator keeps its frame: local variables and position. `inspect.getgeneratorlocals()` and `gi_frame.f_lineno` let you look inside.
- Code after the last `yield` runs only if the generator is resumed once more; then it returns and is closed.
- `return value` ends a generator and stores `value` on the `StopIteration` exception (`ex.value`).
- An uncaught exception also closes the generator. A `StopIteration` leaking out of the body becomes `RuntimeError`.

</div>
