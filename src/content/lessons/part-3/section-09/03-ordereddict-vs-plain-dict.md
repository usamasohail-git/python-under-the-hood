---
title: OrderedDict vs Plain Dict
summary: Now that every dict keeps insertion order, what does OrderedDict still give you? We rebuild its features on plain dicts, then compare speed and memory to see where each one wins.
minutes: 15
---

## What's left to decide

Since Python 3.7, a plain `dict` is guaranteed to preserve insertion order. The previous lesson listed what `OrderedDict` adds on top:

1. reverse iteration
2. popping the first or last item
3. moving a key to the beginning or end
4. equality that takes key order into account

Let's see how much of this a plain dict can do, and at what cost.

```python run
from collections import OrderedDict

d1 = OrderedDict(a=1, b=2, c=3, d=4)
d2 = dict(a=1, b=2, c=3, d=4)
print(d1)
print(d2)
```

## Reverse iteration: a tie since Python 3.8

```python run
print(list(reversed(d1)))
print(list(reversed(d2)))
print(list(reversed(d2.items())))
```

<div class="callout modern">
<span class="callout-title">reversed() on dicts (Python 3.8+)</span>

Older notebooks say `reversed()` doesn't work on a plain dict and suggest `reversed(list(d.keys()))`, which copies every key into a list first. Since Python **3.8**, dicts and their `keys()`, `values()` and `items()` views support `reversed()` directly, with no copy.

</div>

## Popping items

### The last item: a tie

`dict.popitem()` has removed the **last inserted** item (LIFO) ever since order became guaranteed in 3.7. It takes no `last` argument, though:

```python run
d2 = dict(a=1, b=2, c=3, d=4)
print(d2.popitem())
d2
```

### The first item: possible, but slow

To pop the first item we need the first key. `next(iter(d))` gets it without building a list:

```python run
def popitem(d, last=True):
    if last:
        return d.popitem()
    first_key = next(iter(d))
    return first_key, d.pop(first_key)

d2 = dict(a=1, b=2, c=3, d=4)
print(popitem(d2, last=False))
print(popitem(d2))
d2
```

That works. As you'll see in the timings below, though, popping repeatedly from the front of a plain dict gets slower and slower, while `OrderedDict.popitem(last=False)` stays fast.

## Moving keys

### To the end: easy

Since new keys always go to the end, popping a key and inserting it again moves it there:

```python run
d2 = dict(a=1, b=2, c=3, d=4)
key = 'b'
d2[key] = d2.pop(key)
d2
```

### To the front: awkward

There's no way to insert a key at the *front* of a plain dict. One trick: move the target key to the end, then move every key that was before it to the end too, one at a time. Each move shifts the target one place closer to the front:

```python run
d = dict(a=1, b=2, c=3, d=4, e=5, f=6)
target = 'c'

d[target] = d.pop(target)          # a b d e f c
print(list(d))
for k in list(d)[:-1]:             # every key except the target
    d[k] = d.pop(k)
    print(list(d))
```

Packaged as a function:

```python run
def move_to_end(d, key, *, last=True):
    d[key] = d.pop(key)
    if not last:
        for k in list(d)[:-1]:
            d[k] = d.pop(k)

d = dict(a=1, b=2, c=3, d=4, e=5, f=6)
move_to_end(d, 'c')
print(d)
move_to_end(d, 'c', last=False)
print(d)
```

It works, but moving to the front touches **every** key in the dictionary (O(n)), while `OrderedDict.move_to_end(key, last=False)` is O(1). If you're happy to create a new dict instead, `{key: d[key], **d}` is a one-liner. The later `**d` doesn't move `key`, because updating an existing key keeps its position:

```python run
d = dict(a=1, b=2, c=3)
{'c': d['c'], **d}
```

## Order-sensitive equality

Plain dicts ignore order when comparing:

```python run
d1 = {'a': 10, 'b': 20, 'c': 30}
d2 = {'b': 20, 'c': 30, 'a': 10}
print(d1 == d2)
print(d1.keys() == d2.keys())
```

Comparing the `keys()` views doesn't help: key views behave like sets, so their comparison ignores order too. Comparing the keys as **lists** does:

```python run
d1 == d2 and list(d1) == list(d2)
```

To avoid building two lists, walk both key sequences in step with `zip`. Once we know the dicts are equal they have the same length, so `zip` can't silently stop early:

