---
title: Exercise 1 - Solution
summary: Merging word-frequency dictionaries with a defaultdict and then with a Counter, and why the result still has to be sorted explicitly even when a Counter looks sorted.
minutes: 9
---

## The data

```python run
d1 = {'python': 10, 'java': 3, 'c#': 8, 'javascript': 15}
d2 = {'java': 10, 'c++': 10, 'c#': 4, 'go': 9, 'python': 6}
d3 = {'erlang': 5, 'haskell': 2, 'python': 1, 'pascal': 1}
```

The plain-dict solution has two separate jobs: **accumulate** the totals (with `.get(k, 0)` supplying the default) and **sort** the result by value. The specialized dictionaries help with the first job. The second needs care, as we'll see.

## Solution a: defaultdict

A `defaultdict(int)` supplies the `0` for words we haven't seen yet, so the `.get` disappears and `+=` just works:

```python run
from collections import defaultdict

def merge(*dicts):
    totals = defaultdict(int)
    for d in dicts:
        for word, count in d.items():
            totals[word] += count
    return dict(sorted(totals.items(), key=lambda e: e[1], reverse=True))

print(merge(d1, d2))
print(merge(d1, d2, d3))
```

The sorting line is unchanged: `sorted` over the `(word, count)` pairs, keyed on the count, highest first. Because dicts keep insertion order, building a `dict` from the sorted pairs keeps them sorted. Calling `dict(...)` also turns the `defaultdict` into a plain dict, so a caller who looks up an unknown word gets a `KeyError` instead of silently inserting a zero.

It's a modest improvement. The real simplification comes from a `Counter`.

## Solution b: Counter

`Counter.update` **adds** the counts from a mapping (unlike `dict.update`, which replaces them), and that's exactly the merge we need:

```python run
from collections import Counter

def merge(*dicts):
    totals = Counter()
    for d in dicts:
        totals.update(d)
    return totals

print(merge(d1, d2))
print(merge(d1, d2, d3))
```

That *looks* sorted. Is it? Add a fourth server with one very frequent word and look again, this time also iterating over the result:

```python run
d4 = {'modula-2': 100}
result = merge(d1, d2, d3, d4)
print(result)
print(list(result))
```

The repr is sorted, because `Counter.__repr__` displays items in `most_common()` order. But the counter itself, like any dict, is in **insertion order**: `modula-2` was inserted last, so it comes last when you iterate, call `.items()`, convert with `dict(result)` or serialize to JSON. Don't trust the repr; sort explicitly.

`most_common()` with no argument returns every `(element, count)` pair, sorted by count, highest first:

```python run
result.most_common()
```

Wrap that in `dict` and we're done:

```python run
def merge(*dicts):
    totals = Counter()
    for d in dicts:
        totals.update(d)
    return dict(totals.most_common())

merge(d1, d2, d3, d4)
```

## Ties and alternatives

What about words with the same count? Both `sorted` and `most_common` are **stable**: equal counts stay in the order the words were first encountered. Our sample data has no ties, so try two words with equal totals:

```python run
merge({'a': 1, 'b': 2}, {'c': 2})
```

`b` was seen before `c`, so it stays first.

You can also build the counters and add them with `+`, since `sum` accepts a start value:

```python run
dict(sum(map(Counter, (d1, d2, d3, d4)), Counter()).most_common(3))
```

That's compact, but note one difference: `+` drops counts that end up zero or negative, while `update` keeps them. For frequencies that are always positive, both give the same answer.

<div class="takeaways">

## Key takeaways

- `defaultdict(int)` removes the `.get(k, 0)` bookkeeping; `Counter.update` removes the inner loop entirely, because it **adds** counts.
- A `Counter`'s repr is sorted by count, but its iteration order is insertion order. Sort explicitly with `most_common()`.
- `dict(counter.most_common())` gives a plain dict sorted by frequency; ties keep first-seen order.

</div>
