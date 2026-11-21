---
title: Dictionary Views
summary: keys(), values() and items() return live views of a dictionary, and the key and item views support set operations like union, intersection and difference.
minutes: 15
---

## Three ways to look at a dict

A dictionary offers three **views**:

- `d.keys()`: the keys
- `d.values()`: the values
- `d.items()`: `(key, value)` tuples

```python run
d1 = {'a': 1, 'b': 2, 'c': 3}

print(d1.keys())
print(d1.values())
print(d1.items())

for k, v in d1.items():      # unpack each tuple as you iterate
    print(k, v)
```

Iterating over the dict itself is the same as iterating over `d1.keys()`, so `for key in d1:` is the usual spelling.

All three views iterate in the same order, the dict's insertion order, as long as the dict isn't modified in between. So keys and values always line up:

```python run
list(d1.items()) == list(zip(d1.keys(), d1.values()))
```

## Views are live, and reusable

A view doesn't copy anything. It's a thin object that holds a reference to the dict and reads from it on demand. Two consequences:

**You can iterate it again and again** (it's an *iterable*, not a one-shot iterator):

```python run
keys = d1.keys()
print(list(keys))
print(list(keys))
```

**It reflects changes to the dict immediately:**

```python run
d1['z'] = 10
print(keys)
del d1['z']
print(keys)
```

That makes views cheap: `d.keys()` on a million-item dict costs the same as on an empty one. If you need a snapshot that won't change, make one explicitly with `list(d.keys())`.

<div class="callout modern">
<span class="callout-title">Newer view features</span>

Since Python 3.8 you can iterate a dict and its views in reverse with `reversed(d)` or `reversed(d.items())`. Since 3.10 every view has a `.mapping` attribute, a read-only proxy of the dict it belongs to.

```python run
print(list(reversed(d1)))
print(list(reversed(d1.items())))
print(d1.keys().mapping)
```

</div>

## Keys views behave like sets

Dictionary keys are unique and hashable, which are exactly the properties of set elements. So a keys view supports the set operators: `|` (union), `&` (intersection), `-` (difference) and `^` (symmetric difference), plus comparisons like `==` and `<=`.

```python run
d1 = {'a': 1, 'b': 2, 'c': 3}
d2 = {'c': 30, 'd': 4, 'e': 5}

union = d1.keys() | d2.keys()
print(type(union))
print(sorted(union))
print(d1.keys() & d2.keys())
print(sorted(d1.keys() - d2.keys()))
print(d1.keys() == {'a', 'b', 'c'})
```

The result of a set operation is a real `set`, **not** a view, and sets are unordered. The dict's insertion order is lost. (For string keys the order a set prints in can even change from one run to the next, because string hashes are randomized at startup. That's why the cells here use `sorted()` to print.)

### Items views: sometimes

An items view is set-like too, since each `(key, value)` tuple is unique (the keys are). Note that `('c', 3)` and `('c', 30)` are different tuples, so both survive a union:

```python run
print(sorted(d1.items() | d2.items()))
```

But a set can only hold hashable elements, and a tuple is hashable only if everything in it is. If any value is unhashable, the operation fails:

```python run
d3 = {'a': [1, 2], 'b': [3, 4]}
d4 = {'b': [30, 40], 'c': [5, 6]}
try:
    d3.items() | d4.items()
except TypeError as ex:
    print('TypeError:', ex)
```

### Values views: never

Values can repeat and needn't be hashable, so a values view has no set operations at all:

```python run
try:
    d1.values() | d2.values()
except TypeError as ex:
    print('TypeError:', ex)
```

## Putting views to work

**Common keys, with both values.** The intersection finds the shared keys, and a comprehension builds the result:

```python run
d1 = {'a': 1, 'b': 2, 'c': 3}
d2 = {'b': 2, 'c': 30, 'd': 4}

common = {key: (d1[key], d2[key]) for key in d1.keys() & d2.keys()}
print(dict(sorted(common.items())))
```

Because the keys come from a set, the order of `common` isn't predictable. If you want to keep `d1`'s order, iterate over `d1` and test membership instead: `{k: (d1[k], d2[k]) for k in d1 if k in d2}`.

**Keys in one dict or the other, but not both.** You can get these as `union - intersection`, or in one step with the symmetric difference `^`:

```python run
d1 = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
d2 = {'a': 10, 'b': 20, 'c': 30, 'e': 5}

union = d1.keys() | d2.keys()
intersection = d1.keys() & d2.keys()
print(sorted(union - intersection))
print(sorted(d1.keys() ^ d2.keys()))
```

Each of those keys lives in exactly one of the dicts, so we can fetch its value from whichever one has it:

```python run
result = {key: d1[key] if key in d1 else d2[key]
          for key in d1.keys() ^ d2.keys()}
print(dict(sorted(result.items())))
```

<div class="callout note">
<span class="callout-title">Beware of <code>get(...) or get(...)</code></span>

A tempting shortcut is `d1.get(key) or d2.get(key)`: one of the two is `None`, so `or` picks the other. It breaks as soon as a real value is *falsy* (`0`, `''`, `[]`), because `or` skips it too:

```python run
d1 = {'x': 0}
d2 = {'y': 7}
print({k: d1.get(k) or d2.get(k) for k in d1.keys() ^ d2.keys()}['x'])
```

`x` really is `0`, but the expression produced `None`. Test membership with `in` instead.

</div>

<div class="takeaways">

## Key takeaways

- `keys()`, `values()` and `items()` return **views**: live, lightweight, reusable iterables that reflect every change to the dict.
- All three iterate in insertion order and stay aligned with each other.
- Keys views support set operations (`|`, `&`, `-`, `^`). Items views do too, if all values are hashable. Values views never do.
- Set operations return a plain, **unordered** `set`. Iterate over the original dict when order matters.

</div>
