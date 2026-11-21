---
title: Python 3.6 - Underscores and Numeric Literals
summary: Underscores can group digits in any numeric literal, in int() and float() parsing, and in format specifiers, purely to make numbers easier to read.
minutes: 8
---

## Grouping digits

Quick: is `10000000` ten million or one million? Compare it with `10_000_000`. Since Python 3.6 (PEP 515) you can put underscores between digits of a numeric literal. They are **only** for human readers; Python ignores them completely:

```python run
print(10_000_000)
print(10_000_000 == 10000000)
print(type(1_000))
```

They work for every kind of numeric literal:

```python run
print(30_000.05)             # float
print(1_000.5e1_0)           # float with an exponent
print(2_000j)                # imaginary
print(0b_1111_0000)          # binary
print(0o_777)                # octal
print(0x_FF_FFFF)            # hex
print(0x_F_F_F_F_F_F)        # any group size is allowed
```

You don't have to group in threes. The last line has one digit per group, which is legal but unhelpful. Use whatever grouping makes the number easiest to read: thousands for decimals, bytes or nibbles for binary and hex, and so on.

## The rules

An underscore must sit **between two digits**, or right after a base prefix like `0x`. That means no leading or trailing underscore, no doubled underscores, and none next to the decimal point:

```python run
for text in ['1__000', '1000_', '1_.5', '0x_FF']:
    try:
        print(f'{text:8} ->', eval(text))
    except SyntaxError as ex:
        print(f'{text:8} -> SyntaxError: {ex.msg}')
```

<div class="callout note">
<span class="callout-title">Why not a leading underscore?</span>

`_1000` isn't a bad number; it's a perfectly valid **variable name**. Python reads anything that starts with a letter or underscore as an identifier, so `_1000` would just give a `NameError` (or silently refer to a variable with that name).

</div>

## Parsing strings

The same rules apply when converting strings with `int()`, `float()` and `complex()`, including with an explicit base:

```python run
print(int('1_000_000'))
print(int('FF_FF', 16))
print(int('0b_1_0000_0000', 2))
print(float('1_000.25'))
```

```python run
try:
    int('1__000')
except ValueError as ex:
    print('ValueError:', ex)
```

## Formatting with separators

Python 3.6 also lets format specifiers *produce* underscores. For decimal numbers, `_` inserts a separator every three digits, just like the older `,` option. For `b`, `o`, `x` and `X` it inserts one every **four** digits:

```python run
print('{:_}'.format(10000))
print(f'{1234567.891:_.2f}')
print(f'{1234567.891:,.2f}')
print(f'{16777215:_X}')
print(f'{255:_b}')
```

A nice round trip: format with `_`, and `int()` can read the result back.

```python run
n = 4_294_967_295
text = f'{n:_x}'
print(text, int(text, 16) == n)
```

<div class="takeaways">

## Key takeaways

- Underscores in numeric literals are ignored by Python; use them to group digits for readability (3.6+).
- They must sit between digits (or right after a base prefix): no leading, trailing, doubled or next-to-the-point underscores.
- `int()`, `float()` and `complex()` accept underscores in strings under the same rules.
- The `_` format option groups decimals by three and binary/octal/hex digits by four.

</div>
