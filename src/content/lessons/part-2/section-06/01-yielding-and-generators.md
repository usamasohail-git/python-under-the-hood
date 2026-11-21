---
title: Yielding and Generators
summary: A function that contains yield returns a generator, an iterator that runs the function body lazily, pausing at each yield and resuming on the next call to next().
minutes: 15
---

## The hand-written way

Let's start with a small iterator built the way you already know: a class with `__iter__` and `__next__`. It produces the factorials `0!, 1!, 2!, …` up to (but not including) `n!`.

```python run
import math

class FactIter:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        result = math.factorial(self.i)
        self.i += 1
        return result

for num in FactIter(5):
    print(num)
```

It works, but look at how much of the code is bookkeeping. The interesting part is a single line, `math.factorial(self.i)`. Everything else exists only to remember **where we are** between calls: the counter `self.i` has to be stored on the instance, because `__next__` starts from scratch every time it's called.

There's a second way you've seen: the two-argument form `iter(callable, sentinel)`. It calls a zero-argument function over and over and stops as soon as the function returns the sentinel value. A closure can hold the counter:

```python run
def fact():
    i = 0
    def inner():
        nonlocal i
        result = math.factorial(i)
        i += 1
        return result
    return inner

# stop when we reach 5! (so we get 0! ... 4!)
for num in iter(fact(), math.factorial(5)):
    print(num)
```

Less code, but harder to read: you need to know the sentinel in advance, and the state is hidden inside a closure. What we'd really like is to write a plain loop and somehow **pause** it after each value.

## `yield`: pause instead of return

That's exactly what `yield` does. When a function body reaches `yield value`, it hands `value` back to the caller just like `return` would, but instead of throwing away the function's state, Python **suspends** the function: the local variables and the current position in the code are kept. Later, the function can be **resumed** right after that `yield`.

The surprise is that you don't resume it by calling the function again. Watch:

```python run
def my_func():
    print('line 1')
    yield 'Flying'
    print('line 2')
    yield 'Circus'

my_func()
```

Calling `my_func()` didn't print anything. Because its body contains `yield`, `my_func` is a **generator function**: calling it doesn't run the body at all. It just creates and returns a **generator object**, which is ready to run the body when asked.

You ask with `next()`:

```python run
gen = my_func()
print(next(gen))
```

The body ran up to the first `yield`, printing `line 1` along the way, and `next` returned the yielded value `'Flying'`. The function is now frozen at that `yield`. Call `next` again and it picks up from there:

```python run
print(next(gen))
```

And once more, with nothing left to run:

```python run
try:
    next(gen)
except StopIteration:
    print('StopIteration')
```

`next()`, values one at a time, and `StopIteration` at the end: that's the **iterator protocol**. A generator *is* an iterator.

<figure class="diagram">
<svg viewBox="0 0 600 170" role="img" aria-label="Generator states: created, suspended at a yield, running between yields, and finished, which raises StopIteration">
<defs>
<marker id="yg1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="yg2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="60" width="120" height="50" rx="8" class="d-name"/><text x="24" y="80" class="d-sub">gen = f()</text><text x="24" y="100" class="d-text">created</text>
<rect x="190" y="60" width="120" height="50" rx="8" class="d-obj"/><text x="204" y="80" class="d-sub">body executes</text><text x="204" y="100" class="d-text">running</text>
<rect x="370" y="60" width="120" height="50" rx="8" class="d-obj-hl"/><text x="384" y="80" class="d-sub">paused at yield</text><text x="384" y="100" class="d-text">suspended</text>
<rect x="190" y="130" width="120" height="34" rx="8" class="d-obj"/><text x="204" y="152" class="d-text">finished</text>
<path d="M130 85 L186 85" class="d-arrow" marker-end="url(#yg1)"/><text x="138" y="76" class="d-sub">next()</text>
<path d="M310 78 L366 78" class="d-arrow-hl" marker-end="url(#yg2)"/><text x="316" y="70" class="d-sub">yield v</text>
<path d="M370 98 C340 120, 330 120, 312 100" class="d-arrow" marker-end="url(#yg1)"/><text x="330" y="132" class="d-sub">next()</text>
<path d="M250 110 L250 126" class="d-arrow" marker-end="url(#yg1)"/>
<text x="320" y="152" class="d-sub">body ends or returns → StopIteration</text>
<text x="10" y="30" class="d-sub">Each next() runs the body from where it paused until the next yield.</text>
</svg>
<figcaption>A generator moves between <em>running</em> and <em>suspended</em> each time you call <code>next()</code>. When the body finishes, the generator raises <code>StopIteration</code>.</figcaption>
</figure>

