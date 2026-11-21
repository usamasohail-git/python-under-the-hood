---
title: MappingProxyType
summary: types.MappingProxyType wraps a dictionary in a read-only view that still reflects changes made to the original, the same protection Python gives every class's __dict__.
minutes: 10
---

## You've already met one

Look at the `__dict__` of a class:

```python run
class Test:
    a = 100

print(type(Test.__dict__))
Test.__dict__
```

It isn't a `dict` but a `mappingproxy`. It reads like a dictionary, but you can't write to it:

```python run
print(Test.__dict__['a'])
try:
    Test.__dict__['a'] = 200
except TypeError as ex:
    print('TypeError:', ex)
```

Python does this on purpose. Changing a class has side effects that the interpreter must know about (for example, method caches have to be invalidated), so all changes have to go through `setattr` / `Test.a = ...`, which handles them correctly. The proxy lets you *inspect* the namespace freely while blocking the back door.

```python run
Test.b = 'added via setattr'
print(Test.__dict__['b'])
```

<div class="callout modern">
<span class="callout-title">New entries in class namespaces (Python 3.13)</span>

On Python 3.13 a class `__dict__` contains two entries older notebooks don't show: `__firstlineno__` (the line where the class was defined) and `__static_attributes__` (the names assigned as `self.<name>` inside the class's methods). Both are set by the compiler; you can ignore them here.

</div>

## Making your own read-only view

The type is available as `types.MappingProxyType`. Wrap any mapping in it:

```python run
from types import MappingProxyType

d = {'a': 1, 'b': 2}
mp = MappingProxyType(d)

print(list(mp.keys()), list(mp.values()), list(mp.items()))
print(mp['a'], mp.get('c', 'not found'), 'b' in mp, len(mp))
```

All the *reading* operations of a dictionary work: lookup, `get`, `in`, `len`, iteration and the three views. None of the *writing* operations exist:

```python run
try:
    mp['a'] = 100
except TypeError as ex:
    print('TypeError:', ex)

try:
    del mp['a']
except TypeError as ex:
    print('TypeError:', ex)

print(hasattr(mp, 'update'), hasattr(mp, 'pop'), hasattr(mp, 'clear'))
```

In terms of the abstract base classes, a proxy is a `Mapping` but not a `MutableMapping` (and not a `dict`):

```python run
from collections.abc import Mapping, MutableMapping
print(isinstance(mp, Mapping), isinstance(mp, MutableMapping), isinstance(mp, dict))
```

## A live view, not a copy

The proxy doesn't copy anything; it wraps the original dictionary. Change the dictionary and the proxy sees the change immediately, just as the `keys()`, `values()` and `items()` views do:

```python run
d['a'] = 100
d['c'] = 'new item'
mp
```

That's the key difference from handing out a copy: whoever holds the proxy always sees the current state, and only the code holding the original `d` can change it.

## Read-only is shallow

The proxy prevents changes to the mapping itself (which keys exist and which objects they refer to). It does **not** freeze the values. If a value is mutable, you can still mutate it through the proxy:

```python run
settings = {'hosts': ['alpha', 'beta']}
view = MappingProxyType(settings)

view['hosts'].append('gamma')    # mutates the list, not the mapping
settings
```

If the values need protecting too, store immutable values (tuples instead of lists, nested proxies or `frozenset`s), or hand out copies.

## Getting a mutable copy

`copy()` returns a **shallow copy** of the underlying mapping. For a proxy over a `dict`, that's a plain, independent `dict` you can modify:

```python run
cp = mp.copy()
print(type(cp))
cp['a'] = 'changed in the copy'
print(cp['a'], mp['a'])
```

`dict(mp)` does the same. The `|` operator (Python 3.9+) also works with a proxy on the left and returns a new `dict`, leaving the original untouched:

```python run
merged = mp | {'z': 26}
print(type(merged).__name__, merged)
```

## Pattern: exposing internal state safely

A typical use is a class that keeps a registry internally and lets other code look at it without being able to tamper with it. Return a proxy from a property:

```python run
class PluginRegistry:
    def __init__(self):
        self._plugins = {}
        self._view = MappingProxyType(self._plugins)   # one view, always current

    @property
    def plugins(self):
        return self._view

    def register(self, name, func):
        if name in self._plugins:
            raise ValueError(f'{name!r} is already registered')
        self._plugins[name] = func

registry = PluginRegistry()
registry.register('upper', str.upper)
registry.register('title', str.title)

print(list(registry.plugins))
print(registry.plugins['title']('hello world'))

try:
    registry.plugins['upper'] = None     # bypassing register() is impossible
except TypeError as ex:
    print('TypeError:', ex)
```

All changes must go through `register`, which can enforce its rules, while readers always see the up-to-date registry without anyone paying for a copy.

<div class="callout note">
<span class="callout-title">Read-only, not secure</span>

A proxy is a guard against *accidental* modification and a clear statement of intent. It isn't a security boundary: code that can reach `registry._plugins` can still change it. Python generally relies on conventions like the leading underscore for that.

</div>

<div class="takeaways">

## Key takeaways

- `types.MappingProxyType(d)` creates a read-only view of the mapping `d`; a class's `__dict__` is exactly such a proxy.
- All read operations work; item assignment and deletion raise `TypeError`, and methods like `update` and `pop` don't exist.
- The proxy is **live**: changes to the original dictionary show through it immediately.
- Protection is shallow: mutable values inside can still be mutated.
- `copy()` (or `dict(mp)`) gives a mutable shallow copy; `mp | other` returns a new `dict`.

</div>
