---
title: Slicing
summary: Slices are objects with start, stop and step. Understanding how Python turns them into a range of indices explains every edge case, including negative steps.
minutes: 16
---

## Slices are objects

When you write `l[0:2]`, Python builds a `slice` object and passes it to the sequence. You can build that object yourself with the `slice()` built-in:

```python run
s = slice(0, 2)
print(type(s), s.start, s.stop, s.step)

l = [1, 2, 3, 4, 5]
print(l[s], l[0:2])
```

That's more than a curiosity. Named slices make code that cuts up fixed-width data much easier to read and maintain:

```python run
record = 'Ada       Lovelace  1815'

FIRST_NAME = slice(0, 10)
LAST_NAME = slice(10, 20)
BORN = slice(20, 24)

print(record[FIRST_NAME].strip(), record[LAST_NAME].strip(), int(record[BORN]))
```

If the file layout changes, you update the slice definitions in one place instead of hunting down magic numbers throughout the code.

## The fundamentals

A slice `seq[start:stop]` includes `start` and **excludes** `stop`. That half-open convention has nice properties: `seq[i:j]` has `j - i` items, and `seq[:k] + seq[k:]` is always the whole sequence.

```python run
s = 'python'
print(s[0:1], s[0:6], s[:2] + s[2:])
```

An optional third value, the **step**, picks every k-th item. The same works with a `slice` object:

```python run
print(s[0:6:2], s[0:6:3])
print(s[slice(0, 6, 2)], s[slice(0, 6, 3)])
```

Any of the three values can be omitted (or given as `None`): start defaults to the beginning, stop to the end, step to `1`. So `s[:]` is the whole sequence, which for a list means a shallow copy.

### Out-of-range bounds are fine

Plain indexing raises an `IndexError` for a position that doesn't exist. Slicing never does: bounds are clipped to the sequence.

```python run
l = [1, 2, 3, 4, 5, 6]
print(l[0:100], l[-10:100], l[10:20])
try:
    l[100]
except IndexError as ex:
    print('IndexError:', ex)
```

### Negative indices

A negative index counts from the end: `-1` is the last item, `-2` the one before. In a slice, a negative bound `i` simply means `len(seq) + i`:

```python run
l = [0, 1, 2, 3, 4, 5]
print(l[-3:], l[:-1], l[-3:-1])
```

## Negative steps

A negative step walks the sequence **backwards**. Start is still included and stop still excluded, but now start should be to the right of stop:

```python run
l = [0, 1, 2, 3, 4, 5]
print(l[3:0:-1])     # from 3 down to, but not including, 0
print(l[3::-1])      # omit stop to go all the way to the beginning
print(l[::-1])       # the classic reversed copy
```

Here's a puzzle. What should `l[3:-1:-1]` return? If you read `-1` as "one before the start", you'd expect `[3, 2, 1, 0]`. But:

```python run
l[3:-1:-1]
```

Empty! A negative *bound* always means "counted from the end", so `-1` here is index `5`. Starting at 3 and stepping down towards 5 goes nowhere. To include index `0` going backwards, omit the stop (`l[3::-1]`) or use a value far enough below that it gets clipped (`l[3:-100:-1]`).

## How Python resolves a slice

Every slice is ultimately converted into a sequence of indices you could produce with `range(start, stop, step)`. Given the sequence length `n`, the rules are:

**Positive step** (`step > 0`):

- omitted start → `0`; omitted stop → `n`
- a negative bound `b` → `n + b`, and if still below `0` → `0`
- a bound above `n` → `n`

**Negative step** (`step < 0`):

- omitted start → `n - 1` (the last item); omitted stop → "before index 0", which is `-1` as a `range` stop
- a negative bound `b` → `n + b`, and if still below `0` → `-1`
- a bound at or above `n` → `n - 1`

Applying that to the puzzle with `n = 6`: start `3` stays `3`, stop `-1` becomes `6 - 1 = 5`, so the equivalent is `range(3, 5, -1)`, which is empty.

```python run
list(range(3, 5, -1))
```

You don't need to memorize these rules, because the `slice` object will apply them for you.

## `slice.indices()`

`slice.indices(n)` returns the resolved `(start, stop, step)` for a sequence of length `n`: exactly the arguments you'd pass to `range`:

```python run
print(slice(1, 5).indices(10))
print(slice(0, 100, 2).indices(10))
print(slice(None, None, -1).indices(10))
print(slice(3, -1, -1).indices(6))
```

Unpacking that tuple into `range` gives you the actual positions a slice selects:

```python run
l = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

for sl in (slice(1, 5), slice(0, 100, 2), slice(None, None, -1)):
    idx = list(range(*sl.indices(len(l))))
    print(idx, l[sl])
```

The indices and the sliced values match exactly. This is the tool you'll use when you write your own sequence types: your `__getitem__` receives a `slice` object, and `indices(len(self))` tells you which positions to return.

<div class="callout tip">
<span class="callout-title">Try it</span>

Before running, predict what `'python'[-2:-6:-2]` returns. Then check yourself with `slice(-2, -6, -2).indices(6)`.

```python run
print('python'[-2:-6:-2], slice(-2, -6, -2).indices(6))
```

</div>

<div class="takeaways">

## Key takeaways

- `seq[a:b:c]` is shorthand for `seq[slice(a, b, c)]`; named `slice` objects make data-parsing code clearer.
- Slices include start and exclude stop; out-of-range bounds are clipped instead of raising errors.
- A negative step walks backwards. A negative bound still means "counted from the end", which is why `l[3:-1:-1]` is empty.
- `slice.indices(n)` resolves a slice to the `(start, stop, step)` of an equivalent `range` for a sequence of length `n`.

</div>
