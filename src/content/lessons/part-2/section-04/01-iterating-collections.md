---
title: Iterating Collections
summary: Indexing only works for ordered, numbered collections. A more general way to iterate is to ask an object for its next item until it says there are no more.
minutes: 10
---

## The limits of indexing

Earlier you saw that a sequence can be iterated because it supports `__getitem__`: Python asks for `seq[0]`, `seq[1]`, `seq[2]`… until it gets an `IndexError`. That works well for lists, tuples and strings, but it bakes in two assumptions:

- the items are numbered with integers, starting at `0`
- the collection has a meaningful *order*, so "item 3" means something

Plenty of collections break those assumptions. A `set` has no positions at all, yet you can loop over it without any trouble:

```python run
s = {'x', 'y', 'b', 'c', 'a'}
for item in s:
    print(item)
```

The order you see is decided by the set's internal hash table, not by the order you typed the elements, and it can differ between runs. And since there's no notion of position, indexing is refused outright:

```python run
try:
    s[0]
except TypeError as ex:
    print('TypeError:', ex)
```

So `for` must be using something other than indexes here. If you think about what a loop really needs, it's not "give me item number *i*". It's just **"give me the next item"**, plus some way of saying **"there are no more"**. That works for ordered and unordered collections alike, and even for things that aren't stored anywhere, like values computed on the fly.

## Rolling our own "next"

Let's build that idea ourselves before looking at what Python provides. Here's a class with a `next_()` method (trailing underscore because `next` is already a built-in we'll meet in a moment). Each call returns the next square, and the object has to **remember where it is** between calls:

```python run
class Squares:
    def __init__(self):
        self.i = 0

    def next_(self):
        result = self.i ** 2
        self.i += 1
        return result

sq = Squares()
print(sq.next_(), sq.next_(), sq.next_())
```

Two things stand out already:

- The object carries **state** (`self.i`), so each call depends on the calls before it.
- There's no way to go back. To start over you have to create a brand-new `Squares()`.

There's also no end: this produces squares forever. To make a finite collection we need a way to signal "done".

## Signalling the end: `StopIteration`

Python has a built-in exception made for exactly this: `StopIteration`. Let's give `Squares` a length, and raise `StopIteration` once we've handed out that many items. We'll also add `__len__` so `len()` works:

```python run
class Squares:
    def __init__(self, length):
        self.length = length
        self.i = 0

    def next_(self):
        if self.i >= self.length:
            raise StopIteration
        result = self.i ** 2
        self.i += 1
        return result

    def __len__(self):
        return self.length

sq = Squares(3)
print(len(sq))
print(sq.next_(), sq.next_(), sq.next_())
try:
    sq.next_()
except StopIteration:
    print('StopIteration: no more items')
```

Raising an exception to end a loop may look odd if you come from other languages, but it's a clean design: *any* value, including `None`, can be a legitimate item, so there's no special value that could safely mean "finished". An exception is out-of-band.

Now we can write a loop that consumes the whole collection:

```python run
sq = Squares(5)
while True:
    try:
        print(sq.next_())
    except StopIteration:
        break        # reached the end, leave the loop
```

Run `sq.next_()` again after that loop and you'll get `StopIteration` immediately: the object is **used up**. We'll call that *exhausted*.

## Using the built-in `next()`

Just as `len(obj)` calls `obj.__len__()`, the built-in `next(obj)` calls `obj.__next__()`. So let's rename our method to the dunder name:

```python run
class Squares:
    def __init__(self, length):
        self.length = length
        self.i = 0

    def __next__(self):
        if self.i >= self.length:
            raise StopIteration
        result = self.i ** 2
        self.i += 1
        return result

    def __len__(self):
        return self.length

sq = Squares(5)
while True:
    try:
        print(next(sq))
    except StopIteration:
        break
```

Is that enough for a `for` loop?

```python run
try:
    for i in Squares(10):
        print(i)
except TypeError as ex:
    print('TypeError:', ex)
```

Not yet. Python doesn't recognize the object as something it can iterate. `__next__` is half of the story; the next lesson adds the missing half.

## A collection with no order at all

`Squares` could easily have been a sequence (square number *i* is just `i ** 2`). Here's something that truly has no positions: a bag of random numbers. Asking for "the third one" is meaningless, but asking for "the next one" is perfectly sensible:

```python run
import random

class RandomNumbers:
    def __init__(self, length, *, range_min=0, range_max=10):
        self.length = length
        self.range_min = range_min
        self.range_max = range_max
        self.num_requested = 0

    def __len__(self):
        return self.length

    def __next__(self):
        if self.num_requested >= self.length:
            raise StopIteration
        self.num_requested += 1
        return random.randint(self.range_min, self.range_max)

numbers = RandomNumbers(10)
print(len(numbers))
while True:
    try:
        print(next(numbers), end=' ')
    except StopIteration:
        break
```

The numbers are different every run, which is the point: none of them existed until we asked for it. This "next item on demand" model is what Python's iteration is built on. We still have two problems to fix: `for` loops don't work yet, and restarting means creating a whole new object.

<div class="takeaways">

## Key takeaways

- Iterating by index needs integer positions starting at 0, so it can't handle unordered collections like sets.
- A more general model: an object that returns its **next** item each time you ask, and remembers its position.
- Python signals "no more items" by raising **`StopIteration`**.
- The built-in `next(obj)` calls `obj.__next__()`, just like `len(obj)` calls `obj.__len__()`.
- `__next__` alone isn't enough for a `for` loop, and once the object has handed out every item it's **exhausted**.

</div>
