---
title: Python 3.6 - Dictionary Ordering
summary: Plain dicts keep keys in insertion order, which covers most of what OrderedDict used to be needed for, with a few differences worth knowing.
minutes: 13
---

## Order is now part of the deal

Before Python 3.6, iterating over a dictionary gave you keys in an order that depended on their hash values and the dictionary's history. It looked random and could change between runs. If order mattered, you used `collections.OrderedDict`.

CPython 3.6 introduced a new dict implementation that is more compact in memory and, as a bonus, keeps keys in **insertion order**. At first this was only an implementation detail. Python 3.7 made it official: every Python 3.7+ implementation must preserve insertion order for `dict`.

<div class="callout note">
<span class="callout-title">Know your minimum version</span>

If your code relies on dict order, it must run on Python 3.7 or later (3.6 works in CPython but isn't guaranteed). On older versions it will silently behave differently. Today that's rarely a concern, but you'll still see `OrderedDict` in older code written to be safe.

</div>

## Watching the order

The keys, values and items views all follow the same order:

```python run
d = {'a': 1, 'b': 2}
d['x'] = 3
d.keys(), d.values(), d.items()
```

New keys go to the end. Deleting a key removes it from the sequence, and adding it back puts it at the **end**, not in its old position:

```python run
del d['b']
print(d)
d['b'] = 4
print(d)
```

Changing the value of an existing key does **not** move it:

```python run
d['x'] = 100
d
```

`update()` follows the same rules. Existing keys keep their place (with the new value) and new keys are appended in the order they appear in the other dictionary:

```python run
d1 = {'a': 1, 'b': 200}
d2 = {'a': 100, 'd': 300, 'c': 400}
d1.update(d2)
d1
```

## `popitem()` removes the last item

With ordering in place, `popitem()` is well defined: it removes and returns the most recently inserted item (LIFO order):

```python run
d = {'a': 1, 'b': 2, 'c': 3}
print(d.popitem())
print(d)
```

So a dict *can* act like a stack, but a `list` is the simpler and faster tool for that.

<div class="callout note">
<span class="callout-title">Displaying a dict vs pretty-printing it</span>

`print(d)` and the `repr` shown on this site keep insertion order. The `pprint` module, however, **sorts** keys by default, and older Jupyter versions used it to display results, which made dicts *look* sorted. Since Python 3.8 you can pass `sort_dicts=False`:

```python run
import pprint

d = {'x': 1, 'a': 2}
print(d)
pprint.pprint(d)
pprint.pprint(d, sort_dicts=False)
```

</div>

## Do we still need `OrderedDict`?

`OrderedDict` has some operations that a plain dict doesn't offer directly:

- `move_to_end(key, last=True)`: move a key to either end
- `popitem(last=True)`: pop from either end
- order-sensitive equality

```python run
from collections import OrderedDict

od = OrderedDict(a=1, b=2, c=3)
od.move_to_end('a')
print(od)
od.move_to_end('a', last=False)
print(od)
print(od.popitem(last=False), od)
```

(Reverse iteration with `reversed()` used to be another difference, but plain dicts support it since 3.8.)

Let's see how far a plain dict can go.

**Move a key to the end:** pop it and put it back.

```python run
d = {'a': 1, 'b': 2, 'c': 3}
d['a'] = d.pop('a')
d
```

**Move a key to the front:** there's no way to insert at the front, but we can move the key to the end, then rotate every *other* key behind it:

```python run
d = {'a': 1, 'b': 2, 'c': 3, 'x': 100, 'y': 200}
d['c'] = d.pop('c')            # c is now last
for _ in range(len(d) - 1):    # move every key in front of c to the end
    key = next(iter(d))
    d[key] = d.pop(key)
d
```

That works, but it touches every key, so it's O(n), while `OrderedDict.move_to_end(key, last=False)` is O(1).

**Pop the first item:** get the first key with `next(iter(d))`, then pop it.

```python run
d = {'a': 1, 'b': 2, 'c': 3}
first = next(iter(d))
print(first, d.pop(first), d)
```

**Equality:** this is the one real behavioral difference. Two plain dicts are equal if they hold the same key/value pairs in *any* order, while two `OrderedDict` objects must also have the same order:

```python run
print({'a': 1, 'b': 2} == {'b': 2, 'a': 1})
print(OrderedDict(a=1, b=2) == OrderedDict(b=2, a=1))
print(OrderedDict(a=1, b=2) == {'b': 2, 'a': 1})   # mixed: order ignored
```

So use a plain `dict` by default, and reach for `OrderedDict` when you need cheap reordering at both ends (an LRU cache is the classic example) or order-sensitive comparisons.

<div class="callout modern">
<span class="callout-title">Modern Python: a cleaner OrderedDict repr</span>

Since Python 3.12, an `OrderedDict` displays as `OrderedDict({'a': 1, ...})`. Older versions show a list of pairs, `OrderedDict([('a', 1), ...])`.

</div>

<div class="takeaways">

## Key takeaways

- Dicts preserve insertion order (CPython 3.6, guaranteed since 3.7). This applies to keys, values, items, `update()` and `popitem()`.
- Updating a value keeps the key's position; deleting and re-adding moves it to the end.
- `pprint` sorts keys unless you pass `sort_dicts=False`.
- Plain dicts can emulate most `OrderedDict` operations, but `move_to_end(..., last=False)` is O(1) only in `OrderedDict`, and only `OrderedDict` compares order in `==`.

</div>
