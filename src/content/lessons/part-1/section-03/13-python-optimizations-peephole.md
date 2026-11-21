---
title: "Python Optimizations: Peephole"
summary: At compile time, CPython pre-computes constant expressions and turns membership tests on literal lists and sets into faster constants.
minutes: 10
---

## Optimizing at compile time

Before Python runs your code, it **compiles** it to bytecode. During that step CPython applies small, local optimizations, historically called **peephole optimizations**, because they look at a small window of code at a time. Two of the most visible are **constant folding** and **membership-test** rewriting.

You can see the constants a function was compiled with in its code object, `__code__.co_consts`.

## Constant folding

```python run
def my_func():
    a = 24 * 60
    b = (1, 2) * 5
    c = 'abc' * 3
    d = 'ab' * 11
    e = 'the quick brown fox' * 10
    f = [1, 2] * 5
    g = 'x' * 5000

my_func.__code__.co_consts
```

Look at what's stored:

- `24 * 60` was computed once, at compile time, and stored as `1440`. The function never multiplies at run time.
- `(1, 2) * 5` and `'abc' * 3` were also pre-computed into their results.
- `[1, 2] * 5` was **not** folded: a list is mutable, so it must be built fresh on every call (otherwise every call would share one list).
- `'x' * 5000` was **not** folded: the result is too long to be worth storing.

<div class="callout modern">
<span class="callout-title">Modern Python: the size limit</span>

Older versions of CPython only folded sequences up to **20** items, so older notebooks show `'the quick brown fox' * 10` left unfolded. Since Python 3.7, the limit for strings is **4096** characters, so that 190-character string *is* folded today, while `'x' * 5000` is not.

</div>

Use the `dis` module to see the bytecode itself:

```python run
import dis
dis.dis(my_func)
```

Note the single `LOAD_CONST (1440)` for `a`, compared with the `BUILD_LIST` and `BINARY_OP` instructions that still run for `f` and `g`.

## Membership tests

When you test membership against a **literal** list or set, CPython knows you're only reading it once, so it swaps in an immutable, pre-built constant:

```python run
def my_func(e):
    if e in [1, 2, 3]:
        pass
    if e in {1, 2, 3}:
        pass

my_func.__code__.co_consts
```

- The list `[1, 2, 3]` became the tuple `(1, 2, 3)`: same membership result, no list to build each time.
- The set `{1, 2, 3}` became a `frozenset`: an immutable set, built once.

## Prefer sets for membership tests

A list or tuple is searched element by element. A set is a **hash table**, so checking membership takes about the same time no matter how big it is. Here's a rough benchmark:

```python run
import string
import time

char_list = list(string.ascii_letters)
char_tuple = tuple(string.ascii_letters)
char_set = set(string.ascii_letters)

def membership_test(n, container):
    for i in range(n):
        if 'p' in container:
            pass

for container in (char_list, char_tuple, char_set):
    start = time.perf_counter()
    membership_test(1_000_000, container)
    print(f'{type(container).__name__:>5}: {time.perf_counter() - start:.3f}s')
```

`'p'` is the 16th letter, so the list and tuple must check 16 elements every time, while the set jumps straight to it. The bigger the collection, the bigger the gap. You'll learn exactly how hash tables work in Part 3.

<div class="takeaways">

## Key takeaways

- CPython folds constant expressions (like `24 * 60`) at compile time, as long as the result is immutable and not too large.
- Membership tests against literal lists or sets are compiled to tuple or frozenset constants.
- For repeated membership tests, prefer a `set`: lookups are hash-based and fast.

</div>
