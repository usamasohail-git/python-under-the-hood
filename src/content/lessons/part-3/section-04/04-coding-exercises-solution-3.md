---
title: Coding Exercises - Solution 3
summary: Combine word counts from any number of dictionaries in a single pass with get, then order the result by frequency with a reverse sort.
minutes: 11
---

## The problem

Merge word-frequency dicts from any number of servers into one, adding counts for words that appear more than once, and order the result from most to least frequent:

```python run
d1 = {'python': 10, 'java': 3, 'c#': 8, 'javascript': 15}
d2 = {'java': 10, 'c++': 10, 'c#': 4, 'go': 9, 'python': 6}
d3 = {'erlang': 5, 'haskell': 2, 'python': 1, 'pascal': 1}
```

## Why not just merge?

The merge tools from this section, `update`, `{**a, **b}` and `a | b`, all resolve conflicts by **replacing** the value. Here we need to **add** the values:

```python run
print((d1 | d2)['python'])    # 6: d2's count replaced d1's 10
```

So we need to accumulate.

## Step 1: accumulate the counts

Accept any number of dicts with `*dicts`. Then walk every item of every dict, adding its count to a running total. `get(word, 0)` treats a word we haven't seen yet as zero:

```python run
def combine(*dicts):
    totals = {}
    for d in dicts:
        for word, count in d.items():
            totals[word] = totals.get(word, 0) + count
    return totals

print(combine(d1, d2, d3))
```

This visits each item exactly once. An alternative is to compute the union of all keys first and then, for each key, sum `d.get(key, 0)` over every dict. That works too, but performs one lookup per key *per dict*, even for dicts that don't contain the key. The single pass is simpler and does less work.

## Step 2: order by frequency

This is Exercise 1 again, sorted in reverse:

```python run
def merge(*dicts):
    totals = {}
    for d in dicts:
        for word, count in d.items():
            totals[word] = totals.get(word, 0) + count
    return dict(sorted(totals.items(), key=lambda item: item[1], reverse=True))

for word, count in merge(d1, d2, d3).items():
    print(f'{word:<11} {count}')
```

And with only two servers:

```python run
print(merge(d1, d2))
print(merge())             # no servers: an empty result, not an error
```

### What about ties?

`java` and `c++` both have 10 in `d2`, but after merging nothing ties. In general, `sorted` is stable, and with `reverse=True` Python still keeps tied items in their original order (it doesn't reverse them). So tied words appear in the order they were first seen across the inputs:

```python run
print(merge({'b': 1, 'a': 2}, {'c': 2}))
```

`a` and `c` both total 2, and `a` was seen first.

<div class="callout tip">
<span class="callout-title">The standard-library shortcut</span>

`collections.Counter` is a dict subclass made for exactly this: counters can be added with `+`, and `most_common()` returns items sorted by count. It's covered with the specialized dictionaries later in Part 3.

```python run
from collections import Counter

total = Counter(d1) + Counter(d2) + Counter(d3)
print(dict(total.most_common()))
```

</div>

<div class="takeaways">

## Key takeaways

- `update`, `**` and `|` replace values on conflicting keys; summing requires accumulating yourself.
- `totals[k] = totals.get(k, 0) + v` is the plain-dict accumulation idiom, and `*dicts` lets one function handle any number of sources.
- `sorted(..., key=..., reverse=True)` orders by value, largest first, and keeps ties in their original order.

</div>
