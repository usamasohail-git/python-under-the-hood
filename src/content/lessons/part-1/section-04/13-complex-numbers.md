---
title: Complex Numbers
summary: Python has a built-in complex type with float real and imaginary parts, arithmetic operators, no ordering, and a cmath module for complex math functions and polar coordinates.
minutes: 10
---

## A built-in type

A complex number has a **real** part and an **imaginary** part: `a + bi`, where `i² = -1`. Python writes the imaginary unit as `j` (the engineering convention), and `complex` is a built-in type, no import needed.

You can create one with the constructor or with a literal:

```python run
a = complex(1, 2)
b = 1 + 2j
c = complex('1+2j')    # from a string (no spaces allowed)
print(a, b, c)
print(a == b == c)
print(1j * 1j)
```

The `j` must follow a number directly: `2j` and `1j` are imaginary literals, but `j` on its own is just a variable name.

## Parts and conjugate

The real and imaginary parts are stored as **floats**, whatever you passed in:

```python run
print(a.real, type(a.real))
print(a.imag, type(a.imag))
print(a.conjugate())     # same real part, imaginary part negated
```

## Arithmetic

The standard arithmetic operators work with complex numbers, and they mix freely with `int` and `float`:

```python run
a = 1 + 2j
b = 3 - 4j
c = 5j
d = 10
print(a + b)
print(b * c)
print(c / d)
print(d - a)
print(a ** 2)
```

Floor division and modulo have no meaning for complex numbers, so they raise `TypeError`:

```python run
try:
    a // b
except TypeError as ex:
    print('a // b -> TypeError:', ex)

try:
    a % b
except TypeError as ex:
    print('a % b  -> TypeError:', ex)
```

## Comparisons

`==` and `!=` work, but since both parts are floats, they inherit all the float equality problems:

```python run
a = 0.1j
print(a + a + a == 0.3j)
print(a + a + a)
```

The ordering operators `<`, `<=`, `>`, `>=` are **not defined**. Complex numbers have no natural order (is `1 + 100j` bigger than `2 + 1j`?), so Python refuses rather than guessing:

```python run
try:
    (1 + 1j) < (100 + 100j)
except TypeError as ex:
    print('TypeError:', ex)
```

## The `cmath` module

The `math` module works with real numbers only. Give it a complex number and it raises `TypeError`. The `cmath` module provides complex versions of the same functions:

```python run
import cmath
import math

a = 1 + 5j
print(cmath.sqrt(a))

try:
    math.sqrt(a)
except TypeError as ex:
    print('TypeError:', ex)
```

`cmath` also handles real inputs that have complex answers:

```python run
print(cmath.sqrt(-4))
try:
    math.sqrt(-4)
except ValueError as ex:
    print('ValueError:', ex)
```

## Polar coordinates

A complex number can also be described by its distance from the origin, the **modulus** `r`, and the angle it makes with the positive real axis, the **phase** (or argument) `φ`, in radians:

- `abs(z)` returns the modulus (the built-in works on complex numbers);
- `cmath.phase(z)` returns the phase;
- `cmath.polar(z)` returns both as a tuple;
- `cmath.rect(r, phi)` converts back to rectangular form `x + yj`.

```python run
a = 1 + 1j
r = abs(a)
phi = cmath.phase(a)
print(f'{a} -> r = {r}, phi = {phi}')
print(cmath.polar(a))
print(cmath.rect(math.sqrt(2), math.pi / 4))
```

Converting back gives `1.0000000000000002` instead of exactly `1`, another reminder that floats are approximations.

## Euler's identity and `cmath.isclose`

One of the most famous equations in mathematics is Euler's identity: e<sup>iπ</sup> + 1 = 0. Let's check it numerically:

```python run
RHS = cmath.exp(cmath.pi * 1j) + 1
print(RHS)
```

Because π itself is only approximated, the result isn't exactly zero, but it is extremely close. `cmath.isclose()` works like `math.isclose()`. Since we're comparing with **zero**, a relative tolerance alone can't succeed; we need an absolute tolerance:

```python run
print(cmath.isclose(RHS, 0))
print(cmath.isclose(RHS, 0, abs_tol=0.00001))
```

<div class="takeaways">

## Key takeaways

- `complex(1, 2)` and `1 + 2j` create complex numbers; `.real` and `.imag` are floats, and `.conjugate()` negates the imaginary part.
- `+ - * / **` work; `//` and `%` don't, and complex numbers can't be ordered with `<` or `>`.
- `==` has the same pitfalls as floats; use `cmath.isclose()` (with `abs_tol` near zero).
- `cmath` supplies complex math functions and polar conversions (`abs`, `phase`, `polar`, `rect`).

</div>
