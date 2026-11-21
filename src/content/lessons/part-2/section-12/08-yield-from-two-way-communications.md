---
title: Yield From - Two-Way Communications
summary: yield from connects the caller directly to a subgenerator through the delegating generator, and the delegator resumes only when the subgenerator finishes.
minutes: 12
---

## Delegation, revisited

In the generators section we used `yield from` as a shortcut for "yield everything this iterable produces":

```python run
def squares(n):
    for i in range(n):
        yield i ** 2

def delegator_loop(n):
    for value in squares(n):
        yield value

def delegator(n):
    yield from squares(n)

print(list(delegator_loop(5)))
print(list(delegator(5)))
```

For plain iteration the two are equivalent. But `yield from` does much more than the loop version, and that's what makes it central to coroutines.

**Terminology.** In `yield from subgen`:

- the generator containing the `yield from` is the **delegator**;
- the generator it delegates to is the **subgenerator**;
- the code calling `next()` (or `send()`, …) on the delegator is the **caller**.

## A two-way channel

When the caller calls `next()` on the delegator, the delegator doesn't do any work itself. It passes the request straight to the subgenerator. The subgenerator yields a value, and that value travels back through the delegator to the caller. While the `yield from` is active, the delegator is just a **transparent pipe**:

<figure class="diagram">
<svg viewBox="0 0 600 160" role="img" aria-label="The caller sends next, send, throw and close through the delegator to the subgenerator; values yielded by the subgenerator travel back through the delegator to the caller">
<defs>
<marker id="yf1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
<marker id="yf2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<rect x="20" y="45" width="120" height="60" rx="8" class="d-name"/><text x="80" y="80" text-anchor="middle" class="d-text">caller</text>
<rect x="240" y="45" width="130" height="60" rx="8" class="d-obj"/><text x="305" y="72" text-anchor="middle" class="d-text">delegator</text><text x="305" y="92" text-anchor="middle" class="d-sub">yield from s</text>
<rect x="470" y="45" width="120" height="60" rx="8" class="d-obj-hl"/><text x="530" y="80" text-anchor="middle" class="d-text">subgen s</text>
<path d="M140 62 L236 62" class="d-arrow-hl" marker-end="url(#yf1)"/>
<path d="M370 62 L466 62" class="d-arrow-hl" marker-end="url(#yf1)"/>
<text x="150" y="35" class="d-sub">next · send · throw · close</text>
<path d="M466 90 L374 90" class="d-arrow" marker-end="url(#yf2)"/>
<path d="M236 90 L144 90" class="d-arrow" marker-end="url(#yf2)"/>
<text x="185" y="130" class="d-sub">yielded values come back the same way</text>
</svg>
<figcaption>While <code>yield from</code> runs, the delegator forwards every request to the subgenerator and every yielded value back to the caller.</figcaption>
</figure>

The next lessons show that `send()`, `close()` and `throw()` travel through this channel too. First, let's watch the states on both ends.

## Watching delegator and subgenerator

```python run
from inspect import getgeneratorstate, getgeneratorlocals

def song():
    yield "I'm a lumberjack and I'm OK"
    yield 'I sleep all night and I work all day'

def play_song():
    count = 0
    s = song()
    yield from s
    yield 'song finished'
    print('player is exiting...')

player = play_song()
print(getgeneratorstate(player), getgeneratorlocals(player))
```

The delegator hasn't started, so it has no locals yet (not even `s`). Start it:

```python run
print(next(player))
print(getgeneratorstate(player), getgeneratorlocals(player))
s = getgeneratorlocals(player)['s']
print('subgen:', getgeneratorstate(s))
```

One `next()` on the delegator started *both* generators: `play_song` ran to its `yield from`, which immediately advanced `song` to its first `yield`. The value came straight back to us. Both are now suspended: the subgenerator at its `yield`, the delegator at its `yield from`.

```python run
print(next(player))
print('delegator:', getgeneratorstate(player), '| subgen:', getgeneratorstate(s))
```

Still both suspended. The next request is the interesting one: the subgenerator has nothing left to yield, so it **returns**. The `yield from` sees that, finishes, and the delegator **carries on with its own code**:

```python run
print(next(player))
print('delegator:', getgeneratorstate(player), '| subgen:', getgeneratorstate(s))
```

`yield from` absorbed the subgenerator's `StopIteration` (the caller never saw it), and the delegator ran on to its next `yield`. One more `next()` finishes the delegator itself, and this time the `StopIteration` does reach us:

```python run
try:
    next(player)
except StopIteration:
    print('StopIteration')
print('delegator:', getgeneratorstate(player), '| subgen:', getgeneratorstate(s))
```

## Delegating repeatedly

Since the delegator resumes normally after each `yield from`, it can delegate again and again, to the same generator function or to different ones:

```python run
def player():
    count = 1
    while True:
        print('Run count:', count)
        yield from song()
        count += 1

p = player()
print(next(p), '/', next(p))
print(next(p), '/', next(p))
print(next(p), '/', next(p))
```

Each pass through the loop creates a **new** `song()` subgenerator and delegates to it until it's exhausted, then the delegator's own code (`count += 1`) runs before the next delegation.

<div class="callout note">
<span class="callout-title">Why not just loop?</span>

`for v in subgen: yield v` only forwards `next()`. Values sent with `send()` would land in the delegator's `yield` and be thrown away, a `throw()` would hit the delegator instead of the subgenerator, and the subgenerator's return value would be lost. `yield from` forwards all of these correctly, which is why it was added ([PEP 380](https://peps.python.org/pep-0380/), Python 3.3) and why it became the basis for coroutine delegation.

</div>

<div class="takeaways">

## Key takeaways

- In `yield from subgen`, the generator doing the delegating is the **delegator**, `subgen` is the **subgenerator**, and whoever drives the delegator is the **caller**.
- `yield from` creates a two-way channel: the caller's requests go to the subgenerator, and its yielded values come back to the caller.
- The first `next()` on the delegator also primes the subgenerator.
- When the subgenerator finishes, `yield from` swallows its `StopIteration` and the delegator resumes with the code after it.
- Unlike a `for` loop that re-yields values, `yield from` also forwards `send()`, `throw()` and `close()`, and captures the subgenerator's return value.

</div>
