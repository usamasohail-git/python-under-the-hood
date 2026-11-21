---
title: Example - Card Deck
summary: Rebuilding a lazy card deck with generators, first with index arithmetic, then with plain nested loops, and finally as an iterable class that also supports reversed().
minutes: 11
---

## The setup

A standard deck has 4 suits and 13 ranks. We'll represent a card as a named tuple, and the suits and ranks as tuples in the order we want the deck sorted (all spades from 2 to ace, then hearts, then diamonds, then clubs):

```python run
from collections import namedtuple

Card = namedtuple('Card', 'rank suit')
SUITS = ('Spades', 'Hearts', 'Diamonds', 'Clubs')
RANKS = tuple(range(2, 11)) + tuple('JQKA')

print(len(SUITS) * len(RANKS), 'cards')
print(RANKS)
```

The goal is a lazy deck: cards are created one at a time as you iterate, never stored in a list of 52.

## Version 1: index arithmetic

When you write a deck as a sequence, card number `i` (0 to 51) is computed with integer division and remainder: every 13 cards the suit changes, and the rank cycles within each suit.

```text
suit_index = i // len(RANKS)
rank_index = i %  len(RANKS)
```

That translates directly into a generator:

```python run
def card_gen():
    for i in range(len(SUITS) * len(RANKS)):
        suit = SUITS[i // len(RANKS)]
        rank = RANKS[i % len(RANKS)]
        yield Card(rank, suit)

cards = list(card_gen())
print(len(cards))
print(cards[:3])
print(cards[12:15])     # last spade, first hearts
```

That's the approach you need when you must support random access by index (`deck[37]`). But for plain iteration we're doing unnecessary arithmetic.

## Version 2: just loop

A generator can contain *any* control flow, including nested loops. Iterating suits on the outside and ranks on the inside produces exactly the same order with no index math at all:

```python run
def card_gen():
    for suit in SUITS:
        for rank in RANKS:
            yield Card(rank, suit)

print(list(card_gen()) == cards)
for card in card_gen():
    if card.rank == 'A':
        print(card)
```

This is where generators really shine: with a hand-written `__next__`, a nested loop is awkward, because you'd have to track *two* counters on `self` and handle the "roll over to the next suit" logic yourself. With `yield`, the loops keep their own state.

<div class="callout tip">
<span class="callout-title">`itertools.product`</span>

Nested loops over independent sequences are a Cartesian product, so `itertools.product(SUITS, RANKS)` produces the same pairs in the same order: `(Card(rank, suit) for suit, rank in product(SUITS, RANKS))`. You'll meet the `itertools` module in detail in a later section.

</div>

## Version 3: an iterable deck

A bare generator is exhausted after one pass. As in the previous lesson, wrap it in a class whose `__iter__` returns a fresh generator:

```python run
class CardDeck:
    SUITS = ('Spades', 'Hearts', 'Diamonds', 'Clubs')
    RANKS = tuple(range(2, 11)) + tuple('JQKA')

    def __iter__(self):
        return CardDeck.card_gen()

    @staticmethod
    def card_gen():
        for suit in CardDeck.SUITS:
            for rank in CardDeck.RANKS:
                yield Card(rank, suit)

deck = CardDeck()
print(len(list(deck)), len(list(deck)))   # iterable twice
print(next(iter(deck)))
```

## Supporting `reversed()`

What happens if we ask for the deck in reverse?

```python run
try:
    reversed(CardDeck())
except TypeError as ex:
    print('TypeError:', ex)
```

`reversed()` works in one of two ways. If the object has a `__reversed__` method, it calls it and expects an iterator back. Otherwise it falls back to the **sequence protocol**, `__len__` plus `__getitem__` with integer indices, and walks the indices backwards. Our deck has neither.

We could add `__len__` and `__getitem__`, but that would bring back the index arithmetic. It's simpler to implement `__reversed__` with a second generator that loops over the suits and ranks backwards:

```python run
class CardDeck:
    SUITS = ('Spades', 'Hearts', 'Diamonds', 'Clubs')
    RANKS = tuple(range(2, 11)) + tuple('JQKA')

    def __iter__(self):
        return CardDeck.card_gen()

    def __reversed__(self):
        return CardDeck.reversed_card_gen()

    @staticmethod
    def card_gen():
        for suit in CardDeck.SUITS:
            for rank in CardDeck.RANKS:
                yield Card(rank, suit)

    @staticmethod
    def reversed_card_gen():
        for suit in reversed(CardDeck.SUITS):
            for rank in reversed(CardDeck.RANKS):
                yield Card(rank, suit)

rev = list(reversed(CardDeck()))
print(rev[:3])
print(rev[-1])
print(rev == list(CardDeck())[::-1])
```

`reversed()` on a tuple works out of the box (tuples are sequences), so the reversed generator is just the forward one with both loops flipped. The last line confirms we get exactly the forward deck in reverse order, without ever building the forward list.

Just as with `__iter__`, you could also write `__reversed__` itself as a generator method by putting the loops and `yield` directly in it.

<div class="takeaways">

## Key takeaways

- Generators can contain any control flow; nested loops with a `yield` inside replace awkward multi-counter `__next__` logic.
- Index arithmetic (`i // 13`, `i % 13`) is needed for random access, not for sequential iteration.
- Wrap the generator in a class with `__iter__` to get a re-iterable deck.
- `reversed(obj)` uses `obj.__reversed__()` if it exists, otherwise `__len__` + `__getitem__`. Without either you get a `TypeError`.
- Implementing `__reversed__` with a generator that iterates backwards keeps everything lazy.

</div>
