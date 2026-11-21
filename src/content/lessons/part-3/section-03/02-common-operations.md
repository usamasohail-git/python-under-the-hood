---
title: Common Operations
summary: Read, test, insert and remove items safely with [], get, in, del, pop, popitem, setdefault and clear, and use them for counting and grouping.
minutes: 15
---

## Size and lookup

`len()` counts key/value pairs, and square brackets fetch the value for a key:

```python run
d = dict(zip('abc', range(1, 4)))
print(d, len(d))
print(d['a'])
```

Asking for a key that isn't there raises `KeyError`:

```python run
try:
    d['python']
except KeyError as ex:
    print('KeyError:', ex)
```

Often a missing key isn't an error, just a case to handle. You could wrap every lookup in `try`/`except`, but `get` is cleaner. It returns `None` for a missing key, or a default you supply:

```python run
print(d.get('a'))
print(d.get('python'))
print(d.get('python', 0))
```

### Counting with `get`

`get` with a default of `0` is the classic way to count things whose keys you don't know in advance. Here we count characters, ignoring whitespace and case:

```python run
text = ('Sed ut perspiciatis, unde omnis iste natus error sit voluptatem '
        'accusantium doloremque laudantium, totam rem aperiam eaque ipsa.')

counts = {}
for c in text:
    key = c.lower().strip()       # '' for whitespace
    if key:
        counts[key] = counts.get(key, 0) + 1

print(counts)
```

Each pass does "read the current count (or 0), add one, store it back". The keys appear in the order each character was first seen, because that's when it was inserted.

<div class="callout tip">
<span class="callout-title">There's a tool for this</span>

Counting is so common that the standard library has `collections.Counter` (and `collections.defaultdict` for "give missing keys a starting value"). They're covered with the specialized dictionaries later in Part 3. It's still worth knowing the plain-dict pattern, because it's what those classes do for you.

</div>

## Membership tests

`in` and `not in` test whether a **key** is present (not a value). Thanks to the hash table this is fast however big the dict is, unlike `in` on a list, which scans every element:

```python run
d = dict(a=1, b=2, c=3)
print('a' in d, 'z' in d, 'z' not in d)
print(1 in d)                # 1 is a value, not a key
print(1 in d.values())       # searching values is a linear scan
```

## Removing items

`del` removes a key, and raises `KeyError` if it's missing:

```python run
d = dict.fromkeys('abcd', 0)
del d['a']
print(d)

try:
    del d['z']
except KeyError as ex:
    print('KeyError:', ex)
```

`pop(key)` removes the key **and returns its value**. With a second argument it returns that default instead of raising when the key is missing:

```python run
result = d.pop('b')
print(result, d)

print(d.pop('z', 'Not found!'))
try:
    d.pop('z')
except KeyError as ex:
    print('KeyError:', ex)
```

`popitem()` takes no key. It removes and returns the **last inserted** item as a `(key, value)` tuple, so repeated calls work in LIFO (last in, first out) order. On an empty dict it raises `KeyError`:

```python run
d = {'a': 10, 'b': 20, 'c': 30}
print(d.popitem())
print(d.popitem())
print(d.popitem())

try:
    d.popitem()
except KeyError as ex:
    print('KeyError:', ex)
```

<div class="callout modern">
<span class="callout-title">LIFO is guaranteed (3.7+)</span>

Before dicts were ordered, `popitem` returned an *arbitrary* item. Since Python 3.7 it is guaranteed to return the most recently inserted one, which makes a plain dict usable as a simple stack of key/value pairs.

</div>

`clear()` empties the dict in place. It's the same object afterwards, which matters if other names refer to it:

```python run
d = {'a': 1, 'b': 2}
alias = d
d.clear()
print(d, alias, d is alias)
```

## Insert only if missing: `setdefault`

A common need: "give me the value for this key, and if there isn't one yet, insert this default first". Written by hand:

```python run
def insert_if_not_present(d, key, value):
    if key not in d:
        d[key] = value
    return d[key]

d = {'a': 1, 'b': 2}
print(insert_if_not_present(d, 'a', 0), d)
print(insert_if_not_present(d, 'z', 0), d)
```

That's exactly what `d.setdefault(key, default)` does, in one call (and one hash lookup):

```python run
d = {'a': 1, 'b': 2, 'c': 3}
print(d.setdefault('a', 0), d)      # present: value returned, nothing changes
print(d.setdefault('z', 100), d)    # missing: inserted, then returned
```

Its real power is in **grouping**. Because it returns the value that is now stored in the dict, you can mutate that value directly. Here we sort the characters of `text` into lowercase, uppercase and other:

```python run
import string

text = 'Sed ut perspiciatis, Unde omnis iste natus error? Quia: NON.'

def cat_key(c):
    if c == ' ':
        return None
    if c in string.ascii_lowercase:
        return 'lower'
    if c in string.ascii_uppercase:
        return 'upper'
    return 'other'

categories = {}
for c in text:
    key = cat_key(c)
    if key:
        categories.setdefault(key, set()).add(c)

for cat, chars in categories.items():
    print(f'{cat}:', ''.join(sorted(chars)))
```

The line `categories.setdefault(key, set()).add(c)` reads as "the set for this category (creating it if needed), add `c` to it". Without `setdefault` you'd need an `if key not in categories:` block first.

One subtlety: the default expression (`set()` here) is evaluated on **every** call, even when the key already exists and the new set is thrown away. For cheap defaults that doesn't matter; for expensive ones, test `in` first or use `defaultdict`.

### A dict as a lookup table

`cat_key` could itself use a dictionary instead of an `if` chain. Build a table mapping each character to its category once, then look characters up with `get`, using `'other'` as the default:

```python run
CATEGORIES = {' ': None,
              **dict.fromkeys(string.ascii_lowercase, 'lower'),
              **dict.fromkeys(string.ascii_uppercase, 'upper')}

def cat_key(c):
    return CATEGORIES.get(c, 'other')

print(cat_key('a'), cat_key('A'), cat_key('!'), cat_key(' '))
```

(The `**` unpacking merges several dicts into one literal; it's explained in the lesson on merging.) Replacing branching logic with a table lookup is a common dictionary idiom: the table is data, easy to extend, and each lookup is a single hash probe.

## Don't change the size while iterating

A dict must not gain or lose keys while you're looping over it. Python detects this and stops you:

```python run
d = {'a': 1, 'b': 0, 'c': 3}
try:
    for k in d:
        if d[k] == 0:
            del d[k]
except RuntimeError as ex:
    print('RuntimeError:', ex)
```

Loop over a snapshot of the keys instead, or build a new dict:

```python run
d = {'a': 1, 'b': 0, 'c': 3}
for k in list(d):              # list(d) copies the keys first
    if d[k] == 0:
        del d[k]
print(d)

d = {'a': 1, 'b': 0, 'c': 3}
print({k: v for k, v in d.items() if v != 0})
```

Changing the *value* of an existing key during iteration is fine, since the set of keys doesn't change.

<div class="takeaways">

## Key takeaways

- `d[key]` raises `KeyError` for a missing key; `d.get(key, default)` returns a default instead.
- `in` tests **keys**, in roughly constant time.
- `del d[key]` and `d.pop(key)` remove a key; `pop` returns the value and accepts a default. `popitem()` removes the last inserted item (LIFO, guaranteed since 3.7).
- `setdefault(key, default)` inserts a default only if the key is missing and returns the stored value, which makes grouping a one-liner.
- Never add or remove keys while iterating over a dict; iterate over `list(d)` or build a new dict.

</div>
