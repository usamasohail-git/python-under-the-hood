---
title: Decimals
summary: The Decimal type stores base-10 numbers exactly, and a context controls the precision and rounding of its arithmetic, either globally or temporarily.
minutes: 12
---

## Why another real-number type?

Floats are binary, so ordinary decimal values such as `0.1` are stored approximately. Each individual error is tiny, but errors **compound** when you do many operations:

```python run
total = 0.0
for _ in range(1_000_000):
    total += 0.1
print(total)
print(total == 100_000)
```

One million additions of `0.1` should give exactly `100000`, but the float result is off in the sixth decimal place. For a physics simulation that may be fine. For a bank adding up millions of transactions, an error you can see in the cents is not acceptable.

We could use `Fraction`, which is exact, but fractions are slow and awkward: adding `1/10 + 1/5` means finding a common denominator and reducing the result every time.

The `decimal` module offers a third option, designed for exactly this situation. A `Decimal` stores a number as **decimal digits** plus an exponent, so any number you can write with a finite number of decimal digits is stored exactly:

```python run
from decimal import Decimal
total = Decimal('0')
for _ in range(100_000):
    total += Decimal('0.1')
print(total)
print(total == 10_000)
```

<div class="callout note">
<span class="callout-title">Strings, not floats</span>

Notice `Decimal('0.1')`, with a string. `Decimal(0.1)` would faithfully copy the float's binary approximation, error included. The next lesson covers the constructor in detail.

</div>

## Contexts: precision and rounding

Every `Decimal` operation is carried out in a **context**: a set of rules that includes, most importantly,

- **`prec`**: how many **significant digits** arithmetic results keep (default `28`);
- **`rounding`**: which rounding algorithm is used when a result has to be shortened (default `ROUND_HALF_EVEN`, the same banker's rounding floats use).

There are two kinds of context:

- the **global** (thread's current) context, which `decimal.getcontext()` returns, used by default;
- **local** contexts, created with `decimal.localcontext()` in a `with` block. They only apply inside that block.

### The global context

```python run
import decimal
g_ctx = decimal.getcontext()
print(g_ctx.prec)
print(g_ctx.rounding)
```

You can change the global context's settings, and every `Decimal` calculation afterwards will use them:

```python run
g_ctx.prec = 6
g_ctx.rounding = decimal.ROUND_HALF_UP
print(decimal.getcontext().prec, decimal.getcontext().rounding)
print(Decimal(1) / Decimal(7))

# put the defaults back so later cells behave normally
g_ctx.prec = 28
g_ctx.rounding = decimal.ROUND_HALF_EVEN
print(Decimal(1) / Decimal(7))
```

### Local contexts

Changing global state is risky: every other part of your program that uses decimals is affected, and it's easy to forget to change it back. A local context avoids that. `localcontext()` starts from a **copy** of the current context, and modifications disappear when the `with` block ends:

```python run
with decimal.localcontext() as ctx:
    ctx.prec = 10
    print(f'local prec = {ctx.prec}, global prec = {g_ctx.prec}')
    print(decimal.getcontext() is ctx)
    print(Decimal(1) / Decimal(7))

print(decimal.getcontext() is g_ctx, decimal.getcontext().prec)
print(Decimal(1) / Decimal(7))
```

Inside the block, the local context temporarily **becomes** the current context: `decimal.getcontext()` returns it, so all decimal arithmetic in the block (including in functions you call) uses it. When the block ends, the previous context is restored. That's why we print `g_ctx.prec` (the global context object we saved earlier) to see the global setting from inside the block.

## Choosing the rounding mode

Unlike floats, decimals let you pick the rounding algorithm. The most common ones:

| Constant | Ties are rounded … | `1.25` → | `-1.25` → |
|---|---|---|---|
| `ROUND_HALF_EVEN` (default) | to the even digit | `1.2` | `-1.2` |
| `ROUND_HALF_UP` | away from zero ("school") | `1.3` | `-1.3` |
| `ROUND_HALF_DOWN` | toward zero | `1.2` | `-1.2` |

There are also non-"nearest" modes: `ROUND_UP` (always away from zero), `ROUND_DOWN` (toward zero, i.e. truncation), `ROUND_CEILING`, `ROUND_FLOOR` and `ROUND_05UP`.

The built-in `round()` uses the current context's rounding mode when given a `Decimal`. And because `Decimal('1.25')` really is 1.25, the ties are genuine ties:

```python run
x = Decimal('1.25')
y = Decimal('1.35')
print(round(x, 1), round(y, 1))           # half even: 1.2 1.4

with decimal.localcontext() as ctx:
    ctx.rounding = decimal.ROUND_HALF_UP
    print(round(x, 1), round(y, 1))       # half up:   1.3 1.4

print(round(x, 1), round(y, 1))           # back to half even
```

Compare that with floats, where `round(1.35, 1)` gave `1.4` only because the float 1.35 is stored slightly above 1.35.

<div class="callout modern">
<span class="callout-title">Python 3.11+: settings as keyword arguments</span>

Since Python 3.11, `localcontext()` accepts the settings directly, so you don't need to modify `ctx` inside the block:

```python run
with decimal.localcontext(prec=4, rounding=decimal.ROUND_HALF_UP):
    print(Decimal(2) / Decimal(3))
```

Older notebooks always set the attributes on the context object instead, which still works.

</div>

<div class="callout tip">
<span class="callout-title">Notebook gotcha</span>

On this page (as in any notebook), all cells share one interpreter, and the global decimal context is shared by everything in it. If you change it in one cell, later cells see the change. Prefer local contexts, and if you experiment with the global one, restore `prec = 28` and `rounding = ROUND_HALF_EVEN` afterwards.

</div>

<div class="takeaways">

## Key takeaways

- `Decimal` stores base-10 digits, so values like `0.1` are exact and repeated additions don't drift.
- A context sets the **precision** (significant digits, default 28) and **rounding** (default `ROUND_HALF_EVEN`) for decimal arithmetic.
- `decimal.getcontext()` is the global context; `with decimal.localcontext() as ctx:` makes temporary changes that end with the block.
- `round()` on a `Decimal` uses the context's rounding mode.

</div>
