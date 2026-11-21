---
title: The For Loop
summary: "Python's for loop doesn't count: it iterates over an iterable. Plus unpacking, break, continue, else, finally and enumerate."
minutes: 11
---

## Not a counting loop

If you come from C, Java or JavaScript, you probably know this kind of `for` loop:

```c
for (int i = 0; i < 5; i++) {
    // code block
}
```

That loop is really just a **repetition** with a counter, a `while` loop in disguise. In Python you'd write the equivalent like this:

```python run
i = 0
while i < 5:
    print(i)
    i += 1
```

Python's `for` statement is something different. It **iterates over an iterable**: it asks an object for its values, one at a time, and runs the block once per value. There's no counter, condition or increment unless the iterable provides them.

## Iterables

An **iterable** is an object that can hand out values one at a time. Note that this definition doesn't say it's a *collection* of values stored somewhere. Some iterables compute each value on demand, which matters a lot once you meet iterators and generators in Part 2.

`range()` produces a simple iterable of integers:

```python run
for i in range(5):
    print(i)
```

`range(5)` doesn't build a list of five numbers. It's a small object that knows its start, stop and step and produces each number when asked:

```python run
r = range(5)
print(r, type(r))
print(list(r))
```

Lots of built-in objects are iterable: lists, tuples, strings, dictionaries, sets, files and more.

```python run
for x in [1, 2, 3]:
    print(x)
for x in 'hello':
    print(x, end=' ')
print()
for x in ('a', 'b', 'c'):
    print(x, end=' ')
print()
```

<div class="callout note">
<span class="callout-title">What `for` does behind the scenes</span>

`for x in obj:` first calls `iter(obj)` to get an **iterator**, then calls `next()` on it repeatedly, binding each result to `x`. When the iterator raises `StopIteration`, the loop ends. You can drive the same protocol by hand:

```python run
it = iter('hi')
print(next(it))
print(next(it))
try:
    next(it)
except StopIteration:
    print('StopIteration: no more values')
```

</div>

## Unpacking in the loop target

Each iteration hands you the "next" object, whatever it is. If the items are tuples, you get tuples:

```python run
for x in [(1, 2), (3, 4), (5, 6)]:
    print(x)
```

The loop target can be a pattern of several names, and each item is **unpacked** into them:

```python run
for i, j in [(1, 2), (3, 4), (5, 6)]:
    print(i, j)
```

This is the same unpacking as `i, j = (1, 2)`, done once per item. A common use is looping over a dictionary's key/value pairs:

```python run
prices = {'apple': 0.5, 'bread': 2.25}
for name, price in prices.items():
    print(f'{name}: {price}')
```

## `break`, `continue` and `else`

`break` and `continue` work exactly as in `while` loops:

```python run
for i in range(5):
    if i == 3:
        continue
    print(i)
```

```python run
for i in range(5):
    if i == 3:
        break
    print(i)
```

`for` loops also accept an `else` block, which runs only when the loop ran through the whole iterable **without `break`**. It's a natural fit for searches:

```python run
for i in range(1, 5):
    print(i)
    if i % 7 == 0:
        print('multiple of 7 found')
        break
else:
    print('No multiples of 7 encountered')
```

```python run
for i in range(1, 8):
    print(i)
    if i % 7 == 0:
        print('multiple of 7 found')
        break
else:
    print('No multiples of 7 encountered')
```

And just like with `while`, a `finally` block runs even when `continue` cuts the iteration short:

```python run
for i in range(5):
    print('--------------------')
    try:
        10 / (i - 3)
    except ZeroDivisionError:
        print('divided by 0')
        continue
    finally:
        print('always runs')
    print(i)
```

For `i == 3`, the division fails, `finally` runs, and `continue` skips `print(i)`.

## Getting the index too

Iterating a string gives you the characters but not their positions:

```python run
s = 'hello'
for c in s:
    print(c, end=' ')
print()
```

When you also need the index, there are several approaches. A manual counter works but is easy to get wrong:

```python run
i = 0
for c in s:
    print(i, c)
    i += 1
```

Looping over `range(len(s))` and indexing works for sequences (things that support `s[i]`), but it's indirect:

```python run
for i in range(len(s)):
    print(i, s[i])
```

The idiomatic tool is `enumerate`, which wraps any iterable and yields `(index, value)` pairs that you unpack directly:

```python run
for i, c in enumerate(s):
    print(i, c)
```

`enumerate` works with any iterable, not only sequences, and takes an optional `start`: `enumerate(s, start=1)` counts from 1.

<div class="callout modern">
<span class="callout-title">Looping over several iterables: `zip(strict=True)`</span>

`zip` walks several iterables in parallel. By default it stops quietly at the shortest one, which can hide bugs. Since Python 3.10, `strict=True` raises an error if the lengths differ:

```python run
names = ['a', 'b', 'c']
scores = [90, 85]
print(list(zip(names, scores)))
try:
    list(zip(names, scores, strict=True))
except ValueError as ex:
    print('ValueError:', ex)
```

</div>

<div class="takeaways">

## Key takeaways

- Python's `for` iterates over an **iterable**, one value at a time; it's not a counter loop.
- `range()` is a lazy iterable of integers; strings, lists, tuples, dicts and files are iterable too.
- The loop target can unpack each item: `for k, v in d.items():`.
- `break`, `continue`, `else` and `finally` behave the same way as in `while` loops.
- Use `enumerate` when you need the index as well as the value.

</div>
