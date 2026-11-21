---
title: Combinatorics
summary: product, permutations, combinations and combinations_with_replacement generate every arrangement of their inputs lazily, which makes brute-force counting and probability easy.
minutes: 15
---

## Cartesian products replace nested loops

Here is a multiplication table written as a generator with two nested loops:

```python run
import itertools

def matrix(n):
    for i in range(1, n + 1):
        for j in range(1, n + 1):
            yield (i, j, i * j)

list(itertools.islice(matrix(10), 10, 14))
```

The nested loops visit every pair `(i, j)` with `i` from one set and `j` from another. In mathematics that set of all pairs is the **Cartesian product** of the two sets, written `S1 × S2`. You can picture it as a table with one set along the rows and the other along the columns:

```text
        y1        y2        y3
x1  (x1, y1)  (x1, y2)  (x1, y3)
x2  (x2, y1)  (x2, y2)  (x2, y3)
```

`itertools.product(*iterables)` generates exactly those tuples, lazily, in the same order as the nested loops (the rightmost input varies fastest):

```python run
l1 = ['x1', 'x2', 'x3']
l2 = ['y1', 'y2']
list(itertools.product(l1, l2))
```

So the table generator flattens to a single loop, or just a generator expression:

```python run
def matrix(n):
    return ((i, j, i * j) for i, j in itertools.product(range(1, n + 1), range(1, n + 1)))

list(matrix(3))
```

When the same iterable is repeated, pass `repeat=` instead of writing it twice:

```python run
print(len(list(itertools.product(range(1, 11), repeat=2))))
print(list(itertools.product('01', repeat=3)))    # every 3-bit pattern
```

`product` reads each input fully into a tuple before producing anything, because it has to revisit every value many times. That's why it's fine to give it iterators: they're only consumed once. (You could also pass `*itertools.tee(range(1, n + 1), 2)` to supply two copies of one iterator, but `repeat=2` says it more clearly.)

## Example: a grid of coordinates

`range` only steps in integers, but `count` and `takewhile` can make a float axis, and `product` turns axes into a grid in any number of dimensions:

```python run
def grid(min_val, max_val, step, *, num_dimensions=2):
    axis = itertools.takewhile(lambda x: x <= max_val, itertools.count(min_val, step))
    return itertools.product(axis, repeat=num_dimensions)

points = list(grid(-1, 1, 0.5))
print(len(points), points[:6])
print(len(list(grid(-1, 1, 0.5, num_dimensions=3))))
```

(5 values per axis, so 25 points in 2D and 125 in 3D.)

## Example: odds of rolling 8 with two dice

Brute-force probability is simple: list every equally likely outcome (the **sample space**), count the outcomes you want, divide.

```python run
from fractions import Fraction

sample_space = list(itertools.product(range(1, 7), repeat=2))
outcomes = [roll for roll in sample_space if sum(roll) == 8]

print(len(sample_space), outcomes)
print(Fraction(len(outcomes), len(sample_space)))
```

## Permutations

A **permutation** is an ordering. `permutations(iterable, r=None)` yields every ordering of `r` distinct *positions* from the input (all of them by default):

```python run
print(list(itertools.permutations('abc')))
print(list(itertools.permutations('abc', 2)))
```

"Distinct" refers to positions, not values. Repeated values produce repeated-looking permutations:

```python run
print(list(itertools.permutations('aba', 2)))
print(len(list(itertools.permutations('aaa'))))
```

That's correct from the function's point of view: the first `'a'` and the last `'a'` are different elements. If you need unique *value* arrangements, deduplicate with `set(...)`.

## Combinations

A **combination** is a selection where order doesn't matter: `(3, 4)` and `(4, 3)` are the same pick. `combinations(iterable, r)` yields each selection once, in the order of the input:

```python run
list(itertools.combinations([1, 2, 3, 4], 2))
```

`combinations_with_replacement` also allows an element to be picked more than once, like drawing from a bag and putting each item back:

```python run
list(itertools.combinations_with_replacement([1, 2, 3, 4], 2))
```

For the same input of `n` items, the four functions grow at very different rates:

```python run
n, r = 4, 2
items = range(n)
print('product        ', len(list(itertools.product(items, repeat=r))))
print('permutations   ', len(list(itertools.permutations(items, r))))
print('combinations   ', len(list(itertools.combinations(items, r))))
print('with repl.     ', len(list(itertools.combinations_with_replacement(items, r))))
```

<div class="callout modern">
<span class="callout-title">Python 3.8: math.comb and math.perm</span>

If you only need the *number* of arrangements, don't generate them. `math.comb(n, k)` and `math.perm(n, k)` compute the counts directly, even for numbers far too large to enumerate:

```python run
import math
print(math.comb(4, 2), math.perm(4, 2), math.comb(52, 4))
print(math.comb(52, 13))    # possible bridge hands
```

</div>

## Example: four aces

What are the odds that four cards drawn from a shuffled deck are all aces? Build a deck with `product`, generate every 4-card hand with `combinations`, and count. There are over 270,000 hands, so we go through the sample space **once**, counting both the total and the hits as we go (a generator has no `len`, and building it twice would double the work):

```python run
from collections import namedtuple

Card = namedtuple('Card', 'rank suit')
SUITS = 'SHDC'
RANKS = tuple(map(str, range(2, 11))) + tuple('JQKA')

deck = [Card(rank, suit) for suit, rank in itertools.product(SUITS, RANKS)]
print(len(deck), deck[:3])

total = acceptable = 0
for hand in itertools.combinations(deck, 4):
    total += 1
    if all(card.rank == 'A' for card in hand):
        acceptable += 1

print(f'total={total}, acceptable={acceptable}')
print(Fraction(acceptable, total), f'{acceptable / total:.10f}')
```

`all` with a generator expression replaces an inner `for` loop with a `break`/`else`, and it short-circuits at the first non-ace, so most hands are rejected after one comparison.

We can check the answer two ways: with `math.comb` (one good hand out of `C(52, 4)`), and by multiplying the chances of drawing an ace each time:

```python run
print(Fraction(1, math.comb(52, 4)))
print(Fraction(4, 52) * Fraction(3, 51) * Fraction(2, 50) * Fraction(1, 49))
```

<div class="takeaways">

## Key takeaways

- `product(*iterables, repeat=1)` is the Cartesian product: a flat replacement for nested loops.
- `permutations(it, r)` yields orderings of distinct **positions**; repeated values give repeated-looking results.
- `combinations(it, r)` ignores order; `combinations_with_replacement` also lets an item repeat.
- All four are lazy, but their output grows fast. Use `math.comb`/`math.perm` when you only need counts.

</div>
