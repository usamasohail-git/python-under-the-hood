---
title: Dictionaries
summary: Mapping keys to values. Creating and updating dicts, get versus [], views and iteration, dict comprehensions, merging with | and the pitfalls of mutable defaults.
minutes: 13
---

## Creating dictionaries

A `dict` maps **keys** to **values**. Each key appears at most once, and looking up a value by its key is fast, because dictionaries are hash tables. There are several ways to make one:

```python run
ages = {'ann': 31, 'bo': 25}
also = dict(ann=31, bo=25)                    # keyword arguments (string keys only)
from_pairs = dict([('ann', 31), ('bo', 25)])  # any iterable of pairs
zipped = dict(zip(['ann', 'bo'], [31, 25]))
print(ages == also == from_pairs == zipped)
print({}, dict())
```

Keys must be **hashable** (strings, numbers, tuples of hashables…); values can be anything:

```python run
grid = {(0, 0): 'start', (2, 3): 'goal'}
print(grid[(2, 3)])
try:
    {['a']: 1}
except TypeError as ex:
    print('TypeError:', ex)
```

A **dict comprehension** builds a dictionary from `key: value` expressions:

```python run
squares = {n: n * n for n in range(5)}
print(squares)
words = ['apple', 'fig', 'banana']
print({w: len(w) for w in words if len(w) > 3})
```

## Reading values: `[]` versus `get`

