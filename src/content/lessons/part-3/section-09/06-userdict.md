---
title: UserDict
summary: Subclassing dict and overriding __getitem__ or __setitem__ only half works, because dict's own methods bypass your overrides. UserDict is a dict wrapper written in Python that routes everything through them.
minutes: 14
---

## The goal: a custom dictionary

Suppose we want a dictionary that only accepts real numbers as values and always hands them back as truncated integers. We need control over two operations: storing a value (`__setitem__`) and reading one (`__getitem__`).

### Attempt 1: wrap a dict

The simplest approach is a class that keeps a plain dict inside and implements just those two methods:

```python run
from numbers import Real

class IntDict:
    def __init__(self):
        self._d = {}

    def __setitem__(self, key, value):
        if not isinstance(value, Real):
            raise ValueError('Value must be a real number.')
        self._d[key] = value

    def __getitem__(self, key):
        return int(self._d[key])

d = IntDict()
d['a'] = 10.5
print(d['a'])
try:
    d['b'] = 3 + 2j
except ValueError as ex:
    print('ValueError:', ex)
```

The rules work, but this object can do almost nothing else. There's no `get`, `update`, `keys()`, `len()`, `in`, iteration... We'd have to write every method a dictionary normally has.

### Attempt 2: subclass dict

Inheritance seems like the answer: subclass `dict`, override the two methods, and inherit the rest.

```python run
class IntDict(dict):
    def __setitem__(self, key, value):
        if not isinstance(value, Real):
            raise ValueError('Value must be a real number.')
        super().__setitem__(key, value)

    def __getitem__(self, key):
        return int(super().__getitem__(key))

d = IntDict()
d['a'] = 10.5
d['b'] = 100.5
print(d['a'], d['b'], list(d.keys()))
try:
    d['c'] = 'python'
except ValueError as ex:
    print('ValueError:', ex)
```

So far so good. Now try the inherited methods:

```python run
print(d.get('a'))         # expected 10
print(dict(d))            # expected {'a': 10, 'b': 100}

d.update({'x': 'python'}) # expected a ValueError...
print(d)

d2 = IntDict(y='not a number')   # ...and here
print(d2)
```

Every one of these **ignored** our overrides. `get` returned the raw `10.5`, `dict(d)` copied raw values, and `update` and the constructor happily stored strings.

## Why: built-ins don't call your dunder methods

`dict` is implemented in C. Its methods work on the underlying hash table directly; `dict.get` doesn't look up `self.__getitem__` and call it, and `dict.update` doesn't call `self.__setitem__` for each key. That's what makes them fast, and it's a deliberate design decision. The same holds for `list` and `str`.

The only things guaranteed to use your overrides are the operations you overrode: `d[key]` and `d[key] = value`. Everything else may or may not, and you'd have to override `get`, `update`, `setdefault`, `__init__`, `copy`, `pop`, `__ior__` and more to plug every hole.

<div class="callout note">
<span class="callout-title">Subclassing dict is still fine for some things</span>

Subclassing `dict` works well when you **add** behavior instead of changing how values are stored or read: extra methods, a `__missing__` hook (that's how `defaultdict` and `Counter` are built), or a custom `__repr__`. The trouble starts when you override `__getitem__`/`__setitem__` and expect the rest of `dict` to honor them.

</div>

## UserDict to the rescue

`collections.UserDict` is a dictionary class written **in Python**. It stores the real data in a plain dict in its `data` attribute, and it gets its higher-level methods from `collections.abc.MutableMapping`, which implements them in terms of `__getitem__`, `__setitem__`, `__delitem__`, `__iter__` and `__len__`. So when you override one of those, everything built on top of it follows.

```python run
from collections import UserDict

class IntDict(UserDict):
    def __setitem__(self, key, value):
        if not isinstance(value, Real):
            raise ValueError('Value must be a real number.')
        super().__setitem__(key, value)

    def __getitem__(self, key):
        return int(super().__getitem__(key))

d = IntDict()
d['a'] = 10.5
d['b'] = 100.5
print(d.get('a'))
print(dict(d))
```

Now `get` and `dict(d)` go through `__getitem__`. The same goes for the constructor and `update`, which go through `__setitem__`:

```python run
for attempt in (lambda: IntDict({'a': 'python'}), lambda: d.update({'x': 'python'})):
    try:
        attempt()
    except ValueError as ex:
        print('ValueError:', ex)
print(d)
```

The underlying dictionary is available as `.data`, and it's a real `dict`:

```python run
d1 = IntDict({'a': 1.1, 'b': 2.2, 'c': 3.3})
print(d1)                      # repr shows the stored values
print(d1['a'], d1['b'], d1['c'])
print(type(d1.data), d1.data)
```

The repr shows the *stored* values (`1.1`, ...), not the truncated ones. That's reasonable: the repr describes what is actually inside, so the object could be rebuilt from it.

<div class="callout tip">
<span class="callout-title">Trade-offs</span>

A `UserDict` instance is **not** a `dict`: `isinstance(d, dict)` is `False`, though `isinstance(d, collections.abc.MutableMapping)` is `True`. Code that type-checks for `dict` (some JSON encoders, for example) may reject it; pass `d.data` or `dict(d)` there. And because its methods are written in Python, it's slower than a real `dict`. You trade speed for predictable inheritance.

</div>

```python run
from collections.abc import MutableMapping
print(isinstance(d, dict), isinstance(d, MutableMapping))
```

## Example: a constrained dictionary

Let's write a dictionary that accepts only a fixed set of keys, with integer values in a given range. A color with `red`, `green` and `blue` channels from 0 to 255 is a good test case. The constructor takes the constraints first and passes any initial data on to `UserDict.__init__`, which stores it through our `__setitem__`. The constraints must therefore be set **before** calling `super().__init__`:

```python run
class LimitedDict(UserDict):
    def __init__(self, keyset, min_value, max_value, *args, **kwargs):
        self._keyset = keyset
        self._min_value = min_value
        self._max_value = max_value
        super().__init__(*args, **kwargs)

    def __setitem__(self, key, value):
        if key not in self._keyset:
            raise KeyError(f'Invalid key name: {key!r}')
        if not isinstance(value, int):
            raise ValueError('Value must be an integer type.')
        if not self._min_value <= value <= self._max_value:
            raise ValueError(f'Value must be between {self._min_value} and {self._max_value}')
        super().__setitem__(key, value)

color = LimitedDict({'red', 'green', 'blue'}, 0, 255, red=10, green=10, blue=10)
color['red'] = 200
print(color)

for key, value in [('purple', 100), ('red', 300), ('blue', 'x')]:
    try:
        color[key] = value
    except (KeyError, ValueError) as ex:
        print(type(ex).__name__, ex)
```

The rules also hold for `update` and the constructor, with no extra code:

```python run
try:
    LimitedDict({'red'}, 0, 255, red=999)
except ValueError as ex:
    print('ValueError:', ex)
```

<div class="takeaways">

## Key takeaways

- Overriding `__getitem__`/`__setitem__` in a `dict` subclass doesn't affect `get`, `update`, the constructor, `dict(d)` and other built-in methods; they're C code that accesses the data directly.
- `UserDict` keeps its data in a plain dict (`.data`) and builds every method on the core dunder methods, so overriding them changes all the related behavior.
- `UserDict` isn't a `dict` subclass and is slower, but its inheritance behaves the way you'd expect from a Python class.
- Subclass `dict` to *add* behavior (`__missing__`, extra methods); subclass `UserDict` (or `MutableMapping`) to *change* how items are stored or read.

</div>
