---
title: Closure Applications - Part 1
summary: A class with a single method can often be replaced by a closure. We build a running averager and an elapsed-time timer both ways.
minutes: 10
---

## State plus one behavior

Many small classes exist only to hold a bit of state and offer **one** method that uses it. A closure gives you exactly that: the free variables are the state, and the inner function is the behavior. Let's see the two approaches side by side.

## A running average

We want something we can feed numbers to, one at a time, that returns the average of everything seen so far.

A first class-based version stores every number and recomputes the average each time:

```python run
class Averager:
    def __init__(self):
        self.numbers = []

    def add(self, number):
        self.numbers.append(number)
        return sum(self.numbers) / len(self.numbers)

a = Averager()
print(a.add(10), a.add(20), a.add(30))
```

The same thing as a closure. The list is the free variable:

```python run
def averager():
    numbers = []

    def add(number):
        numbers.append(number)          # mutating, not re-binding: no nonlocal needed
        return sum(numbers) / len(numbers)

    return add

a = averager()
print(a(10), a(20), a(30))
print(a.__code__.co_freevars)
```

Note that we didn't need `nonlocal`: `numbers.append(...)` mutates the list the cell points to, it never re-binds the name `numbers`.

### Keeping only a running total

Storing every number is wasteful when all we need is the total and the count. Here's a leaner class:

```python run
class Averager:
    def __init__(self):
        self._count = 0
        self._total = 0

    def add(self, value):
        self._total += value
        self._count += 1
        return self._total / self._count

a = Averager()
print(a.add(10), a.add(20), a.add(30))
```

And the closure version. This time `total += value` **re-binds** the names (integers are immutable), so they must be declared `nonlocal`:

```python run
def averager():
    total = 0
    count = 0

    def add(value):
        nonlocal total, count
        total += value
        count += 1
        return total / count

    return add

a = averager()
print(a(10), a(20), a(30))
```

Forget the `nonlocal` line and you'd get an `UnboundLocalError`: `total += value` would make `total` local to `add`, and then try to read it before it has a value.

Each call to `averager()` produces an independent closure with its own cells, just as each `Averager()` produces an independent instance:

```python run
a, b = averager(), averager()
print(a(10), a(20))
print(b(1000))
print(a(30))
```

## An elapsed-time timer

Here's another class with essentially one job: tell me how long it's been since I was created. Implementing `__call__` lets us call the instance like a function:

```python run
from time import perf_counter

class Timer:
    def __init__(self):
        self._start = perf_counter()

    def __call__(self):
        return perf_counter() - self._start

t1 = Timer()
sum(range(500_000))          # do a little work so some time passes
print(f'{t1():.6f}s')
```

As a closure, `start` is captured in a cell. We only **read** it, so no `nonlocal` is needed:

```python run
def timer():
    start = perf_counter()

    def elapsed():
        return perf_counter() - start

    return elapsed

t2 = timer()
sum(range(500_000))
t3 = timer()
sum(range(500_000))
print(f't1: {t1():.6f}s')
print(f't2: {t2():.6f}s')
print(f't3: {t3():.6f}s')
```

`t1` (the class instance) and `t2`, `t3` (closures) are used in exactly the same way: call them, get the elapsed time. Each has its own starting point, so `t1 > t2 > t3`.

## Which should you choose?

Both are perfectly valid. Some things to weigh:

- **Closures** are compact and keep their state truly private: there's no `a._total` for anyone to poke at. They're a natural fit for "configure once, call many times" helpers, and they're the foundation of decorators (coming up soon).
- **Classes** scale better. Once you need a second method (`reset()`, `report()`), a readable `repr`, or subclassing, a class is usually clearer.

A useful rule of thumb: if your class has `__init__` plus one method and nothing else, consider whether a closure (or even a plain function) says the same thing more simply.

<div class="takeaways">

## Key takeaways

- A closure bundles state (its free variables) with behavior (the inner function), much like an object with one method.
- Mutating a captured object needs no declaration; re-binding a captured name (e.g. `total += value`) needs `nonlocal`.
- Every call to the outer function produces an independent closure with its own state.
- Classes with `__call__` and closures can be used interchangeably by callers; pick whichever is clearer.

</div>
