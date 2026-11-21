---
title: ChainMap
summary: ChainMap presents several mappings as one, without copying them. Lookups search the maps in order and return the first match, while every write goes to the first map only.
minutes: 15
---

## Merging without copying

Say you have several dictionaries and want to treat them as one. You already know two ways to build a combined dictionary:

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'c': 3, 'd': 4}
d3 = {'e': 5, 'f': 6}

merged = {**d1, **d2, **d3}      # or: d1 | d2 | d3 (Python 3.9+)
print(merged)
```

Both **copy** every key and value into a new dictionary. For large mappings that's wasted work and memory, and the copy goes stale as soon as one of the originals changes.

`collections.ChainMap` takes a different approach. It keeps references to the original mappings and searches through them on demand:

```python run
from collections import ChainMap

d = ChainMap(d1, d2, d3)
print(d)
print(d['a'], d['e'], len(d))
print(isinstance(d, dict))
```

A `ChainMap` is **not** a `dict`, but it implements the full mutable mapping interface (`[]`, `get`, `in`, `len`, `keys()`, `items()`, `update`, `pop` and so on), so you can use it almost anywhere a dictionary is expected.

## Lookups: the first match wins

When the same key appears in more than one map, the lookup returns the value from the **first** map in the chain that has it:

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'b': 20, 'c': 3}
d3 = {'c': 30, 'd': 4}
d = ChainMap(d1, d2, d3)

print(d['b'], d['c'])
```

That's the reverse of `{**d1, **d2, **d3}`, where *later* dictionaries overwrite earlier ones:

```python run
{**d1, **d2, **d3}
```

Iterating gives each key once, paired with the value a lookup would return:

```python run
list(d.items())
```

<div class="callout modern">
<span class="callout-title">Iteration order is now predictable</span>

Older notebooks warn that the iteration order of a `ChainMap` isn't guaranteed. In current Python it's deterministic: the keys are collected by walking the maps **from last to first**, so keys from the last map come first and each key keeps the position where it was first seen during that walk. That's why `d` above lists `c` and `d` (from `d3`) before `b` and `a`. Don't build logic on that order, but it no longer changes from run to run.

</div>

## Writes only touch the first map

Every mutation (insert, update or delete) acts on the **first** map in the chain, and only that one.

**Inserting** a new key adds it to the first map:

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'c': 3, 'd': 4}
d = ChainMap(d1, d2)

d['z'] = 100
print(d1)
print(d2)
```

**Updating** a key that lives in a later map doesn't change that map either. The key is *added* to the first map, where it now shadows the old value:

```python run
d['c'] = 300
print(d['c'])
print(d1)
print(d2)     # unchanged
```

**Deleting** removes the key from the first map. If the key also exists further down the chain, it reappears:

```python run
d1 = {'a': 1}
d2 = {'a': 100}
d = ChainMap(d1, d2)

del d['a']
print(d['a'])    # the value from d2 shows through
```

And deleting a key that isn't in the first map fails, even if the chain as a whole contains it:

```python run
try:
    del d['a']
except KeyError as ex:
    print('KeyError:', ex)
```

## A live view

A `ChainMap` holds its maps **by reference**, so changes made directly to an underlying dictionary show up immediately:

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'c': 3}
d = ChainMap(d1, d2)

d2['g'] = 7
print(d['g'])
```

## Managing the chain

The list of mappings is exposed as the `maps` attribute. It's an ordinary list, and you can change it in place:

```python run
d = ChainMap({'a': 1, 'b': 2}, {'c': 3, 'd': 4})
print(type(d.maps), d.maps)

d.maps.insert(0, {'a': 100})   # new first map shadows 'a'
d.maps.append({'e': 5})        # new last map
print(d['a'], d['e'])
del d.maps[1]                  # drop {'a': 1, 'b': 2}
print(d.maps)
```

Two helpers build **new** chains that share the same underlying maps:

- `new_child(m=None)` returns a chain with `m` (or a new empty dict) in **front**, followed by all the current maps. Since Python 3.10 you can also pass keyword arguments: `new_child(x=1)`.
- `parents` returns a chain of every map **except the first**.

```python run
base = ChainMap({'a': 1, 'b': 2}, {'c': 3, 'd': 4})

child = base.new_child({'d': 400, 'e': 5})
print(child)
print(child['d'])
print(child.parents)
```

You can also nest a `ChainMap` inside another, but `new_child` keeps the chain flat, which is easier to read. Where you put the new map matters: in front, it overrides; at the back, it only fills in missing keys.

<div class="callout note">
<span class="callout-title">The | operator (Python 3.9+)</span>

`ChainMap` supports `|` and `|=` like `dict`. `chain | other` returns a new `ChainMap` whose first map is a **copy** of the original first map, updated with `other`. The rest of the chain is shared, not copied. `chain |= other` updates the first map in place.

</div>

## Layered scopes

This "search in order, write to the front" behavior is exactly how nested scopes work. Python's own name lookup (local, then global, then built-ins) can be modeled with a `ChainMap`:

```python run
import builtins

local_ns = {'x': 'local x'}
global_ns = {'x': 'global x', 'y': 'global y'}
lookup = ChainMap(local_ns, global_ns, vars(builtins))

print(lookup['x'], '|', lookup['y'], '|', lookup['len'])
lookup['y'] = 'assigned'         # assignment creates a *local* name
print(local_ns, global_ns['y'])
```

Interpreters, template engines and command-line tools use the same idea: `new_child()` to enter a scope, `parents` to leave it.

## Example: temporary settings

A common use is to override some settings without touching the originals. Put an empty dict at the front of the chain. All changes land there, and the base configuration is left intact:

```python run
config = {
    'host': 'prod.example.com',
    'port': 5432,
    'database': 'deepdive',
    'user_id': '$pg_user',
    'user_pwd': '$pg_pwd',
}

local_config = ChainMap({}, config)    # same as ChainMap(config).new_child()
local_config['user_id'] = 'test'
local_config['user_pwd'] = 'test'

print(local_config['host'], local_config['user_id'])
print(config['user_id'])               # untouched
print(local_config.maps[0])            # only the overrides
```

To discard the overrides, simply drop `local_config` (or use `local_config.parents`). No copy of `config` was ever made.

The same pattern handles layered configuration: command-line options, then environment variables, then defaults:

```python
settings = ChainMap(cli_args, env_vars, defaults)
```

<div class="takeaways">

## Key takeaways

- `ChainMap(m1, m2, ...)` presents several mappings as one **without copying** them; it's a live view.
- Lookups return the value from the **first** map that has the key (the opposite of `{**m1, **m2}`).
- Inserts, updates and deletes affect **only the first map**. A deleted key can reappear from a later map.
- `maps` is the editable list of mappings; `new_child()` adds a map in front and `parents` drops the first one.
- Use it for layered scopes and settings: an empty first map collects changes and leaves the base intact.

</div>