## Generators implement the iterator protocol

If a generator is an iterator, it should have both `__iter__` and `__next__`, and `iter()` should hand back the very same object:

```python run
gen = my_func()
print('__iter__' in dir(gen), '__next__' in dir(gen))
print(iter(gen) is gen)
```

So everything that accepts an iterator accepts a generator: `for` loops, `list()`, `sum()`, `zip()`, unpacking, and so on. Python built the iterator for you from the function body.

## How a generator ends: `return`

The generator above stopped because its body ran out of code. Remember that a function that falls off its end implicitly returns `None`. In a generator, **returning** (explicitly or implicitly) is what ends the iteration: Python raises `StopIteration` for you. If you return a value, it's attached to the exception:

```python run
def squares(sentinel):
    i = 0
    while True:
        if i < sentinel:
            yield i ** 2
            i += 1          # runs when the generator is resumed
        else:
            return 'all done!'

sq = squares(3)
print(next(sq), next(sq), next(sq))
try:
    next(sq)
except StopIteration as ex:
    print('StopIteration value:', repr(ex.value))
```

Notice the `i += 1` placed *after* the `yield`. That line doesn't run when the value is produced; it runs the next time someone calls `next(sq)`, as the very first thing the resumed body does. Thinking "the function freezes on the `yield` line" makes code like this easy to read.

A `for` loop silently swallows the `StopIteration`, and with it the return value. You'll mostly see return values used with `yield from` (the last lesson of this section) and with generator-based coroutines later on.

```python run
for num in squares(5):
    print(num)
```

## The factorial iterator, rewritten

Now compare the generator version of our factorial iterator with the class we started with:

```python run
def factorials(n):
    for i in range(n):
        yield math.factorial(i)

for num in factorials(5):
    print(num)
```

Three lines, and the state (`i`, `n`) is just ordinary local variables. The generator keeps them alive between calls, so there's nothing to store on `self` and no `StopIteration` to raise by hand.

<div class="callout note">
<span class="callout-title">Iterator ⊃ generator</span>

Every generator is an iterator, but not every iterator is a generator. `FactIter` instances are iterators that aren't generators, just as every sequence is iterable but not every iterable is a sequence.

</div>

## Generators get exhausted

Because a generator is an iterator, it can be consumed only **once**. After that it stays finished:

```python run
facts = factorials(5)
print(list(facts))
print(list(facts))     # nothing left
try:
    next(facts)
except StopIteration:
    print('still exhausted')
```

To iterate again you call the generator function again to get a **new** generator. In two lessons you'll see how to package that up in an iterable class so users don't have to think about it.

You can inspect where a generator is in its life with `inspect.getgeneratorstate`:

```python run
import inspect

g = factorials(2)
print(inspect.getgeneratorstate(g))
next(g)
print(inspect.getgeneratorstate(g))
list(g)
print(inspect.getgeneratorstate(g))
```

<div class="callout modern">
<span class="callout-title">Don't raise StopIteration inside a generator</span>

Since Python 3.7 (PEP 479), if a `StopIteration` escapes from *inside* a generator's body, for example from a bare `next()` on some other exhausted iterator, Python converts it into a `RuntimeError`. Older code sometimes used `raise StopIteration` to end a generator early; today you simply `return`.

```python run
def bad():
    yield 1
    raise StopIteration    # wrong way to stop

try:
    list(bad())
except RuntimeError as ex:
    print('RuntimeError:', ex)
```

The change exists because a stray `StopIteration` used to end the loop *silently*, hiding real bugs.

</div>

<div class="takeaways">

## Key takeaways

- A function whose body contains `yield` is a **generator function**. Calling it runs nothing; it returns a **generator object**.
- `next(gen)` runs the body until the next `yield`, returns the yielded value and suspends the function with all its local state.
- Generators **are iterators**: they implement `__iter__` (returning themselves) and `__next__`.
- When the body finishes or hits `return`, the generator raises `StopIteration`; a returned value ends up in `StopIteration.value`.
- Like any iterator, a generator is exhausted after one pass. Call the generator function again for a fresh one.
- End a generator with `return`, never `raise StopIteration` (that becomes a `RuntimeError` since 3.7).

</div>
