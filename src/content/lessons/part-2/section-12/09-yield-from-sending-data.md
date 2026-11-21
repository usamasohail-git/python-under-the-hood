---
title: Yield From - Sending Data
summary: Values sent to a delegator are forwarded through yield from to the subgenerator, which also lets generators delegate recursively, as in flattening nested data.
minutes: 13
---

## send() goes through yield from

The channel that `yield from` sets up carries `send()` as well as `next()`. Start with a coroutine that prints each string it receives, reversed:

```python run
def echo():
    while True:
        received = yield
        print(received[::-1])

e = echo()
next(e)
e.send('stressed')
e.send('tons')
e.close()
```

Now wrap it in a delegator:

```python run
from inspect import getgeneratorstate, getgeneratorlocals

def delegator():
    e = echo()
    yield from e

d = delegator()
next(d)                          # primes the delegator AND the subgenerator
e = getgeneratorlocals(d)['e']
print(getgeneratorstate(d), getgeneratorstate(e))
d.send('stressed')
d.send('drawer')
```

We only primed the delegator, but `yield from` primed the subgenerator for us when it started delegating. Every value sent to `d` was passed on to `e`'s `yield`. The delegator never sees those values at all.

The same goes for values coming back: if the subgenerator yields results, `send()` on the delegator returns them:

```python run
def echo():
    output = None
    while True:
        received = yield output
        output = received[::-1]

def delegator():
    yield from echo()

d = delegator()
next(d)
print(d.send('stressed'))
print(d.send('live'))
```

From the caller's side, the delegator behaves exactly like the subgenerator it's wrapping. That's the point: a delegator can add setup and teardown around a coroutine (choosing which subgenerator to use, logging, restarting it), and the caller doesn't need to know.

## Chains of delegation

A generator can be a delegator and a subgenerator at the same time, so delegation can be chained as deep as you like. Data sent in at the top is pushed all the way down:

```python run
def coro():
    while True:
        received = yield
        print('coro received:', received)

def gen1():
    yield from gen2()

def gen2():
    yield from gen3()

def gen3():
    yield from coro()

g = gen1()
next(g)
g.send('hello')
g.send('world')
```

The path is `caller → gen1 → gen2 → gen3 → coro`, a tiny pipeline. We'll build real pipelines at the end of the section.

## Recursive delegation: flattening nested lists

A chain of delegation doesn't have to be written by hand. A generator can delegate to *itself*, recursively. A classic use is flattening arbitrarily nested lists:

```python run
data = [1, 2, [3, 4, [5, 6]], [7, [8, 9, 10]]]
```

A traditional recursive function has to carry an output list around:

```python run
def flatten(curr_item, output):
    if isinstance(curr_item, list):
        for item in curr_item:
            flatten(item, output)
    else:
        output.append(curr_item)

output = []
flatten(data, output)
output
```

The generator version is shorter and lazier:

```python run
def flatten_gen(curr_item):
    if isinstance(curr_item, list):
        for item in curr_item:
            yield from flatten_gen(item)
    else:
        yield curr_item

print(list(flatten_gen(data)))
for x in flatten_gen(data):
    if x > 3:
        print('first item above 3:', x)
        break
```

Each nested list gets its own generator, and `yield from` relays every leaf value up the chain of active generators to the caller. Nothing is collected in memory unless you ask for a list, and you can stop early.

## Flattening any iterable

To flatten tuples, sets and other iterables too, test for "iterable" rather than "list". The simplest test is to try calling `iter()`:

```python run
def is_iterable(item):
    try:
        iter(item)
    except TypeError:
        return False
    return True

def flatten_gen(curr_item):
    if is_iterable(curr_item):
        for item in curr_item:
            yield from flatten_gen(item)
    else:
        yield curr_item

list(flatten_gen([1, 2, (3, 4, {5, 6}), (7, 8, [9, 10])]))
```

But strings are a trap. A string is iterable, and so is each of its characters, which is a one-character string, which is iterable…:

```python run
try:
    list(flatten_gen(['abc', [1, 2]]))
except RecursionError as ex:
    print('RecursionError:', ex)
```

`'a'` iterates to `'a'`, forever. We need to treat strings specially: either as atoms that shouldn't be split at all, or as iterables whose single characters are atoms. A keyword-only flag lets the caller choose:

```python run
def is_iterable(item, *, str_is_iterable=True):
    if isinstance(item, str):
        return str_is_iterable and len(item) > 1
    try:
        iter(item)
    except TypeError:
        return False
    return True

def flatten_gen(curr_item, *, str_is_iterable=True):
    if is_iterable(curr_item, str_is_iterable=str_is_iterable):
        for item in curr_item:
            yield from flatten_gen(item, str_is_iterable=str_is_iterable)
    else:
        yield curr_item

data = ['abc', [1, 2, (3, 4)], 'x']
print(list(flatten_gen(data)))
print(list(flatten_gen(data, str_is_iterable=False)))
```

<div class="callout note">
<span class="callout-title">Recursion depth</span>

Each nesting level adds one active generator to the chain, and Python's recursion limit (usually 1000) applies. For data nested thousands of levels deep, use an explicit stack instead of recursion. For realistic nesting, the recursive generator is the clearest solution.

</div>

<div class="takeaways">

## Key takeaways

- `send()` on a delegator is forwarded by `yield from` to the subgenerator, and the subgenerator's yielded value becomes `send()`'s return value.
- Priming the delegator also primes the subgenerator it delegates to.
- Delegation chains can be arbitrarily long: a generator can be a delegator and a subgenerator at once.
- Recursive `yield from` is a neat way to flatten nested structures lazily. Watch out for strings, whose characters are themselves iterable strings.

</div>
