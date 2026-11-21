---
title: Coding Exercises - Solution 2
summary: Find the keys two dictionaries share with the & operator on keys views, then build the result with a comprehension, and keep the input order when it matters.
minutes: 9
---

## The problem

Keep only the keys present in both dicts, mapping each to a tuple of its two values:

```python run
d1 = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
d2 = {'b': 20, 'c': 30, 'y': 40, 'z': 50}
# expected: {'b': (2, 20), 'c': (3, 30)}
```

This splits naturally into two questions: *which* keys, and *what* values.

## Step 1: which keys?

Keys views behave like sets, so the shared keys are simply the intersection. No need to convert anything to `set` first:

```python run
common = d1.keys() & d2.keys()
print(type(common), sorted(common))
```

The result is a real `set`. It's built with hashing, so finding the intersection takes time proportional to the size of the smaller dict, not a nested loop over both.

## Step 2: what values?

For every common key, both lookups are guaranteed to succeed, so plain `d1[k]` and `d2[k]` are safe. A comprehension builds the result in one expression:

```python run
def intersect(d1, d2):
    return {k: (d1[k], d2[k]) for k in d1.keys() & d2.keys()}

result = intersect(d1, d2)
print(result == {'b': (2, 20), 'c': (3, 30)})
print(sorted(result.items()))
```

A few edge cases are worth checking, since they're where solutions usually break:

```python run
print(intersect({}, {'a': 1}))                 # nothing in common
print(intersect({'a': None}, {'a': 0}))        # falsy values are kept
print(intersect({'x': [1]}, {'x': [2]}))       # unhashable values are fine
```

The last one works because only the **keys** go through a set operation. The values are just looked up. (Writing `d1.items() & d2.items()` would be a different question, matching *pairs*, and would fail on unhashable values.)

## Keeping the order

The exercise says order doesn't matter, and that's lucky: a set has no meaningful order, so the result's key order is whatever the set produced. For string keys it can even change between runs, since string hashes are randomized per process.

If you want the keys in `d1`'s order, iterate over `d1` and test membership in `d2` instead. `k in d2` is a hash lookup, so this is just as efficient:

```python run
def intersect_ordered(d1, d2):
    return {k: (d1[k], d2[k]) for k in d1 if k in d2}

print(intersect_ordered(d1, d2))
print(intersect_ordered({'z': 1, 'a': 2, 'm': 3}, {'m': 0, 'z': 0}))
```

<div class="takeaways">

## Key takeaways

- `d1.keys() & d2.keys()` gives the common keys directly; keys views support set operators.
- Once you know a key is in both dicts, `d[k]` lookups are safe and a comprehension builds the result.
- Set operations lose order. To keep `d1`'s order, iterate over `d1` and filter with `k in d2`.

</div>
