---
title: Random Samples
summary: random.sample picks k distinct elements without replacement, the right tool when an element must not be picked twice.
minutes: 7
---

## Without replacement

`random.choices` picks **with replacement**: every pick is made from the full population, so the same element can come up again. That's often not what you want. When you deal cards, draw raffle tickets or pick a test group of users, an element that has been chosen must be **out of the running** for the rest of the draw.

That is sampling **without replacement**, and it's what `random.sample(population, k)` does:

```python run
import random

random.seed(0)
print(random.choices('abc', k=10))   # with replacement: repeats, k can be > 3
print(random.sample('abc', k=3))     # without replacement: each element at most once
```

`sample` returns a new list and leaves the population untouched. Each *position* in the population can appear at most once in the result. (If the population itself contains duplicate values, those can both be picked, since they are different positions.)

## Sample size limits

Since nothing is put back, you can't draw more elements than there are:

```python run
l = range(20)
print(random.sample(l, k=10))
print(random.sample(l, k=20))   # the whole population, in random order

try:
    random.sample(l, k=50)
except ValueError as ex:
    print('ValueError:', ex)
```

A sample as large as the population is simply a shuffled copy. That's a handy alternative to `random.shuffle`, which only works in place on a mutable sequence:

```python run
t = (1, 2, 3, 4, 5)
try:
    random.shuffle(t)
except TypeError as ex:
    print('TypeError:', ex)
print(random.sample(t, k=len(t)))
```

And, like everything in `random`, samples are repeatable with a seed:

```python run
random.seed(0)
print(random.sample(l, k=5))
random.seed(0)
print(random.sample(l, k=5))
```

## Dealing cards

Let's build a deck of 52 cards and deal from it. Ranks are 2 to 10 plus J, Q, K, A, and suits are clubs, diamonds, hearts and spades:

```python run
suits = 'C', 'D', 'H', 'S'
ranks = tuple(range(2, 11)) + tuple('JQKA')
deck = [str(rank) + suit for suit in suits for rank in ranks]
print(len(deck), deck[:15])
```

A hand dealt with `sample` never contains the same card twice. Let's confirm it by counting with `Counter`, comparing against `choices`:

```python run
from collections import Counter

random.seed(1)
hand = random.sample(deck, k=20)
print('sample  max count:', max(Counter(hand).values()))

repeats = 0
for _ in range(1000):
    hand = random.choices(deck, k=20)
    if max(Counter(hand).values()) > 1:
        repeats += 1
print(f'choices produced a repeated card in {repeats} out of 1000 hands')
```

Twenty picks from 52 cards *with* replacement almost always contain at least one repeat (this is the "birthday problem" in disguise), which would be a very suspicious deal.

<div class="callout modern">
<span class="callout-title">Changes in recent versions</span>

- **3.9** added a `counts` argument for populations with repeated elements: `random.sample(['red', 'blue'], counts=[4, 2], k=5)` behaves like sampling from `['red'] * 4 + ['blue'] * 2`, without building that list.
- **3.11** removed support for sampling directly from a `set` (sets have no order, so seeded results weren't reproducible). Convert first, for example `random.sample(sorted(my_set), k=3)`.

```python run
try:
    random.sample({1, 2, 3, 4}, k=2)
except TypeError as ex:
    print('TypeError:', ex)
random.seed(0)
print(random.sample(['red', 'blue'], counts=[4, 2], k=5))
```

</div>

<div class="takeaways">

## Key takeaways

- `random.sample(population, k)` picks `k` elements **without replacement**: each position is used at most once.
- `k` can't exceed the population size; `k=len(population)` gives a shuffled copy.
- Use `sample` for deals, draws and test groups; use `choices` when repeats are allowed.
- Since 3.11 a `set` must be converted to a sequence before sampling; `counts=` (3.9+) handles repeated elements compactly.

</div>
