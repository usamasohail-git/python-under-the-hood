---
title: Integers - Data Type
summary: Python's int is an object of variable size. It never overflows, but bigger integers use more memory and take longer to compute with.
minutes: 9
---

## Integers are objects

Like everything else in Python, an integer is an object: an instance of the class `int`.

```python run
print(type(100))
print(isinstance(100, int))
```

The interesting question is: **how big can an integer get?** To answer it, we need to look at how integers are stored.

## Integers in binary

Computers store everything as bits, so integers are stored in **base 2**. Each bit position is worth a power of two:

| bit value | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|
| `10011` | 1 | 0 | 0 | 1 | 1 |

`1·16 + 0·8 + 0·4 + 1·2 + 1·1 = 19`, so 19 needs **5 bits**. Python can show you the binary digits and count them for you:

```python run
print(bin(19))
print((19).bit_length())
print((255).bit_length(), (256).bit_length())
```

With `n` bits you can store the non-negative integers `0` to `2**n - 1`. With 8 bits that is 0 to 255.

### Signed integers

To store negative numbers too, one bit's worth of the range is used for the sign. Because zero doesn't need a positive and a negative version, the usual encoding (two's complement) squeezes in one extra negative value. An `n`-bit signed integer covers:

```text
-2**(n-1)  …  2**(n-1) - 1
```

```python run
for n in (8, 16, 32, 64):
    print(f'{n:>2} bits: {-2**(n-1):>27,} … {2**(n-1) - 1:,}')
```

## Fixed-size vs. arbitrary precision

Languages such as C and Java give you several **fixed-width** integer types (`byte`, `short`, `int`, `long`, …). You pick one up front, and if a value outgrows it, it silently wraps around or the program misbehaves.

Python takes a different approach. An `int` uses **as many bits as the value needs**, growing automatically. There is no maximum value other than the memory you have:

```python run
big = 2 ** 200
print(big)
print(big.bit_length(), 'bits')
print(big * big > big)   # still exact, no overflow
```

<div class="callout note">
<span class="callout-title">What about sys.maxsize?</span>

`sys.maxsize` is the largest value of the C type CPython uses for sizes and indexes (for example the maximum length of a list). It is **not** a limit on `int` values. Integers happily go far beyond it.

</div>

## The cost: memory

Being an object has overhead (the type pointer, the reference count, the size field), and every extra chunk of digits adds more bytes. `sys.getsizeof` shows the total size of the object in bytes:

```python run
import sys
for value in (0, 1, 2**30, 2**60, 2**1000):
    print(f'{value.bit_length():>5} bits -> {sys.getsizeof(value)} bytes')
```

CPython stores an integer's magnitude as a sequence of 30-bit "digits", so the size goes up in steps as the number grows.

<div class="callout note">
<span class="callout-title">Why are your numbers different?</span>

The exact byte counts depend on the platform. On a typical 64-bit CPython, `sys.getsizeof(1)` is 28 bytes. This page runs Python compiled to 32-bit WebAssembly, where pointers are smaller, so you'll see smaller numbers. The pattern is what matters: **bigger integers take more memory**.

</div>

## The cost: speed

Operations on big integers also take longer, because the CPU can't handle a 10,000-bit number in one instruction. CPython has to work through it digit by digit:

```python run
import time

def calc(a, n=500_000):
    for i in range(n):
        a * 2

for a in (10, 2**100, 2**10000):
    start = time.perf_counter()
    calc(a)
    elapsed = time.perf_counter() - start
    print(f'{a.bit_length():>6} bits: {elapsed:.3f} s')
```

The exact timings vary, but the 10,000-bit number is clearly slower than the small one. For everyday numbers you will never notice, which is why Python can afford to make every integer unlimited.

## Readable literals

Since Python 3.6 you can put underscores in numeric literals to group digits. They are ignored by the interpreter and make long numbers much easier to read:

```python run
population = 8_100_000_000
print(population)
print(1_000_000 == 1000000)
```

<div class="callout modern">
<span class="callout-title">Python 3.11+: limit on int/str conversion</span>

Integers themselves have no size limit, but since Python 3.11 converting between `int` and a **decimal string** is limited to 4300 digits by default. Converting a huge string is slow (the time grows quadratically), and an attacker could use this to slow down a server. Older notebooks don't show this, because the limit didn't exist yet.

```python run
import sys
try:
    int('9' * 5000)
except ValueError as ex:
    print('ValueError:', ex)

print(sys.get_int_max_str_digits())
print(len(str(2 ** 10000)))   # 3011 digits: fine, under the limit
```

Arithmetic is never affected, and `sys.set_int_max_str_digits()` raises or removes the limit when you really need it. Conversions to and from bases that are powers of two (binary, hex) aren't limited.

</div>

<div class="takeaways">

## Key takeaways

- An `n`-bit signed integer in a fixed-width language covers `-2**(n-1)` to `2**(n-1) - 1`.
- Python's `int` has **arbitrary precision**: it grows as needed and never overflows.
- Bigger integers cost more memory and more time per operation.
- `bit_length()` tells you how many bits a value needs; `_` in literals improves readability.
- Since 3.11, `int` ↔ decimal `str` conversion is capped at 4300 digits by default (arithmetic is unaffected).

</div>
