---
title: Infinite Iterators
summary: count, cycle and repeat produce endless streams that you combine with tools like islice, zip and takewhile to take only what you need.
minutes: 13
---

## Endless, but lazy

`itertools` has three functions that never run out on their own: `count`, `cycle` and `repeat`. An infinite iterator is perfectly safe as long as you never ask for *all* of it. Calling `list()` on one would run until memory runs out, so we always pair them with something that stops: `islice`, `zip` with a finite partner, `takewhile`, or a `break`.

```python run
from itertools import count, cycle, repeat, islice
```

## count

`count(start=0, step=1)` is like a `range` without a `stop`:

```python run
print(list(islice(count(10), 5)))
print(list(islice(count(10, step=2), 5)))
print(list(islice(count(10, -3), 5)))
```

Unlike `range`, which only accepts integers, `count` works with any numbers that support `+`: floats, complex numbers, `Decimal`, `Fraction`.

```python run
from decimal import Decimal
from fractions import Fraction

print(list(islice(count(10.5, 0.5), 5)))
print(list(islice(count(1+1j, 1+2j), 4)))
print(list(islice(count(Decimal('0.0'), Decimal('0.1')), 4)))
print(list(islice(count(Fraction(0), Fraction(1, 3)), 4)))
```

With floats, be aware that the value is built by repeated addition, so binary rounding errors accumulate:

```python run
print(list(islice(count(0, 0.1), 10))[-3:])
print([round(0.1 * i, 10) for i in range(7, 10)])   # multiply instead if precision matters
```

The most common use of `count` is as an unbounded index or ID source. `enumerate` is really just `zip(count(), iterable)`:

```python run
names = ['ann', 'bob', 'cat']
print(list(zip(count(1), names)))
print(list(enumerate(names, 1)))
```

## cycle

`cycle(iterable)` goes through the iterable, then starts over from the beginning, forever:

```python run
colors = cycle(('red', 'green', 'blue'))
list(islice(colors, 8))
```

It even works when the argument is an **iterator** that is exhausted after one pass. That's possible because `cycle` saves a copy of each item the first time through, then replays the saved copy:

```python run
def colors():
    yield 'red'
    yield 'green'
    yield 'blue'

cols = colors()
print(list(cols), list(cols))      # a plain generator is single-use

print(list(islice(cycle(colors()), 7)))   # but cycle replays it
```

The flip side of that copy: cycling over a huge stream keeps the whole first pass in memory.

### Dealing cards with cycle

Say we want to deal a 52-card deck into 4 hands, one card at a time, round-robin. With an index and the `%` operator:

```python run
from collections import namedtuple

Card = namedtuple('Card', 'rank suit')

def card_deck():
    ranks = tuple(str(num) for num in range(2, 11)) + tuple('JQKA')
    suits = ('Spades', 'Hearts', 'Diamonds', 'Clubs')
    for suit in suits:
        for rank in ranks:
            yield Card(rank, suit)

hands = [[] for _ in range(4)]
index = 0
for card in card_deck():
    hands[index % 4].append(card)
    index += 1

print([len(hand) for hand in hands])
print(hands[0][:4])
```

The index exists only to go round and round. `cycle` expresses that directly, and we don't even need indices: we can cycle over the **hands themselves** and append to whichever comes up next.

```python run
hands = [[] for _ in range(4)]
hands_cycle = cycle(hands)
for card in card_deck():
    next(hands_cycle).append(card)

print([len(hand) for hand in hands])
print(hands[0][:4])
```

This works because `cycle` stores references to the four list objects; appending through `next(hands_cycle)` mutates the very lists in `hands`. The same idea in one line uses `zip`, which stops when the (finite) deck runs out:

```python run
hands = [[] for _ in range(4)]
for hand, card in zip(cycle(hands), card_deck()):
    hand.append(card)
print(hands[3][:4])
```

## repeat

`repeat(obj)` yields the same object forever, and `repeat(obj, times)` yields it a fixed number of times:

```python run
g = repeat('Python')
print([next(g) for _ in range(3)])
print(list(repeat('Python', 4)))
```

On its own that looks pointless, but `repeat` is the standard way to feed a constant argument into `map` or `zip` alongside a varying one:

```python run
print(list(map(pow, range(6), repeat(2))))          # squares
print(list(zip(['a', 'b', 'c'], repeat(0))))
```

### It really is the same object

`repeat` doesn't copy anything. Every item it yields is a reference to the one object you gave it, which matters when that object is mutable:

```python run
l = [1, 2, 3]
result = list(repeat(l, 3))
print(l is result[0], l is result[1], l is result[2])

result[0][0] = 100
print(result)
```

All three "lists" changed, because there is only one list. If you need independent copies, copy each item as you go:

```python run
l = [1, 2, 3]
result = [item[:] for item in repeat(l, 3)]   # or list(item), copy.deepcopy(item)
result[0][0] = 100
print(result, l)
```

This is the same trap as `[[0] * 3] * 3`, which you may have met with list multiplication.

<div class="takeaways">

## Key takeaways

- `count`, `cycle` and `repeat` are infinite (except `repeat` with a `times` argument); always pair them with something that stops.
- `count` accepts any addable numbers, including floats and `Decimal`, but float steps accumulate rounding error.
- `cycle` replays a saved copy of the first pass, so it works on one-shot iterators but holds that data in memory.
- `repeat` yields the **same object** every time; copy mutable objects if you need independent ones.
- `repeat` is ideal for supplying a constant argument to `map` or `zip`.

</div>
