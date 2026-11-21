---
title: Coroutines
summary: A coroutine is a routine that voluntarily pauses itself and hands control back, and a generator's yield is all you need to build one.
minutes: 14
---

## Cooperative, not preemptive

The *co* in **coroutine** stands for *cooperative*. A coroutine is a generalization of an ordinary function (a *subroutine*): instead of running from start to finish in one go, it can **pause itself**, hand control back to whoever is driving it, and later **resume** exactly where it left off, with all its local variables intact.

If you've used threads, the goal will sound familiar: several pieces of work make progress "at the same time". The difference is who decides when to switch:

- With threads, the **operating system** suspends one thread and resumes another whenever it likes, without asking. That is **preemptive** multitasking.
- With coroutines, each routine runs until it decides to **yield control**. Nothing interrupts it. That is **cooperative** multitasking.

Cooperative switching only happens at points you can see in the code, so you never have two routines modifying the same data halfway through each other's work. The price is that a routine which never yields hogs the whole program.

You already know the keyword that makes a function pause and resume: `yield`. In the previous section we used it to produce values for iteration. Here we'll use it for something different: to **give up control**.

## A quick tool: `deque` as a queue

Our example needs a **queue**: a first-in, first-out (FIFO) collection. Items join at one end and leave from the other, like a supermarket line. (A **stack** is the opposite, last-in first-out, like a pile of pancakes.)

A list makes a fine stack, but a poor queue: adding or removing at the *front* of a list shifts every other element. `collections.deque` (a "double-ended queue") is fast at both ends:

```python run
from collections import deque

dq = deque([1, 2, 3, 4, 5])
dq.append(100)        # add on the right
dq.appendleft(-10)    # add on the left
print(dq)
print(dq.pop(), dq.popleft())   # remove from the right, then the left
print(dq)
```

A deque can also be **capped** with `maxlen`. When it's full, adding on one side silently drops an item from the other side:

```python run
dq = deque([1, 2, 3, 4], maxlen=5)
dq.append(100)
print(dq)
dq.append(200)       # full: 1 falls off the left
print(dq)
print(len(dq), dq.maxlen)
```

How big is the difference compared to a list? A small timing (absolute numbers depend on your machine, the ratios are what matter):

```python run
from timeit import timeit

n = 10_000

def list_insert_front():
    lst = []
    for i in range(n):
        lst.insert(0, i)

def deque_insert_front():
    dq = deque()
    for i in range(n):
        dq.appendleft(i)

print(f'list.insert(0, x): {timeit(list_insert_front, number=10):.3f}s')
print(f'deque.appendleft:  {timeit(deque_insert_front, number=10):.3f}s')
```

Inserting at the front of a list gets slower as the list grows, because everything has to move over. The deque does the same job in constant time per item.

## Producer and consumer, the plain way

Now two functions share a queue: one **produces** items into it and one **consumes** them:

```python run
def produce_elements(dq):
    for i in range(1, 8):
        dq.appendleft(i)

def consume_elements(dq):
    while len(dq) > 0:
        item = dq.pop()
        print('processing item', item)

def coordinator():
    dq = deque()
    produce_elements(dq)
    consume_elements(dq)

coordinator()
```

This works, but the producer must finish *everything* before the consumer starts. Imagine the producer is reading a huge (or never-ending) stream of records. We'd rather process items in batches: fill the queue, process what's there, then resume filling, and so on. Each function needs to **pause in the middle** and let the other one run.

## Producer and consumer as coroutines

Put a `yield` at each point where a function should hand over control:

```python run
def produce_elements(dq, n):
    for i in range(1, n):
        dq.appendleft(i)
        if len(dq) == dq.maxlen:
            print('queue full - yielding control')
            yield

def consume_elements(dq):
    while True:
        while len(dq) > 0:
            print('processing', dq.pop())
        print('queue empty - yielding control')
        yield

def coordinator():
    dq = deque(maxlen=10)
    producer = produce_elements(dq, 26)
    consumer = consume_elements(dq)
    while True:
        try:
            print('producing...')
            next(producer)
        except StopIteration:
            break            # the producer has finished
        finally:
            print('consuming...')
            next(consumer)

coordinator()
```

Follow the flow:

1. `next(producer)` runs the producer until the queue is full (10 items). It yields, which **suspends** it and returns control to the coordinator.
2. `next(consumer)` runs the consumer, which empties the queue and yields.
3. Back to the producer, which continues *right after its `yield`*, still inside its `for` loop, with `i` remembered.
4. After item 25 the producer's loop ends and it returns, which raises `StopIteration`. The `finally` clause still runs, so the consumer gets one last turn to process items 21–25 before the loop breaks.

The consumer never finishes on its own; it simply stays suspended when the coordinator stops calling it. That's fine: an unused suspended generator is just an object that gets garbage-collected.

<div class="callout note">
<span class="callout-title">A different use of yield</span>

Look closely: neither generator yields a *value*. `yield` here is not about iteration at all, it's a way for a function to **suspend itself** and give control back. Likewise, the coordinator calls `next()` not to get the next item of a sequence, but to **resume** a paused routine. That shift in thinking, from *generator as iterator* to *generator as pausable routine*, is what the rest of this section builds on.

</div>

## Where this is heading

The coordinator above is a tiny **scheduler**: it decides which routine runs next, and each routine runs until it voluntarily yields. Over the next lessons we'll add the remaining pieces: sending data *into* a paused generator, closing it, throwing exceptions into it, and delegating to other generators with `yield from`. Together, these are the tools an event loop needs to juggle many tasks in a single thread.

<div class="callout modern">
<span class="callout-title">Generator-based vs native coroutines</span>

Everything in this section uses **generator-based coroutines**: ordinary `def` functions that use `yield`. Historically, `asyncio` was built on them: Python 3.4 used `@asyncio.coroutine` with `yield from`. Python 3.5 introduced **native coroutines** with `async def` and `await`, which are now the only way to write asyncio code: `@asyncio.coroutine` was deprecated in 3.8 and **removed in 3.11**.

Native coroutines are a separate type (you can't call `next()` on one or loop over it), but under the hood they use the same machinery: they have `send()`, `throw()` and `close()` methods, and `await` delegates much like `yield from` does. Learn the generator version and you understand what `async`/`await` is doing for you.

</div>

<div class="takeaways">

## Key takeaways

- A **coroutine** is a routine that can pause itself, hand control back, and later resume with its state intact. It's **cooperative**: it decides when to give up control, unlike preemptive threads.
- A generator is already a pausable function: `yield` suspends it, `next()` resumes it.
- In a coroutine, `yield` is about giving up control, not necessarily about producing values.
- `collections.deque` is an efficient queue: fast appends and pops at both ends, with an optional `maxlen` cap. Lists are slow at inserting at the front.
- Generator-based coroutines are the foundation of `async`/`await`; modern asyncio code uses native coroutines (`async def`), and `@asyncio.coroutine` was removed in Python 3.11.

</div>
