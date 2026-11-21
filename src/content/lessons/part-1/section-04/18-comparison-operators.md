---
title: Comparison Operators
summary: Identity, membership, equality and ordering comparisons, how they behave across numeric types, and how chained comparisons like a < b < c are evaluated.
minutes: 11
---

## Four kinds of comparison

| Category | Operators | Question |
|---|---|---|
| identity | `is`, `is not` | same object? |
| membership | `in`, `not in` | is it an element of this container? |
| equality | `==`, `!=` | equal values? |
| ordering | `<`, `<=`, `>`, `>=` | which comes first? |

All of them return a `bool`, and all of them share the **same precedence**, below arithmetic and above `not`.

## Identity: `is`, `is not`

`is` compares memory addresses, so it works between objects of **any** types. It never raises an error; it just tells you whether two names point to one object:

```python run
a, b, c = 0.1, 3 + 4j, 'a'
print(a is b)
print(c is [1, 2, 3])
x = [1, 2]
y = x
print(y is x, y is not [1, 2])
```

As you saw in the previous section, its main everyday use is `x is None`.

## Membership: `in`, `not in`

`in` tests whether a value is an **element** of a container (any iterable, in fact):

```python run
print(1 in [1, 2, 3])
print([1, 2] in [1, 2, 3])               # [1, 2] isn't an element
print([1, 2] in [[1, 2], [2, 3], 'abc']) # here it is
print('ell' in 'hello')                  # strings test for substrings
print(5 not in range(5))
```

For dictionaries, `in` checks the **keys**, not the values:

```python run
d = {'key1': 1, 'key2': 2}
print('key1' in d)
print(1 in d)
print(1 in d.values())
```

You'll see more of these operators in the sections on sequences, iterables and mappings.

## Equality: `==`, `!=`

`==` compares **values**, and it works across types when the comparison makes sense. Numbers of different types compare by their mathematical value:

```python run
from decimal import Decimal
from fractions import Fraction

print(Decimal('0.1') == Fraction(1, 10))
print(1 == 1 + 0j)
print(True == Fraction(2, 2))
print(False == 0j)
```

Unrelated types are simply not equal. Comparing them is not an error:

```python run
print(1 == '1')
print([1, 2] == (1, 2))
```

### Exact values, not appearances

Cross-type comparisons use the **exact** value of each number. A float holds a binary approximation, so it can be unequal to a decimal or fraction that "looks" the same:

```python run
print(0.5 == Fraction(1, 2), 0.5 == Decimal('0.5'))
print(0.1 == Fraction(1, 10), 0.1 == Decimal('0.1'))
```

`0.5` is exact in binary; `0.1` isn't, so the exact comparison says no. This is also why `Decimal('0.1') == Fraction(1, 10)` is `True` but `0.1 == Fraction(1, 10)` is `False`.

### NaN

The special float NaN ("not a number") is not equal to anything, **including itself**. Use `math.isnan` to detect it:

```python run
import math
nan = float('nan')
print(nan == nan, nan != nan)
print(math.isnan(nan))
```

## Ordering: `<`, `<=`, `>`, `>=`

Many types have an order, but not all. Complex numbers don't, and comparing values of unrelated types raises `TypeError`:

```python run
try:
    1 + 1j < 2 + 2j
except TypeError as ex:
    print('TypeError:', ex)

try:
    1 < 'a'
except TypeError as ex:
    print('TypeError:', ex)
```

Mixed numeric types that can be compared, can be ordered too:

```python run
print(Decimal('0.1') < Fraction(1, 2))
print(3 < 3.5 < Decimal('4'))
```

Strings are ordered character by character, by Unicode code point. All uppercase ASCII letters come before all lowercase ones:

```python run
print('A' < 'a', ord('A'), ord('a'))
print('apple' < 'banana', 'Zebra' < 'apple')
print([1, 2, 3] < [1, 3])   # sequences compare element by element too
```

## Chained comparisons

Python lets you chain comparisons the way mathematicians write them:

```python run
x = 5
print(1 < x < 10)
```

`a < b < c` means `a < b and b < c`, except that `b` is evaluated **only once**. The chain also short-circuits: once one comparison is `False`, the rest are skipped.

```python run
def value(v):
    print(f'  evaluating {v}')
    return v

print(value(1) < value(2) < value(3))
print(value(3) < value(2) < value(1))   # stops after 3 < 2 fails
```

Any comparison operators can be chained, which allows some odd-looking (but legal) expressions. Each one is just the pairwise comparisons joined with `and`:

```python run
print(1 < 2 > -5 < 50 > 4)          # 1<2 and 2>-5 and -5<50 and 50>4
print(1 < 2 == Decimal('2.0'))
import string
print('A' < 'a' < 'z' > 'Z' in string.ascii_letters)
```

Note what `a < b > c` does **not** say: it says nothing about how `a` and `c` relate. `1 < 5 > 2` is `True`, but so is `3 < 5 > 2`.

<div class="callout tip">
<span class="callout-title">Keep chains readable</span>

Chains like `lo <= x < hi` or `a == b == c` are clear and idiomatic. Long chains that change direction (`a < b > c`) are legal but hard to read; split them up with `and`. And remember the trap from the booleans lesson: `x == y == False` is a chain, not a comparison of `x == y` with `False`.

</div>

<div class="takeaways">

## Key takeaways

- `is` / `is not` compare identity and work between any objects; `in` / `not in` test membership (dict keys for dictionaries).
- `==` compares values across compatible types using exact values (`0.1 == Decimal('0.1')` is `False`); unrelated types are just unequal.
- Ordering is undefined for complex numbers and unrelated types (`TypeError`).
- `a < b < c` means `a < b and b < c`, with `b` evaluated once and short-circuiting.

</div>
