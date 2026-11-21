---
title: Booleans - Precedence and Short-Circuiting
summary: not binds tighter than and, which binds tighter than or, and Python stops evaluating a boolean expression as soon as the result is known.
minutes: 11
---

## The boolean operators

Python has three boolean operators: `not`, `and` and `or`. Here are their truth tables (with plain `True`/`False` operands; the next lesson shows what happens with other objects):

| `X` | `Y` | `not X` | `X and Y` | `X or Y` |
|---|---|---|---|---|
| False | False | True | False | False |
| False | True | True | False | True |
| True | False | False | False | True |
| True | True | False | True | True |

Two observations will matter shortly:

- if `X` is `True`, then `X or Y` is `True` **whatever** `Y` is;
- if `X` is `False`, then `X and Y` is `False` **whatever** `Y` is.

## Useful laws

These identities help when simplifying conditions. Read `≡` as "has the same truth value as" (it's math notation, not Python):

- **Commutative**: `A or B` ≡ `B or A`, and `A and B` ≡ `B and A`. (The truth value is the same, but the evaluation order still matters, as you'll see.)
- **Distributive**: `A and (B or C)` ≡ `(A and B) or (A and C)`, and `A or (B and C)` ≡ `(A or B) and (A or C)`.
- **Associative**: `A or (B or C)` ≡ `(A or B) or C`, likewise for `and`, so you can write `A or B or C` without parentheses. Python evaluates it left to right.
- **De Morgan's laws**: `not (A or B)` ≡ `not A and not B`, and `not (A and B)` ≡ `not A or not B`.
- **Negating comparisons**: `not (x < y)` ≡ `x >= y`, and `not (x <= y)` ≡ `x > y`. Also `not not A` ≡ `A`.

Let's verify De Morgan's laws for every combination:

```python run
from itertools import product
for A, B in product([False, True], repeat=2):
    print(A, B,
          (not (A or B)) == ((not A) and (not B)),
          (not (A and B)) == ((not A) or (not B)))
```

## Precedence

When an expression mixes operators without parentheses, **precedence** decides what's grouped first. From highest to lowest, the relevant part of the table is:

| Precedence | Operators |
|---|---|
| highest | `( … )` parentheses |
| | arithmetic: `**`, then `* / // %`, then `+ -` |
| | comparisons, identity, membership: `< > <= >= == != is is not in not in` |
| | `not` |
| | `and` |
| lowest | `or` |

So `and` binds tighter than `or`:

```python run
print(True or True and False)     # True or (True and False)
print(True or (True and False))
print((True or True) and False)   # different grouping, different result
```

And comparisons bind tighter than `not`, so `not a == b` means `not (a == b)`:

```python run
a, b = 1, 2
print(not a == b)
print(a < b or a > 10 and b > 10)   # (a < b) or ((a > 10) and (b > 10))
```

<div class="callout tip">
<span class="callout-title">When in doubt, add parentheses</span>

`a or (b and c)` is identical to `a or b and c` for Python, but the parentheses save every reader from having to remember the precedence table. Readable code beats clever code.

</div>

## Short-circuit evaluation

Remember the two observations from the truth table. Python takes advantage of them: it evaluates operands **left to right** and **stops as soon as the result is decided**.

- `X or Y`: if `X` is truthy, the result is known, and `Y` is **never evaluated**.
- `X and Y`: if `X` is falsy, the result is known, and `Y` is **never evaluated**.

We can watch it happen with a function that announces itself:

```python run
def check(name, value):
    print(f'  evaluating {name}')
    return value

print('True or ...')
result = check('A', True) or check('B', False)
print('False and ...')
result = check('A', False) and check('B', True)
print('True and ...')
result = check('A', True) and check('B', True)
```

In the first two cases `B` is never called.

### Using it as a guard

Short-circuiting lets the left operand **protect** the right one from running when it would fail. Dividing by `b` fails when `b` is `0`:

```python run
a = 10
b = 0
try:
    if a / b > 2:
        print('a is at least double b')
except ZeroDivisionError as ex:
    print('ZeroDivisionError:', ex)
```

Put a check in front and the division never happens. `b` is `0`, which is falsy, so `and` stops there:

```python run
if b and a / b > 2:
    print('a is at least double b')
else:
    print('skipped safely')
```

The same pattern guards against `None` or empty strings, for example when validating data that may be missing:

```python run
import string

def check_name(name):
    if name and name[0] in string.digits:
        return 'Name cannot start with a digit!'
    return 'ok'

for name in ('', None, 'Bob', '1Bob'):
    print(repr(name), '->', check_name(name))
```

Without the `name and` guard, `''[0]` would raise `IndexError` and `None[0]` would raise `TypeError`.

### Order matters

Because of short-circuiting, `and` and `or` are not fully interchangeable with their operands swapped. With the checks in the wrong order, the risky part runs first:

```python run
a = None
if a is not None and len(a) > 0:     # safe: len() is never reached
    print(a[0])

try:
    if len(a) > 0 and a is not None: # unsafe: len(None) runs first
        print(a[0])
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout tip">
<span class="callout-title">Put cheap tests first</span>

Short-circuiting is also an optimization. When one test is fast and another is slow (a database query, a big computation), put the fast one first so the slow one often doesn't need to run at all.

</div>

<div class="takeaways">

## Key takeaways

- Precedence (high to low): comparisons, then `not`, then `and`, then `or`. Use parentheses for clarity.
- `X or Y` skips `Y` when `X` is truthy; `X and Y` skips `Y` when `X` is falsy.
- Short-circuiting lets a left operand guard the right one: `if b and a / b > 2:`, `if name and name[0] ...`.
- The order of operands matters both for correctness and for speed.

</div>
