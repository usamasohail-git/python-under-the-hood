---
title: Sending Data To Generators
summary: yield is an expression, so a suspended generator can receive a value through send(), once it has been primed to its first yield.
minutes: 14
---

## yield is an expression

Until now, data flowed *out* of a generator. [PEP 342](https://peps.python.org/pep-0342/) (Python 2.5) added the other direction: when you resume a suspended generator, you can hand it a value, and that value appears **exactly at the point where it was paused**: at the `yield`.

That works because `yield` is not just a statement, it's an **expression**, and an expression has a value you can assign:

```python
received = yield
```

The value of the `yield` expression is whatever the caller sends when it resumes the generator. You send it with the generator's `send()` method:

```python run
def echo():
    while True:
        received = yield
        print('You said:', received)

e = echo()
next(e)           # run up to the first yield
e.send('python')
e.send('generators')
```

Walk through what happened, remembering that in an assignment the right-hand side is evaluated **first**:

1. `next(e)` started the body. It reached `received = yield` and began evaluating the right side: the `yield`. So the generator **suspended** before the assignment happened.
2. `e.send('python')` resumed it. The paused `yield` expression evaluated to `'python'`, the assignment completed, the message printed, and the loop came back around to `yield` and suspended again.
3. The second `send` did the same with `'generators'`.

<figure class="diagram">
<svg viewBox="0 0 600 170" role="img" aria-label="The caller calls send with a value; the value becomes the result of the paused yield expression inside the generator, which runs until the next yield and hands back the yielded value as send's return value">
<defs>
<marker id="sd1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
<marker id="sd2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<text x="20" y="22" class="d-sub">CALLER</text>
<text x="330" y="22" class="d-sub">GENERATOR (suspended at a yield)</text>
<rect x="20" y="40" width="200" height="46" rx="8" class="d-name"/><text x="35" y="68" class="d-text">r = g.send(value)</text>
<rect x="330" y="40" width="250" height="46" rx="8" class="d-obj-hl"/><text x="345" y="68" class="d-text">received = yield out</text>
<path d="M220 55 L326 55" class="d-arrow-hl" marker-end="url(#sd1)"/><text x="235" y="48" class="d-sub">value in</text>
<path d="M326 75 L224 75" class="d-arrow" marker-end="url(#sd2)"/><text x="235" y="98" class="d-sub">next yielded value out</text>
<text x="330" y="125" class="d-sub">1. paused yield evaluates to value</text>
<text x="330" y="145" class="d-sub">2. body runs to the next yield, which hands out its value</text>
</svg>
<figcaption><code>send()</code> resumes the generator with a value, and returns whatever the generator yields next.</figcaption>
</figure>

## next() is send(None)

What if you resume with `next()` instead? The paused `yield` still needs a value, so it gets `None`:

```python run
next(e)
e.send(None)
```

The two are equivalent: `next(g)` is the same as `g.send(None)`. That also means `send()` works on any generator, including the ones that ignore what `yield` evaluates to:

```python run
def squares(n):
    for i in range(n):
        yield i ** 2      # the value sent in is simply discarded

sq = squares(5)
print(next(sq))
print(sq.send(100))
print(sq.send('ignored'))
```

## Priming: the first resume must be next()

A freshly created generator isn't paused at any `yield`, so there's nowhere for a sent value to go. Python refuses:

```python run
e = echo()
try:
    e.send('hello')
except TypeError as ex:
    print('TypeError:', ex)
```

You must first **prime** the generator: advance it to its first `yield` with `next(e)` (or the equivalent `e.send(None)`). After that it's suspended and ready to receive:

```python run
from inspect import getgeneratorstate

e = echo()
print(getgeneratorstate(e))
next(e)                         # prime
print(getgeneratorstate(e))
e.send('hello')
```

Forgetting to prime is the most common coroutine bug, and two lessons from now we'll write a decorator that does it automatically.

## Receiving and yielding at the same time

`send()` also *returns* something: the value of the **next** `yield` the generator reaches. So one `yield` can receive data and hand data back:

```python run
def squares(n):
    for i in range(n):
        received = yield i ** 2
        print('received:', received)

sq = squares(5)
print('first:', next(sq))
yielded = sq.send('hello')
print('yielded:', yielded)
yielded = sq.send('world')
print('yielded:', yielded)
```

Read the order carefully: `send('hello')` completes the *paused* yield (so `received` becomes `'hello'`), then the loop moves on and yields `1`, which is what `send` returns. The value you get back belongs to the **next** step, not to the value you sent. This mixed form is powerful but easy to get wrong, so use it only when it genuinely makes things clearer. A good rule of thumb is to keep the two uses separate: `yield value` for producing data, `var = yield` for consuming it.

## When a coroutine finishes

If a `send()` resumes the generator and it then returns instead of reaching another `yield`, `send()` raises `StopIteration`, just like `next()`:

```python run
def echo(max_times):
    for _ in range(max_times):
        received = yield
        print('You said:', received)
    print("that's all, folks!")

e = echo(2)
next(e)
e.send('python')
try:
    e.send('rocks')
except StopIteration:
    print('StopIteration')
```

## A useful example: running averages

The mixed form shines when every input naturally produces an output. Here's a running average, first written as a closure for comparison:

```python run
def averager():
    total = 0
    count = 0
    def inner(value):
        nonlocal total, count
        total += value
        count += 1
        return total / count
    return inner

avg = averager()
[avg(v) for v in [1, 2, 3, 4]]
```

The same idea as a coroutine. The state lives in plain local variables, with no `nonlocal` needed, because the generator's frame persists between sends:

```python run
def running_averager():
    total = 0
    count = 0
    running_average = None
    while True:
        value = yield running_average
        total += value
        count += 1
        running_average = total / count

averager = running_averager()
next(averager)                  # prime: yields the initial None
[averager.send(v) for v in [1, 2, 3, 4]]
```

Each `send(v)` delivers a value and gets back the updated average in a single call. Notice the priming step yields `running_average`'s initial value, `None`, which we simply discard.

<div class="takeaways">

## Key takeaways

- `yield` is an expression. In `x = yield`, `x` receives the value the caller passes to `send()`.
- `g.send(value)` resumes a suspended generator, delivering `value` at the paused `yield`, and returns the next yielded value.
- `next(g)` is equivalent to `g.send(None)`.
- A new generator must be **primed** with `next()` before you can `send()` a non-`None` value; otherwise `TypeError`.
- `x = yield y` both yields `y` out and receives `x` in, but the value `send()` returns comes from the *next* `yield`. Prefer keeping producing and consuming separate unless the combination is natural.
- If the generator returns after a `send`, `send` raises `StopIteration`.

</div>
