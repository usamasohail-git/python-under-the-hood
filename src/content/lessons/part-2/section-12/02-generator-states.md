---
title: Generator States
summary: A generator is always in one of four states (created, running, suspended or closed), and the inspect module can tell you which.
minutes: 10
---

## Four states

To use generators as coroutines, you need a precise picture of what a generator object is doing at any moment. Start with a plain generator:

```python run
def gen(s):
    for c in s:
        yield c

g = gen('abc')
g
```

Calling `gen('abc')` did **not** run any of the body. It only built a generator object. At this point the generator is **created**: it has a frame ready to go, but it hasn't executed a single line.

Calling `next()` starts it. The body **runs** until it hits a `yield`, hands the value to us, and is then **suspended**, frozen at that `yield`, waiting to be resumed:

```python run
print(next(g))
print(next(g))
print(next(g))
```

Each `next()` moves the generator from suspended back to running, until the next `yield`. When the body finally finishes (it returns, or falls off the end), `next()` raises `StopIteration` and the generator is **closed** for good:

```python run
try:
    next(g)
except StopIteration:
    print('StopIteration: the generator is exhausted')
```

So a generator moves through four states:

<figure class="diagram">
<svg viewBox="0 0 600 200" role="img" aria-label="State diagram: CREATED goes to RUNNING on next; RUNNING goes to SUSPENDED on yield and back on next or send; RUNNING goes to CLOSED on return or an uncaught exception">
<defs>
<marker id="gs1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="gs2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="20" y="70" width="110" height="46" rx="8" class="d-obj"/><text x="75" y="98" text-anchor="middle" class="d-text">CREATED</text>
<rect x="240" y="20" width="120" height="46" rx="8" class="d-obj-hl"/><text x="300" y="48" text-anchor="middle" class="d-text">RUNNING</text>
<rect x="240" y="130" width="120" height="46" rx="8" class="d-obj"/><text x="300" y="158" text-anchor="middle" class="d-text">SUSPENDED</text>
<rect x="470" y="70" width="110" height="46" rx="8" class="d-obj"/><text x="525" y="98" text-anchor="middle" class="d-text">CLOSED</text>
<path d="M130 82 L236 50" class="d-arrow-hl" marker-end="url(#gs2)"/><text x="150" y="52" class="d-sub">next()</text>
<path d="M280 66 L280 126" class="d-arrow-hl" marker-end="url(#gs2)"/><text x="215" y="100" class="d-sub">yield</text>
<path d="M320 126 L320 70" class="d-arrow-hl" marker-end="url(#gs2)"/><text x="328" y="100" class="d-sub">next() / send()</text>
<path d="M360 43 L466 82" class="d-arrow" marker-end="url(#gs1)"/><text x="400" y="45" class="d-sub">return / error</text>
<path d="M360 153 L466 104" class="d-arrow" marker-end="url(#gs1)"/><text x="410" y="150" class="d-sub">close()</text>
</svg>
<figcaption>A generator only runs between a resume (<code>next</code>/<code>send</code>) and the next <code>yield</code>. It spends most of its life created, suspended or closed.</figcaption>
</figure>

## Asking a generator for its state

`inspect.getgeneratorstate()` reports the state as a string:

```python run
from inspect import getgeneratorstate

g = gen('abc')
print(getgeneratorstate(g))
next(g)
print(getgeneratorstate(g))
list(g)                       # consume the rest
print(getgeneratorstate(g))
```

You'll see `GEN_CREATED`, `GEN_SUSPENDED` and `GEN_CLOSED`. What about `GEN_RUNNING`? From the outside you can never observe it: by the time `next()` returns to you, the generator has already suspended again. The only code that runs while a generator is running is the generator's own body.

To catch it in the act, the body has to inspect *itself*. A generator doesn't have a handy name for its own object, so we cheat and use a global variable:

```python run
def gen(s):
    for c in s:
        print('inside:', getgeneratorstate(global_gen))
        yield c

global_gen = gen('abc')
print(next(global_gen))
print('outside:', getgeneratorstate(global_gen))
```

## The attributes behind the states

`getgeneratorstate` is a thin wrapper around attributes on the generator object:

```python run
def letters(s):
    for c in s:
        yield c

g = letters('xy')
print('frame:', g.gi_frame is not None, '| running:', g.gi_running, '| suspended:', g.gi_suspended)
next(g)
print('frame:', g.gi_frame is not None, '| running:', g.gi_running, '| suspended:', g.gi_suspended)
list(g)
print('frame:', g.gi_frame, '| running:', g.gi_running, '| suspended:', g.gi_suspended)
```

- `gi_frame` is the generator's execution frame (its local variables and the current position). It becomes `None` once the generator is closed, because there's nothing left to resume.
- `gi_running` is `True` only while the body is executing.
- `gi_suspended` is `True` while it's paused at a `yield`.

<div class="callout modern">
<span class="callout-title">gi_suspended is new</span>

`gi_suspended` was added in Python 3.11. On older versions, `inspect` worked out "suspended" by checking the frame's instruction pointer. Either way, `inspect.getgeneratorstate()` is the portable way to ask, and it works the same on every Python 3 version.

</div>

## Why a running generator can't be resumed

Since a generator is either running or not, Python refuses to resume one that is already running. That can only happen if the body tries to advance *itself*:

```python run
def selfish():
    yield next(me)      # try to resume ourselves while running

me = selfish()
try:
    next(me)
except ValueError as ex:
    print('ValueError:', ex)
```

You'll never write this on purpose, but it shows that "running" is a real, enforced state.

## Why the states matter

For iteration, you rarely care: a `for` loop handles starting the generator and stopping on `StopIteration` for you. For coroutines, the state is everything:

- You'll **send** data only into a *suspended* generator. A created one hasn't reached a `yield` yet, so there's nowhere for the data to land.
- You'll **close** a generator to move it to the closed state on purpose, before it's exhausted.
- You'll inspect states to understand what `yield from` does to a delegator and its subgenerator.

<div class="takeaways">

## Key takeaways

- A generator is **created** (not started), **running** (executing its body), **suspended** (paused at a `yield`) or **closed** (finished, or closed on purpose).
- `next()` moves it from created or suspended to running; `yield` suspends it; returning or an uncaught exception closes it.
- `inspect.getgeneratorstate()` returns `GEN_CREATED`, `GEN_RUNNING`, `GEN_SUSPENDED` or `GEN_CLOSED`. You can only see `GEN_RUNNING` from inside the body.
- The same information lives in `gi_frame`, `gi_running` and (since 3.11) `gi_suspended`.

</div>
