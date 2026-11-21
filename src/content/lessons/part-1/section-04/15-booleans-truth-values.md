---
title: Booleans - Truth Values
summary: Every object has a truth value. Python decides it with __bool__, falls back to __len__, and otherwise treats the object as truthy.
minutes: 10
---

## Truthy and falsy

Every object in Python has an associated **truth value**: it counts as either "true" or "false" when used in a condition such as `if`, `while`, `and`, `or` or `not`. Objects that count as true are called **truthy**, the others **falsy**. `bool(obj)` tells you which:

```python run
print(bool(0))
print(bool(1), bool(-1), bool(100))
```

## Where truth values come from

This behavior has nothing to do with `bool` being a subclass of `int`. It comes from a special method. To decide the truth value of `obj`, Python:

1. calls `obj.__bool__()` if the class defines it (it must return `True` or `False`);
2. otherwise calls `obj.__len__()` if it exists: a length of `0` is falsy, anything else truthy;
3. otherwise the object is **truthy**.

For integers, `__bool__` is defined as `self != 0`:

```python run
print((100).__bool__())
print((0).__bool__())
```

You can see the rules in action with your own classes:

```python run
class AlwaysTrue:
    pass

class Box:
    def __init__(self, items):
        self.items = items
    def __len__(self):
        return len(self.items)

class Account:
    def __init__(self, balance):
        self.balance = balance
    def __bool__(self):
        return self.balance > 0

print(bool(AlwaysTrue()))            # neither method: truthy
print(bool(Box([])), bool(Box([1]))) # uses __len__
print(bool(Account(0)), bool(Account(50)))
```

You'll write `__bool__` and `__len__` methods properly when you learn about classes. The point here is that truthiness is a **protocol** that any type can take part in.

## The built-in rules

### Numbers

Any numeric **zero** is falsy; every other number is truthy:

```python run
from fractions import Fraction
from decimal import Decimal
print(bool(10), bool(1.5), bool(Fraction(3, 4)), bool(Decimal('10.5')), bool(1j))
print(bool(0), bool(0.0), bool(-0.0), bool(Fraction(0, 1)), bool(Decimal('0')), bool(0j))
```

<div class="callout note">
<span class="callout-title">NaN is truthy</span>

`float('nan')` is not equal to zero (it isn't equal to anything, not even itself), so `bool(float('nan'))` is `True`.

</div>

### Sequences, mappings and sets

Containers use their length: **empty is falsy**, non-empty is truthy:

```python run
print(bool([1, 2, 3]), bool((1, 2, 3)), bool('abc'), bool({'a': 1}), bool({1, 2}))
print(bool([]), bool(()), bool(''), bool({}), bool(set()), bool(range(0)))
```

Careful: a string containing a space or `'0'` is not empty, so it's truthy:

```python run
print(bool(' '), bool('0'), bool('False'))
```

### `None`

`None` is always falsy:

```python run
print(bool(None))
```

## Why it matters: concise conditions

Any condition that doesn't involve a `bool` uses the object's truth value. That lets you write checks very compactly:

```python run
def first_or_message(a):
    if a:
        return a[0]
    else:
        return 'a is None, or a is empty'

print(first_or_message([1, 2, 3]))
print(first_or_message([]))
print(first_or_message('abc'))
print(first_or_message(''))
print(first_or_message(None))
```

`if a:` handles **both** `None` and empty values in one step. Writing it out explicitly takes more code:

```python run
a = 'abc'
if a is not None and len(a) > 0:
    print(a[0])
```

And it's easy to get the explicit version wrong. Checking only for `None` breaks on an empty string, and checking only the length breaks on `None`:

```python run
a = ''
try:
    if a is not None:
        print(a[0])
except IndexError as ex:
    print('IndexError:', ex)

a = None
try:
    if len(a) > 0:
        print(a[0])
except TypeError as ex:
    print('TypeError:', ex)
```

Even the order of the two checks matters. `len(a) > 0 and a is not None` fails for `None`, because `len(a)` runs first. The next lesson explains why order matters: **short-circuit evaluation**.

<div class="callout tip">
<span class="callout-title">When not to rely on truthiness</span>

`if x:` treats `0`, `''`, `[]` and `None` alike. When `0` or an empty string are **valid** values (a quantity of zero, an empty name the user typed on purpose), test what you actually mean: `if x is not None:`.

</div>

<div class="takeaways">

## Key takeaways

- Every object is truthy or falsy; `bool(obj)` asks Python which.
- Python calls `__bool__`, then `__len__`; if neither exists, the object is truthy.
- Falsy built-ins: `None`, `False`, numeric zeros (`0`, `0.0`, `0j`, `Decimal('0')`, `Fraction(0)`), and empty containers (`''`, `[]`, `()`, `{}`, `set()`, `range(0)`).
- `if a:` is a concise way to reject both `None` and empty values, but use `is not None` when zero or empty values are legitimate.

</div>
