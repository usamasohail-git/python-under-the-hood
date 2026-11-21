---
title: Dictionary Views
summary: keys(), values() and items() return live views of a dictionary; the keys and items views behave like sets, and none of them tolerate the dictionary changing size during iteration.
minutes: 15
---

## Views are windows, not copies

`d.keys()`, `d.values()` and `d.items()` don't copy anything. Each returns a small **view** object that reads from the dictionary whenever you use it. If the dictionary changes, the view shows the change immediately:

```python run
d = {'a': 1, 'b': 2}
keys, values, items = d.keys(), d.values(), d.items()
print(keys, values, items, sep='\n')

ids_before = (id(keys), id(values), id(items))
d['z'] = 100

print(keys, values, items, sep='\n')
print(ids_before == (id(keys), id(values), id(items)))
```

Same three view objects, new contents. A view doesn't own any data; it's a dynamic window onto the dictionary. (Unlike sets, dictionaries *do* keep insertion order, so the order you see here is reliable.)

<div class="callout modern">
<span class="callout-title">Python 3.10: views know their dictionary</span>

Since Python 3.10, every view has a read-only `mapping` attribute giving a read-only proxy of the dictionary it's looking at.

```python run
print(keys.mapping)
print(keys.mapping['z'])
```

</div>

## Keys and items views are set-like

Because dictionary keys are unique and hashable, the keys view behaves like a set. It supports `len`, `in`, the comparison operators and the four set operations, and those operations return ordinary `set` objects:

```python run
inventory = {'apples': 10, 'pears': 4, 'kiwis': 0}
order = {'pears': 2, 'kiwis': 5, 'mangos': 1}

print(type(inventory.keys() & order.keys()))
print(sorted(inventory.keys() & order.keys()))   # in both
print(sorted(order.keys() - inventory.keys()))   # ordered but never stocked
print(sorted(inventory.keys() ^ order.keys()))   # in exactly one of them
print(inventory.keys() == {'apples', 'pears', 'kiwis'})
```

The operators on a view are more relaxed than on a real set: the other operand can be any iterable.

```python run
print(sorted(inventory.keys() | ['plums']))
print(inventory.keys() <= {'apples', 'pears', 'kiwis', 'plums'})
```

The **items** view is set-like too, its elements being `(key, value)` tuples. That's a quick way to find entries that differ between two dictionaries, as long as the values are hashable:

```python run
old = {'host': 'localhost', 'port': 8080, 'debug': True}
new = {'host': 'localhost', 'port': 9090, 'user': 'admin'}

print(sorted(new.items() - old.items()))   # added or changed entries
print(sorted(old.items() - new.items()))   # removed or changed entries
```

If a value isn't hashable, set operations on the items view fail as soon as they need to hash that pair:

```python run
d = {'a': [1, 2]}
try:
    d.items() & {('a', 1)}
except TypeError as ex:
    print('TypeError:', ex)
```

The **values** view is *not* set-like. Values needn't be unique or hashable, so set operations make no sense for it. It doesn't even compare equal to another values view with the same contents, because two values views are only `==` if they are the same object:

```python run
d = {'a': 1, 'b': 2}
try:
    d.values() & {1}
except TypeError as ex:
    print('TypeError:', ex)

print(d.values() == d.values())
print(sorted(d.values()) == sorted(dict(b=2, a=1).values()))   # compare contents explicitly
```

## Changing a dictionary while iterating

Since views are live, what happens if the dictionary changes in the middle of a loop over one? Python allows some changes and forbids others.

**Changing the size is forbidden.** Deleting a key during iteration is detected at the next step of the loop:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
try:
    for k, v in d.items():
        print(k, v)
        del d[k]
except RuntimeError as ex:
    print('RuntimeError:', ex)
print(d)
```

Note *where* the error happens: the `del` itself succeeded (`'a'` is gone), and the exception came from the loop asking for the next item. Adding a key is caught in the same way:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
try:
    for k in d:
        d['z'] = 100
except RuntimeError as ex:
    print('RuntimeError:', ex)
```

It doesn't matter which view you iterate over. The values view doesn't "use" the keys, but it's still a window onto the same dictionary:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
try:
    for v in d.values():
        del d['a']
except RuntimeError as ex:
    print('RuntimeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Swapping keys without changing the size</span>

The size check is cheap, but it can't see a deletion followed by an insertion, since the size ends up the same. Since Python 3.8, CPython adds a second check: if the iterator ends up producing more keys than the dictionary had when the loop started, it raises `RuntimeError: dictionary keys changed during iteration`. Older versions could silently loop over the new keys.

```python run
d = {'a': 1, 'b': 2}
seen = []
try:
    for k in d:
        seen.append(k)
        del d[k]
        d[k.upper()] = 0      # same size, different keys
except RuntimeError as ex:
    print('RuntimeError:', ex)
print(seen, d)
```

This second check is best-effort: whether it fires depends on the dictionary's internal layout, and some swaps slip through unnoticed. Treat "don't change the keys while iterating" as a rule, not as something Python will always enforce for you.

</div>

**Changing values is fine.** Re-assigning the value of an existing key doesn't change the dictionary's structure, so you can do it while iterating over any view:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
for k, v in d.items():
    d[k] = v * 100
print(d)
```

The rule of thumb: don't add or remove keys while iterating over a dictionary; updating values is fine.

### When you do need to remove keys

Iterate over a **snapshot** of the keys instead of the live view. `list(d)` copies the keys into a list that's unaffected by later changes:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
for k in list(d):
    value = d.pop(k)
    print(f'{k}: {value} ** 2 = {value ** 2}')
print(d)
```

To keep some keys and drop others, building a new dictionary with a comprehension is usually clearer still: `{k: v for k, v in d.items() if keep(k)}`.

Or consume the dictionary with `popitem()`, which removes and returns the **last inserted** pair, so items come out in reverse order:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
while d:
    key, value = d.popitem()
    print(key, value, value ** 2)
```

`popitem()` on an empty dictionary raises `KeyError`, so `while d:` (an empty dict is falsy) is the natural loop condition.

## Iterating: the dict, `keys()` or `items()`?

Iterating over a dictionary directly gives its keys, exactly like iterating over `d.keys()`:

```python run
d = dict.fromkeys('python', 0)
print(list(d) == list(d.keys()))
print(type(iter(d)).__name__, type(iter(d.keys())).__name__)
```

It's the same kind of iterator in both cases, so performance is the same. Use `for k in d` for plain key loops, and `d.keys()` when you want the view's set operations.

When you need both keys and values, iterate over `items()` rather than looking each value up again:

```python run
from timeit import timeit

d = {k: k * 2 for k in range(10_000)}

def with_items(d):
    for k, v in d.items():
        pass

def with_lookup(d):
    for k in d:
        v = d[k]

print('items():', timeit('with_items(d)', globals=globals(), number=500))
print('d[k]:   ', timeit('with_lookup(d)', globals=globals(), number=500))
```

Dictionary lookups are fast, but no lookup at all is faster: `items()` hands you the value it already found while walking the table.

<div class="takeaways">

## Key takeaways

- `keys()`, `values()` and `items()` return live views that reflect the dictionary's current state.
- Keys and items views are set-like: `&`, `|`, `-`, `^` and comparisons work and return/compare as sets (items need hashable values). The values view is not set-like.
- Adding or removing keys while iterating over the dict or any of its views raises `RuntimeError`; changing values is fine.
- To remove keys while looping, iterate over `list(d)`, build a new dict, or drain it with `popitem()`.
- Use `items()` when you need keys and values together; it avoids a lookup per key.

</div>
