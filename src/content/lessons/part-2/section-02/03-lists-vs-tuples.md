---
title: Lists vs Tuples
summary: Tuples are cheaper than lists to create, copy and store, because the compiler and runtime can rely on their size and contents never changing.
minutes: 14
---

## Two ways to see a tuple

In Part 1 we treated tuples as **data records**, where the position of each value has meaning (`(x, y)`, `('Paris', 'France', 2_100_000)`). Here we'll look at them from another angle: as **immutable lists**. Seen that way, the question is simple: if you don't need to change a collection, is a tuple better than a list?

Usually, yes. Because a tuple can never change, Python can take shortcuts with it that are impossible for lists. Let's look at three of them: creation, copying and storage.

## Creation: constant folding

When the compiler sees a tuple literal made only of constants, it builds the tuple **once, at compile time**, and stores it as a single constant in the code object. A list literal has to be built fresh every time the code runs, because each evaluation must produce a new, independent list.

The `dis` module shows the bytecode the compiler produces:

```python run
from dis import dis

dis(compile('(1, 2, 3, "a")', 'string', 'eval'))
print('-' * 40)
dis(compile('[1, 2, 3, "a"]', 'string', 'eval'))
```

The tuple version simply returns one constant, the ready-made tuple. The list version creates an empty list and then extends it from a constant tuple: real work, done at run time, on every execution.

<div class="callout modern">
<span class="callout-title">Bytecode changes between versions</span>

Older notebooks show a tuple compiled to `LOAD_CONST` + `RETURN_VALUE`, and a list built with one `LOAD_CONST` per element followed by `BUILD_LIST`. Newer versions (3.12+) fuse the tuple case into `RETURN_CONST` and build constant lists with `BUILD_LIST 0` + `LIST_EXTEND`. The names change, but the idea is the same: the tuple already exists; the list is assembled each time.

</div>

The difference shows up in timings:

```python run
from timeit import timeit

print('tuple:', timeit('(1, 2, 3, 4, 5, 6, 7, 8, 9)', number=1_000_000))
print('list: ', timeit('[1, 2, 3, 4, 5, 6, 7, 8, 9]', number=1_000_000))
```

The advantage disappears once the literal contains something that isn't a constant, such as a variable or a nested list. Then even the tuple has to be built at run time:

```python run
def fn1():
    pass

dis(compile('(fn1, 10, 20)', 'string', 'eval'))
print('-' * 40)
dis(compile('([1, 2], 10, 20)', 'string', 'eval'))
```

Both now end in `BUILD_TUPLE`, just as a list would end in `BUILD_LIST`, and the timings become very close.

## Copying: tuples don't bother

Ask for a copy of a list and you get a new list. Ask for a "copy" of a tuple and you get the **same** tuple back:

```python run
l1 = [1, 2, 3, 4, 5, 6, 7, 8, 9]
t1 = (1, 2, 3, 4, 5, 6, 7, 8, 9)

l2 = list(l1)
t2 = tuple(t1)
print(l1 is l2, t1 is t2)
```

That's not a shortcut that could ever bite you. A copy is only useful if you might change one version without affecting the other, and a tuple can't be changed at all. Even if the tuple contains mutable objects, a shallow copy would point at the very same objects, so it would be no safer than the original:

```python run
t1 = ([1, 2], fn1, 3)
t2 = tuple(t1)
print(t1 is t2)
```

Skipping the copy is, of course, faster:

```python run
print('tuple():', timeit('tuple(t1)', globals={'t1': (1, 2, 3, 4, 5, 6, 7, 8, 9)}, number=1_000_000))
print('list(): ', timeit('list(l1)', globals={'l1': [1, 2, 3, 4, 5, 6, 7, 8, 9]}, number=1_000_000))
```

## Storage: over-allocation

A list has to support fast `append`. If it allocated exactly enough room for its current items, every append would need to allocate a bigger block and move everything. Instead, CPython **over-allocates**: when a list must grow, it reserves room for several extra items, so most appends just fill a slot that's already there. (This is the classic *dynamic array*: occasional expensive resizes, but cheap appends on average.)

A tuple's size is fixed at creation, so it needs exactly one slot per element and nothing more. `sys.getsizeof` reports the memory used by the container itself (not by the objects it refers to):

```python run
import sys

for n in range(1, 9):
    t = tuple(range(n))
    l = list(range(n))
    print(f'{n} items: tuple={sys.getsizeof(t):3}  list={sys.getsizeof(l):3}')
```

The tuple grows by exactly one pointer per item. The list is bigger to begin with (it has to track its allocated capacity separately from its length, and its items live in a separate array). Now watch a list grow by appending:

```python run
c = []
prev = sys.getsizeof(c)
print(f'0 items: {prev}')
for i in range(20):
    c.append(i)
    size = sys.getsizeof(c)
    if size != prev:
        print(f'{i + 1:2} items: {size} (grew by {size - prev})')
    prev = size
```

Most appends don't change the size at all: they use reserved capacity. The size jumps only now and then, and each jump reserves room for more items than the last.

<div class="callout note">
<span class="callout-title">Your numbers may differ</span>

This site runs Python compiled to WebAssembly, where a pointer is 4 bytes, so sizes here are smaller than on a typical 64-bit desktop (where pointers are 8 bytes). The exact growth pattern also varies across Python versions. The shape, a tuple growing one pointer at a time and a list growing in occasional jumps, is the same everywhere.

</div>

## Retrieving elements

Indexing is fast for both. A tuple stores its element pointers directly inside the tuple object, while a list stores a pointer to a separate array of element pointers, so a list lookup has one extra hop. In practice the difference is tiny:

```python run
t = tuple(range(100_000))
l = list(t)
print('tuple:', timeit('t[99_999]', globals=globals(), number=1_000_000))
print('list: ', timeit('l[99_999]', globals=globals(), number=1_000_000))
```

Don't choose between them for lookup speed. Choose based on whether the collection needs to change.

## So which should you use?

- Use a **tuple** when the collection is fixed: constant lookup tables, records, function return values, dictionary keys (tuples of hashable items are hashable).
- Use a **list** when you need to add, remove, reorder or replace items.

Immutability isn't only a speed trick. A tuple tells the reader "this won't change", and it can't be modified by accident by some function you passed it to.

<div class="takeaways">

## Key takeaways

- Tuple literals of constants are built once at compile time; list literals are rebuilt on every evaluation.
- `tuple(t)`, `t[:]` and `copy.copy(t)` return the original tuple: copying an immutable object is pointless.
- Lists over-allocate so that `append` is cheap on average; tuples use exactly the memory they need.
- Element access speed is essentially the same.
- Prefer tuples for data that shouldn't change, lists for collections that must.

</div>
