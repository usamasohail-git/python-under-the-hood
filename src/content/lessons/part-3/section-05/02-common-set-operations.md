---
title: Common Set Operations
summary: Size, membership testing, adding and removing elements, and the memory you pay for a set's fast lookups.
minutes: 12
---

## Size

The number of elements in a set (its **cardinality**) comes from the same `len()` you use everywhere else:

```python run
len({1, 2, 3})
```

## Membership testing

`in` and `not in` work exactly as you'd expect:

```python run
s = {1, 2, 3}
print(1 in s, 10 in s, 1 not in s, 10 not in s)
```

What makes sets special is *how* they answer. A list has to scan its elements one by one until it finds a match (or reaches the end), so the cost grows with the list's length. A set hashes the value you're looking for and jumps straight to the slot where it would be. On average that's the same small amount of work whether the set holds ten elements or ten million. Dictionaries use the same mechanism for their keys.

Let's measure. We look for a value near the **start** of the list first, then one at the **end**, then one that's **missing**:

```python run
from timeit import timeit

n = 10_000
l = list(range(n))
s = set(range(n))
d = dict.fromkeys(range(n))

def compare(expr, number):
    for name in ('l', 's', 'd'):
        t = timeit(expr.replace('X', name), globals=globals(), number=number)
        print(f'{name}: {t:.5f}s')

print('9 in X (near the start of the list)')
compare('9 in X', 100_000)
print('9_999 in X (end of the list)')
compare('9_999 in X', 1_000)
print('-1 not in X (missing)')
compare('-1 not in X', 1_000)
```

For an element near the front, the list finds it after ten comparisons and is competitive. For the last element or a missing one, the list must look at all 10,000 elements every time, while the set and dict times barely move. Your exact numbers will vary, but the gap at the end of the list is typically a thousand times or more.

<div class="callout tip">
<span class="callout-title">A practical rule</span>

If you're going to ask "is `x` in here?" many times, convert the collection to a set once and test against the set. `allowed = set(big_list)` costs one pass; every lookup after that is cheap.

</div>

## The price: memory

Hash tables stay fast by keeping plenty of empty slots, so sets and dicts use considerably more memory than a list with the same elements. `__sizeof__()` reports the size of the container itself (not of the elements it points to):

```python run
print('list:', l.__sizeof__())
print('set: ', s.__sizeof__())
print('dict:', d.__sizeof__())
```

All three containers grow in steps rather than one element at a time: when they fill up, they over-allocate so that the next several additions are free. You can watch the steps happen:

```python run
l, s, d = [], set(), {}
previous = None
for i in range(20):
    sizes = (l.__sizeof__(), s.__sizeof__(), d.__sizeof__())
    if sizes != previous:
        print(f'{i:>2} elements -> list {sizes[0]:>4}, set {sizes[1]:>4}, dict {sizes[2]:>4}')
        previous = sizes
    l.append(i)
    s.add(i)
    d[i] = None
```

Each container has its own growth strategy, and the set and dict jump in much larger steps than the list. Making the elements bigger changes nothing here, because a container only stores **references**, and a reference is the same size whatever it points to:

```python run
small = {1, 2, 3}
huge = {10 ** 1000, 10 ** 2000, 10 ** 3000}
print(small.__sizeof__() == huge.__sizeof__())
```

<div class="callout note">
<span class="callout-title">Why your numbers may differ</span>

These byte counts depend on the Python build. This site runs Python compiled to 32-bit WebAssembly, where a reference is 4 bytes, so every number is smaller than on a typical 64-bit desktop Python. The *pattern* (sets and dicts cost more than lists and grow in bigger jumps) is the same everywhere.

</div>

## Adding elements

Since a set has no positions, the method isn't called `append` or `insert`. It's just `add`:

```python run
s = {30, 20, 10}
s.add(15)
s.add(-1)
sorted(s)
```

Where the new element ends up in iteration order is the hash table's business, and it can shuffle when the table resizes. Adding an element that's already present does nothing, with no error:

```python run
s.add(15)
len(s)
```

## Removing elements

There are two ways to remove a specific element, which differ only in what happens if it's absent. `remove` raises `KeyError` (the same exception a dictionary raises for a missing key); `discard` silently does nothing:

```python run
s = {1, 2, 3}
s.remove(1)
print(s)

try:
    s.remove(10)
except KeyError as ex:
    print('KeyError:', ex)

s.discard(10)   # no error
print(s)
```

Use `remove` when a missing element would be a bug you want to hear about, and `discard` when "make sure it isn't there" is all you need.

`pop()` removes and returns an **arbitrary** element. You don't choose which one, and you shouldn't predict it:

```python run
s = set('python')
x = s.pop()
print(x in 'python', len(s))
```

That's useful for draining a set one element at a time when order doesn't matter. Popping an empty set raises `KeyError`:

```python run
s = set()
try:
    s.pop()
except KeyError as ex:
    print('KeyError:', ex)
```

Finally, `clear()` empties a set in place:

```python run
s = {1, 2, 3}
s.clear()
s
```

<div class="takeaways">

## Key takeaways

- `len(s)` gives the cardinality; `in` / `not in` test membership.
- Set (and dict) membership is a hash lookup: roughly constant time, versus a linear scan for a list.
- That speed costs memory. Sets and dicts over-allocate in larger steps than lists, and `__sizeof__` measures only the container, not its elements.
- `add` adds (ignoring duplicates); `remove` raises `KeyError` for a missing element while `discard` doesn't; `pop` removes an arbitrary element; `clear` empties the set.

</div>
