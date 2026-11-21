---
title: Challenge - Randomizing using Sorted
summary: A puzzle about key functions. Can you use sorted to shuffle an iterable instead of ordering it?
minutes: 7
---

## The challenge

You've seen that `sorted(iterable, key=fn)` orders items by whatever `fn` returns for them. Here's a puzzle: **use `sorted` to put the items of an iterable into a random order**, in a single line of code.

One hint: the `random` module has a function, also called `random`, that returns a random float in the interval [0, 1) (0 is possible, 1 is not).

```python run
import random

help(random.random)
```

```python run
print(random.random())
print(random.random())
print(random.random())
```

Each call gives a different number. Try to solve the challenge yourself before reading on.

```python run
l = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# your one-liner here
```

## A solution

`sorted` calls the key function once for every element, and doesn't care what the key function does with its argument. So let's ignore the element completely and return a random number instead:

```python run
sorted(l, key=lambda x: random.random())
```

Every element gets a random sort key, and sorting by random keys produces a random arrangement. Run the cell a few times: you get a different order each time. The lambda still has to *accept* a parameter, because `sorted` will pass each element to it, even though the body never uses it.

It works for any iterable, not only lists. A string is an iterable of characters:

```python run
sorted('abcdefg', key=lambda x: random.random())
```

`sorted` always returns a list. To get a shuffled *string* back, join the characters:

```python run
''.join(sorted('abcdefg', key=lambda x: random.random()))
```

## Why it works (and why it's fair)

It's worth checking that each key is computed **once per element** and then reused for all comparisons. If the sort compared fresh random numbers each time it looked at an item, it could get confused. Let's count how many times the key function is called:

```python run
calls = 0

def counting_key(x):
    global calls
    calls += 1
    return random.random()

sorted(range(1000), key=counting_key)
print('elements: 1000, key calls:', calls)
```

Exactly one call per element: `sorted` computes all the keys up front (this is sometimes called the *decorate-sort-undecorate* pattern) and then sorts by them. Since the 1000 keys are independent random numbers, every ordering of the elements is equally likely.

Because each run uses random keys, results can't be reproduced... unless you **seed** the random number generator. Seeding with the same value makes the sequence of "random" numbers repeat, which is useful in tests:

```python run
random.seed(42)
first = sorted(l, key=lambda x: random.random())

random.seed(42)
second = sorted(l, key=lambda x: random.random())

print(first == second)
```

## The standard tools for the job

The `sorted` trick is a nice illustration of how key functions work, but the `random` module already has tools for this, and they are faster (they don't need to sort, which takes O(n log n) time):

```python run
l = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

shuffled = random.sample(l, k=len(l))   # new shuffled list; l is unchanged
print(shuffled, l)

random.shuffle(l)                       # shuffles the list in place, returns None
print(l)
```

- `random.shuffle(lst)` shuffles a **mutable sequence in place** and returns `None`.
- `random.sample(population, k)` returns a **new list** of `k` distinct elements; with `k=len(population)` that's a shuffled copy. It works with any sequence, including strings and tuples.

<div class="callout note">
<span class="callout-title">Not for secrets</span>

The `random` module is designed for simulations and games, not security. For passwords, tokens and anything an attacker might try to predict, use the `secrets` module instead.

</div>

<div class="takeaways">

## Key takeaways

- A key function may ignore its argument. Returning `random.random()` gives each element a random key, so `sorted` produces a random order.
- `sorted` calls the key function exactly once per element, then sorts by the stored keys.
- `''.join(...)` turns the list that `sorted` returns back into a string.
- In real code, use `random.shuffle` (in place) or `random.sample` (new list); use `random.seed` to make results reproducible.

</div>