`d[key]` returns the value, or raises `KeyError` if the key is missing. `d.get(key, default)` returns the default instead (or `None` if you don't give one):

```python run
stock = {'apples': 3, 'pears': 0}
print(stock['apples'])
try:
    stock['kiwis']
except KeyError as ex:
    print('KeyError:', ex)
print(stock.get('kiwis'), stock.get('kiwis', 0))
```

Use `[]` when a missing key is a bug you want to hear about, and `get` when absence is normal. Test for a key with `in`, which checks **keys**, not values:

```python run
print('pears' in stock, 3 in stock, 3 in stock.values())
```

Notice that `stock.get('pears')` gives `0`, a falsy value. Write `if 'pears' in stock:` rather than `if stock.get('pears'):` when you mean "is the key there?".

## Adding, changing and removing

Assigning to a key adds it or replaces its value:

```python run
stock['kiwis'] = 12        # add
stock['apples'] += 2       # update
del stock['pears']         # remove (KeyError if missing)
print(stock)
print(stock.pop('kiwis'), stock)
print(stock.pop('mangos', 'none left'))
```

| Method | What it does |
|---|---|
| `d.get(k, default)` | value for `k`, or `default` |
| `d.setdefault(k, default)` | value for `k`; inserts `default` first if missing |
| `d.pop(k[, default])` | remove `k` and return its value |
| `d.popitem()` | remove and return the last inserted `(key, value)` |
| `d.update(other)` | copy in keys and values from another mapping or pairs |
| `d.keys()`, `d.values()`, `d.items()` | live views of the contents |
| `d.copy()`, `d.clear()` | shallow copy / empty the dict |
| `dict.fromkeys(keys, value)` | new dict with every key set to `value` |

```python run
config = {'debug': False}
config.update({'debug': True, 'level': 3})
print(config)
print(config.setdefault('theme', 'dark'), config)
print(config.popitem(), config)
```

## Merging with `|` (Python 3.9)

<div class="callout modern">
<span class="callout-title">The merge operators</span>

Since Python 3.9, `a | b` returns a new dict with the keys of both; where a key appears in both, the right-hand value wins. `a |= b` updates `a` in place. Older code uses `{**a, **b}` or `a.update(b)`.

```python run
defaults = {'color': 'blue', 'size': 'M'}
user = {'size': 'L'}
print(defaults | user)
print({**defaults, **user})
defaults |= user
print(defaults)
```

</div>

## Iterating

Looping over a dict gives you its **keys**. Use `.items()` to get key/value pairs and unpack them in the loop:

```python run
prices = {'tea': 2.5, 'coffee': 3.0, 'cake': 4.25}
for name in prices:
    print(name, end=' ')
print()
for name, price in prices.items():
    print(f'{name:>7}: {price:.2f}')
```

Dictionaries keep **insertion order**: items come back in the order the keys were first added. Changing an existing key's value doesn't move it.

<div class="callout modern">
<span class="callout-title">Insertion order is guaranteed (Python 3.7)</span>

CPython 3.6 started preserving insertion order as an implementation detail, and Python 3.7 made it part of the language. Older code often used `collections.OrderedDict` for this; today a plain dict is enough in most cases.

</div>

`keys()`, `values()` and `items()` return **views**, not copies. They reflect later changes to the dictionary, and key views support set operations:

```python run
keys = prices.keys()
prices['juice'] = 3.5
print(keys)
print(keys & {'tea', 'water'})
```

To sort by value, pass a `key` function to `sorted`:

```python run
print(sorted(prices.items(), key=lambda kv: kv[1], reverse=True))
```

### Don't resize a dict while iterating

Adding or deleting keys during a loop over the dict raises `RuntimeError`. Loop over a snapshot (`list(d)`) or build a new dict:

```python run
scores = {'ann': 90, 'bo': 45, 'cy': 72}
try:
    for name in scores:
        if scores[name] < 50:
            del scores[name]
except RuntimeError as ex:
    print('RuntimeError:', ex)

scores = {'ann': 90, 'bo': 45, 'cy': 72}
passed = {k: v for k, v in scores.items() if v >= 50}
print(passed)
```

(Changing the *value* of an existing key during iteration is fine.)

## Counting and grouping

Two patterns come up constantly. Counting uses `get` with a default of `0`; grouping uses `setdefault` to create each list once:

```python run
text = 'the cat and the hat and the bat'
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts)

by_letter = {}
for word in ['apple', 'avocado', 'banana', 'blueberry', 'cherry']:
    by_letter.setdefault(word[0], []).append(word)
print(by_letter)
```

The standard library has ready-made tools for both: `collections.Counter` and `collections.defaultdict`.

```python run
from collections import Counter, defaultdict

print(Counter(text.split()).most_common(2))
groups = defaultdict(list)
for word in ['apple', 'avocado', 'banana']:
    groups[word[0]].append(word)
print(dict(groups))
```

## Mutable values and shared references

`dict.fromkeys` uses the **same** object as every value. With a mutable value like a list, that's the same trap as `[[]] * 3`:

```python run
shared = dict.fromkeys(['a', 'b'], [])
shared['a'].append(1)
print(shared)

separate = {k: [] for k in ['a', 'b']}
separate['a'].append(1)
print(separate)
```

`copy()` is shallow too: the copy has its own keys, but nested lists or dicts are still shared. Use `copy.deepcopy` for nested data.

<div class="callout note">
<span class="callout-title">Where to go deeper</span>

[Part 3 · Dictionaries](/part-3/section-03/) explains hash tables, hashing rules, views, ordering and dictionary performance in depth. Shared references and shallow versus deep copies are covered in [Part 1 · Variables and Memory](/part-1/section-03/).

</div>

<div class="takeaways">

## Key takeaways

- A dict maps unique, hashable keys to any values; create one with `{}`, `dict()` or a comprehension.
- `d[k]` raises `KeyError` for a missing key; `d.get(k, default)` doesn't. `in` tests keys.
- Iterating a dict yields keys; use `.items()` for pairs. Insertion order is guaranteed since 3.7.
- `a | b` (3.9+) merges into a new dict, with the right side winning; `|=` updates in place.
- Don't add or delete keys while looping over a dict; loop over `list(d)` or build a new dict.
- `dict.fromkeys(keys, [])` shares one list across all keys; use a comprehension instead.

</div>
