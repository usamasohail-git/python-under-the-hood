---
title: Creating Python Dictionaries
summary: Build dictionaries with literals, the dict() constructor, comprehensions and fromkeys, and see the hash table that makes key lookup fast.
minutes: 18
---

## Keys, values and the one rule

A dictionary maps **keys** to **values**. Each key appears at most once, and asking for a key gives you back its value without searching through the whole collection. The simplest way to make one is a literal:

```python run
a = {'k1': 100, 'k2': 200}
a
```

Values can be any object at all. Keys have one requirement: they must be **hashable**. Roughly, an object is hashable if `hash(obj)` gives an integer that never changes during the object's lifetime, and objects that compare equal have equal hashes. Python's immutable built-ins (numbers, strings, tuples of hashable things, `frozenset`, `None`) are hashable. Mutable containers (lists, dicts, sets) are not:

```python run
print(hash((1, 2, 3)))          # a tuple of hashable elements: fine

for obj in ([1, 2, 3], ([1, 2], [3, 4]), {'a': 1}):
    try:
        hash(obj)
    except TypeError as ex:
        print('TypeError:', ex)
```

Notice the middle case: a tuple is immutable, but this one *contains* lists, so its hash would depend on objects that can change. Python refuses to hash it. You'll see exactly why that matters in a moment, when we look inside a dict.

So keys can be fairly rich objects, and values can be anything, including other dicts:

```python run
a = {('a', 100): ['a', 'b', 'c'], 'key2': {'a': 100, 'b': 200}}
a
```

### Functions as keys

Functions are objects, and they're hashable (their hash is based on their identity). That means you can use them as keys. Here's a small "job table" that stores the arguments each function should be called with later:

```python run
def fn_add(a, b):
    return a + b

def fn_inv(a):
    return 1 / a

def fn_mult(a, b):
    return a * b

funcs = {fn_add: (10, 20), fn_inv: (2,), fn_mult: (2, 8)}

for f in funcs:                 # iterating a dict gives its keys
    print(f.__name__, '->', f(*funcs[f]))
```

Iterating over `.items()` gives `(key, value)` pairs, which reads better than looking the value up again:

```python run
for f, args in funcs.items():
    print(f.__name__, args, '->', f(*args))
```

## How a dictionary works inside

Why do keys need a hash, and why must it never change? Because a dict is a **hash table**. Here is the idea, in the compact layout CPython has used since 3.6.

A dict keeps two arrays:

1. an **entries** array, where each new item is appended as a row `(hash, key, value)`, in insertion order;
2. a sparse **index table** whose size is a power of two (8 for a small dict). Each slot is either empty or holds the position of a row in the entries array.

To **store** `d[key] = value`, Python computes `h = hash(key)` and uses the low bits of `h` (in effect `h % table_size`) to pick a slot. If that slot is empty, the new row is appended to the entries and the slot records its position. If the slot is already taken by a *different* key, that's a **collision**: Python moves on to another slot, chosen by a fixed *probe sequence* that also depends on `h`, until it finds a free one.

