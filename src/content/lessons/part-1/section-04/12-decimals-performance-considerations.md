---
title: Decimals - Performance Considerations
summary: Decimals use several times more memory than floats and are noticeably slower to create and compute with, so use them where exactness matters, not everywhere.
minutes: 8
---

## Exactness has a price

Floats are implemented directly by the CPU's floating-point hardware: one 64-bit value, one machine instruction per operation. Decimals are implemented in software (CPython uses the fast C library *libmpdec*), with variable-length digit storage and a context to consult for every operation. That flexibility costs memory and time.

## Memory footprint

```python run
import sys
from decimal import Decimal

a = 3.1415
b = Decimal('3.1415')
print('float:  ', sys.getsizeof(a), 'bytes')
print('Decimal:', sys.getsizeof(b), 'bytes')
```

The exact numbers depend on the platform (on a typical 64-bit CPython you'll see 24 bytes for the float and around 104 for the `Decimal`; this page runs a 32-bit WebAssembly build, so both are smaller), but the decimal is several times larger either way. If you store millions of values, that adds up.

## Speed

Let's time a few basic operations. `timeit` runs a statement many times and reports the total seconds. The counts are kept small so each cell finishes quickly in the browser.

### Creating values

```python run
from timeit import timeit
n = 200_000

t_float = timeit('a = 3.1415', number=n)
t_dec = timeit("a = Decimal('3.1415')", globals=globals(), number=n)
print(f'float:   {t_float:.4f} s')
print(f'Decimal: {t_dec:.4f} s  ({t_dec / t_float:.0f}x slower)')
```

A float literal is a compile-time constant, so creating it is nearly free; building a `Decimal` means calling the constructor and parsing a string each time.

### Addition

```python run
a_float = 3.1415
a_dec = Decimal('3.1415')

t_float = timeit('a_float + a_float', globals=globals(), number=n)
t_dec = timeit('a_dec + a_dec', globals=globals(), number=n)
print(f'float:   {t_float:.4f} s')
print(f'Decimal: {t_dec:.4f} s  ({t_dec / t_float:.1f}x slower)')
```

Simple arithmetic is the cheapest decimal operation, but still slower than floats.

### Square roots

```python run
import math
n = 50_000

t_float = timeit('math.sqrt(a_float)', globals=globals(), number=n)
t_dec = timeit('a_dec.sqrt()', globals=globals(), number=n)
print(f'float:   {t_float:.4f} s')
print(f'Decimal: {t_dec:.4f} s  ({t_dec / t_float:.0f}x slower)')
```

Computing a square root to 28 significant digits is real work, while the float square root is a single hardware instruction, so expect a large gap here (on a native 64-bit CPython it is typically the largest of the three).

<div class="callout note">
<span class="callout-title">Your numbers will vary</span>

Timings depend on the machine, the browser and what else is running. Run the cells a few times. The *ratios* are what matter, and they consistently favor floats.

</div>

## So when should you use which?

| Use | When |
|---|---|
| `float` | scientific and engineering calculations, graphics, statistics, machine learning: anywhere a relative error around 1e-16 is fine and speed matters |
| `Decimal` | money, accounting, invoices, tax, anything that must match decimal arithmetic done by humans (or by law), or when you need control over precision and rounding |
| `Fraction` | exact rational arithmetic, such as symbolic or teaching contexts, where values are ratios like 1/3 that no decimal can represent |
| `int` | anything countable, including money stored as an integer number of cents |

<div class="callout tip">
<span class="callout-title">Integers for money</span>

A popular alternative to decimals for currency is to store amounts as integers in the smallest unit (cents). Integer arithmetic is exact and fast; you only convert for display. Decimals shine when you need fractional cents, interest rates, or explicit rounding rules.

</div>

<div class="takeaways">

## Key takeaways

- A `Decimal` uses several times the memory of a `float`.
- Creating decimals and doing arithmetic with them is slower than with floats; functions like `sqrt()` are dramatically slower.
- Choose `Decimal` when exact decimal results matter, and `float` when speed matters and tiny relative errors are acceptable.

</div>
