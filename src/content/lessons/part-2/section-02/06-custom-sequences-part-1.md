---
title: Custom Sequences - Part 1
summary: Implement __getitem__ and __len__ and your class supports indexing, slicing, iteration, in, reversed and len, with no inheritance required.
minutes: 16
---

## What `[]` really calls

Square brackets on an object are syntax for a method call. `seq[i]` becomes `type(seq).__getitem__(seq, i)`:

```python run
my_list = [0, 1, 2, 3, 4, 5]
print(my_list.__getitem__(0), my_list.__getitem__(-1))
print(my_list.__getitem__(slice(0, 6, 2)))
print(my_list.__getitem__(slice(None, None, -1)))

try:
    my_list.__getitem__(6)
except IndexError as ex:
    print('IndexError:', ex)
```

The list's `__getitem__` handles positive and negative indices, slices, and raises `IndexError` when an index is out of range. That last behavior is more important than it looks.

## How a `for` loop uses `__getitem__`

If a class has no `__iter__` method but does have `__getitem__`, Python can still iterate over it. It calls `__getitem__(0)`, `__getitem__(1)`, `__getitem__(2)` and so on, and **stops when it gets an `IndexError`**. Written by hand, that "legacy" iteration protocol looks like this:

```python run
index = 0
while True:
    try:
        item = my_list.__getitem__(index)
    except IndexError:
        break                  # end of the sequence
    print(item ** 2, end=' ')
    index += 1
```

So raising `IndexError` at the end isn't optional: it's how a loop knows to stop. Forget it, and iterating your object never ends.

## What does `__getitem__` receive?

Let's see what Python passes for different subscripts:

```python run
class MySequence:
    def __getitem__(self, index):
        print(type(index).__name__, repr(index))

my_seq = MySequence()
my_seq[0]
my_seq[100]
my_seq[0:2]
my_seq[0:10:2]
my_seq[::-1]
```

An `int` for a plain index, a `slice` object for any slice. That's all your method has to handle. And from the previous lesson, you already know how to turn a slice into concrete positions: `range(*s.indices(len(self)))`.

## Example: a lazy Fibonacci sequence

Let's build a sequence of the first `n` Fibonacci numbers (`1, 1, 2, 3, 5, ...`) that **doesn't** store them. Each item is computed on demand when someone asks for it. We'll use a memoized helper so repeated lookups are fast.

```python run
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(k):
    a, b = 1, 1
    for _ in range(k):
        a, b = b, a + b
    return a

print([fib(k) for k in range(10)], fib(50))
```

(An iterative helper avoids recursion-depth limits for large `k`; the cache makes repeated lookups instant.)

### Step 1: indexing

A first attempt just delegates to `fib`:

```python run
class Fib:
    def __init__(self, n):
        self._n = n

    def __getitem__(self, s):
        return fib(s)

f = Fib(10)
print(f[0], f[5], f[9])
print(f[200] > 0, f[-5])     # oops
```

Two bugs: `f[200]` happily returns a value even though the sequence has only 10 items, and `f[-5]` returns `fib(-5)` (which our helper treats as `fib(0)`) instead of the fifth item from the end. Worse, because no `IndexError` is ever raised, `for x in f` would loop forever.

### Step 2: bounds and negative indices

Map a negative index to `n + index`, then reject anything still outside `0 .. n-1`:

```python run
class Fib:
    def __init__(self, n):
        self._n = n

    def __getitem__(self, s):
        if s < 0:
            s = self._n + s
        if s < 0 or s >= self._n:
            raise IndexError('Fib index out of range')
        return fib(s)

f = Fib(10)
print(f[9], f[-1])
for idx in (10, -11):
    try:
        f[idx]
    except IndexError as ex:
        print('IndexError:', ex)

print([x for x in f])     # iteration now stops correctly
```

### Step 3: slices

Now we branch on the type of the argument. For a slice, let `indices()` do the hard work and return a list of the requested values:

```python run
class Fib:
    def __init__(self, n):
        self._n = n

    def __len__(self):
        return self._n

    def __getitem__(self, s):
        if isinstance(s, int):
            if s < 0:
                s = self._n + s
            if s < 0 or s >= self._n:
                raise IndexError('Fib index out of range')
            return fib(s)
        elif isinstance(s, slice):
            rng = range(*s.indices(self._n))
            return [fib(k) for k in rng]
        else:
            raise TypeError(f'Fib indices must be integers or slices, not {type(s).__name__}')

    def __repr__(self):
        return f'Fib({self._n})'

f = Fib(10)
print(f[0:5], f[5::-1], f[::-1])
print(len(f), list(f))
```

We also added `__len__`, so `len(f)` works. Without it, `len()` raises `TypeError` even though the class "knows" its size.

## What you get for free

With just `__len__` and `__getitem__`, a lot of Python already works with our class:

```python run
print(55 in f, 4 in f)          # `in` falls back to iterating
print(list(reversed(f)))        # reversed uses __len__ + __getitem__
print(sum(f), max(f))
a, b, *rest = Fib(4)            # unpacking iterates too
print(a, b, rest)
```

None of this required inheriting from `list` or any other class. Python cares about **behavior** (which special methods exist), not ancestry. This is often called *duck typing*, or following a *protocol*.

<div class="callout tip">
<span class="callout-title">Want index() and count() too?</span>

Inherit from `collections.abc.Sequence` and implement `__getitem__` and `__len__`. The base class then supplies working `__contains__`, `__iter__`, `__reversed__`, `index` and `count` methods, and `isinstance(f, Sequence)` becomes `True`. You'll see these abstract base classes in more depth later.

</div>

<div class="callout note">
<span class="callout-title">Lazy vs stored</span>

`Fib` computes items when they're requested rather than storing them. That's the same idea behind `range`, which represents millions of numbers with three integers. Later, iterators and generators take this further and remove even the need for random access.

</div>

<div class="takeaways">

## Key takeaways

- `obj[x]` calls `__getitem__` with an `int` for an index and a `slice` object for a slice.
- `__getitem__` must raise `IndexError` past the end; iteration relies on it to stop.
- Handle negative indices by adding the length, and slices with `range(*s.indices(len(self)))`.
- With `__len__` and `__getitem__` alone, `len`, `for`, `in`, `reversed`, unpacking, `sum`, `max` and more all work.

</div>
