---
title: Decimals - Constructors and Contexts
summary: Create Decimals from integers, strings or tuples (never floats), and understand that context precision applies to arithmetic results, not to construction.
minutes: 11
---

## Creating a `Decimal`

```python run
import decimal
from decimal import Decimal
```

### From integers

Integers are always converted exactly:

```python run
print(repr(Decimal(10)))
print(repr(Decimal(-10)))
print(repr(Decimal(2 ** 100)))
```

### From strings

A string gives you exactly the digits you typed, including trailing zeros. A `Decimal` remembers its exponent, so `'1.50'` and `'1.5'` are equal in value but displayed differently:

```python run
print(repr(Decimal('0.1')))
print(repr(Decimal('-3.1415')))
print(Decimal('1.50'), Decimal('1.5'), Decimal('1.50') == Decimal('1.5'))
print(repr(Decimal('1.2e-5')))
```

### From tuples

A decimal number is fully described by three things, and you can pass them as a tuple `(sign, digits, exponent)`:

- `sign`: `0` for positive, `1` for negative;
- `digits`: a tuple of the decimal digits;
- `exponent`: the power of ten that the digits are multiplied by.

So `(0, (3, 1, 4, 1, 5), -4)` means `+31415 × 10⁻⁴ = 3.1415`:

```python run
print(repr(Decimal((0, (3, 1, 4, 1, 5), -4))))
print(repr(Decimal((1, (1, 2, 3, 4), -3))))
print(repr(Decimal((0, (1, 2, 3), 3))))
```

The last one is `123 × 10³`, which `Decimal` prints in scientific notation as `1.23E+5`. The method `as_tuple()` goes the other way:

```python run
print(Decimal('-3.1415').as_tuple())
```

### But not from floats

You *can* pass a float, and the conversion is exact, but exact to the **binary approximation** the float holds, not to the decimal number you had in mind:

```python run
print(format(0.1, '.25f'))
print(repr(Decimal(0.1)))
print(Decimal(0.1) == Decimal('0.1'))
```

`Decimal` does its job perfectly here; the damage was done when `0.1` became a float. So: **build decimals from strings, integers or tuples.**

<div class="callout tip">
<span class="callout-title">Catching accidental floats</span>

If you want Python to stop you from mixing floats in, enable the `FloatOperation` trap. Then constructing from a float, or comparing a `Decimal` with a float using `<`, raises an exception:

```python run
with decimal.localcontext() as ctx:
    ctx.traps[decimal.FloatOperation] = True
    try:
        Decimal(0.1)
    except decimal.FloatOperation as ex:
        print('FloatOperation raised:', type(ex).__name__)
```

</div>

## Precision applies to arithmetic, not construction

The context precision does **not** limit the numbers you create. It only applies to the **results of arithmetic**. Let's use a local context with a precision of 2:

```python run
with decimal.localcontext() as ctx:
    ctx.prec = 2
    a = Decimal('0.12345')
    b = Decimal('0.12345')
    print(repr(a), repr(b))   # stored with all their digits
    print(repr(a + b))        # result rounded to 2 significant digits
```

`0.12345 + 0.12345 = 0.2469`, rounded to two significant digits, gives `0.25`.

<div class="callout note">
<span class="callout-title">Significant digits, not decimal places</span>

`prec` counts **significant digits**, not digits after the decimal point. With `prec = 2`, `0.2469` becomes `0.25`, but `123.45 + 0` becomes `1.2E+2`. It looks like "two decimal places" in the first case only because the number starts with `0.`.

```python run
with decimal.localcontext(prec=2):
    print(Decimal('0.12345') + Decimal('0.12345'))
    print(Decimal('123.45') + 0)
    print(+Decimal('123.45'))    # unary plus also applies the context
```

To round to a fixed number of **decimal places**, use `quantize()`:

```python run
price = Decimal('19.98765')
print(price.quantize(Decimal('0.01')))
print(price.quantize(Decimal('0.01'), rounding=decimal.ROUND_DOWN))
```

</div>

## Local and global contexts are independent

A value computed inside a local context keeps the digits it was given. Leaving the block doesn't magically "re-precision" it:

```python run
a = Decimal('0.12345')
b = Decimal('0.12345')
print(a + b)                       # global precision (28): 0.24690

with decimal.localcontext() as ctx:
    ctx.prec = 2
    c = a + b
    print(f'c within local context:  {c}')

print(f'c after the block:        {c}')
print(f'a + b after the block:    {a + b}')
```

`c` was rounded when it was created, inside the block, so it stays `0.25`. A new addition after the block uses the global precision again.

## What else is in a context?

Printing the context shows all of its settings:

```python run
print(decimal.getcontext())
```

Besides `prec` and `rounding`, you'll see the exponent limits `Emin`/`Emax`, the **flags** (a record of conditions that have occurred so far, such as `Inexact` or `Rounded`; earlier cells on this page have already set some), and the **traps**: conditions that raise an exception instead of quietly returning a special value. By default, dividing by zero raises an error:

```python run
try:
    Decimal(1) / Decimal(0)
except decimal.DivisionByZero as ex:
    print('DivisionByZero:', type(ex).__name__)

with decimal.localcontext() as ctx:
    ctx.traps[decimal.DivisionByZero] = False
    print(Decimal(1) / Decimal(0))
```

<div class="takeaways">

## Key takeaways

- Create decimals from `int`, `str`, or `(sign, digits, exponent)` tuples; `Decimal(float)` copies the float's binary error.
- Context precision is about **significant digits** and only affects arithmetic results (and unary `+`), not construction.
- Use `quantize()` to round to a fixed number of decimal places.
- A value created in a local context keeps its digits after the context ends.

</div>
