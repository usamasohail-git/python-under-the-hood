---
title: Iterators and Iterables
summary: An iterable is a collection that hands out a fresh iterator every time you ask; the iterator is the single-use cursor that walks it. Separating the two is what lets you loop over a list again and again.
minutes: 16
---

## Two open questions

The previous lesson left two loose ends:

1. Why does a `for` loop call `__iter__` first, when for an iterator it just returns `self`?
2. An iterator is exhausted after one pass. Do we really have to rebuild the object every time we want to loop again?

Both have the same answer. Here's the problem in its simplest form:

```python run
class Cities:
    def __init__(self):
        self._cities = ['Paris', 'Berlin', 'Rome', 'Madrid', 'London']
        self._index = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._index >= len(self._cities):
            raise StopIteration
        item = self._cities[self._index]
        self._index += 1
        return item

cities = Cities()
print(list(cities))
print(list(cities))      # exhausted
```

To loop twice we'd have to call `Cities()` again, rebuilding the data just to reset one integer. The data and the *position in the data* are tangled together in one object. Let's pull them apart.

## Splitting the data from the cursor

First, a class that only holds the data:

```python run
class Cities:
    def __init__(self):
        self._cities = ['New York', 'Newark', 'New Delhi', 'Newcastle']

    def __len__(self):
        return len(self._cities)
```

Then a separate class whose only job is to walk an existing `Cities` object. It keeps a reference to the data and its **own** index:

```python run
class CityIterator:
    def __init__(self, city_obj):
        self._city_obj = city_obj
        self._index = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self._index >= len(self._city_obj):
            raise StopIteration
        item = self._city_obj._cities[self._index]
        self._index += 1
        return item

cities = Cities()                      # data built once
for city in CityIterator(cities):      # one walk
    print(city)
print([c.upper() for c in CityIterator(cities)])   # another, independent walk
```

Much better: the data is created once and each `CityIterator` is a cheap cursor over it. But now we must remember to create an iterator by hand, and the `cities` object itself can't be looped over:

```python run
try:
    for city in cities:
        print(city)
except TypeError as ex:
    print('TypeError:', ex)
```

## The iterable protocol

This is where that first `__iter__` call pays off. An **iterable** is an object whose `__iter__` method returns **a new iterator** over its data. When a `for` loop starts, it calls `iter(obj)` and loops over whatever comes back. So all `Cities` needs is an `__iter__` that builds a `CityIterator`:

```python run
class Cities:
    def __init__(self):
        self._cities = ['New York', 'Newark', 'New Delhi', 'Newcastle']

    def __len__(self):
        return len(self._cities)

    def __iter__(self):
        print('Cities.__iter__: making a new iterator')
        return CityIterator(self)

cities = Cities()
for city in cities:
    print(city)
for city in cities:      # works again!
    print(city)
```

Every loop asks the iterable for a **fresh** iterator, so every loop starts at the beginning. The same happens with any consumer:

```python run
print(sorted(cities, reverse=True))
it_1 = iter(cities)
it_2 = iter(cities)
print(it_1 is it_2)
print(next(it_1), next(it_1), next(it_2))   # independent positions
```

This is the core picture of the whole section:

<figure class="diagram">
<svg viewBox="0 0 600 255" role="img" aria-label="One iterable, cities, creates two independent iterators when iter() is called twice. Each iterator refers back to the same data and keeps its own index.">
<defs>
<marker id="ii1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
<marker id="ii2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<text x="20" y="22" class="d-sub">ITERABLE (the collection)</text>
<text x="360" y="22" class="d-sub">ITERATORS (one per loop)</text>
<rect x="20" y="70" width="220" height="110" rx="8" class="d-obj-hl"/>
<text x="34" y="94" class="d-sub">cities · Cities</text>
<text x="34" y="118" class="d-text">data: 4 city names</text>
<text x="34" y="142" class="d-text">__iter__() → NEW</text>
<text x="34" y="164" class="d-text">   CityIterator</text>
<rect x="360" y="35" width="220" height="90" rx="8" class="d-obj"/>
<text x="374" y="57" class="d-sub">it_1 · CityIterator</text>
<text x="374" y="80" class="d-text">_index = 2</text>
<text x="374" y="104" class="d-text">__iter__() → self</text>
<rect x="360" y="150" width="220" height="90" rx="8" class="d-obj"/>
<text x="374" y="172" class="d-sub">it_2 · CityIterator</text>
<text x="374" y="195" class="d-text">_index = 1</text>
<text x="374" y="219" class="d-text">__iter__() → self</text>
<path d="M240 105 C290 105, 300 80, 356 80" class="d-arrow-hl" marker-end="url(#ii1)"/>
<path d="M240 145 C290 145, 300 195, 356 195" class="d-arrow-hl" marker-end="url(#ii1)"/>
<text x="268" y="88" class="d-sub">iter()</text>
<text x="268" y="168" class="d-sub">iter()</text>
<path d="M360 112 C320 125, 290 128, 244 128" class="d-arrow" marker-end="url(#ii2)"/>
</svg>
<figcaption>The iterable owns the data and makes a new iterator on every <code>iter()</code> call. Each iterator refers back to the same data (grey arrow, drawn for <code>it_1</code>) and keeps its own position; exhausting one doesn't affect the other or the iterable.</figcaption>
</figure>