```python run
def dict_equal_sensitive(d1, d2):
    return d1 == d2 and all(k1 == k2 for k1, k2 in zip(d1, d2))

print(dict_equal_sensitive(d1, d2))
print(dict_equal_sensitive(d1, dict(d1)))
```

So every `OrderedDict` feature can be emulated. The question is whether the emulation is cheap enough, and what `OrderedDict` costs in exchange.

## Timings

Keep the numbers small and compare ratios rather than absolute values (the browser runs Python in WebAssembly, which is slower than native CPython).

**Building** a dictionary:

```python run
from timeit import timeit

def create_dict(n):
    d = {}
    for i in range(n):
        d[i] = i
    return d

def create_ordered_dict(n):
    d = OrderedDict()
    for i in range(n):
        d[i] = i
    return d

print(f"dict:        {timeit('create_dict(10_000)', globals=globals(), number=50):.3f}s")
print(f"OrderedDict: {timeit('create_ordered_dict(10_000)', globals=globals(), number=50):.3f}s")
```

`OrderedDict` has to maintain its linked list on every insert, so it's slower to build. **Lookups**, on the other hand, are plain hash table lookups in both:

```python run
dd = create_dict(10_000)
od = create_ordered_dict(10_000)
print(f"dict:        {timeit('dd[9_999]', globals=globals(), number=200_000):.3f}s")
print(f"OrderedDict: {timeit('od[9_999]', globals=globals(), number=200_000):.3f}s")
```

**Popping the last item** is cheap for both: the dict removes the last entry of its compact array, the `OrderedDict` also unlinks the tail of its list. Expect them to be close (on native CPython the plain dict is usually somewhat faster):

```python run
n = 100_000
dd = create_dict(n)
od = create_ordered_dict(n)
print(f"dict:        {timeit('dd.popitem()', globals=globals(), number=n):.3f}s")
print(f"OrderedDict: {timeit('od.popitem()', globals=globals(), number=n):.3f}s")
```

**Popping the first item** is where the plain dict falls apart:

```python run
n = 20_000
dd = create_dict(n)
od = create_ordered_dict(n)
print(f"dict:        {timeit('popitem(dd, last=False)', globals=globals(), number=n):.3f}s")
print(f"OrderedDict: {timeit('od.popitem(last=False)', globals=globals(), number=n):.3f}s")
```

Why so slow? A plain dict stores its entries in an array in insertion order. Deleting an entry leaves a "dummy" hole in that array rather than shifting everything down. `next(iter(d))` must skip over all those holes to find the first real entry, so each successive pop from the front scans further than the last one. Popping all *n* items that way is roughly quadratic. The `OrderedDict` just unlinks the head of its linked list.

## Memory

That linked list isn't free. An `OrderedDict` uses roughly twice the memory of an equivalent dict:

```python run
import sys
print(sys.getsizeof(dict.fromkeys(range(1_000))))
print(sys.getsizeof(OrderedDict.fromkeys(range(1_000))))
```

## Verdict

| Need | Plain `dict` | `OrderedDict` |
|---|---|---|
| Keep insertion order | yes (3.7+) | yes |
| `reversed()` | yes (3.8+) | yes |
| Pop last item | `popitem()` | `popitem()` |
| Pop first item | `next(iter(d))` + `pop`, slow when repeated | `popitem(last=False)`, O(1) |
| Move key to end | `d[k] = d.pop(k)` | `move_to_end(k)` |
| Move key to front | O(n) workaround | `move_to_end(k, last=False)`, O(1) |
| Order-sensitive `==` | write it yourself | built in |
| Memory, insert speed | better | worse |

If all you need is a dictionary that keeps insertion order, use a plain `dict`: it's faster and smaller. Reach for `OrderedDict` when you need to reorder keys, consume items from the front, or compare with order in mind.

<div class="takeaways">

## Key takeaways

- Plain dicts keep insertion order (3.7+), support `reversed()` (3.8+) and pop the last item with `popitem()`.
- Popping from the front or moving keys to the front can be emulated on a plain dict, but only slowly: repeated front pops degrade badly, and moving to the front is O(n).
- Order-sensitive equality on plain dicts needs extra code: `d1 == d2 and list(d1) == list(d2)`.
- `OrderedDict` costs more memory and is slower to build, but is unbeatable for reordering and FIFO-style popping.

</div>
