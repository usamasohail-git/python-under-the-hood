---
title: Rational Numbers
summary: The Fraction class does exact arithmetic with ratios of integers, and it reveals the exact value hiding behind every float.
minutes: 11
---

## What is a rational number?

A **rational number** is one that can be written as a fraction `p / q` of two integers, with `q != 0`: `1/2`, `-3/4`, `22/7`, and also `5` (which is `5/1`) and `0.125` (which is `1/8`).

Every number with a **finite** decimal expansion is rational: `0.375 = 375/1000 = 3/8`. Numbers like π or √2 are **irrational**: no fraction of integers equals them exactly.

Python represents rational numbers with the `Fraction` class from the `fractions` module. A `Fraction` stores an integer numerator and an integer denominator, and because Python integers have unlimited size, the arithmetic is **exact**.

## Creating fractions

```python run
from fractions import Fraction

print(repr(Fraction(1)))        # denominator defaults to 1
print(repr(Fraction(1, 3)))
print(repr(Fraction('10.5')))   # from a decimal string
print(repr(Fraction('22/7')))   # from a fraction string
print(repr(Fraction(0.125)))    # from a float
```

The arguments can themselves be rational. `Fraction(x, y)` means "x divided by y":

```python run
x = Fraction(2, 3)
y = Fraction(3, 4)
Fraction(x, y)    # (2/3) / (3/4) = 8/9
```

Two normalizations happen automatically: fractions are **reduced** to lowest terms, and the sign always ends up on the **numerator**:

```python run
print(repr(Fraction(8, 16)))
print(repr(Fraction(1, -4)))
```

## Arithmetic

All the usual operators work, and the results stay exact:

```python run
print(Fraction(1, 3) + Fraction(1, 3) + Fraction(1, 3))
print(Fraction(1, 2) * Fraction(1, 4))
print(Fraction(1, 2) / Fraction(1, 3))
print(Fraction(1, 3) + 1)        # mixing with int stays a Fraction
```

Compare that with `float`, where `1/3 + 1/3 + 1/3` only *happens* to come out as `1.0` thanks to rounding, and many similar sums don't.

The parts are available as plain integers:

```python run
x = Fraction(22, 7)
print(x.numerator, x.denominator)
```

## Every float is a fraction

A `float` stores a finite number of binary digits, so every finite float is exactly some fraction whose denominator is a power of two. `Fraction(some_float)` gives you that exact fraction:

```python run
import math
x = Fraction(math.pi)
print(x)
print(float(x))
print(Fraction(math.sqrt(2)))
```

These are the rational numbers closest to π and √2 that a float can hold. They are approximations of the real values, not the real values themselves.

### The surprise: `0.3` isn't 3/10

Some decimal numbers can be stored exactly in binary. `0.125` is `1/8`, a power of two, so it's exact:

```python run
print(repr(Fraction(0.125)))
```

But `0.3` cannot be written with a power-of-two denominator, so the float `0.3` is only the nearest binary value:

```python run
print(repr(Fraction(3, 10)))
print(repr(Fraction(0.3)))
```

Printing `0.3` hides this. Python displays the **shortest** string that converts back to the same float, which is `0.3`. Ask for more digits and the truth shows up:

```python run
x = 0.3
print(x)
print(format(x, '.5f'))
print(format(x, '.15f'))
print(format(x, '.25f'))
```

We can even measure the error exactly:

```python run
delta = Fraction(0.3) - Fraction(3, 10)
print(delta == 0)
print(repr(delta))
print(float(delta))
```

The next lessons explain where this comes from. For now: **if you want an exact `Fraction`, build it from integers or a string, not from a float.**

```python run
print(Fraction('0.3') == Fraction(3, 10))
print(Fraction(0.3) == Fraction(3, 10))
```

## Limiting the denominator

`limit_denominator(max_d)` finds the closest fraction whose denominator is at most `max_d`. It's a neat way to find simple approximations:

```python run
x = Fraction(math.pi)
for max_d in (10, 100, 500):
    y = x.limit_denominator(max_d)
    print(f'{str(y):>8} = {float(y):.15f}')
print(f'      pi = {math.pi:.15f}')
```

`22/7` is the classic approximation of π; `355/113` is already correct to six decimal places.

<div class="callout modern">
<span class="callout-title">Newer conveniences</span>

- `float.as_integer_ratio()` (long-standing) and `int.as_integer_ratio()` (3.8+) return the exact `(numerator, denominator)` pair without importing `fractions`.
- Python 3.12 added `Fraction.is_integer()`, and fractions now support float-style format specs such as `f'{x:.3f}'`.

```python run
print((0.75).as_integer_ratio())
print(Fraction(6, 3).is_integer())
print(f'{Fraction(1, 3):.4f}')
```

</div>

<div class="takeaways">

## Key takeaways

- `Fraction(p, q)` stores an exact ratio of integers, automatically reduced, with the sign on the numerator.
- Arithmetic on fractions is exact (but slower than floats).
- Every float is exactly a fraction with a power-of-two denominator; `Fraction(0.3)` exposes that `0.3` is only approximated.
- Build exact fractions from integers or strings; use `limit_denominator()` to find simple approximations.

</div>
