---
title: Yield From - Throwing Exceptions
summary: Exceptions thrown into a delegator are forwarded to the subgenerator, and anything the subgenerator doesn't handle propagates back up through the delegator.
minutes: 14
---

## throw() is forwarded too

The last piece of the `yield from` channel: `throw()`. An exception thrown into the delegator is raised **inside the subgenerator**, at its paused `yield`. First, a coroutine used directly:

```python run
class CloseCoroutine(Exception):
    pass

def echo():
    try:
        while True:
            received = yield
            print(received)
    except CloseCoroutine:
        return 'coro was closed'
    except GeneratorExit:
        print('close() was called')

e = echo()
next(e)
try:
    e.throw(CloseCoroutine)
except StopIteration as ex:
    print('StopIteration:', ex.value)

e = echo()
next(e)
e.close()
```

`throw()` gives us the generator's return value on a `StopIteration`; `close()` keeps things quiet. Now put a delegator in front of it:

```python run
def delegator():
    result = yield from echo()
    yield 'subgen closed and returned:', result
    print('delegator closing...')

d = delegator()
next(d)
d.send('hello')
d.throw(CloseCoroutine)
```

The exception went straight through the delegator into `echo`, which handled it by returning. `yield from` received the return value, and the delegator continued to its next `yield`, whose value is what `throw()` returned to us. Throwing a custom exception is thus a way to tell a subgenerator "finish now and report your result".

## When the subgenerator handles it and keeps going

What if the subgenerator handles the exception and yields instead of returning? Then, as with a direct `throw()`, that yielded value is returned to the caller:

```python run
class IgnoreMe(Exception):
    pass

def echo():
    try:
        while True:
            try:
                received = yield
                print(received)
            except IgnoreMe:
                yield "I'm ignoring you..."
    except CloseCoroutine:
        return 'coro was closed'
    except GeneratorExit:
        print('close() was called')

d = delegator()
next(d)
d.send('python')
print(repr(d.throw(IgnoreMe)))
print(repr(d.send('rocks!')))
d.close()
```

There's a subtle bug: `'rocks!'` was never printed. The subgenerator was paused at the *second* `yield` (the one in the `except` block), so the sent value landed there and was discarded, and the loop simply moved on to the first `yield`. Two different `yield` points in one coroutine make it easy to lose data. The fix is to keep a **single** `yield` and change what it yields:

```python run
def echo():
    try:
        output = None
        while True:
            try:
                received = yield output
                print(received)
            except IgnoreMe:
                output = "I'm ignoring you..."
            else:
                output = None
    except CloseCoroutine:
        return 'coro was closed'
    except GeneratorExit:
        print('close() was called')

d = delegator()
next(d)
d.send('hello')
print(repr(d.throw(IgnoreMe)))
print(repr(d.send('python')))
d.close()
```

Now every `send()` lands at the same place, and the coroutine reports whether it ignored something through what it yields.

## Unhandled exceptions travel back up

If the subgenerator doesn't handle the exception, it propagates out of the subgenerator, then out of the `yield from` **inside the delegator**, and then to the caller (unless the delegator catches it):

```python run
def echo():
    while True:
        received = yield
        print(received)

def delegator():
    yield from echo()

d = delegator()
next(d)
try:
    d.throw(ValueError('boom'))
except ValueError as ex:
    print('caller got ValueError:', ex)
```

Because it surfaces at the `yield from` line, the delegator gets a chance to catch it, just like an exception from an ordinary function call:

```python run
def delegator():
    try:
        yield from echo()
    except ValueError:
        print('delegator handled the ValueError')
    yield 'delegator still running'

d = delegator()
next(d)
d.throw(ValueError)
```

So an exception thrown in travels **down** the chain to the innermost generator, and if nobody down there handles it, it travels back **up** the chain, giving each delegator a chance to handle it, until it reaches the caller.

<div class="callout note">
<span class="callout-title">GeneratorExit is special</span>

`throw()`ing `GeneratorExit` (or calling `close()`) on a delegator doesn't throw it into the subgenerator. Instead, `yield from` calls the subgenerator's `close()` method and then raises `GeneratorExit` in the delegator. That's why closing a delegator always closes the whole chain, as we saw in the previous lesson.

</div>

## Example: a running average that can save itself

Here's a coroutine that keeps a running average and, when it receives a custom `WriteAverage` exception, appends the current count and average to a CSV file. It opens the file with `with`, so closing the coroutine closes the file:

```python run
class WriteAverage(Exception):
    pass

def averager(out_file):
    total = 0
    count = 0
    average = None
    with open(out_file, 'w') as f:
        f.write('count,average\n')
        while True:
            try:
                received = yield average
                total += received
                count += 1
                average = total / count
            except WriteAverage:
                if average is not None:
                    print('saving average to file:', average)
                    f.write(f'{count},{average}\n')

avg = averager('sample.csv')
next(avg)
print(avg.send(1), avg.send(2))
print(avg.throw(WriteAverage))      # saves, then yields the current average
print(avg.send(3), avg.send(2))
print(avg.throw(WriteAverage))
avg.close()

print(open('sample.csv').read())
```

Exceptions here are commands, not errors: "save now". The same works through a delegator, which might, for instance, be the one responsible for choosing the file name:

```python run
def delegator():
    yield from averager('sample.csv')

d = delegator()
next(d)
for v in [1, 2, 3, 4]:
    d.send(v)
d.throw(WriteAverage)
d.send(5)
d.throw(WriteAverage)
d.close()

print(open('sample.csv').read())
```

<div class="takeaways">

## Key takeaways

- `throw()` on a delegator raises the exception inside the active subgenerator, at its paused `yield`.
- If the subgenerator returns while handling it, `yield from` gets the return value and the delegator continues; if it yields, that value goes back to the caller.
- Keep one `yield` per coroutine loop. Yielding from an `except` block creates a second resume point where sent data can get lost.
- An unhandled exception propagates up out of the `yield from`, where the delegator can catch it, and otherwise reaches the caller.
- `GeneratorExit` is handled specially: `yield from` closes the subgenerator and then raises it in the delegator.

</div>
