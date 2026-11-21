---
title: Integers - Operations
summary: Which integer operations return an int, why / always returns a float, and how floor division and modulo behave with negative numbers.
minutes: 10
---

## Operations that stay integers

Adding, subtracting and multiplying two integers always gives an integer. Exponentiation does too, as long as the exponent is a non-negative integer:

```python run
print(type(2 + 3), type(3 - 10), type(3 * 5), type(3 ** 4))
```

A negative exponent produces a fraction, so the result becomes a `float`:

```python run
print(2 ** -1, type(2 ** -1))
```

## True division always returns a float

The `/` operator is **true division**. It returns a `float` every time, even when the division is exact:

```python run
print(2 / 3, type(2 / 3))
print(10 / 2, type(10 / 2))
```

That consistency is deliberate: the result type of `/` never depends on the values, only on the operation. If you want an integer result, you need a different operator.

## Floor, truncation and negative numbers

Before we look at `//`, we need two ways of turning a real number into an integer:

- **truncation** (`math.trunc`) throws away the fractional part, always moving **toward zero**;
- **floor** (`math.floor`) returns the largest integer **less than or equal to** the number, always moving **down** the number line.

For non-negative numbers they agree. For negative numbers they don't:

```python run
import math
print(math.floor(3.15), math.trunc(3.15))
print(math.floor(3.9999999), math.trunc(3.9999999))
print(math.floor(-3.15), math.trunc(-3.15))
print(math.floor(-3.0000001), math.trunc(-3.0000001))
```

The floor of `-3.15` is `-4`, because `-4` is the nearest integer *below* `-3.15` on the number line. Truncation just chops off `.15` and gives `-3`.

## Floor division: `//`

The floor division operator is defined as the floor of the true quotient:

```text
a // b  ==  floor(a / b)
```

This holds for every combination of signs. With positive numbers, `//` looks like truncation. With a negative operand you can see that it really is *floor*:

```python run
for a, b in [(33, 16), (-33, 16), (33, -16), (-33, -16)]:
    print(f'{a:>3} / {b:>3} = {a / b:>7}   trunc = {math.trunc(a / b):>2}   {a:>3} // {b:>3} = {a // b:>2}')
```

<div class="callout note">
<span class="callout-title">Not the same in every language</span>

In C, Java and JavaScript, integer division truncates toward zero, so `-33 / 16` gives `-2` there. Python's `//` gives `-3`. Keep this in mind when porting code between languages.

</div>

## Modulo: `%`

`a % b` is the remainder that goes with floor division. Python guarantees this identity for all integers (with `b != 0`):

```text
a == b * (a // b) + a % b
```

Because `//` floors, the remainder always has the **same sign as the divisor** `b` (or is zero):

```python run
for a, b in [(13, 4), (-13, 4), (13, -4), (-13, -4)]:
    q, r = a // b, a % b
    print(f'{a:>3} // {b:>2} = {q:>2}   {a:>3} % {b:>2} = {r:>2}   identity holds: {a == b * q + r}')
```

Take `-13 // 4`: the true quotient is `-3.25`, its floor is `-4`, and `4 * -4 = -16`. To get back to `-13` you must add `3`, so `-13 % 4 == 3`.

The built-in `divmod()` returns both at once:

```python run
print(divmod(13, 4))
print(divmod(-13, 4))
```

### Why floored modulo is handy

Since `% b` with a positive `b` always lands in `0 … b-1`, it's perfect for wrap-around arithmetic like clocks, weekdays or circular buffers, even when you step backwards:

```python run
hour = 2
print((hour - 5) % 24)   # 5 hours before 2 o'clock
days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
print(days[(0 - 1) % 7]) # the day before Monday
```

With truncating division (as in C), `(2 - 5) % 24` would be `-3`, and you'd have to fix the sign yourself.

<div class="callout tip">
<span class="callout-title">Try it</span>

Pick a few negative values for `a` and `b` in the modulo table above and check that the identity is always `True`. Then try `b = 0`: both `//` and `%` raise `ZeroDivisionError`.

</div>

<div class="callout modern">
<span class="callout-title">Python 3.8+: modular inverse with pow()</span>

The three-argument form `pow(base, exp, mod)` computes `base ** exp % mod` efficiently without building the huge intermediate number. Since Python 3.8 the exponent may be `-1` to get a **modular inverse**: the number `x` with `base * x % mod == 1`.

```python run
print(pow(3, 200, 7))
x = pow(3, -1, 7)
print(x, 3 * x % 7)
```

</div>

<div class="takeaways">

## Key takeaways

- `+`, `-`, `*` and `**` (with a non-negative exponent) on integers return integers; `/` always returns a `float`.
- `math.trunc` moves toward zero, `math.floor` moves down; they differ for negative numbers.
- `a // b` is `floor(a / b)`, and `a % b` is defined so that `a == b * (a // b) + a % b` always holds.
- The result of `%` takes the sign of the divisor, which makes wrap-around arithmetic easy.

</div>
