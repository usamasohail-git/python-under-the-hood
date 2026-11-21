---
title: Counter
summary: Counter is a dictionary built for counting, a multiset with most_common, elements, update/subtract, arithmetic and (since 3.10) total() and inclusion comparisons.
minutes: 16
---

## Counting, the short way

Counting things with a `defaultdict(int)` is already pleasant:

```python run
from collections import defaultdict, Counter

sentence = 'the quick brown fox jumps over the lazy dog'

counter = defaultdict(int)
for c in sentence:
    counter[c] += 1
counter['o'], counter[' ']
```

A `Counter` works the same way without a factory: the default for a missing key is always `0`.

```python run
counter = Counter()
for c in sentence:
    counter[c] += 1
counter['o'], counter[' ']
```

But you'd rarely write that loop, because counting the elements of an iterable is what the constructor does:

```python run
Counter('able was I ere I saw elba')
```

Notice that the repr lists the elements **from most to least common**, not in insertion order. That's only the display: iterating over a `Counter` still follows insertion order, like any dict.

A `Counter` is a `dict` subclass whose values are counts. Think of it as a **multiset**: a set in which each element can appear more than once.

## Building a Counter

The constructor accepts any iterable to count, or a mapping or keyword arguments of ready-made counts:

```python run
import random
random.seed(0)
rolls = [random.randint(1, 6) for _ in range(1_000)]

print(Counter(rolls))
print(Counter(a=1, b=10))
print(Counter({'a': 1, 'b': 10}))
```

## Missing keys are zero, and stay missing

Here is an important difference from `defaultdict`: looking up a missing key returns `0` but **does not insert** it.

```python run
c = Counter('abba')
print(c['z'])
print('z' in c, c)
```

So you can freely ask "how many?" without polluting the counter. Setting a count to zero, on the other hand, *does* keep the key. Use `del` to remove it:

```python run
c['a'] = 0
print(c, 'a' in c)
del c['a']
print(c, 'a' in c)
```

## The n most common elements

`most_common(n)` returns the `n` highest counts as a list of `(element, count)` tuples, highest first. Elements with equal counts keep the order in which they were first seen. Without an argument it returns everything, sorted.

Let's find the most common words in a paragraph. Splitting on non-word characters gives us words, plus empty strings wherever two separators are adjacent, so we filter those out:

```python run
import re

text = '''
This module implements pseudo-random number generators for various distributions.
For integers, there is uniform selection from a range. For sequences, there is
uniform selection of a random element, a function to generate a random permutation
of a list in-place, and a function for random sampling without replacement.
'''

words = [w for w in re.split(r'\W', text.lower()) if w]
word_count = Counter(words)
word_count.most_common(5)
```

`re.findall(r'\w+', text.lower())` is another way to get the same list of words.

<div class="callout modern">
<span class="callout-title">Use raw strings for regex patterns</span>

Older notebooks write `re.split('\W', ...)`. In a normal string literal `\W` is an invalid escape sequence. Python has warned about these for a long time, and since **3.12** the warning is a visible `SyntaxWarning`. Write regex patterns as raw strings: `r'\W'`.

</div>

## Repeating elements: elements()

Iterating over a `Counter` yields each key once. `elements()` yields each key **as many times as its count**:

```python run
c = Counter('abba')
print(list(c))
print(list(c.elements()))
```

Elements with zero or negative counts are skipped. You can turn this around and use a `Counter` to *describe* a repeated sequence. To get 1 once, 2 twice, 3 three times and so on:

```python run
c = Counter({i: i for i in range(1, 6)})
print(c.elements())
list(c.elements())
```

`elements()` returns a lazy iterator (an `itertools.chain`), so the repeated sequence is never stored as a whole. A rough equivalent written as a generator:

```python run
def elements(counts):
    for key, count in counts.items():
        for _ in range(count):
            yield key

list(elements({'a': 2, 'b': 3, 'c': 1}))
```

## update and subtract

`update` **adds** counts, from another `Counter`, any mapping, or an iterable of elements to count. (This is different from `dict.update`, which *replaces* values.)

```python run
c1 = Counter(a=1, b=2, c=3)
c1.update(Counter(b=1, c=2, d=3))
print(c1)

c2 = Counter('aabbccddee')
c2.update('abcdef')         # count these characters too
print(c2)
```

`subtract` takes away counts. Missing keys start from zero, and counts are allowed to go negative:

