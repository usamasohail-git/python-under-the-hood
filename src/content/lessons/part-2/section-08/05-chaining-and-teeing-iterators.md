---
title: Chaining and Teeing Iterators
summary: chain glues several iterables into one stream (lazily, if you use chain.from_iterable), and tee splits one iterator into several independent ones.
minutes: 14
---

## Concatenating iterators

Sequences can be concatenated with `+`: `[1, 2] + [3, 4]`. Generators can't, because they have no `__add__`. Yet we often need to treat several iterables as one long stream, for example processing three log files as if they were one. Here are three generators:

```python run
def make_gens():
    return ((i ** 2 for i in range(4)),
            (i ** 2 for i in range(4, 8)),
            (i ** 2 for i in range(8, 12)))

l1, l2, l3 = make_gens()
for gen in (l1, l2, l3):
    for item in gen:
        print(item, end=' ')
```

A nested loop works, but it has to be repeated everywhere we need the combined stream. Wrapping it in a generator function gives us something reusable:

```python run
def chain_iterables(*iterables):
    for iterable in iterables:
        yield from iterable

print(list(chain_iterables(*make_gens())))
```

## itertools.chain

That generator is exactly what `itertools.chain` does (implemented in C):

```python run
from itertools import chain

l1, l2, l3 = make_gens()
print(list(chain(l1, l2, l3)))
print(list(chain('ab', [1, 2], range(3))))   # any mix of iterables
```

`chain` takes the iterables as **separate positional arguments**. If you pass a single list of generators, it chains just that one iterable, so you get the generators themselves back, not their values:

```python run
gens = list(make_gens())
for item in chain(gens):
    print(item)
```

The quick fix is unpacking, `chain(*gens)`:

```python run
print(list(chain(*make_gens())))
```

## Unpacking is not lazy

Unpacking with `*` has a cost that's easy to miss: Python must iterate the outer iterable **completely** to build the argument tuple, before `chain` even starts. That's harmless for a small tuple, but if the outer iterable is itself a lazy generator (say, one that opens a file per item), unpacking forces all of it up front. Watch the order of the prints:

```python run
def squares():
    print('producing 1st generator')
    yield (i ** 2 for i in range(4))
    print('producing 2nd generator')
    yield (i ** 2 for i in range(4, 8))
    print('producing 3rd generator')
    yield (i ** 2 for i in range(8, 12))

c = chain(*squares())
print('chain created')
```

All three were produced before `chain` existed. An infinite outer iterable would never finish unpacking at all.

## chain.from_iterable

The alternate constructor `chain.from_iterable(iterable_of_iterables)` takes **one** argument and iterates the outer level lazily too, pulling the next inner iterable only when the previous one is exhausted:

```python run
c = chain.from_iterable(squares())
print('chain created')
for item in c:
    print(item)
```

Now the "producing" messages are interleaved with the values. A hand-written equivalent is just as short as before, with the `*` moved:

```python
def chain_from_iterable(iterable):
    for item in iterable:
        yield from item
```

`chain.from_iterable` is also the idiomatic way to **flatten one level** of nesting:

```python run
matrix = [[1, 2, 3], [4, 5], [6]]
list(chain.from_iterable(matrix))
```

## "Copying" an iterator with tee

The opposite problem: you have **one** iterator and need to go through it more than once, maybe computing a running total in one pass and a maximum in another. Assigning it to a second name doesn't help; both names refer to the same iterator object, and draining one drains "both".

`itertools.tee(iterable, n=2)` returns a tuple of `n` independent iterators over the same data:

```python run
from itertools import tee

def squares(n):
    for i in range(n):
        yield i ** 2

iters = tee(squares(10), 3)
print(type(iters), len(iters))

iter1, iter2, iter3 = iters
print(next(iter1), next(iter1), next(iter1))
print(next(iter2), next(iter2))
print(next(iter3))
```

Each one advances on its own. Under the hood, `tee` pulls each value from the source once and keeps it in a shared buffer until **every** copy has seen it. Two consequences follow:

- If one copy races far ahead of the others, everything in between stays buffered in memory. When you know you'll consume one copy entirely before starting the next, `list(iterator)` is simpler and no worse.
- After calling `tee`, **stop using the original iterator**. Pulling from it directly takes values the copies will never see:

```python run
source = iter(range(6))
a, b = tee(source)
print(next(a))
print(next(source))        # bypasses the tee buffer...
print(list(a), list(b))    # ...so 1 is missing from both copies
```

Also note that `tee` always returns **iterators**, even if you give it a list. Each copy is single-use:

```python run
l = [1, 2, 3, 4]
lists = tee(l, 2)
print(lists[0])
print(list(lists[0]), list(lists[0]))
print(iter(lists[1]) is lists[1], '__next__' in dir(lists[1]))
```

<div class="callout tip">
<span class="callout-title">A classic tee recipe</span>

Pairing each item with the next one is done by teeing, advancing one copy, and zipping the two. Python 3.10 added this as `itertools.pairwise`, covered in the Zipping lesson.

```python run
def pairs(iterable):
    a, b = tee(iterable)
    next(b, None)
    return zip(a, b)

list(pairs('ABCD'))
```

</div>

<div class="takeaways">

## Key takeaways

- `chain(a, b, c)` yields everything from `a`, then `b`, then `c`: concatenation for any iterables.
- `chain(*outer)` must exhaust `outer` up front; `chain.from_iterable(outer)` stays lazy at both levels and is the standard way to flatten one level.
- `tee(it, n)` gives `n` independent iterators that share a buffer; don't touch the original afterwards, and beware of memory when copies drift apart.
- `tee` always returns one-shot iterators, whatever the input.

</div>
