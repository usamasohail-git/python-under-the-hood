---
title: Decimals - Math Operations
summary: For Decimals, // truncates instead of flooring, and their own sqrt, ln, exp and log10 methods keep the full context precision that the math module would throw away.
minutes: 10
---

## `//` and `%` work differently

```python run
import decimal
from decimal import Decimal
```

For integers, `//` is **floor** division and `%` is the matching remainder. For decimals, `//` **truncates** toward zero, and `%` is adjusted to match. In both cases the fundamental identity still holds:

```text
n == d * (n // d) + n % d
```

With positive numbers you can't tell the difference:

```python run
x, y = 10, 3
print(x // y, x % y, divmod(x, y), x == y * (x // y) + x % y)

a, b = Decimal('10'), Decimal('3')
print(a // b, a % b, divmod(a, b), a == b * (a // b) + a % b)
```

With a negative operand, they diverge:

```python run
x, y = -10, 3
print(x // y, x % y, divmod(x, y), x == y * (x // y) + x % y)

a, b = Decimal('-10'), Decimal('3')
print(a // b, a % b, divmod(a, b), a == b * (a // b) + a % b)
```

The true quotient is `-3.33…`:

- `int`: floor gives `-4`, so the remainder must be `-10 - 3·(-4) = 2`;
- `Decimal`: truncation gives `-3`, so the remainder must be `-10 - 3·(-3) = -1`.

So for decimals, the remainder takes the sign of the **dividend** (the left operand), as `%` does in C and Java. Both are valid conventions; just don't assume decimal code with negative numbers gives the same results as the equivalent integer code.

## Mixing types

Decimals combine with integers, but not with floats or fractions, because that would silently reintroduce binary approximations or ambiguity:

```python run
print(Decimal('1.1') + 2)

try:
    Decimal('1.1') + 2.0
except TypeError as ex:
    print('TypeError:', ex)
```

Comparisons with floats **are** allowed and compare exact values, which can be surprising:

```python run
print(Decimal('0.5') == 0.5)   # 0.5 is exact in binary
print(Decimal('0.1') == 0.1)   # 0.1 isn't
```

## Mathematical functions

`Decimal` objects have their own methods for common functions, computed to the context precision:

```python run
a = Decimal('1.5')
print(a.log10())   # base-10 logarithm
print(a.ln())      # natural logarithm
print(a.exp())     # e ** a
print(a.sqrt())    # square root
print(a ** 2, a ** Decimal('0.5'))
```

### Why not just use `math`?

Functions in the `math` module accept decimals, but they **convert them to floats first**, so you lose the extra precision you chose decimals for:

```python run
import math
x = 2
x_dec = Decimal(2)

root_float = math.sqrt(x)
root_mixed = math.sqrt(x_dec)   # Decimal -> float -> sqrt
root_dec = x_dec.sqrt()

print(type(root_mixed))
print(format(root_float, '1.27f'))
print(format(root_mixed, '1.27f'))
print(root_dec)
```

The float result is only accurate to about 16 digits; after that the digits are noise. The decimal result is correct to all 28 significant digits. Squaring each root shows the difference:

```python run
print(format(root_float * root_float, '1.27f'))
print(format(root_mixed * root_mixed, '1.27f'))
print(root_dec * root_dec)
```

The decimal version misses `2` by one unit in the 28th digit (the square root of 2 is irrational, so *some* rounding is unavoidable). The float version is off in the 16th digit.

When the exact answer has a finite decimal form, decimals find it exactly, while the float version can't even represent the input:

```python run
x = 0.01
x_dec = Decimal('0.01')
root_float = math.sqrt(x)
root_dec = x_dec.sqrt()
print(format(root_float, '1.27f'), root_dec)
print(format(root_float * root_float, '1.27f'), root_dec * root_dec)
```

More precision is just a context setting away:

```python run
with decimal.localcontext(prec=50):
    print(Decimal(2).sqrt())
```

<div class="callout note">
<span class="callout-title">Where are sin and cos?</span>

The `Decimal` class provides `sqrt`, `exp`, `ln`, `log10` and powers, but no trigonometric functions. The `decimal` documentation includes recipes for them written with plain decimal arithmetic.

</div>

<div class="takeaways">

## Key takeaways

- For decimals, `//` truncates and `%` takes the sign of the dividend; for ints, `//` floors and `%` takes the sign of the divisor. `n == d*(n//d) + n%d` holds for both.
- `Decimal` mixes with `int`, but arithmetic with `float` raises `TypeError`.
- Use the `Decimal` methods (`sqrt()`, `ln()`, `exp()`, `log10()`) rather than `math` functions, which convert to float and lose precision.

</div>
