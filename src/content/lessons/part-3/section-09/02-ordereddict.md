---
title: OrderedDict
summary: OrderedDict remembers insertion order and adds order-aware tools on top of dict, including move_to_end, popitem from either end and equality that checks key order.
minutes: 13
---

## Why OrderedDict exists

For most of Python's history, a plain `dict` made no promise about the order of its keys. `collections.OrderedDict` was added (in Python 2.7/3.1) to fill that gap: a dictionary that remembers the order in which keys were inserted.

Then the landscape changed. CPython 3.6 reimplemented `dict` in a way that happens to preserve insertion order, and Python **3.7** made that order an official language guarantee. So the original reason for `OrderedDict` is gone. It's still worth knowing, because it does a few things a plain `dict` doesn't (next lesson compares the two head to head), and because you'll meet it in older code and libraries.

`OrderedDict` is a subclass of `dict`, so everything you know about dictionaries applies:

```python run
from collections import OrderedDict

d = OrderedDict()
d['z'] = 'hello'
d['y'] = 'world'
d['a'] = 'python'

print(isinstance(d, dict))
for key in d:
    print(key)
```

The keys come back in insertion order (`z`, `y`, `a`), not sorted order.

<div class="callout modern">
<span class="callout-title">The repr changed in Python 3.12</span>

Older notebooks display an `OrderedDict` as a list of pairs: `OrderedDict([('z', 'hello'), ('y', 'world'), ('a', 'python')])`. Since Python **3.12** the repr uses dict-literal syntax instead:

```python run
d
```

Both forms are valid constructor calls, so `eval(repr(d))` still rebuilds the object. Only the display changed.

</div>

Updating the value of an existing key does **not** move it; only new keys go to the end:

```python run
d['z'] = 'HELLO'
list(d)
```

## Reverse iteration

`reversed()` walks an `OrderedDict` from the newest key to the oldest, without building a list first:

```python run
for key in reversed(d):
    print(key)
```

The `keys()`, `values()` and `items()` views are reversible too. (Plain dicts gained the same ability in Python 3.8; see the next lesson.)

## popitem from either end

Since an `OrderedDict` has a first and a last item, its `popitem` takes a `last` argument. By default it removes and returns the **last** item (LIFO, like a stack). With `last=False` it takes the **first** item (FIFO, like a queue):

```python run
d = OrderedDict(first=10, second=20, third=30, last=40)

print(d.popitem())             # from the end
print(d.popitem(last=False))   # from the front
d
```

Popping from an empty `OrderedDict` raises `KeyError`:

```python run
empty = OrderedDict()
try:
    empty.popitem()
except KeyError as ex:
    print('KeyError:', ex)
```

## move_to_end

`move_to_end(key)` moves an existing key to the end. With `last=False` it moves the key to the **front** instead. Both are fast, constant-time operations, because an `OrderedDict` keeps its keys in a doubly linked list alongside the hash table.

```python run
d = OrderedDict(first=10, second=20, third=30, last=40)

d.move_to_end('second')
print(list(d))

d.move_to_end('third', last=False)
print(list(d))
```

The key must already exist:

```python run
try:
    d.move_to_end('x')
except KeyError as ex:
    print('KeyError:', ex)
```

### Example: a tiny LRU cache

`move_to_end` and `popitem(last=False)` together are exactly what a **least recently used** cache needs: every time a key is used, move it to the end; when the cache is full, evict from the front, where the stalest key sits.

```python run
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        value = self.data[key]
        self.data.move_to_end(key)          # mark as most recently used
        return value

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            evicted = self.data.popitem(last=False)
            print('evicted', evicted)

cache = LRUCache(2)
cache.put('a', 1)
cache.put('b', 2)
cache.get('a')          # 'a' is now the freshest
cache.put('c', 3)       # evicts 'b', the least recently used
list(cache.data)
```

(For caching function results, `functools.lru_cache` already does this for you. The point here is how naturally the two methods fit the job.)

## Equality is order-sensitive

Two plain dicts are equal when they have the same key/value pairs, in any order:

```python run
{'a': 10, 'b': 20} == {'b': 20, 'a': 10}
```

Two `OrderedDict` objects are equal only if they have the same pairs **in the same order**:

```python run
d1 = OrderedDict(a=10, b=20)
d2 = OrderedDict(a=10, b=20)
d3 = OrderedDict(b=20, a=10)

print(d1 == d2)
print(d1 == d3)
```

But comparing an `OrderedDict` with a plain `dict` ignores order, in either direction, because the plain dict has no order-aware comparison to offer:

```python run
plain = {'b': 20, 'a': 10}
print(d1 == plain, plain == d1)
```

<div class="callout note">
<span class="callout-title">Equality isn't transitive here</span>

That rule leads to an odd situation: `d1 == plain` and `plain == d3` are both `True`, yet `d1 == d3` is `False`. Keep this in mind if you mix the two types, for example when checking whether a value is "in" a list that contains both.

</div>

## As a stack or queue: use a deque instead

Because of `popitem(last=...)`, an `OrderedDict` can act as a stack or a queue. If you only need the stack/queue behavior, though, `collections.deque` is built for it and much faster. A quick comparison (popping 10,000 items off each, fifty times):

```python run
from collections import deque
from timeit import timeit

def pop_all_od(n=10_000):
    d = OrderedDict.fromkeys(range(n))
    while d:
        d.popitem(last=False)

def pop_all_deque(n=10_000):
    dq = deque(range(n))
    while dq:
        dq.popleft()

print(f'OrderedDict: {timeit(pop_all_od, number=50):.3f}s')
print(f'deque:       {timeit(pop_all_deque, number=50):.3f}s')
```

The exact numbers depend on your machine, but the `deque` is clearly faster, even though both timings include building the structure. An `OrderedDict` earns its keep when you need queue-like ordering **and** fast lookup or removal by key, as in the LRU cache above. A deque can only find an item by scanning it.

<div class="takeaways">

## Key takeaways

- `OrderedDict` is a `dict` subclass that remembers insertion order. Plain dicts do too since Python 3.7, so order alone is no longer a reason to use it.
- It adds `popitem(last=False)` to remove the **first** item and `move_to_end(key, last=...)` to move a key to either end, both in constant time.
- Equality between two `OrderedDict`s checks key order; comparing with a plain `dict` ignores it.
- Since Python 3.12 its repr looks like `OrderedDict({'a': 1})` instead of a list of pairs.
- For a plain stack or queue, a `deque` is much faster. Use `OrderedDict` when you need ordering *and* lookup by key.

</div>
