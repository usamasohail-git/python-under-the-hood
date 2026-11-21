---
title: Random Seeds
summary: Random numbers from the random module come from a deterministic algorithm. Fixing its seed makes every "random" result repeatable.
minutes: 9
---

## Random numbers that aren't really random

The `random` module gives you random integers, floats, shuffles, picks from sequences and samples from many distributions. Behind all of it sits a single **pseudo-random number generator** (CPython uses an algorithm called the Mersenne Twister).

"Pseudo" is the important word. The numbers come out of a completely deterministic algorithm. They *look* unpredictable and are spread evenly over their range, which is all most programs need, but each number is computed from the generator's internal state. That state starts from a **seed**:

- same seed, same sequence of numbers, every time
- different seed, a different sequence

If you never choose a seed, Python picks one for you when the module is imported, from an operating system source of randomness (or the current time if none is available). That's why each run of a program normally produces different numbers.

## The problem: bugs you can't reproduce

Different numbers on every run sounds like exactly what you want, until something breaks. Suppose a simulation crashes on the 40,000th random step only for some inputs. You run it again to investigate, and this time it works fine, because the random numbers are different. Intermittent, non-repeatable failures are among the hardest bugs to track down.

Run this cell a few times and watch the values change:

```python run
import random

for _ in range(5):
    print(random.randint(10, 20), random.random())
```

`randint(a, b)` returns an integer from `a` to `b` **inclusive**, and `random()` returns a float in the half-open range `[0.0, 1.0)`.

## Setting the seed

Call `random.seed(...)` to put the generator into a known starting state:

```python run
random.seed(0)
for _ in range(5):
    print(random.randint(10, 20), random.random())
```

Run that cell again: you'll see exactly the same ten numbers. Now run the loop *without* re-seeding:

```python run
for _ in range(5):
    print(random.randint(10, 20), random.random())
```

Different numbers again. Seeding doesn't freeze the generator. It sets a starting point, and every call moves the generator forward. These five lines are simply the *next* values after the first five. To replay a sequence, you have to reset the seed before replaying it:

```python run
random.seed(0)
first = [random.randint(10, 20) for _ in range(10)]

random.seed(0)
second = [random.randint(10, 20) for _ in range(10)]

print(first)
print(second)
print(first == second)
```

In a script, the usual pattern is a single `random.seed(some_number)` near the top while you debug. Every run then sees the same sequence, so a failure happens at the same place every time. Remove it (or make it configurable) when you want real variety again.

## Everything in the module uses the same generator

The seed doesn't only affect `randint`. Shuffling, Gaussian numbers and every other function in `random` draw from the same generator, so they all become repeatable:

```python run
def generate_random_stuff(seed=None):
    random.seed(seed)
    results = []

    for _ in range(5):
        results.append(random.randint(0, 5))

    characters = ['a', 'b', 'c']
    random.shuffle(characters)      # shuffles the list in place
    results.append(characters)

    for _ in range(3):
        results.append(round(random.gauss(0, 1), 4))

    return results

print(generate_random_stuff())      # seed=None: a fresh, unpredictable seed
print(generate_random_stuff())
print(generate_random_stuff(0))
print(generate_random_stuff(0))
print(generate_random_stuff(100))
print(generate_random_stuff(100))
```

The first two lines differ from each other. Seeds `0` and `100` each give their own result, but repeating a seed repeats the result exactly, including the shuffled order. Passing `None` to `seed()` re-seeds from the operating system, which is why it works as a "no seed" default.

<div class="callout modern">
<span class="callout-title">What counts as a seed (3.11+)</span>

Since Python 3.11, `random.seed()` only accepts `None`, `int`, `float`, `str`, `bytes` and `bytearray`. Older versions also accepted any hashable object (a tuple, for example) and hashed it, which wasn't reproducible across runs for every type. Now other types raise `TypeError`:

```python run
try:
    random.seed((1, 2))
except TypeError as ex:
    print('TypeError:', ex)
random.seed('any string works')
print(random.randint(1, 100))
```

</div>

## Are the numbers evenly spread?

A good generator for `randint` should produce each value about equally often. Let's count. Here's a hand-written frequency count using a dictionary comprehension:

```python run
def freq_analysis(lst):
    return {k: lst.count(k) for k in sorted(set(lst))}

random.seed(0)
lst = [random.randint(0, 10) for _ in range(100)]
print(freq_analysis(lst))
```

With only 100 numbers the counts are bumpy: some values show up far more often than others. That's normal. A uniform distribution only *evens out* over many draws. The standard library already has a tool for counting, `collections.Counter`, so let's use it on a larger sample:

```python run
from collections import Counter

random.seed(0)
counts = Counter(random.randint(0, 10) for _ in range(200_000))
total = sum(counts.values())
for value in sorted(counts):
    print(f'{value:2}: {counts[value]:6}  {100 * counts[value] / total:.2f}%')
```

Each of the 11 possible values now lands close to 1/11, about 9.09%. (`lst.count(k)` scans the whole list once per key, while `Counter` makes a single pass, so prefer `Counter` for real work.)

<div class="callout note">
<span class="callout-title">Don't use random for secrets</span>

Because the sequence is fully determined by the seed and state, an attacker who sees enough outputs can predict the next ones. For passwords, tokens or anything security-related, use the `secrets` module (for example `secrets.token_hex()`), which uses the operating system's cryptographic randomness and can't be seeded.

</div>

<div class="takeaways">

## Key takeaways

- The `random` module is a deterministic pseudo-random generator: the seed fixes the whole sequence.
- Without an explicit seed you get a different sequence each run. `random.seed(n)` makes runs repeatable, which is invaluable for debugging.
- Seeding sets a starting point, it doesn't freeze the generator. Re-seed to replay a sequence.
- All functions in `random` (`randint`, `shuffle`, `gauss`, `choice`, ...) share the same seeded generator.
- Use `collections.Counter` to check frequencies, and `secrets` (not `random`) for anything security-sensitive.

</div>