## Iterable vs iterator, side by side

| | **Iterable** | **Iterator** |
|---|---|---|
| Must implement | `__iter__` | `__iter__` **and** `__next__` |
| `__iter__` returns | a **new** iterator | **itself** |
| Can you call `next()` on it? | No | Yes |
| Loop over it twice? | Yes, each loop starts fresh | No, the second loop is empty |
| Holds | the data (or a recipe for it) | a position in the data |
| Examples | `list`, `str`, `dict`, `set`, `range` | `iter([1, 2])`, `zip(...)`, `enumerate(...)`, files |

Notice the asymmetry: **every iterator is also an iterable** (its `__iter__` returns something you can call `next()` on, namely itself). That's precisely why iterators must implement `__iter__`: so you can pass an iterator anywhere an iterable is expected, including a `for` loop. But an iterator is a *degenerate* iterable: it can only be iterated once.

<div class="callout tip">
<span class="callout-title">A quick test</span>

For an object `obj` that you can iterate, `iter(obj) is obj` is `True` for an iterator and `False` for a re-iterable collection. You'll use this test later to defend functions against being handed an iterator.

</div>

## Keeping the iterator private

Since the iterator only makes sense together with its iterable, it's common to nest the iterator class inside the iterable:

```python run
del CityIterator   # make sure the global one isn't used

class Cities:
    def __init__(self):
        self._cities = ['New York', 'Newark', 'New Delhi', 'Newcastle']

    def __len__(self):
        return len(self._cities)

    def __iter__(self):
        return self.CityIterator(self)

    class CityIterator:
        def __init__(self, city_obj):
            self._city_obj = city_obj
            self._index = 0

        def __iter__(self):
            return self

        def __next__(self):
            if self._index >= len(self._city_obj):
                raise StopIteration
            item = self._city_obj._cities[self._index]
            self._index += 1
            return item

cities = Cities()
print(list(enumerate(cities)))
print(type(iter(cities)).__qualname__)
```

## Iterable *and* sequence

`Cities` is iterable but it isn't a sequence: it has `len()` but no indexing.

```python run
print(len(cities))
try:
    cities[1]
except TypeError as ex:
    print('TypeError:', ex)
```

A class can implement both protocols. If it has `__iter__` **and** `__getitem__`, which one does a `for` loop use?

```python run
class Cities:
    def __init__(self):
        self._cities = ['New York', 'Newark', 'New Delhi', 'Newcastle']

    def __len__(self):
        return len(self._cities)

    def __getitem__(self, s):
        print('__getitem__ called')
        return self._cities[s]

    def __iter__(self):
        print('__iter__ called')
        return iter(self._cities)   # a list iterator does the walking for us

cities = Cities()
print(cities[0])
for city in cities:
    print(city)
```

`__iter__` wins. Python only falls back to `__getitem__` if there's no `__iter__` (more on that fallback in a later lesson). Indexing and slicing, of course, still need `__getitem__`. (Returning `iter(self._cities)` is a shortcut called *delegation*, which also gets its own lesson.)

## Built-in collections work exactly the same way

Lists, sets, dicts and strings are all **iterables**, not iterators. Each has an `__iter__` that returns a dedicated iterator type:

```python run
l = [1, 2, 3]
iter_l = iter(l)
print(type(iter_l))
print(next(iter_l), next(iter_l), next(iter_l))
try:
    next(iter_l)
except StopIteration:
    print('StopIteration, just like ours')
```

```python run
print('list has __iter__:', '__iter__' in dir(l), '| __next__:', '__next__' in dir(l))
print('list_iterator has __iter__:', '__iter__' in dir(iter_l), '| __next__:', '__next__' in dir(iter_l))
print(iter(iter_l) is iter_l, iter(l) is l)
print(type(iter({1, 2, 3})), '__getitem__' in dir(set))
```

A `set` has no `__getitem__`, so it can only be iterated through its iterator. And a dictionary? Its iterator yields the **keys**; use the `.values()` and `.items()` views for the rest:

```python run
d = dict(a=1, b=2, c=3)
print(next(iter(d)))
print(next(iter(d.values())))
print(next(iter(d.items())))
```

<div class="takeaways">

## Key takeaways

- An **iterable** implements `__iter__`, which returns a **new iterator** each time. An **iterator** implements `__iter__` (returning `self`) and `__next__`.
- `for` (and every other consumer) first calls `iter(obj)`, then calls `next()` on the result. That's why a list can be looped over repeatedly: each loop gets a fresh iterator.
- Iterators are iterables too, but single-use ones. Iterables can't be passed to `next()`.
- Keep the data in the iterable and the position in the iterator. Nesting the iterator class inside the iterable keeps it private.
- If a class has both `__iter__` and `__getitem__`, iteration uses `__iter__`.
- Built-in collections follow the same pattern: `list` → `list_iterator`, `dict` → keys iterator, and so on.

</div>
