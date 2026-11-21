---
title: Coding Exercises
summary: Four dictionary problems, sorting by value, intersecting keys, merging word counts and spotting uneven load balancing, to solve before reading the walkthroughs.
minutes: 8
---

## How to approach these

Each exercise below states a problem, shows sample data and the expected result, and gives a hint or two. Aim for code that reads well: dictionary comprehensions, `dict(...)` built from pairs, keys views used as sets. Building the result by starting from `{}` and adding one key at a time in a loop works, but there is usually a clearer way.

All the sample data is in one cell, so you can experiment right here:

```python run
composers = {'Johann': 65, 'Ludwig': 56, 'Frederic': 39, 'Wolfgang': 35}

d1 = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
d2 = {'b': 20, 'c': 30, 'y': 40, 'z': 50}

s1 = {'python': 10, 'java': 3, 'c#': 8, 'javascript': 15}
s2 = {'java': 10, 'c++': 10, 'c#': 4, 'go': 9, 'python': 6}
s3 = {'erlang': 5, 'haskell': 2, 'python': 1, 'pascal': 1}

n1 = {'employees': 100, 'employee': 5000, 'users': 10, 'user': 100}
n2 = {'employees': 250, 'users': 23, 'user': 230}
n3 = {'employees': 150, 'users': 4, 'login': 1000}

print(composers)
print(sorted(n1.keys() & n2.keys() & n3.keys()))   # resources seen on every node
```

## Exercise 1: sort a dictionary by value

Write `sort_dict_by_value(d)` that returns a **new** dictionary with the same items as `d`, ordered by value from smallest to largest. You can assume the values are mutually comparable.

Given `composers` above, the result should be:

```python
{'Wolfgang': 35, 'Frederic': 39, 'Ludwig': 56, 'Johann': 65}
```

*Hint:* the built-in `sorted` accepts any iterable, including `d.items()`, and a `key` function that tells it what to sort by. Remember that dicts keep insertion order.

## Exercise 2: common keys

Write `intersect(d1, d2)` that returns a dictionary containing only the keys present in **both** `d1` and `d2`. Each value is a tuple `(value in d1, value in d2)`. The order of the keys doesn't matter.

With the sample `d1` and `d2`:

```python
{'b': (2, 20), 'c': (3, 30)}
```

*Hint:* keys views support set operations, and `s1 & s2` is the intersection.

## Exercise 3: merge word counts

Text is spread over several servers. Each server analyzes its share and returns a dict of word frequencies. Write `merge(*dicts)` that takes **any number** of such dicts and returns a single dict with the combined frequency of every word.

For the bonus (and the auto-graded version), the result should be sorted by frequency, **highest first**. With `s1`, `s2` and `s3`:

```python
{'python': 17, 'javascript': 15, 'java': 13, 'c#': 12, 'c++': 10,
 'go': 9, 'erlang': 5, 'haskell': 2, 'pascal': 1}
```

If only the first two servers respond, `merge(s1, s2)` gives:

```python
{'python': 16, 'javascript': 15, 'java': 13, 'c#': 12, 'c++': 10, 'go': 9}
```

## Exercise 4: unevenly balanced requests

A web API runs on three load-balanced nodes. Each node logs its requests and reports a dict mapping each resource to the number of times it was requested there. If the load balancer works properly, every resource should show up on every node. You want to find the ones that **don't**.

Write `identify(node1, node2, node3)` that returns a dictionary containing only the resources that appear on **some, but not all**, of the nodes. Each value is a tuple of the three request counts, in node order, using `0` for a node where the resource never appeared.

With `n1`, `n2` and `n3` above (key order doesn't matter):

```python
{'employee': (5000, 0, 0), 'user': (100, 230, 0), 'login': (0, 0, 1000)}
```

*Hints:* `|` is union, `&` is intersection and `-` is difference, and they all work on keys views. Sketch three overlapping circles and shade the region you want. Then remember which dict method returns a default for a missing key.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution walkthroughs, open the **Practice** page for this section. Each exercise is there with starter code and automatic tests, so you can check your solution as you go.

</div>

<div class="takeaways">

## Key takeaways

- Exercise 1: return a new dict ordered by value, smallest first.
- Exercise 2: keep only the shared keys, pairing up both values in a tuple.
- Exercise 3: add up the counts from any number of dicts, and order the result by count, highest first.
- Exercise 4: report the resources missing from at least one node, with a count (or `0`) per node.
- Lean on comprehensions, keys views and built-ins rather than filling an empty dict by hand.

</div>
