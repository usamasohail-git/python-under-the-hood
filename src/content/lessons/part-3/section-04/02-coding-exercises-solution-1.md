---
title: Coding Exercises - Solution 1
summary: Sort a dictionary by value by sorting its items with a key function and rebuilding a dict from the ordered pairs.
minutes: 10
---

## The problem

Return a new dict with the items of `d` ordered by value, smallest first:

```python run
composers = {'Johann': 65, 'Ludwig': 56, 'Frederic': 39, 'Wolfgang': 35}
```

A dictionary can't be sorted in place: it has no `sort` method. But it keeps insertion order, so if we insert the items in the order we want, the new dict *is* sorted. The task becomes: get the items in value order, then build a dict from them.

## Step 1: sort the items

`d.items()` gives `(key, value)` tuples, and `sorted` accepts any iterable and returns a list. By default tuples are compared element by element, so sorting the items as they are would sort by **key**:

```python run
print(sorted(composers.items()))
```

To sort by value, pass a `key` function that receives each tuple and returns what to compare, the second element:

```python run
by_value = sorted(composers.items(), key=lambda item: item[1])
by_value
```

## Step 2: rebuild a dict

A first version uses a comprehension to unpack each pair back into the new dict:

```python run
def sort_dict_by_value(d):
    return {k: v for k, v in sorted(d.items(), key=lambda item: item[1])}

print(sort_dict_by_value(composers))
```

That comprehension doesn't transform anything; it just copies pairs. And `dict()` already accepts an iterable of pairs, which is exactly what `sorted` returned. So the cleanest version is:

```python run
def sort_dict_by_value(d):
    return dict(sorted(d.items(), key=lambda item: item[1]))

result = sort_dict_by_value(composers)
print(result)
print(result is composers, composers)    # a new dict; the original is unchanged
```

## Variations

**`operator.itemgetter`** is a ready-made, slightly faster equivalent of `lambda item: item[1]`:

```python run
from operator import itemgetter

print(dict(sorted(composers.items(), key=itemgetter(1))))
```

**Largest first**: add `reverse=True`.

```python run
print(dict(sorted(composers.items(), key=itemgetter(1), reverse=True)))
```

**Ties.** Python's sort is *stable*: items that compare equal keep their original relative order. So equal values stay in the order they had in the input dict. If you'd rather break ties alphabetically by key, sort by a tuple `(value, key)`:

```python run
scores = {'carol': 3, 'alice': 5, 'bob': 3, 'dave': 5}

print(dict(sorted(scores.items(), key=itemgetter(1))))                     # stable
print(dict(sorted(scores.items(), key=lambda item: (item[1], item[0]))))   # ties by key
```

<div class="callout note">
<span class="callout-title">Is a "sorted dict" a good idea?</span>

The result is ordered only at the moment you create it. Add a key later and it goes at the end, wherever its value would belong. If you need to keep things sorted as they change, re-sort when you need the order, or use a list of pairs for presentation and keep the dict for lookups.

</div>

<div class="takeaways">

## Key takeaways

- Dicts can't be sorted in place, but because they preserve insertion order, a dict built from sorted pairs stays in that order.
- `sorted(d.items(), key=...)` sorts the pairs; `key=itemgetter(1)` (or a lambda) sorts by value.
- `dict(pairs)` is simpler than a comprehension that just copies pairs.
- Sorting is stable, so tied values keep their input order unless you add a tie-breaker to the key.

</div>