<figure class="diagram">
<svg viewBox="0 0 600 240" role="img" aria-label="A dict's sparse index table of 8 slots points into a dense entries array holding hash, key and value rows in insertion order">
<defs><marker id="cd1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<text x="40" y="22" class="d-sub">INDEX TABLE (8 slots)</text>
<text x="300" y="22" class="d-sub">ENTRIES (insertion order)</text>
<text x="30" y="52" text-anchor="end" class="d-sub">0</text><rect x="40" y="36" width="70" height="22" rx="4" class="d-name"/>
<text x="30" y="76" text-anchor="end" class="d-sub">1</text><rect x="40" y="60" width="70" height="22" rx="4" class="d-obj-hl"/><text x="75" y="76" text-anchor="middle" class="d-text">0</text>
<text x="30" y="100" text-anchor="end" class="d-sub">2</text><rect x="40" y="84" width="70" height="22" rx="4" class="d-name"/>
<text x="30" y="124" text-anchor="end" class="d-sub">3</text><rect x="40" y="108" width="70" height="22" rx="4" class="d-name"/>
<text x="30" y="148" text-anchor="end" class="d-sub">4</text><rect x="40" y="132" width="70" height="22" rx="4" class="d-obj-hl"/><text x="75" y="148" text-anchor="middle" class="d-text">2</text>
<text x="30" y="172" text-anchor="end" class="d-sub">5</text><rect x="40" y="156" width="70" height="22" rx="4" class="d-name"/>
<text x="30" y="196" text-anchor="end" class="d-sub">6</text><rect x="40" y="180" width="70" height="22" rx="4" class="d-obj-hl"/><text x="75" y="196" text-anchor="middle" class="d-text">1</text>
<text x="30" y="220" text-anchor="end" class="d-sub">7</text><rect x="40" y="204" width="70" height="22" rx="4" class="d-name"/>
<rect x="300" y="45" width="270" height="40" rx="8" class="d-obj"/><text x="312" y="70" class="d-sub">0</text><text x="335" y="70" class="d-text">hash('a') · 'a' · 1</text>
<rect x="300" y="105" width="270" height="40" rx="8" class="d-obj"/><text x="312" y="130" class="d-sub">1</text><text x="335" y="130" class="d-text">hash('b') · 'b' · 2</text>
<rect x="300" y="165" width="270" height="40" rx="8" class="d-obj"/><text x="312" y="190" class="d-sub">2</text><text x="335" y="190" class="d-text">hash('c') · 'c' · 3</text>
<path d="M110 71 C200 71, 220 65, 296 65" class="d-arrow-hl" marker-end="url(#cd1)"/>
<path d="M110 191 C200 191, 220 125, 296 125" class="d-arrow-hl" marker-end="url(#cd1)"/>
<path d="M110 143 C200 143, 220 185, 296 185" class="d-arrow-hl" marker-end="url(#cd1)"/>
</svg>
<figcaption>The dict <code>{'a': 1, 'b': 2, 'c': 3}</code>. Each key's hash picks a slot in the index table; the slot points to the key's row in the dense entries array. Iteration simply walks the entries array, which is why order is preserved.</figcaption>
</figure>

To **look up** `d[key]`, Python repeats the same steps: hash the key, go to the slot, and follow the probe sequence. At each occupied slot it checks the row: is the stored key the very same object (`is`)? If not, is the stored hash equal to `h` (a cheap integer comparison) *and* does the stored key `==` the one we're looking for? The expensive `==` only runs when the hashes already match. If so, it returns the value. If it reaches an empty slot, the key isn't there: `KeyError`.

That procedure explains the rules:

- **Fast lookup.** As long as hashes are well spread out, the first slot or two is the right one, whether the dict has 10 items or 10 million. Python also keeps the table at most about two-thirds full, growing it (and re-inserting every key) when needed, so free slots stay easy to find.
- **Equal keys must have equal hashes.** If `a == b` but `hash(a) != hash(b)`, looking up `b` would start in the wrong place and never find `a`.
- **A key's hash must never change.** A key is filed under the hash it had when it was inserted. If it later changed, lookups would go to the wrong slot. That's why mutable containers like lists are not hashable: their "value" can change, and so would any hash based on it.
- **Order comes for free.** Iteration walks the dense entries array, so items come out in the order they were inserted.

You can watch the table grow: the size of a dict jumps in steps as it is resized, rather than growing by one item at a time.

```python run
import sys

d = {}
last = sys.getsizeof(d)
print(f'{0:>3} items: {last} bytes')
for i in range(1, 50):
    d[i] = i
    size = sys.getsizeof(d)
    if size != last:
        print(f'{i:>3} items: {size} bytes')
        last = size
```

<div class="callout modern">
<span class="callout-title">Insertion order is guaranteed (3.7+)</span>

