---
title: Pipelines - Pushing Data
summary: Chaining coroutines builds a push pipeline, where the producer sends each item into the first stage and every stage sends its results on to the next.
minutes: 12
---

## Turning the pipeline around

In a pull pipeline the consumer drives: it asks for data and each stage pulls from the one before. A **push** pipeline is the mirror image. The **producer** drives: it `send()`s each item into the first stage, and each stage does its work and `send()`s the result to the next stage, its **target**. The stages are coroutines, and the last one (the **sink**) consumes the data: it prints it, writes it to a file, stores it in a database.

Push pipelines fit naturally whenever data *arrives* rather than being *requested*: events, messages from a socket, readings from a sensor.

Since every stage is a coroutine that must be primed, we'll use our priming decorator:

```python run
import math
from functools import wraps

def coroutine(gen_fn):
    @wraps(gen_fn)
    def inner(*args, **kwargs):
        gen = gen_fn(*args, **kwargs)
        next(gen)
        return gen
    return inner
```

## A sink and a transform

The sink is the end of the line. Here it just prints:

```python run
@coroutine
def handle_data():
    while True:
        received = yield
        print(received)
```

A transform stage receives a value, computes something, and sends the result to its target. The target is passed in as an argument:

```python run
@coroutine
def power_up(n, target):
    while True:
        received = yield
        target.send(math.pow(received, n))

print_data = handle_data()
squarer = power_up(2, print_data)     # pipeline: squarer → print_data

for i in range(1, 6):
    squarer.send(i)
```

Notice the construction order: the pipeline is built **back to front**. A stage needs its target when it's created, so the sink comes first and the head of the pipeline last.

## Longer pipelines

Add a second transform in front of the first:

```python run
print_data = handle_data()
cuber = power_up(3, print_data)
squarer = power_up(2, cuber)          # pipeline: squarer → cuber → print_data

for i in range(1, 6):
    squarer.send(i)
```

Each value is squared, then cubed, so we get the sixth powers. A filter stage forwards only some values:

```python run
@coroutine
def filter_even(target):
    while True:
        received = yield
        if received % 2 == 0:
            target.send(received)

print_data = handle_data()
evens = filter_even(print_data)
cuber = power_up(3, evens)
squarer = power_up(2, cuber)          # squarer → cuber → evens → print_data

for i in range(1, 6):
    squarer.send(i)
```

Only the even results, `2**6` and `4**6`, reach the sink.

<figure class="diagram">
<svg viewBox="0 0 640 130" role="img" aria-label="Push pipeline: a for loop sends values to squarer, which sends to cuber, which sends to filter_even, which sends to print_data">
<defs>
<marker id="pu1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="40" width="90" height="50" rx="8" class="d-name"/><text x="55" y="62" text-anchor="middle" class="d-text">for i …</text><text x="55" y="80" text-anchor="middle" class="d-sub">producer</text>
<rect x="140" y="40" width="100" height="50" rx="8" class="d-obj"/><text x="190" y="62" text-anchor="middle" class="d-text">squarer</text><text x="190" y="80" text-anchor="middle" class="d-sub">x ** 2</text>
<rect x="280" y="40" width="100" height="50" rx="8" class="d-obj"/><text x="330" y="62" text-anchor="middle" class="d-text">cuber</text><text x="330" y="80" text-anchor="middle" class="d-sub">x ** 3</text>
<rect x="420" y="40" width="100" height="50" rx="8" class="d-obj"/><text x="470" y="62" text-anchor="middle" class="d-text">evens</text><text x="470" y="80" text-anchor="middle" class="d-sub">filter</text>
<rect x="560" y="40" width="70" height="50" rx="8" class="d-obj-hl"/><text x="595" y="62" text-anchor="middle" class="d-text">print</text><text x="595" y="80" text-anchor="middle" class="d-sub">sink</text>
<path d="M100 65 L136 65" class="d-arrow-hl" marker-end="url(#pu1)"/>
<path d="M240 65 L276 65" class="d-arrow-hl" marker-end="url(#pu1)"/>
<path d="M380 65 L416 65" class="d-arrow-hl" marker-end="url(#pu1)"/>
<path d="M520 65 L556 65" class="d-arrow-hl" marker-end="url(#pu1)"/>
<text x="150" y="120" class="d-sub">each stage calls target.send(result) →</text>
</svg>
<figcaption>In a push pipeline the producer drives: every <code>send()</code> runs the item through all the stages before <code>send()</code> returns.</figcaption>
</figure>

When the producer calls `squarer.send(i)`, that one call runs the whole chain: `squarer` calls `cuber.send(...)`, which calls `evens.send(...)`, which may call `print_data.send(...)`. Only when every stage has gone back to its `yield` does the producer's `send()` return. As with pull pipelines, only one item is in flight at a time.

## Shutting a push pipeline down

In a pull pipeline, closing the last stage (or simply dropping it) lets the whole chain wind down. In a push pipeline, the producer holds the **head**, so that's the stage it can close, but the downstream stages are separate objects that don't hear about it. That matters as soon as a sink holds a resource, like an open file that needs flushing.

One robust pattern: every stage closes its target when it is itself closed:

```python run
@coroutine
def power_up(n, target):
    try:
        while True:
            received = yield
            target.send(math.pow(received, n))
    finally:
        target.close()           # pass the shutdown downstream

@coroutine
def collect(results):
    try:
        while True:
            results.append((yield))
    finally:
        print('sink closing, collected', len(results), 'items')

results = []
head = power_up(2, power_up(0.5, collect(results)))
for i in range(1, 6):
    head.send(i)
head.close()
print(results)
```

Closing the head raised `GeneratorExit` in it; its `finally` closed the next stage, whose `finally` closed the sink. (Note `results.append((yield))`: a `yield` used as a function argument needs its own parentheses.) The next lesson uses the same idea, in a different form, to make sure output files are complete.

<div class="callout note">
<span class="callout-title">Pull or push?</span>

Both styles process data lazily, one item at a time. Pull pipelines (generators) are simpler and are the default in everyday Python: `for` loops, generator expressions, `itertools`. Push pipelines (coroutines) shine when the producer isn't under your control (data arrives on its own schedule) or when one input must fan out to several consumers, which is exactly what the next lesson does.

</div>

<div class="takeaways">

## Key takeaways

- In a push pipeline the producer drives, `send()`ing each item into the first coroutine; every stage sends its output to its **target**.
- Stages are primed coroutines (use a priming decorator), and the pipeline is built back to front, sink first.
- One `send()` at the head runs the item through every stage before it returns.
- Transforms, filters and sinks are each small, reusable coroutines that know only their target.
- To shut a push pipeline down cleanly, close the head and have each stage close its target in a `finally`.

</div>
