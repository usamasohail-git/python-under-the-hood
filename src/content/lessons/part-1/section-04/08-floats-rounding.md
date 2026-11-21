---
title: Floats - Rounding
summary: How round() picks the closest multiple of a power of ten, why ties go to the even neighbor (banker's rounding), and how to round ties away from zero.
minutes: 13
---

## `round(x, n)`

The built-in `round()` takes a number and an optional `n` (default `None`):

- `round(x)` rounds to the nearest integer and returns an **`int`**;
- `round(x, n)` rounds to the nearest multiple of **10⁻ⁿ** and returns the **same type as `x`**, even when `n` is `0`.

```python run
a = round(1.5)
b = round(1.5, 0)
print(a, type(a))
print(b, type(b))
```

## What `n` means

Think of `n` as choosing which multiples you round to:

| `n` | rounds to multiples of | example: `x = 888.88` |
|---|---|---|
| 2 | 0.01 | `888.88` |
| 1 | 0.1 | `888.9` |
| 0 | 1 | `889.0` |
| -1 | 10 | `890.0` |
| -2 | 100 | `900.0` |
| -3 | 1000 | `1000.0` |

```python run
print(round(1.8888, 3), round(1.8888, 2), round(1.8888, 1), round(1.8888, 0))
print(round(888.88, 1), round(888.88, 0), round(888.88, -1), round(888.88, -2), round(888.88, -3))
```

Negative `n` works with integers too, and then the result stays an `int`:

```python run
print(round(1234, -2), round(18, -1))
```

Picture `1.23` with `n = 1`: it lies between the multiples `1.2` and `1.3`, and it's closer to `1.2`, so that's the answer. Rounding is just "pick the **closest** multiple". The only hard part is what to do when there isn't a single closest one.

## Ties

`1.25` rounded to one decimal place sits exactly halfway between `1.2` and `1.3`. At school you probably learned to round ties **up**, or more precisely **away from zero** (so `-1.25` would become `-1.3`). Python does something else:

```python run
print(round(0.5), round(1.5), round(2.5), round(3.5))
print(round(-0.5), round(-1.5), round(-2.5))
print(round(15, -1), round(25, -1), round(35, -1))
```

Python uses **round half to even**, also known as **banker's rounding**: when a value is exactly halfway, it goes to the neighbor whose last digit is **even**. `0.5 → 0`, `1.5 → 2`, `2.5 → 2`, `3.5 → 4`. This is the default rounding mode of the IEEE 754 standard, and many languages and libraries use it.

### Why would anyone want that?

Rounding ties away from zero always nudges halfway values in the same direction, so when you add up many rounded numbers, the error accumulates. Round-half-to-even goes up half the time and down half the time, so the errors tend to cancel out:

```python run
import math
values = [x + 0.5 for x in range(10)]           # 0.5, 1.5, ..., 9.5 (exact ties)
half_up = [math.floor(v + 0.5) for v in values]  # school rounding for positives
print('exact sum:     ', sum(values))
print('ties away sum: ', sum(half_up))
print("banker's sum:  ", sum(round(v) for v in values))
```

## Float ties are rarer than they look

Here's a result that puzzles many people:

```python run
print(round(1.25, 1))
print(round(1.35, 1))
print(round(2.675, 2))
```

`round(1.25, 1)` is `1.2`: a genuine tie, broken toward the even digit. But `round(1.35, 1)` gives `1.4`, and `round(2.675, 2)` gives `2.67`. **Neither of those is a tie at all.** `round()` works with the float's *exact stored value*, and as you saw earlier, most decimal fractions are stored approximately:

```python run
from decimal import Decimal
print(Decimal(1.25))
print(Decimal(1.35))
print(Decimal(2.675))
```

- `1.25` is exactly `5/4`, so it is a true tie: half to even gives `1.2`.
- `1.35` is stored slightly **above** 1.35, so it's simply closer to `1.4`.
- `2.675` is stored slightly **below** 2.675, so it's closer to `2.67`.

So for floats, "banker's rounding" only kicks in for values that are exactly representable halfway points (`0.5`, `2.5`, `1.25`, `0.375`, …). Everything else is plain rounding to the closest value, applied to the number that's actually in memory.

<div class="callout tip">
<span class="callout-title">Need decimal rounding rules you can rely on?</span>

When it matters that `2.675` rounds like the *decimal* number you wrote (money, invoices, reports), use `decimal.Decimal`, built from a **string**, where you can choose the rounding mode explicitly. You'll see this in the Decimals lessons:

```python run
from decimal import Decimal, ROUND_HALF_UP
print(Decimal('2.675').quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
```

</div>

## Rounding ties away from zero

If you want school-style rounding to the nearest integer, a common trick is to add `0.5` (or subtract it for negatives) and then truncate. `math.copysign(1, x)` gives `1.0` or `-1.0` with the sign of `x`:

```python run
from math import copysign

def round_half_away(x):
    return int(x + 0.5 * copysign(1, x))

for x in (1.5, 2.5, -1.5, -2.5, 2.4, -2.6):
    print(f'{x:>5}  round: {round(x):>2}  half away: {round_half_away(x):>2}')
```

That's correct for everyday values, but floats have one more trap in store. The largest float below `0.5` is `0.49999999999999994`. It should round to `0`, yet adding `0.5` produces a sum that can't be stored exactly and gets rounded up to `1.0`:

```python run
x = 0.49999999999999994
print(x + 0.5)
print(round_half_away(x), round(x))
```

A version that avoids the extra addition compares the fractional part directly. Subtracting the floor is exact for floats, so no hidden rounding happens:

```python run
import math

def round_half_away(x):
    a = abs(x)
    whole = math.floor(a)
    result = whole + 1 if a - whole >= 0.5 else whole
    return result if x >= 0 else -result

for x in (1.5, 2.5, -1.5, -2.5, 2.4, -2.6, 0.49999999999999994):
    print(x, '->', round_half_away(x))
```

<div class="takeaways">

## Key takeaways

- `round(x)` returns an `int`; `round(x, n)` returns the type of `x` and rounds to the closest multiple of `10**-n` (`n` may be negative).
- Exact ties go to the even neighbor: `round(2.5) == 2`, `round(3.5) == 4` (banker's rounding, which avoids bias in sums).
- Many apparent float ties aren't ties: `round(2.675, 2) == 2.67` because 2.675 is stored slightly below 2.675.
- For decimal rounding rules such as half-up, use `Decimal` with an explicit rounding mode.

</div>
