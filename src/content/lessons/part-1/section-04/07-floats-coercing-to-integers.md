---
title: Floats - Coercing to Integers
summary: Truncation, floor, ceiling and rounding are four different ways to turn a float into an integer, and they disagree for negative numbers.
minutes: 8
---

## Losing the fractional part

Turning a float into an integer always loses information: `10.4` and `10.6` can't both stay what they were. The question is **which** integer you want. Python offers four strategies:

| Method | Rule | Direction |
|---|---|---|
| `math.trunc(x)`, `int(x)` | drop the fractional part | toward zero |
| `math.floor(x)` | largest integer `<= x` | toward −∞ |
| `math.ceil(x)` | smallest integer `>= x` | toward +∞ |
| `round(x)` | nearest integer | to the closest (with a special rule for ties) |

All of them return an `int`.

## Truncation

Truncation simply ignores everything after the decimal point:

```python run
from math import trunc
print(trunc(10.3), trunc(10.5), trunc(10.6))
print(trunc(-10.3), trunc(-10.5), trunc(-10.6))
```

The `int()` constructor uses truncation when given a float. This surprises people who expect `int(10.6)` to be `11`:

```python run
print(int(10.3), int(10.5), int(10.6))
print(int(-10.3), int(-10.5), int(-10.6))
```

## Floor

The floor is the closest integer **at or below** the number, so on the number line it always moves left:

```python run
from math import floor
print(floor(10.4), floor(10.5), floor(10.6))
print(floor(-10.4), floor(-10.5), floor(-10.6))
```

For positive numbers floor and truncation agree. For negative numbers, floor moves *away* from zero: `floor(-10.4)` is `-11`. Recall that `//` is defined with floor, which is why `-7 // 2 == -4`.

## Ceiling

The ceiling is the closest integer **at or above** the number, so it always moves right:

```python run
from math import ceil
print(ceil(10.4), ceil(10.5), ceil(10.6))
print(ceil(-10.4), ceil(-10.5), ceil(-10.6))
```

For negative numbers, the ceiling behaves like truncation.

## All four side by side

```python run
import math
print(f"{'x':>6} {'trunc':>6} {'floor':>6} {'ceil':>6} {'round':>6}")
for x in (2.5, 2.7, 3.5, -2.5, -2.7, -3.5):
    print(f'{x:>6} {math.trunc(x):>6} {math.floor(x):>6} {math.ceil(x):>6} {round(x):>6}')
```

Notice the `round` column for `2.5`, `3.5` and their negatives: `round(2.5)` is `2`, not `3`. That's not a bug. The next lesson explains the tie-breaking rule Python uses.

A handy relationship you can see in the table: `ceil(x) == -floor(-x)`.

```python run
for x in (2.5, -2.7, 7.0):
    print(math.ceil(x) == -math.floor(-x))
```

<div class="callout note">
<span class="callout-title">Values that aren't numbers</span>

Infinity and NaN ("not a number") are valid floats with no integer equivalent, so all of these functions raise an error for them:

```python run
for bad in (float('inf'), float('nan')):
    try:
        int(bad)
    except (OverflowError, ValueError) as ex:
        print(type(ex).__name__, ex)
```

</div>

<div class="callout tip">
<span class="callout-title">Which one should I use?</span>

- Counting how many **full** groups fit (pages, boxes, minutes): `//` or `floor`.
- How many groups you need to hold **everything**: `ceil` (for example `math.ceil(items / per_page)` pages).
- Simply discarding the fraction regardless of sign: `trunc` / `int`.
- The nearest integer: `round`, but read the next lesson first.

</div>

<div class="takeaways">

## Key takeaways

- `trunc` and `int()` go toward zero, `floor` goes down, `ceil` goes up, and `round` goes to the nearest integer.
- For positive numbers `trunc == floor`; for negative numbers `trunc == ceil`.
- `int(10.9)` is `10`: the constructor truncates, it doesn't round.

</div>
