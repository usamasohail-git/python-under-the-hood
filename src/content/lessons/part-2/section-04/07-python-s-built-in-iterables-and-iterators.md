---
title: Python's Built-In Iterables and Iterators
summary: range and dict views are re-iterable lazy iterables, while zip, enumerate, map, filter and file objects are single-use iterators. Knowing which is which prevents silent bugs.
minutes: 13
files: ['cars.csv']
---

## How to tell them apart

Many built-ins return something lazy that you can loop over. Some return **iterables** (loop as often as you like), others return **iterators** (loop once). Two quick checks tell you which you have:

- does it have a `__next__` method? Only iterators do.
- is `iter(obj) is obj`? True for iterators, False for iterables.

Let's write a tiny helper and survey the built-ins:

```python run
def kind(obj):
    try:
        it = iter(obj)
    except TypeError:
        return 'not iterable'
    return 'iterator' if it is obj else 'iterable'

print(kind(10))
print(kind([1, 2]), kind(iter([1, 2])))
```

## `range`: a lazy iterable

`range(10)` doesn't build a list of ten numbers. It stores only `start`, `stop` and `step`, and computes the values as you iterate. That's why printing it shows the recipe, not the contents:

```python run
r_10 = range(10)
print(r_10, kind(r_10))
print('__iter__' in dir(r_10), '__next__' in dir(r_10))

r_10_iter = iter(r_10)
print(type(r_10_iter), kind(r_10_iter))
print(list(r_10))
print(list(r_10))    # an iterable: works every time
```

`range` is also a full (immutable) sequence, so it supports `len`, indexing, slicing and very fast `in` checks, all computed arithmetically without generating the values:

```python run
r = range(0, 1_000_000_000, 7)
print(len(r), r[3], r[-1], r[10:13])
print(700_000_000 in r)
```

## `zip`, `enumerate`, `map`, `filter`: lazy iterators

These all return **iterators**: lazy, and single-use.

```python run
z = zip([1, 2, 3], 'abc')
print(z, kind(z))
print('__iter__' in dir(z), '__next__' in dir(z))
print(list(z))
print(list(z))    # exhausted
```

```python run
e = enumerate('Python rocks!')
print(kind(e), iter(e) is e)
print(list(e)[:4])
print(list(e))
```

```python run
m = map(str.upper, ['a', 'b'])
f = filter(None, [0, 1, '', 'x'])
print(kind(m), kind(f), kind(reversed([1, 2, 3])))
print(list(m), list(f))
print(list(m), list(f))
```

None of them does any work until you ask for values. For example, `map` doesn't call the function until `next()` is called:

```python run
def loud_square(x):
    print(f'  squaring {x}')
    return x * x

m = map(loud_square, [1, 2, 3])
print('map created, nothing computed yet')
print(next(m))
print(next(m))
```

<div class="callout note">
<span class="callout-title">How the result looks</span>

Older notebooks show these objects as `<zip at 0x...>`; that's just how IPython displays them. Plain Python prints `<zip object at 0x...>`. Either way, you see the object, not its contents, because the contents haven't been computed yet. In Python 3 `zip`, `map` and `filter` have always returned lazy iterators (in Python 2 they built lists).

</div>

## Files: iterators over lines

`open()` returns a file object that is an **iterator** over the file's lines. It reads from disk lazily, a chunk at a time, so looping over a huge file uses very little memory:

```python run
with open('cars.csv') as f:
    print(type(f), kind(f))
    print(next(f), end='')
    print(f.__next__(), end='')
    print(f.readline(), end='')
```

`next(f)`, `f.__next__()` and `f.readline()` all return the next line, newline included. `readlines()`, on the other hand, reads **everything** into a list:

```python run
with open('cars.csv') as f:
    rows = f.readlines()
print(type(rows), len(rows))
print(rows[:2])
```

Both approaches can solve the same problem. Here we collect the distinct origins (the last column), skipping the two header rows:

```python run
# eager: the whole file in memory
origins = set()
with open('cars.csv') as f:
    rows = f.readlines()
for row in rows[2:]:
    origins.add(row.strip('\n').split(';')[-1])
print(sorted(origins))

# lazy: one line in memory at a time
origins = set()
with open('cars.csv') as f:
    next(f), next(f)              # skip the headers
    for row in f:
        origins.add(row.strip('\n').split(';')[-1])
print(sorted(origins))
```

Same answer, but the second version never holds more than one row. For a 400-line file that doesn't matter; for a 40 GB log file, only the lazy version works.

## Dictionary views: lazy iterables

`d.keys()`, `d.values()` and `d.items()` return **view** objects. They're iterables, not iterators, so you can loop over them repeatedly:

```python run
d = {'a': 1, 'b': 2}
keys = d.keys()
print('__iter__' in dir(keys), '__next__' in dir(keys))
print(iter(keys) is keys, kind(d.values()), kind(d.items()))
```

They're also *live*: a view doesn't copy anything, it looks at the dictionary, so it reflects later changes:

```python run
d['c'] = 3
print(keys, list(keys))
```

## Summary of common built-ins

| Iterable (re-iterable) | Iterator (single use) |
|---|---|
| `list`, `tuple`, `str`, `set`, `dict`, `range` | `iter(anything)` |
| `d.keys()`, `d.values()`, `d.items()` | `zip`, `enumerate`, `map`, `filter`, `reversed` |
| | file objects from `open()` |
| | everything in `itertools` (`cycle`, `islice`, `chain`…) |

<div class="callout tip">
<span class="callout-title">The formal way: `collections.abc`</span>

`isinstance(obj, collections.abc.Iterator)` checks for `__iter__` and `__next__`, and `isinstance(obj, collections.abc.Iterable)` checks for `__iter__`. They're handy for type hints and documentation, but note that the `Iterable` check doesn't recognize classes that are iterable only through `__getitem__`. Calling `iter()` is the only fully reliable test (see the `iter()` lesson).

</div>

<div class="takeaways">

## Key takeaways

- Iterators have `__next__` and satisfy `iter(obj) is obj`; iterables don't.
- `range` and dict views are lazy **iterables**: no values stored up front, yet re-iterable.
- `zip`, `enumerate`, `map`, `filter`, `reversed` and file objects are lazy **iterators**: they compute on demand and work only once.
- Files iterate lazily line by line. Prefer that to `readlines()` when you only need one row at a time.

</div>