The compact layout arrived in CPython 3.6, which made dicts smaller and, as a side effect, ordered. In Python 3.7 that order became an official part of the language: every dict keeps its keys in insertion order. Older code sometimes used `collections.OrderedDict` just for this, or assumed no order at all. Some older notebook environments also *displayed* dicts with sorted keys, which hid the real order; `print(d)` always shows the true one.

</div>

## The `dict()` constructor

`dict()` accepts several kinds of input.

**Keyword arguments** are tidy for string keys, but only work when every key is a valid identifier (so no `'first name'`, no `'class'`, no integers):

```python run
d = dict(a=100, b=200)
d
```

**An iterable of pairs**: each element must itself be an iterable of exactly two items, the key and the value. Tuples and lists can be mixed:

```python run
print(dict([('a', 100), ['b', 200]]))
print(dict(zip('abc', range(3))))     # zip produces pairs

try:
    dict([('a', 1, 2)])
except ValueError as ex:
    print('ValueError:', ex)
```

**Another mapping** (optionally combined with keyword arguments, which win on conflicts):

```python run
d = {'a': 100, 'b': 200, 'c': {'d': 1, 'e': 2}}
new_dict = dict(d, b=999)

print(new_dict)
print(new_dict is d)
print(new_dict['c'] is d['c'])
```

`new_dict` is a new dictionary, but look at the last line: the nested dict under `'c'` is the **same object** in both. `dict(d)` makes a **shallow copy**: a new container whose entries reference the same values. You'll see how to make independent copies later in this section.

## Dictionary comprehensions

When you're computing keys or values, a comprehension is the most readable option. It has the same structure as a list comprehension, with `key: value` in front:

```python run
keys = ['a', 'b', 'c', 'd']
values = (1, 2, 3, 4)

squares = {k: v ** 2 for k, v in zip(keys, values)}
evens = {k: v for k, v in zip(keys, values) if v % 2 == 0}
print(squares)
print(evens)
```

Nested loops work too. This builds a grid of points and maps each `(x, y)` tuple to its distance from the origin. Tuples of numbers are hashable, so they make perfect keys:

```python run
import math

coords = (-2, -1, 0, 1, 2)
distances = {(x, y): math.hypot(x, y) for x in coords for y in coords}

print(len(distances))
print(distances[(1, 1)], distances[(-2, 0)])
```

(For a plain `zip` of keys and values, `dict(zip(keys, values))` is just as good and a little shorter.)

## `dict.fromkeys`

`fromkeys` is a class method that builds a dict from an iterable of keys, giving every key the **same** value (`None` if you don't supply one). Keys are inserted in the order the iterable produces them, and duplicates collapse into one:

```python run
counters = dict.fromkeys(['a', 'b', 'c'], 0)
print(counters)
print(dict.fromkeys('python'))
print(dict.fromkeys('banana'))
```

<div class="callout note">
<span class="callout-title">One value, shared by every key</span>

`fromkeys` doesn't copy the value: every key refers to the very same object. That's harmless for `0` or `None`, but a mutable default is shared:

```python run
groups = dict.fromkeys(['x', 'y'], [])
groups['x'].append(1)
print(groups)              # both keys see the change
print(groups['x'] is groups['y'])

groups = {k: [] for k in ['x', 'y']}   # a fresh list per key
groups['x'].append(1)
print(groups)
```

</div>

<div class="takeaways">

## Key takeaways

- Keys must be **hashable**; values can be anything. Lists, dicts, sets, and tuples containing them can't be keys.
- A dict is a hash table: the key's hash picks a slot, collisions are resolved by probing, and `==` confirms the match. That's why equal keys need equal hashes and a key's hash must never change.
- CPython stores entries in a dense array in insertion order, and since Python 3.7 that order is guaranteed.
- Create dicts with literals, `dict(**kwargs)`, `dict(pairs)`, `dict(mapping)`, comprehensions or `dict.fromkeys(keys, value)`.
- `dict(other)` is a **shallow** copy, and `fromkeys` shares one value object among all keys.

</div>
