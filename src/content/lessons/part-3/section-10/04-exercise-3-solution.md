---
title: Exercise 3 - Solution
summary: Combining common and environment-specific JSON settings with ChainMap, why a single ChainMap loses nested defaults, and a recursive chain that fixes it without copying data.
minutes: 12
files: ['common.json', 'dev.json', 'prod.json']
---

## Loading the files

First, a small helper that reads `<env>.json` and returns the parsed dictionary:

```python run
import json

def load_settings(env):
    with open(f'{env}.json') as f:
        return json.load(f)

common = load_settings('common')
print(common['database'])
print(load_settings('prod'))
```

`json.load` turns JSON objects into ordinary Python dicts, so nested sections like `database` are dicts inside a dict.

## First try: one ChainMap

A `ChainMap` searches its maps in order, so putting the environment settings first makes them override the common ones:

```python run
from collections import ChainMap

def settings(env):
    return ChainMap(load_settings(env), load_settings('common'))

prod = settings('prod')
print(prod['logs']['level'])      # only in common: found there
print(prod['database'])
```

The top level works: `prod.json` has no `logs` section, so the lookup falls through to `common.json`. But `prod['database']` is just the `database` dict from `prod.json`. The `db_name`, `schema` and `port` from `common.json` are gone:

```python run
try:
    prod['database']['port']
except KeyError as ex:
    print('KeyError:', ex)
```

The `ChainMap` resolved the key `'database'` by taking the **first** value it found, which is a whole dictionary. It doesn't look *inside* values. A `ChainMap` is not recursive.

## Chaining nested dictionaries

The fix is to apply the same idea at every level: whenever a key holds a dictionary in **both** maps, its value in the combined view should itself be a `ChainMap` of the two sub-dictionaries (and so on, all the way down).

```python run
def chain_recursive(d1, d2):
    chain = ChainMap(d1, d2)
    for k, v in d1.items():
        if isinstance(v, dict) and isinstance(d2.get(k), dict):
            chain[k] = chain_recursive(v, d2[k])
    return chain
```

Only keys that exist in both maps with dict values need a sub-chain. A section that exists only in `d1` (like `operators` in `dev.json`) or only in `d2` (like `logs` for prod) is found by the outer chain anyway. Checking that `d2[k]` is a dict too guards against settings files that disagree about a key's type.

```python run
dev = chain_recursive(load_settings('dev'), load_settings('common'))
prod = chain_recursive(load_settings('prod'), load_settings('common'))

print(dev['logs']['level'], prod['logs']['level'])
print(prod['database']['port'], prod['database']['user'])
print(dev['data']['numerics']['type'], prod['data']['numerics']['type'])
print(dev['data']['numerics']['precision'])
print(dev['data']['operators'])
```

Every lookup now resolves the way you'd expect: overrides from the environment file, everything else from the defaults, at any depth.

## A side effect to know about

Look closely at `chain[k] = ...`. Writes to a `ChainMap` go to its **first** map, so this line replaces the nested dict inside `d1` (the environment settings we passed in) with a `ChainMap`:

```python run
env = load_settings('dev')
chained = chain_recursive(env, load_settings('common'))
print(type(env['database']).__name__)
```

Here that's harmless, because `load_settings` creates fresh dictionaries on every call and nobody else holds them. If you passed in dictionaries that other code also uses, they'd be modified. A variant that leaves both inputs untouched puts the sub-chains in a **new** map at the front of the chain:

```python run
def chain_recursive(d1, d2):
    nested = {
        k: chain_recursive(v, d2[k])
        for k, v in d1.items()
        if isinstance(v, dict) and isinstance(d2.get(k), dict)
    }
    return ChainMap(nested, d1, d2)

env = load_settings('dev')
dev = chain_recursive(env, load_settings('common'))
print(dev['database']['port'], dev['database']['user'])
print(type(env['database']).__name__)
```

## The finished function

```python run
def settings(env):
    return chain_recursive(load_settings(env), load_settings('common'))

prod = settings('prod')
dev = settings('dev')
print(prod['database']['user'], prod['database']['port'])
print(dev['logs']['level'], dev['data']['numerics']['type'])
```

No setting was ever copied into a merged dictionary: every value still lives in the dict loaded from its file, and the chains are only a lookup structure on top.

Two refinements to consider for real use:

- **Lists** are treated like any other value: an environment list replaces the common one entirely instead of being merged. If you need merged lists, handle them explicitly.
- If you need a real `dict` (for example to dump the effective settings back to JSON), convert recursively: `{k: to_dict(v) if isinstance(v, ChainMap) else v for k, v in chain.items()}`.

<div class="takeaways">

## Key takeaways

- A `ChainMap` resolves each key by taking the value from the first map that has it. It doesn't merge nested dictionaries.
- Chaining recursively (a sub-chain for every key that holds a dict in both maps) gives layered settings at any depth, without copying data.
- Assigning to a `ChainMap` writes into its first map, so be aware of whose dictionaries you mutate. Putting the sub-chains in a new front map avoids it.

</div>
