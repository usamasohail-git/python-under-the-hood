---
title: Reversed Iteration
summary: reversed() works automatically for sequences with __len__ and __getitem__. Any other iterable must implement __reversed__ to support it.
minutes: 12
---

## The problem

Iterators only go forward. But sometimes you need the items of a collection **in reverse order**, which only makes sense for a finite collection. The built-in `reversed()` does this, but it can't work on just any iterable. Let's see why, with a lazy iterable that represents a 52-card deck.

## A lazy card deck

The deck is ordered by suit (Spades, Hearts, Diamonds, Clubs) and, within each suit, by rank from 2 up to Ace. Instead of storing 52 cards, the iterator computes card number `i` arithmetically, since each suit has 13 cards:

- `i // 13` tells you the suit: indexes 0–12 are suit 0, 13–25 are suit 1, and so on
- `i % 13` tells you the rank within the suit: index 13 is `13 % 13 = 0`, the first rank (a 2) of the second suit

```python run
from collections import namedtuple

_SUITS = ('Spades', 'Hearts', 'Diamonds', 'Clubs')
_RANKS = tuple(range(2, 11)) + tuple('JQKA')
Card = namedtuple('Card', 'rank suit')

class CardDeck:
    def __init__(self):
        self.length = len(_SUITS) * len(_RANKS)

    def __len__(self):
        return self.length

    def __iter__(self):
        return self.CardDeckIterator(self.length)

    class CardDeckIterator:
        def __init__(self, length):
            self.length = length
            self.i = 0

        def __iter__(self):
            return self

        def __next__(self):
            if self.i >= self.length:
                raise StopIteration
            suit = _SUITS[self.i // len(_RANKS)]
            rank = _RANKS[self.i % len(_RANKS)]
            self.i += 1
            return Card(rank, suit)

deck = CardDeck()
cards = list(deck)
print(len(cards))
print(cards[:3])
print(cards[12:14])
```

## Reversing the hard way

How do we get the last 7 cards, in reverse order? One option is to build a list of all 52 cards and slice it:

```python run
print(list(CardDeck())[:-8:-1])
```

That works, but it materializes the whole deck just to use 7 cards, which defeats the point of a lazy iterable. What about the built-in?

```python run
try:
    reversed(CardDeck())
except TypeError as ex:
    print('TypeError:', ex)
```

`reversed()` refuses, and for good reason: a general iterator can only move forward, so the only way to reverse it would be to consume it completely and store everything, which `reversed()` won't do silently on your behalf.

## Implementing `__reversed__`

`reversed(obj)` looks for an `__reversed__` method first. If our iterable provides one, it can return an iterator that walks the deck backwards. Since every card is computed from its index, the reversed iterator just counts from the end: index `length - 1 - i`.

```python run
class CardDeck:
    def __init__(self):
        self.length = len(_SUITS) * len(_RANKS)

    def __len__(self):
        return self.length

    def __iter__(self):
        return self.CardDeckIterator(self.length)

    def __reversed__(self):
        return self.CardDeckIterator(self.length, reverse=True)

    class CardDeckIterator:
        def __init__(self, length, *, reverse=False):
            self.length = length
            self.reverse = reverse
            self.i = 0

        def __iter__(self):
            return self

        def __next__(self):
            if self.i >= self.length:
                raise StopIteration
            index = self.length - 1 - self.i if self.reverse else self.i
            suit = _SUITS[index // len(_RANKS)]
            rank = _RANKS[index % len(_RANKS)]
            self.i += 1
            return Card(rank, suit)

deck = CardDeck()
print(next(iter(deck)))
rev = reversed(deck)
print([next(rev) for _ in range(7)])
```

Now we get the last 7 cards in reverse with only 7 cards ever created, and the deck is still lazy and re-iterable in both directions.

## Sequences reverse for free

If your class implements the **sequence protocol** (`__getitem__` *and* `__len__`), you don't need `__reversed__`: `reversed()` can index from `len(obj) - 1` down to `0` on its own.

```python run
class Squares:
    def __init__(self, length):
        self.squares = [i ** 2 for i in range(length)]

    def __len__(self):
        return len(self.squares)

    def __getitem__(self, s):
        return self.squares[s]

print(list(Squares(5)))
print(list(reversed(Squares(5))))
```

Both methods are required. Without `__len__`, `reversed()` can't know where to start:

```python run
class Squares:
    def __init__(self, length):
        self.squares = [i ** 2 for i in range(length)]

    def __getitem__(self, s):
        return self.squares[s]

print(list(Squares(5)))            # forward iteration still works
try:
    reversed(Squares(5))
except TypeError as ex:
    print('TypeError:', ex)
```

## `__reversed__` takes priority

If a sequence defines `__reversed__`, `reversed()` uses it instead of indexing. Here we deliberately return something different, the plain integers, to make it obvious which path ran:

```python run
class Squares:
    def __init__(self, length):
        self.length = length
        self.squares = [i ** 2 for i in range(length)]

    def __len__(self):
        return len(self.squares)

    def __getitem__(self, s):
        return self.squares[s]

    def __reversed__(self):
        print('__reversed__ called')
        return iter(range(self.length - 1, -1, -1))

print(list(Squares(5)))
print(list(reversed(Squares(5))))
```

In real code `__reversed__` should of course return the same items in reverse order, and it should return an **iterator**, because callers expect to be able to call `next()` on whatever `reversed()` gives them. (`reversed()` passes the result through unchecked, so returning a list wouldn't raise an error right away, but `next()` on it would.)

<div class="callout modern">
<span class="callout-title">Reversing dictionaries (Python 3.8+)</span>

Since dictionaries keep insertion order (guaranteed from Python 3.7), Python 3.8 made them reversible too: `reversed(d)`, `reversed(d.keys())`, `reversed(d.values())` and `reversed(d.items())` all work. Older Python versions raise `TypeError`. Sets remain unreversible, since they have no order.

</div>

```python run
d = {'a': 1, 'b': 2, 'c': 3}
print(list(reversed(d)), list(reversed(d.items())))
```

<div class="takeaways">

## Key takeaways

- `reversed(obj)` uses `obj.__reversed__()` if it exists; otherwise it needs the sequence protocol (`__len__` **and** `__getitem__`); otherwise it raises `TypeError`.
- Plain iterables and iterators aren't reversible, because they can only move forward.
- For a lazy iterable, implement `__reversed__` to return an iterator that walks backwards, without materializing the collection.
- `__reversed__` should return an iterator over the same items in reverse.
- Dictionaries and their views are reversible since Python 3.8.

</div>
