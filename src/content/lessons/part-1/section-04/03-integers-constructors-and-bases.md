---
title: Integers - Constructors and Bases
summary: Build integers from numbers and from strings in any base from 2 to 36, and write your own algorithm to convert an integer into any base.
minutes: 12
---

## The `int` constructor

`int` can be called in two ways:

```python
int(x=0)          # from a number (or a base-10 string)
int(x, base=10)   # from a string written in the given base
```

### From numbers

Given a number, `int()` produces an integer. For a `float`, it **truncates** (moves toward zero). It does not round:

```python run
print(int(10))
print(int(10.9))
print(int(-10.9))
```

It works with other numeric types as well, for example a `Fraction` (which you'll meet in the next lesson):

```python run
from fractions import Fraction
a = Fraction(22, 7)
print(a, '->', int(a))
```

With no argument at all, `int()` returns `0`.

### From strings

A string is parsed as a number in the given base (10 by default):

```python run
print(int('10'))
print(int('101', 2))
print(int('101', base=2))
print(int('  42  '))      # surrounding whitespace is allowed
print(int('1_000_000'))   # so are underscores between digits
```

For bases above 10, the letters `a` to `z` stand for the digit values 10 to 35, which is why the largest base is 36. Letters are **not case sensitive**:

```python run
print(int('F1A', base=16))
print(int('f1a', base=16))
print(int('z', 36))
```

The string must be a valid number in that base. In base 11 the only extra digit is `A` (10), so `B` is invalid; in base 12 it's fine:

```python run
try:
    int('B1A', base=11)
except ValueError as ex:
    print('ValueError:', ex)

print(int('B1A', 12))
```

## Base representations

Python has three built-ins to go the other way, from an integer to a string in base 2, 8 or 16:

```python run
print(bin(10), oct(10), hex(10))
```

The prefixes `0b`, `0o` and `0x` are the same ones you can use in **integer literals**. `int()` also accepts them in strings when you give the matching base:

```python run
a = int('1010', 2)
b = int('0b1010', 2)
c = 0b1010
print(a, b, c)

a = int('f1a', 16)
b = int('0xf1a', 16)
c = 0xF1A        # literal digits are case-insensitive too
print(a, b, c)
```

With `base=0`, `int()` reads the prefix and picks the base for you, exactly like the Python parser does for literals:

```python run
print(int('0b1010', 0), int('0o12', 0), int('0xa', 0), int('10', 0))
```

<div class="callout tip">
<span class="callout-title">Formatting without the prefix</span>

`format()` and f-strings can produce these representations without a prefix, with padding, or with the prefix added back via `#`:

```python run
n = 10
print(format(n, 'b'), f'{n:08b}', f'{n:#x}', f'{n:X}')
```

</div>

## Converting to any base yourself

The built-ins only cover bases 2, 8 and 16. For anything else, you write the algorithm yourself, and it's a nice application of `//` and `%`.

The idea: in base `b`, the **last digit** of `n` is `n % b`, and the number formed by the remaining digits is `n // b`. Repeat until nothing is left. For `n = 10`, `b = 2`:

| n | n // 2 | n % 2 (digit) |
|---|---|---|
| 10 | 5 | 0 |
| 5 | 2 | 1 |
| 2 | 1 | 0 |
| 1 | 0 | 1 |

Reading the digits from bottom to top gives `1010`. `divmod()` computes both values in one call:

```python run
def from_base10(n, b):
    """Return the digits of non-negative n in base b, most significant first."""
    if b < 2:
        raise ValueError('Base b must be >= 2')
    if n < 0:
        raise ValueError('Number n must be >= 0')
    if n == 0:
        return [0]
    digits = []
    while n > 0:
        n, m = divmod(n, b)
        digits.insert(0, m)
    return digits

print(from_base10(10, 2))
print(from_base10(255, 16))
```

That gives digit **values**. To display them, map each value to a character. Any characters will do, as long as there are enough of them:

```python run
def encode(digits, digit_map):
    if max(digits) >= len(digit_map):
        raise ValueError('digit_map is not long enough to encode digits')
    return ''.join(digit_map[d] for d in digits)

print(encode([1, 0, 1], 'FT'))
print(encode([1, 10, 11], '0123456789AB'))
```

Combining both, plus handling the sign, gives a general converter. Using the same digit characters as `int()` means the result can be parsed back:

```python run
def rebase_from10(number, base):
    digit_map = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if base < 2 or base > 36:
        raise ValueError('Invalid base: 2 <= base <= 36')
    sign = -1 if number < 0 else 1
    number *= sign
    encoding = encode(from_base10(number, base), digit_map)
    return '-' + encoding if sign == -1 else encoding

for n, b in [(10, 2), (-10, 2), (131, 11), (4095, 16), (-4095, 16)]:
    e = rebase_from10(n, b)
    print(f'{n} in base {b}: {e}  (back: {int(e, b)})')
```

<div class="takeaways">

## Key takeaways

- `int(number)` truncates toward zero; `int(string, base)` parses a string in base 2–36.
- Letters `a`–`z` (any case) are the digits 10–35; prefixes `0b`, `0o`, `0x` work in literals and, with the right base (or `base=0`), in strings.
- `bin()`, `oct()` and `hex()` cover bases 2, 8 and 16; for other bases, repeatedly apply `divmod(n, base)`.

</div>
