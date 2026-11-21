---
title: Floats - Internal Representation
summary: A float is a fixed 64-bit binary number with a sign, an exponent and 52 fraction bits, so most decimal fractions such as 0.1 can only be approximated.
minutes: 12
---

## The `float` type

`float` is Python's default type for real numbers. Its constructor accepts a number or a string:

```python run
print(float(10))
print(float(3.14))
print(float('0.1'))
print(float('1.5e-5'), float('inf'), float('-inf'))
```

Unlike `Fraction`, it doesn't understand fraction strings. If you have one, go through `Fraction` first:

```python run
from fractions import Fraction
try:
    float('22/7')
except ValueError as ex:
    print('ValueError:', ex)

print(float(Fraction('22/7')))
```

## 64 bits, fixed

CPython implements `float` with the C `double` type, which on practically every platform is the **IEEE 754 binary64** format ("double precision"). Unlike `int`, a float has a **fixed size**: 8 bytes (64 bits) of data, whatever the value, plus the usual object overhead.

Those 64 bits are split into three fields:

<figure class="diagram">
<svg viewBox="0 0 560 130" role="img" aria-label="The 64 bits of a float: 1 sign bit, 11 exponent bits and 52 fraction bits">
<rect x="20" y="30" width="30" height="44" rx="6" class="d-obj-hl"/><text x="35" y="57" text-anchor="middle" class="d-text">s</text>
<rect x="56" y="30" width="140" height="44" rx="6" class="d-name"/><text x="126" y="57" text-anchor="middle" class="d-text">exponent</text>
<rect x="202" y="30" width="338" height="44" rx="6" class="d-obj"/><text x="371" y="57" text-anchor="middle" class="d-text">fraction (significand)</text>
<text x="35" y="96" text-anchor="middle" class="d-sub">1 bit</text>
<text x="126" y="96" text-anchor="middle" class="d-sub">11 bits</text>
<text x="371" y="96" text-anchor="middle" class="d-sub">52 bits</text>
<text x="20" y="20" class="d-sub">bit 63</text>
<text x="540" y="20" text-anchor="end" class="d-sub">bit 0</text>
<text x="280" y="122" text-anchor="middle" class="d-sub">value = (−1)^s × 1.fraction (binary) × 2^(exponent − 1023)</text>
</svg>
<figcaption>IEEE 754 double precision: a sign bit, a biased exponent and the significant digits.</figcaption>
</figure>

- **sign** (1 bit): 0 for positive, 1 for negative.
- **exponent** (11 bits): a power of two, roughly from 2⁻¹⁰²² to 2¹⁰²³. This is what lets floats cover both tiny and enormous magnitudes.
- **fraction** (52 bits): the significant digits. Together with an implicit leading `1` bit, a float has **53 bits** of precision, which is about **15 to 17 significant decimal digits**.

This is the same idea as scientific notation in base 10: `1.5e-5` means `1.5 × 10⁻⁵`, where `1.5` holds the significant digits and `-5` is the exponent. A float does the same thing in base 2.

`sys.float_info` reports these limits for your platform:

```python run
import sys
print(sys.float_info.mant_dig)   # bits of precision
print(sys.float_info.dig)        # decimal digits that are always safe
print(sys.float_info.max)
print(sys.float_info.epsilon)    # gap between 1.0 and the next float
```

<div class="callout note">
<span class="callout-title">Significant digits</span>

Roughly, the significant digits of a number are its digits without leading or trailing zeros. `1.2345`, `1234.5`, `12345000000` and `0.000012345` all have five: the zeros only position the digits, which is exactly the exponent's job.

</div>

## Decimal fractions vs. binary fractions

In base 10, the digits after the point stand for tenths, hundredths, thousandths:

```text
0.75 = 7/10 + 5/100           (two terms: finite)
1/3  = 3/10 + 3/100 + 3/1000 + …   (never ends)
```

Some perfectly ordinary rational numbers, like 1/3, need **infinitely many** decimal digits. You can only ever write an approximation.

Binary works the same way, but the positions are halves, quarters, eighths, …:

```text
0.11   (base 2) = 1/2 + 1/4             = 0.75
0.1101 (base 2) = 1/2 + 1/4 + 0/8 + 1/16 = 0.8125
```

A number has a finite binary expansion only if it's a fraction whose denominator is a **power of two**. `0.75 = 3/4` and `0.125 = 1/8` qualify. But `0.1 = 1/10` does not, because 10 has a factor of 5. In binary, 0.1 is a repeating pattern:

```text
0.1 (base 10) = 0.0 0011 0011 0011 0011 … (base 2)
```

With only 53 bits available, the pattern has to be cut off and rounded. So `0.1` in Python is the binary number **closest** to 0.1, not 0.1 itself.

## Seeing the approximation

Printing a float shows the shortest string that maps back to the same float, which hides the error:

```python run
print(0.1)
```

Asking for more digits reveals the stored value:

```python run
print(format(0.1, '.25f'))
print(format(0.125, '.25f'))
```

`0.125` is exactly 1/2³, so it is stored exactly. `0.1` is stored as a value slightly **above** 0.1. Other values end up slightly below. It depends on how the binary expansion was rounded:

```python run
print(format(0.3, '.25f'))
```

`Decimal` can show the *complete* exact value of a float, every digit of it:

```python run
from decimal import Decimal
print(Decimal(0.1))
```

And you can look at the actual bits. `struct` gives the raw 8 bytes, and `float.hex()` shows the significand in hex with a power-of-two exponent:

```python run
import struct
bits = ''.join(f'{byte:08b}' for byte in struct.pack('>d', 0.1))
print('sign     ', bits[0])
print('exponent ', bits[1:12])
print('fraction ', bits[12:])
print((0.1).hex())
```

You can spot the repeating pattern in the fraction bits (`1001 1001 …`, the same `0011` cycle seen from a different starting point). It had to be cut off after 52 bits, and the last bits were rounded **up** (`…1010` instead of `…1001`), which is why the stored value is slightly more than 0.1.

<div class="callout note">
<span class="callout-title">Not a Python problem</span>

Every language that uses IEEE 754 doubles (C, Java, JavaScript, Go, …) has exactly the same behavior. In JavaScript, `0.1 + 0.2` is also `0.30000000000000004`. It's a consequence of storing decimal numbers in a finite number of binary digits.

</div>

<div class="takeaways">

## Key takeaways

- A `float` is an IEEE 754 binary64 number: 1 sign bit, 11 exponent bits, 52 fraction bits (53 bits ≈ 15–17 significant digits).
- Its size is fixed, unlike `int`.
- Only fractions with a power-of-two denominator have a finite binary expansion; `0.1`, `0.2`, `0.3` are stored as approximations.
- `print()` shows the shortest round-tripping repr; use `format(x, '.25f')` or `Decimal(x)` to see the stored value.

</div>
