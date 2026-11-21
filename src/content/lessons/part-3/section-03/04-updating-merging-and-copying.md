---
title: Updating, Merging and Copying
summary: Combine dictionaries with update, ** unpacking and the 3.9+ | and |= operators, and know when a copy is shallow and when you need deepcopy.
minutes: 16
---

## Updating in place

Assigning to an existing key replaces its value; the key keeps its original position in the order:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
d['b'] = 200
d
```

To apply many changes at once, use `update`. It accepts the same kinds of arguments as the `dict()` constructor: another mapping, an iterable of `(key, value)` pairs, keyword arguments, or a mapping/iterable plus keywords.

```python run
d1 = {'a': 1, 'b': 2}
d1.update({'c': 3, 'd': 4})
print(d1)

d1 = {'a': 1, 'b': 2}
d1.update(b=20, c=30)
print(d1)

d1 = {'a': 1, 'b': 2}
d1.update([('c', 3), ['d', 4]])
print(d1)
```

Any iterable of pairs works, including a generator expression:

```python run
d = {'a': 1, 'b': 2}
d.update((ch, ord(ch)) for ch in 'python')
print(d)
```

When a key already exists, its value is **overwritten** by the new one (and it stays in its old position). New keys are appended at the end:

```python run
d1 = {'a': 1, 'b': 2, 'c': 3}
d1.update({'b': 200, 'd': 4})
print(d1)
```

`update` mutates the dict and returns `None`, like `list.sort`. Writing `d = d.update(...)` is a classic bug.

## Merging into a new dict with `**`

Just as `*` unpacks an iterable into a list or tuple display, `**` unpacks a mapping into a dict display. You can unpack as many dicts as you like, mixed with literal items, and **the last value for a key wins**:

```python run
l1 = [1, 2, 3]
print((*l1, *'abc'))

d1 = {'a': 1, 'b': 2}
d2 = {'b': 200, 'c': 3}
print({**d1, **d2})
print({**d1, **d2, 'a': 'override'})
```

This is perfect for layered configuration, where later layers override earlier ones:

```python run
conf_defaults = dict.fromkeys(('host', 'port', 'user', 'pwd', 'database'), None)
conf_global = {'port': 5432, 'database': 'deepdive'}
conf_dev = {'host': 'localhost', 'user': 'test', 'pwd': 'test'}
conf_prod = {'host': 'prodpg.example.com', 'user': '$prod_user',
             'pwd': '$prod_pwd', 'database': 'deepdive_prod'}

config_dev = {**conf_defaults, **conf_global, **conf_dev}
config_prod = {**conf_defaults, **conf_global, **conf_prod}
print(config_dev)
print(config_prod)
```

Starting from `conf_defaults` pins the key order and guarantees every setting is present, even if no layer provides it.

### `**` in function calls

In a call, `**d` passes a dict's items as keyword arguments. For named keyword-only parameters, the dict's order doesn't matter; for `**kwargs`, the function receives the items in the dict's order:

```python run
def connect(*, host, port, user):
    print(f'{user}@{host}:{port}')

opts = {'port': 5432, 'user': 'test', 'host': 'localhost'}
connect(**opts)

def show(**kwargs):
    for k, v in kwargs.items():
        print(k, v)

show(**opts)
```

## The merge operators `|` and `|=` (3.9+)

Python 3.9 added operators for merging, matching the set union operator:

- `d1 | d2` returns a **new** dict with the items of `d1`, then `d2` (the right side wins on conflicts);
- `d1 |= d2` updates `d1` **in place**, like `d1.update(d2)`.

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'b': 200, 'c': 3}

merged = d1 | d2
print(merged, d1)

d1 |= d2
print(d1)
```

The two differ in what they accept. `|` needs a dict on both sides, while `|=`, like `update`, accepts any mapping or iterable of pairs:

```python run
d = {'a': 1}
try:
    d | [('b', 2)]
except TypeError as ex:
    print('TypeError:', ex)

d |= [('b', 2)]
print(d)
```

<div class="callout modern">
<span class="callout-title">Which merge should I use?</span>

On Python 3.9+, `d1 | d2` is the most readable way to merge two dicts into a new one, and `d1 |= d2` is a concise `update`. `{**d1, **d2}` still works everywhere and is handy when mixing in literal items. Older code may use `dict(d1, **d2)`, which only works when `d2`'s keys are all strings. There's also `collections.ChainMap`, which *views* several dicts as one without copying anything; it's covered with the specialized dictionaries.

</div>

## Copying: shallow vs deep

`d.copy()` makes a **shallow** copy: a new dict whose entries refer to the **same** value objects. Adding, removing or re-binding keys in one doesn't affect the other:

```python run
d = {'a': [1, 2], 'b': [3, 4]}
d1 = d.copy()
print(d is d1)

del d['a']
d['b'] = 100
print(d)
print(d1)
```

But *mutating* a shared value is visible through both, because there's only one value object:

```python run
d = {'a': [1, 2], 'b': [3, 4]}
d1 = d.copy()
d['a'].append(100)
print(d1)
print(d['a'] is d1['a'])
```

This bites hardest with nested data, such as a parsed JSON document:

```python run
d = {'id': 123445,
     'person': {'name': 'John', 'age': 78},
     'posts': [100, 105, 200]}

d1 = d.copy()
d1['person']['name'] = 'John Cleese'
d1['posts'].append(300)
print(d)      # the original changed too!
```

To copy everything, all the way down, use `copy.deepcopy`. It recursively copies nested containers (and keeps track of objects it has already copied, so shared references and cycles are handled):

```python run
from copy import deepcopy

d = {'id': 123445,
     'person': {'name': 'John', 'age': 78},
     'posts': [100, 105, 200]}

d1 = deepcopy(d)
d1['person']['name'] = 'John Cleese'
d1['posts'].append(300)
print(d1)
print(d)      # untouched
```

### Which shallow copy is fastest?

`d.copy()`, `dict(d)`, `{**d}` and `d | {}` all produce shallow copies. How do they compare with a comprehension?

```python run
from timeit import timeit

big_d = {k: k * 2 for k in range(100_000)}

tests = {
    'd.copy()':  lambda: big_d.copy(),
    'dict(d)':   lambda: dict(big_d),
    '{**d}':     lambda: {**big_d},
    'comprehension': lambda: {k: v for k, v in big_d.items()},
}
for name, fn in tests.items():
    print(f'{name:<14} {timeit(fn, number=20):.4f}s')
```

The first three are close to each other (the exact numbers vary between runs and machines); the comprehension is several times slower, since it runs a Python-level loop and re-inserts every key. Use `.copy()` (or `dict(d)`) for a plain copy, `**` or `|` when you're combining dicts, and save comprehensions for when you're *transforming* items.

<div class="takeaways">

## Key takeaways

- `update` merges in place from a mapping, an iterable of pairs or keyword arguments; existing keys are overwritten and keep their position.
- `{**d1, **d2}` and (3.9+) `d1 | d2` build a new merged dict; the right-most value for a key wins. `d1 |= d2` updates in place and accepts any iterable of pairs.
- `.copy()`, `dict(d)`, `{**d}` and `d | {}` are **shallow** copies: nested mutable values are shared.
- Use `copy.deepcopy` when nested data must be fully independent.

</div>
