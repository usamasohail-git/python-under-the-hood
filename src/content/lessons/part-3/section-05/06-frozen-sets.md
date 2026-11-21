---
title: Frozen Sets
summary: frozenset is the immutable, hashable version of set, so it can be a set element or a dictionary key, and it powers order-insensitive caching.
minutes: 14
---

## An immutable set

`frozenset` is to `set` what `tuple` is to `list`: the same kind of collection, minus every method that would change it. No `add`, no `remove`, no `update`, no `|=` that mutates.

There's no literal syntax for it. You create one by calling `frozenset()` with an iterable, exactly the way you'd call `set()`:

```python run
fs = frozenset('abc')
print(type(fs), sorted(fs))
print(frozenset())            # the empty frozenset
print(hasattr(fs, 'add'), hasattr(set(), 'add'))
```

## Hashable, so it can go anywhere a key can

Because its contents can never change, a frozenset (of hashable elements) can safely compute a hash from those contents, and that hash stays valid forever. A plain set can't offer that, so it refuses to be hashed at all:

```python run
s1 = {'a', 'b', 'c'}
try:
    hash(s1)
except TypeError as ex:
    print('TypeError:', ex)

s2 = frozenset(['a', 'b', 'c'])
print(isinstance(hash(s2), int))
```

That unlocks two things you couldn't do before: **sets of sets** and **sets as dictionary keys**.

```python run
groups = {frozenset({'a', 'b'}), frozenset([1, 2, 3]), frozenset('ab')}
print(len(groups))    # frozenset('ab') equals frozenset({'a', 'b'})

print(frozenset({1, 2}) in groups, frozenset({1, 2, 3}) in groups)
```

<div class="callout note">
<span class="callout-title">Hash values change between runs</span>

By default CPython randomizes string hashes for each new process (to protect servers against deliberately colliding inputs), so the hash of a frozenset of strings can change from run to run too. Only rely on hashes being consistent *within* one process.

</div>

## Copies of a frozenset are the frozenset

There's no point in making a shallow copy of an immutable container: the copy could never diverge from the original. So, as with tuples, CPython just hands back the same object:

```python run
t1 = (1, 2, [3, 4])
print(tuple(t1) is t1)         # tuple() of a tuple: same object

l1 = [1, 2, [3, 4]]
print(list(l1) is l1)          # list() of a list: a real copy

s = {1, 2, 3}
print(set(s) is s)             # set() of a set: a real copy

fs = frozenset([1, 2, 3])
print(frozenset(fs) is fs, fs.copy() is fs)   # no copy needed
```

A deep copy is a different story, since it may need to copy the elements:

```python run
from copy import deepcopy
print(deepcopy(fs) is fs)
```

<div class="callout note">
<span class="callout-title">An implementation detail</span>

Whether `deepcopy` returns the same frozenset can depend on the elements and the Python version, and whether `frozenset(fs) is fs` holds is a CPython optimization, not a language guarantee. Never write code whose correctness depends on these identities; compare with `==`.

</div>

## Mixing sets and frozensets

All the non-mutating operations work on frozensets, and you can freely mix the two types. The result takes the type of the **left** operand:

```python run
fs = frozenset({'a', 'b', 'c'})
s = {'c', 'd', 'e'}

for expr in ('fs | s', 's | fs', 'fs & s', 's & fs', 'fs - s', 's - fs', 'fs ^ s', 's ^ fs'):
    result = eval(expr)
    print(f'{expr:<7} -> {type(result).__name__:<9} {sorted(result)}')
```

Equality ignores the type difference. A set and a frozenset with the same elements are equal, much like `1 == 1.0`:

```python run
s = {1, 2}
fs = frozenset(s)
print(s == fs, s is fs, 1 == 1.0 == 1 + 0j)
```

## Application: order-insensitive dictionary keys

Suppose you need a dictionary key built from a few values where the order in which they're given shouldn't matter. A frozenset gives exactly that:

```python run
edges = {
    frozenset({'Paris', 'London'}): 344,
    frozenset({'Paris', 'Berlin'}): 878,
}
print(edges[frozenset({'London', 'Paris'})])   # either direction works
```

That's perfect for undirected things like the distance between two cities. Be careful, though: a frozenset forgets **which value played which role** and **how many times** it appeared. A key like `frozenset({name, age})` can't tell `('John', 78)` from `(78, 'John')`. When roles matter, a tuple (or a frozenset of `(field, value)` pairs) is the right key.

## Application: caching that ignores keyword order

`functools.lru_cache` (and `functools.cache`) build their cache key from the arguments **as passed**, including the order of keyword arguments. So the same call spelled two ways is computed twice:

```python run
from functools import lru_cache

@lru_cache
def my_func(*, a, b):
    print('calculating a + b...')
    return a + b

print(my_func(a=1, b=2))
print(my_func(a=1, b=2))   # cached: no "calculating"
print(my_func(b=2, a=1))   # same arguments, different order: computed again
```

The cache is a dictionary, so its keys must be hashable, which is also why unhashable arguments fail even though the function itself could handle them:

```python run
try:
    my_func(a=[1, 2], b=[3, 4])
except TypeError as ex:
    print('TypeError:', ex)
```

We can write our own memoizing decorator whose key ignores keyword order, by putting the keyword arguments' `(name, value)` pairs into a frozenset:

```python run
def memoizer(fn):
    cache = {}
    def inner(*args, **kwargs):
        key = (args, frozenset(kwargs.items()))
        if key not in cache:
            cache[key] = fn(*args, **kwargs)
        return cache[key]
    return inner

@memoizer
def my_func(*, a, b):
    print('calculating a + b...')
    return a + b

print(my_func(a=1, b=2))
print(my_func(b=2, a=1))   # cache hit this time
```

The key is a tuple of two hashable parts: the positional arguments (whose order still matters) and the frozenset of keyword pairs (whose order doesn't).

### Going further, and a trap

For a function like `sum`, the order of positional arguments doesn't matter either. It's tempting to use `frozenset(args)` for them as well, but a frozenset also drops **duplicates**, and for a sum duplicates matter:

```python run
def bad_memoizer(fn):
    cache = {}
    def inner(*args):
        key = frozenset(args)
        if key not in cache:
            cache[key] = fn(*args)
        return cache[key]
    return inner

@bad_memoizer
def adder(*args):
    return sum(args)

print(adder(1, 2, 3), adder(3, 2, 1))   # fine: 6 6
print(adder(1, 2), adder(1, 1, 2))      # wrong: the second call returns 3!
```

`{1, 1, 2}` and `{1, 2}` are the same set, so the second call got the first call's result. To ignore order but keep multiplicity, count each value: `frozenset(collections.Counter(args).items())`, or simply use `tuple(sorted(args))` when the arguments are sortable.

```python run
from collections import Counter

def memoizer(fn):
    cache = {}
    def inner(*args):
        key = frozenset(Counter(args).items())
        if key not in cache:
            print('calculating...')
            cache[key] = fn(*args)
        return cache[key]
    return inner

@memoizer
def adder(*args):
    return sum(args)

print(adder(1, 2, 3), adder(3, 1, 2))   # second call is cached
print(adder(1, 2), adder(1, 1, 2))      # correctly computed separately
```

<div class="takeaways">

## Key takeaways

- `frozenset(iterable)` builds an immutable set; there's no literal syntax.
- A frozenset of hashable elements is hashable, so it can be a set element or a dict key; a plain `set` cannot.
- Copying a frozenset with `frozenset(fs)` or `fs.copy()` returns the same object in CPython, since a copy could never differ.
- Mixed `set`/`frozenset` operations return the type of the left operand; equality ignores the type.
- Frozensets make keys that ignore order, but they also ignore roles and duplicates, so choose them only when that's what you mean.

</div>
