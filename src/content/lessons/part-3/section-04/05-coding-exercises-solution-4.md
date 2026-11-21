---
title: Coding Exercises - Solution 4
summary: Isolate the keys that appear on some but not all of three dictionaries with union minus intersection, and fill in missing counts with get.
minutes: 12
---

## The problem

Three nodes report how often each resource was requested. Find the resources that appear on **some but not all** nodes, and report each one's three counts, with `0` where it's missing:

```python run
n1 = {'employees': 100, 'employee': 5000, 'users': 10, 'user': 100}
n2 = {'employees': 250, 'users': 23, 'user': 230}
n3 = {'employees': 150, 'users': 4, 'login': 1000}
# expected: {'employee': (5000, 0, 0), 'user': (100, 230, 0), 'login': (0, 0, 1000)}
```

Again: first decide *which* keys, then *what* values.

## Step 1: which keys?

Picture three overlapping circles, one per node's keys. "On at least one node" is everything inside any circle: the **union**. "On every node" is the middle region where all three overlap: the **intersection**. What we want is everything in the first but not the second:

```python run
union = n1.keys() | n2.keys() | n3.keys()
intersection = n1.keys() & n2.keys() & n3.keys()

print(sorted(union))
print(sorted(intersection))
print(sorted(union - intersection))
```

Exactly the three expected resources. (Set operators chain left to right, and since the first operation on two keys views returns a `set`, the rest are ordinary set operations.)

<div class="callout note">
<span class="callout-title">Why not the symmetric difference?</span>

With two dicts, "in one but not both" is `a ^ b`. It's tempting to write `a ^ b ^ c` for three, but that's a different set: it keeps the keys found in an **odd** number of dicts. A key on all three nodes drops out of `a ^ b` (it's in both), and then `^ c` adds it right back:

```python run
print(sorted(n1.keys() ^ n2.keys() ^ n3.keys()))
```

`employees` and `users` are on every node, yet they're included, and `user` (on two nodes) is missing. Union minus intersection says exactly what we mean, for any number of sets.

</div>

## Step 2: what values?

For each relevant key, look it up on every node, defaulting to `0`. `get` with a default does exactly that:

```python run
def identify(node1, node2, node3):
    union = node1.keys() | node2.keys() | node3.keys()
    intersection = node1.keys() & node2.keys() & node3.keys()
    return {key: (node1.get(key, 0), node2.get(key, 0), node3.get(key, 0))
            for key in union - intersection}

result = identify(n1, n2, n3)
for key, counts in sorted(result.items()):
    print(f'{key}: {counts}')
```

Check the edge cases: if every node saw the same resources, there's nothing to report; and a node that reports nothing at all makes every resource suspicious:

```python run
print(identify({'a': 1}, {'a': 2}, {'a': 3}))
print(sorted(identify({'a': 1, 'b': 2}, {'a': 3}, {}).items()))
```

## Generalizing to any number of nodes

Nothing in the logic depends on there being three nodes. With `*nodes`, `set().union(*...)` and `set.intersection(*...)` combine any number of keys views:

```python run
def identify_any(*nodes):
    if not nodes:
        return {}
    keys = [node.keys() for node in nodes]
    relevant = set().union(*keys) - set(keys[0]).intersection(*keys[1:])
    return {key: tuple(node.get(key, 0) for node in nodes) for key in relevant}

print(identify_any(n1, n2, n3) == identify(n1, n2, n3))
print(identify_any(n1, n2))
```

As with Exercise 2, the result's order comes from a set and isn't meaningful. If you need a stable report, sort it (as the cells above do) or iterate the union in a deliberate order.

<div class="takeaways">

## Key takeaways

- "Some but not all" is **union minus intersection**; keys views make both one-liners.
- `a ^ b ^ c` is not the same thing: it keeps keys present in an odd number of sets.
- `d.get(key, 0)` fills in missing counts without `if` statements or `try`/`except`.
- The same approach generalizes to any number of dicts with `*args`, `set().union(*...)` and `set.intersection`.

</div>
