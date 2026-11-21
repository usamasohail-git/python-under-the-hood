---
title: Floats - Equality Testing
summary: Why == is unreliable for floats, and how math.isclose uses relative and absolute tolerances to compare them safely.
minutes: 11
---

## The problem

Because most decimal fractions are stored approximately, two calculations that are equal on paper can produce slightly different floats:

```python run
x = 0.1 + 0.1 + 0.1
y = 0.3
print(x == y)
print(x)
```

Showing more digits makes the reason clear. Each `0.1` is a little too big, the errors add up, and `0.3` itself is a little too small:

```python run
print(f'0.1 --> {0.1:.25f}')
print(f'x   --> {x:.25f}')
print(f'y   --> {y:.25f}')
```

When every number involved has an exact binary representation, `==` works fine:

```python run
x = 0.125 + 0.125 + 0.125
y = 0.375
print(x == y)
print(f'{x:.25f}  {y:.25f}')
```

But in real programs you rarely know that, so you need a comparison that tolerates tiny errors.

## First idea: round, then compare

```python run
x = 0.1 + 0.1 + 0.1
y = 0.3
print(round(x, 5) == round(y, 5))
```

It works here, but it's fragile. Two numbers that are extremely close can still round to different values if they sit on either side of a rounding boundary:

```python run
a = 0.123449999
b = 0.123450001
print(abs(a - b))
print(round(a, 4), round(b, 4), round(a, 4) == round(b, 4))
```

They differ by only 0.000000002, yet the rounded versions differ. Rounding also forces you to pick a number of decimal places, which doesn't suit both very large and very small numbers.

## `math.isclose()`

The `math` module provides a proper tool:

```python
math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)
```

```python run
from math import isclose
x = 0.1 + 0.1 + 0.1
y = 0.3
print(isclose(x, y))
```

It accepts two kinds of tolerance.

### Relative tolerance

Is a difference of `0.01` big or small? It depends on the size of the numbers:

- `123456789.01` vs `123456789.02`: for most purposes, the same number;
- `0.01` vs `0.02`: one is **twice** the other.

A **relative tolerance** expresses the allowed difference as a fraction of the numbers' magnitude. `rel_tol=0.01` means "within 1% of the larger of the two":

```python run
print(isclose(123456789.01, 123456789.02, rel_tol=0.01))
print(isclose(0.01, 0.02, rel_tol=0.01))
```

The default `rel_tol=1e-09` means "equal in about the first 9 significant digits", which absorbs ordinary floating-point error.

### Absolute tolerance

Relative tolerance breaks down **near zero**. Two tiny numbers can be very close in absolute terms, yet far apart *relative to their size*:

```python run
x = 0.0000001
y = 0.0000002
print(isclose(x, y, rel_tol=0.01))
```

And comparing anything to exactly `0` with the default settings never succeeds unless the value is exactly zero, because 1e-9 times a tiny number is tinier still:

```python run
print(isclose(1e-20, 0))
```

An **absolute tolerance** is a fixed allowed difference, independent of magnitude:

```python run
print(isclose(x, y, abs_tol=0.0001, rel_tol=0))
print(isclose(1e-20, 0, abs_tol=1e-12))
```

### The rule `isclose` uses

The two tolerances are combined with **or**: the numbers are close if their difference is within *either* tolerance.

```text
abs(a - b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)
```

So specifying both gives sensible behavior for large and small numbers at once:

```python run
x = 0.0000001
y = 0.0000002
a = 123456789.01
b = 123456789.02
print('x close to y:', isclose(x, y, abs_tol=0.0001, rel_tol=0.01))
print('a close to b:', isclose(a, b, abs_tol=0.0001, rel_tol=0.01))
```

Let's re-implement the formula to check we understand it:

```python run
def my_isclose(a, b, rel_tol=1e-09, abs_tol=0.0):
    return abs(a - b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)

tests = [(0.1 + 0.1 + 0.1, 0.3, {}),
         (0.01, 0.02, {'rel_tol': 0.01}),
         (1e-20, 0, {'abs_tol': 1e-12})]
for a, b, kw in tests:
    print(my_isclose(a, b, **kw), isclose(a, b, **kw))
```

<div class="callout tip">
<span class="callout-title">Choosing tolerances</span>

There's no universal value: the right tolerance comes from your problem (how precise is your data? how many operations did the error accumulate through?). A good default is the built-in `rel_tol`, plus an `abs_tol` whenever values near zero are possible.

</div>

<div class="callout modern">
<span class="callout-title">Python 3.9+: math.ulp() and math.nextafter()</span>

To see how far apart neighboring floats really are, use `math.ulp(x)` (the "unit in the last place": the gap from `x` to the next float) and `math.nextafter(x, y)` (the next float after `x` in the direction of `y`). The gap grows with the magnitude, which is exactly why relative tolerances make sense.

```python run
import math
print(math.ulp(1.0))
print(math.ulp(1_000_000.0))
print(math.nextafter(0.3, 1))
print(0.1 + 0.1 + 0.1 == math.nextafter(0.3, 1))
```

`0.1 + 0.1 + 0.1` lands exactly one float above `0.3`.

</div>

<div class="takeaways">

## Key takeaways

- Never compare floats from calculations with `==`; tiny representation errors make it unreliable.
- Rounding before comparing is fragile near rounding boundaries.
- `math.isclose(a, b, rel_tol=1e-09, abs_tol=0.0)` passes if `abs(a-b) <= max(rel_tol * max(|a|, |b|), abs_tol)`.
- Relative tolerance scales with magnitude; absolute tolerance is needed for values near zero.

</div>
