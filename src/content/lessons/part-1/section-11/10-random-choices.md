---
title: Random Choices
summary: Pick one random element with choice, or many at once (with replacement and optional weights) with choices.
minutes: 10
---

## Picking one element

How do you pick a random element from a list? A first attempt might be to generate a random **index** and look it up:

```python run
import random

random.seed(0)
l = [10, 20, 30, 40, 50, 60]

print([l[random.randrange(len(l))] for _ in range(8)])
```

`randrange(n)` returns an integer from `0` up to, but **not including**, `n`, exactly the valid indexes of a list of length `n`. It works, but it spells out a mechanism instead of an intent. `random.choice` says what you mean directly, and works on any sequence:

```python run
random.seed(0)
print([random.choice(l) for _ in range(8)])
```

Same seed, same picks: `choice` uses the generator in the same way the index version did. It also works on strings, tuples and ranges, anything that supports `len()` and indexing.

```python run
print(random.choice('python'), random.choice(range(1000)), random.choice((True, False)))
```

## Picking many: `choices`

To pick several elements you could loop over `choice`, but `random.choices(population, k=...)` does it in one call and returns a list:

```python run
list_1 = list(range(1000))
random.choices(list_1, k=5)
```

### With replacement

`choices` selects **with replacement**: after an element is picked it goes "back into the bag" and can be picked again, even in the same call. With a small population you see duplicates quickly:

```python run
random.seed(0)
list_2 = ['a', 'b', 'c']
for _ in range(5):
    print(random.choices(list_2, k=2))
```

Because elements are put back, `k` can even be **larger** than the population:

```python run
random.choices(list_2, k=10)
```

(If you need picks *without* repetition, that's `random.sample`, covered next.)

## Weighted picks

By default every element is equally likely. The `weights` argument gives each element a relative weight; it must have one entry per element of the population:

```python run
for _ in range(5):
    print(random.choices(list_2, k=8, weights=[10, 1, 1]))
```

With weights `10, 1, 1`, `'a'` has 10 chances out of 12 on every pick, so it dominates. The weights are relative, so `[10, 1, 1]` and `[100, 10, 10]` mean the same thing.

To check that the result really matches the weights, let's count. We'll store each count and its percentage in a small named tuple:

```python run
from collections import namedtuple

Freq = namedtuple('Freq', 'count freq')

def freq_counts(list_):
    total = len(list_)
    return {k: Freq(list_.count(k), 100 * list_.count(k) / total)
            for k in sorted(set(list_))}

random.seed(0)
freq_counts(random.choices(list_2, k=1_000, weights=(8, 1, 1)))
```

`'a'` has weight 8 out of a total of 10, so we expect about 80% `'a'` and 10% each for the others, and that's roughly what we get. The more picks you make, the closer the result gets to the theoretical value:

```python run
freq_counts(random.choices(list_2, k=100_000, weights=(8, 1, 1)))
```

### Cumulative weights

You can also pass `cum_weights`, a running total of the weights. Weights `8, 1, 1` become cumulative weights `8, 9, 10`. Internally `choices` converts plain weights to cumulative ones anyway, so passing them directly saves a little work when you pick from the same distribution many times. With the same seed, the result is identical:

```python run
random.seed(0)
freq_counts(random.choices(list_2, k=1_000, cum_weights=(8, 9, 10)))
```

You can't pass both `weights` and `cum_weights` at the same time:

```python run
try:
    random.choices(list_2, weights=[1, 1, 1], cum_weights=[1, 2, 3])
except TypeError as ex:
    print('TypeError:', ex)
```

## A shortcut for lists of random numbers

Need 20 random integers from 0 to 100 inclusive? Instead of a loop with `randint`, choose from a `range`:

```python run
print(random.choices(range(101), k=20))
```

A `range` is a sequence, so `choices` can index into it without building a list of 101 numbers first.

## Using weights to build realistic test data

Weighted picks are handy whenever you want test data that *looks like reality*. A classic question: is it faster to check for a zero before dividing (**LBYL**, "look before you leap") or to just divide and catch the exception (**EAFP**, "easier to ask forgiveness than permission")? The answer depends on how often zeros actually occur, so let's generate data with a chosen zero rate:

```python run
from time import perf_counter

def lbyl(denominators):
    for d in denominators:
        if d == 0:
            continue
        10 / d

def eafp(denominators):
    for d in denominators:
        try:
            10 / d
        except ZeroDivisionError:
            continue

def compare(zero_weight, other_weight, n=200_000):
    data = random.choices([0, 1], k=n, weights=[zero_weight, other_weight])
    for fn in (lbyl, eafp):
        start = perf_counter()
        fn(data)
        elapsed = perf_counter() - start
        print(f'{fn.__name__}: {elapsed / n * 1e9:6.1f} ns per item')

print('half zeros:')
compare(1, 1)
print('10% zeros:')
compare(1, 9)
print('1% zeros:')
compare(1, 99)
```

Raising and catching an exception is relatively expensive, so when half the values are zero, EAFP is clearly slower. As zeros become rarer, the `try` block raises less and less often, and the gap shrinks dramatically. Since CPython 3.11, *entering* a `try` block costs essentially nothing ("zero-cost" exceptions); you only pay when an exception is actually raised, while the `if` test in LBYL runs on every item. With rare enough failures the two approaches end up close, and natively EAFP often comes out slightly ahead. Exact numbers vary from run to run and machine to machine (the browser makes them noisier still), so focus on the trend: **how often the exceptional case happens** decides which style is faster, and that's exactly what weighted test data lets you explore.

<div class="callout tip">
<span class="callout-title">Try it</span>

Change the weights to `compare(1, 99)` (1% zeros) and `compare(9, 1)` (90% zeros). Where does the balance tip?

</div>

<div class="takeaways">

## Key takeaways

- `random.choice(seq)` picks one element from any sequence. Prefer it over indexing with `randrange(len(seq))`.
- `random.choices(population, k=n)` picks `n` elements **with replacement**, so duplicates are possible and `k` may exceed the population size.
- `weights` (relative) or `cum_weights` (running totals) skew the picks. Use one or the other, not both.
- Weighted random data is a simple way to test code under realistic conditions.

</div>
