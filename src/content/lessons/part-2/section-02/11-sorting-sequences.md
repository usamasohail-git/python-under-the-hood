---
title: Sorting Sequences
summary: sorted() returns a new list from any iterable, list.sort() sorts in place. Both take key and reverse arguments and are guaranteed to be stable.
minutes: 15
---

## Two ways to sort

Just like concatenation, sorting comes in two flavors:

- the built-in function `sorted(iterable)` returns a **new list** and leaves its input alone;
- the method `list.sort()` sorts a list **in place** and returns `None`.

Both use the same algorithm and accept the same two keyword-only options, `key` and `reverse`.

## `sorted()` works on any iterable

`sorted` accepts any finite iterable, and it **always returns a list**, whatever type you gave it:

```python run
t = 10, 3, 5, 8, 9, 6, 1
print(sorted(t))                  # a tuple in, a list out
print(sorted({10, 3, 5, 8}))      # sets have no order, but their items do
print(sorted('python'))           # a string becomes a list of characters
print(t)                          # the original is untouched
```

If you need the result as another type, convert it: `tuple(sorted(t))` or `''.join(sorted(s))`.

Iterating a dictionary yields its **keys**, so sorting a dictionary sorts its keys:

```python run
d = {3: 100, 2: 200, 1: 10}
print(sorted(d))
print(sorted(d.items()))          # (key, value) pairs, ordered by key
```

## Sort keys

By default, items are compared directly with `<`, using their *natural ordering*. The `key` argument changes what gets compared: it's a function that's called **once per item**, and the items are then ordered by the values it returns.

To sort the dictionary's keys by their values instead:

```python run
d = {'a': 100, 'b': 50, 'c': 10}
print(sorted(d, key=lambda k: d[k]))
print(sorted(d, key=d.get))       # same thing, using a bound method as the key
```

Each key `'a'`, `'b'`, `'c'` was mapped to `100`, `50`, `10` and sorted by those numbers, giving `c, b, a`.

Strings normally sort alphabetically, but you can sort them by length instead. Any function works as a key, whether it's a `def`, a `lambda` or a built-in:

```python run
t = 'this', 'parrot', 'is', 'a', 'late', 'bird'
print(sorted(t))
print(sorted(t, key=len))
```

Keys also let you sort things that have **no** natural ordering at all. Complex numbers can't be compared with `<`, but you can order them by their distance from the origin, `abs(z)`:

```python run
t = 0, 10+10j, 3-3j, 4+4j, 5-2j
try:
    sorted(t)
except TypeError as ex:
    print('TypeError:', ex)

print(sorted(t, key=abs))
print(sorted(t, key=lambda c: c.imag))
```

### Sorting by several criteria

Tuples compare element by element, so a key that returns a tuple sorts by the first value, then breaks ties with the second, and so on:

```python run
words = ['bird', 'a', 'late', 'is', 'this', 'parrot']
print(sorted(words, key=lambda w: (len(w), w)))      # by length, then alphabetically
print(sorted(words, key=lambda w: (-len(w), w)))     # longest first, then alphabetically
```

Negating a number reverses just that one criterion, a neat trick when the criteria need different directions.

## Stability

Look again at the sort by length: `'this'`, `'late'` and `'bird'` all have four letters. Which comes first?

```python run
print(sorted(('this', 'parrot', 'is', 'a', 'late', 'bird'), key=len))
print(sorted(('this', 'bird', 'is', 'a', 'late', 'parrot'), key=len))
```

Items with equal keys keep their **original relative order**. That property is called **stability**, and Python guarantees it. (The algorithm, *Timsort*, was written by Tim Peters for Python in 2002. Since 3.11 CPython uses a refined merge strategy called *Powersort*, but the stability guarantee is unchanged.)

Stability makes multi-pass sorting possible: sort by the secondary criterion first, then by the primary one, and ties in the second pass keep the order from the first:

```python run
people = [('Bob', 25), ('alice', 30), ('Carol', 25), ('dave', 30)]
step1 = sorted(people, key=lambda p: p[0].lower())   # by name
step2 = sorted(step1, key=lambda p: p[1])            # then by age
step2
```

## Reversing the order

`reverse=True` gives a descending sort. It's not the same as sorting and then reversing the result: equal elements still keep their original order, so stability is preserved:

```python run
t = 'this', 'bird', 'is', 'a', 'late', 'parrot'
print(sorted(t, key=len, reverse=True))
print(sorted(t, key=len)[::-1])          # ties come out backwards here
```

## In-place sorting with `list.sort()`

Lists have a `sort` method with the same `key` and `reverse` options. It rearranges the list itself and returns `None`, a reminder that it mutated something:

```python run
l = ['this', 'bird', 'is', 'a', 'late', 'parrot']
before = id(l)

result = l.sort(key=len)
print(result)
print(l, id(l) == before)
```

Tuples, strings and other immutable sequences don't have a `sort` method, for obvious reasons. For them, `sorted` is the only choice.

<div class="callout tip">
<span class="callout-title">A classic mistake</span>

`l = l.sort()` replaces your list with `None`. Use either `l.sort()` on its own line, or `l = sorted(l)`.

</div>

### Which is faster?

They run the same algorithm, so the main difference is that `sorted` first has to copy the data into a new list. `list.sort()` is therefore slightly faster and uses less memory. Let's time it on fresh copies so each run sorts unsorted data:

```python run
import random
from timeit import timeit

random.seed(0)
data = [random.randint(0, 100) for _ in range(100_000)]

print('sorted():   ', timeit('sorted(data)', globals=globals(), number=10))
print('list.sort():', timeit('data.copy().sort()', globals=globals(), number=10))
```

(The second line pays for a copy too, so the two come out very close.) A more interesting effect: Timsort detects runs that are already in order, so sorting data that's already sorted is **much** faster:

```python run
already_sorted = sorted(data)
print('random data:', timeit('sorted(data)', globals=globals(), number=10))
print('sorted data:', timeit('sorted(already_sorted)', globals=globals(), number=10))
```

## Natural ordering for your own classes

To make instances of your own class sortable without a key, give it a natural ordering by implementing `__lt__` (the `<` operator). That's all `sorted` needs:

```python run
class MyClass:
    def __init__(self, name, val):
        self.name = name
        self.val = val

    def __repr__(self):
        return f'MyClass({self.name}, {self.val})'

    def __lt__(self, other):
        print(f'  comparing {self.name} < {other.name}')
        return self.val < other.val

c1, c2, c3, c4 = MyClass('c1', 20), MyClass('c2', 10), MyClass('c3', 20), MyClass('c4', 10)
sorted([c1, c2, c3, c4])
```

The printout shows `sorted` calling `__lt__` repeatedly. The result is also stable: `c2` stays ahead of `c4`, and `c1` ahead of `c3`. If you need all the comparison operators, `functools.total_ordering` can derive them from `__eq__` and one ordering method.

<div class="takeaways">

## Key takeaways

- `sorted(iterable)` accepts any finite iterable and always returns a new list; `list.sort()` sorts in place and returns `None`.
- `key` maps each item to the value it's sorted by; return a tuple to sort by several criteria.
- Python's sort is **stable**: items with equal keys keep their original relative order, even with `reverse=True`.
- Sorting nearly sorted data is much faster than sorting random data.
- Implement `__lt__` to give your own class a natural ordering.

</div>