```python run
c1 = Counter(a=1, b=2, c=3)
c1.subtract(Counter(b=1, c=2, d=3))
c1
```

## Counter arithmetic

The binary operators combine two counters into a **new** one, and they all drop any element whose resulting count is zero or negative:

- `c1 + c2`: add counts
- `c1 - c2`: subtract counts, keeping only positive results
- `c1 & c2`: intersection, the **minimum** of each count
- `c1 | c2`: union, the **maximum** of each count

```python run
c1 = Counter('aabbcc')
c2 = Counter('abc')
print(c1 + c2)
print(c1 - c2)
print(c2 - c1)       # everything would be <= 0, so it's empty

c1 = Counter(a=5, b=1)
c2 = Counter(a=1, b=10)
print(c1 & c2)
print(c1 | c2)
```

Compare `c2 - c1` (empty) with `subtract`, which keeps the negatives. The unary operators are shortcuts for "add to / subtract from an empty counter", so they also strip non-positive counts:

```python run
c = Counter(a=10, b=-10, z=0)
print(+c)     # keep the positive counts
print(-c)     # flip the signs, keep what is now positive
```

## total() and comparisons

<div class="callout modern">
<span class="callout-title">New in Python 3.10</span>

`Counter.total()` returns the sum of all counts (the size of the multiset). Before 3.10 you wrote `sum(c.values())`.

Counters also gained **rich comparisons** that treat them as multisets. `c1 <= c2` means "every count in `c1` is at most the corresponding count in `c2`" (multiset inclusion), and `<` additionally requires the counters to differ. Missing elements count as zero, which changed `==` too: `Counter(a=1) == Counter(a=1, b=0)` is now `True`.

</div>

```python run
inventory = Counter(apples=3, pears=2, plums=5)
print(inventory.total())

order = Counter(apples=2, plums=5)
print(order <= inventory)      # can we fill this order?
print(Counter(pears=3) <= inventory)
print(order < inventory, inventory < inventory)
print(Counter(a=1) == Counter(a=1, b=0))
```

`<=` is a handy way to ask "do I have enough of everything?" in one expression. Note that it is a *partial* order: two counters can each have something the other lacks, in which case neither `<=` nor `>=` holds.

## Example: best-selling widgets

You're asked for the top three best-selling widgets. One data source gives you orders as `(widget, quantity)` pairs, another gives refunds in the same shape:

```python run
random.seed(0)
widgets = ['battery', 'charger', 'cable', 'case', 'keyboard', 'mouse']
orders = [(random.choice(widgets), random.randint(1, 5)) for _ in range(100)]
refunds = [(random.choice(widgets), random.randint(1, 3)) for _ in range(20)]
print(orders[:5])
print(refunds[:5])
```

Load each source into a counter, subtract, and ask for the top three:

```python run
sold = Counter()
refunded = Counter()
for widget, qty in orders:
    sold[widget] += qty
for widget, qty in refunds:
    refunded[widget] += qty

net = sold - refunded
print(sold)
print(refunded)
net.most_common(3)
```

The loops can go too. `itertools.repeat(widget, qty)` produces the widget name `qty` times, and `chain.from_iterable` strings all those repeats together into one iterable for the constructor to count:

```python run
from itertools import chain, repeat

sold2 = Counter(chain.from_iterable(repeat(*order) for order in orders))
sold2 == sold
```

For comparison, here's the same result with a plain dict. It works, but you have to handle the defaults, the filtering and the sorting yourself:

```python run
net_sales = {}
for widget, qty in orders:
    net_sales[widget] = net_sales.get(widget, 0) + qty
for widget, qty in refunds:
    net_sales[widget] = net_sales.get(widget, 0) - qty

net_sales = {k: v for k, v in net_sales.items() if v > 0}
sorted(net_sales.items(), key=lambda kv: kv[1], reverse=True)[:3]
```

<div class="takeaways">

## Key takeaways

- `Counter(iterable)` counts elements; it also accepts a mapping or keyword arguments of counts.
- Missing keys read as `0` **without** being inserted, unlike `defaultdict`.
- `most_common(n)` gives the top counts; `elements()` lazily repeats each key by its count.
- `update` adds counts (unlike `dict.update`), `subtract` removes them and keeps negatives.
- `+`, `-`, `&`, `|` and unary `+`/`-` return new counters and drop non-positive counts.
- Python 3.10 added `total()` and multiset comparisons (`<=`, `<`, `>=`, `>`), with missing elements treated as zero, also for `==`.

</div>
