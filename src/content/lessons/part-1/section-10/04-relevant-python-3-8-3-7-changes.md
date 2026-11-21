---
title: Relevant Python 3.8 / 3.7 Changes
summary: Positional-only parameters, self-documenting f-strings, as_integer_ratio everywhere, @lru_cache without parentheses, math.dist, named tuple defaults and a few smaller changes.
minutes: 16
---

## A grab bag of improvements

Apart from the walrus operator (previous lesson), Python 3.8 (October 2019) and 3.7 (June 2018) brought a set of smaller features that touch topics from all over Part 1: function parameters, f-strings, numbers, decorators and named tuples.

## Positional-only parameters (3.8)

Normally, a parameter can receive its argument either by position or by name:

```python run
def my_func(a, b):
    return a + b

print(my_func(1, 2), my_func(b=2, a=1))
```

Many built-ins don't allow that. The values you pass to `print`, for example, can only be passed positionally:

```python run
try:
    print(value="hello")
except TypeError as ex:
    print("TypeError:", ex)
```

(Older versions word this error as `'value' is an invalid keyword argument for print()`; the meaning is the same.) Since 3.8 your own functions can do the same. Parameters listed **before a `/`** are positional-only:

```python run
def my_func(a, b, /):
    return a + b

print(my_func(1, 2))
try:
    my_func(a=1, b=2)
except TypeError as ex:
    print("TypeError:", ex)
```

`/` combines with the rest of the parameter syntax. Everything before `/` is positional-only, everything after `*` is keyword-only, and anything in between can be passed either way:

```python run
def my_func(a, b, /, c, *, d):
    return a + b + c + d

print(my_func(1, 2, 3, d=4), my_func(1, 2, c=3, d=4))
```

Why would you want this? Positional-only parameters let you **rename** a parameter later without breaking anyone's code (nobody can have used the name), and they keep a name free for `**kwargs`. For example `def update(self, other=(), /, **kwargs)` lets a caller pass a keyword argument literally called `other`.

## Self-documenting f-strings: `{expr=}` (3.8)

When debugging, you constantly write things like `f"a={a}"`. Adding `=` after the expression prints the expression's text, an equals sign, and the value's `repr`:

```python run
a, b = "hello", "world"
print(f"a={a}, b={b}")
print(f"{a=}, {b=}")
```

Note the quotes: with `=`, the value is shown with `repr()` by default. A format specifier after the `=` switches to normal formatting:

```python run
from datetime import datetime
from math import pi

d = datetime(2022, 3, 20, 6, 1, 13)
print(f"{a=:s}, {pi=:.3f}")
print(f"{d=}")
print(f"{d=:%Y-%m-%d %H:%M}")
```

It works with any expression, and spaces around the `=` are kept in the output:

```python run
words = ["Python", "rocks!"]
print(f"{1 + 2=}, {' '.join(words)=}")
print(f"{len(words) = }")
```

## `as_integer_ratio()` on all numbers (3.8)

`float` and `Decimal` already had `as_integer_ratio()`, which returns a `(numerator, denominator)` pair in lowest terms. In 3.8 `int`, `bool` and `Fraction` gained it too:

```python run
from fractions import Fraction
from decimal import Decimal

for number in [12, True, Fraction(2, 3), Decimal("0.33"), 0.75, 3.14]:
    print(f"{number!r:>16} -> {number.as_integer_ratio()}")
```

The point is **duck typing**: code that needs an exact ratio can call the same method on any numeric value without checking its type first. (The huge ratio for `3.14` is the exact value of the binary float closest to 3.14.)

## `@lru_cache` without parentheses (3.8)

`functools.lru_cache` memoizes a function. You used to have to call the decorator factory even when you didn't pass any arguments, writing `@lru_cache()`. Since 3.8 the bare form works and uses the default `maxsize=128`:

```python run
from functools import lru_cache

@lru_cache
def fib(n):
    return 1 if n <= 2 else fib(n - 1) + fib(n - 2)

print(fib(100))
print(fib.cache_info())
```

<div class="callout modern">
<span class="callout-title">Modern Python: functools.cache (3.9)</span>

Python 3.9 added `@functools.cache`, an unbounded cache, equivalent to `@lru_cache(maxsize=None)`. It's a little faster because it never has to evict anything, but the cache can grow without limit.

</div>

## New `math` helpers (3.8)

Euclidean distance between two points used to be written by hand. `math.dist` does it for points with any number of coordinates. 3.8 also added `math.prod` (like `sum`, but multiplies) and `math.isqrt` (exact integer square root):

```python run
import math

a, b = (0, 0), (1, 1)
print(math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))
print(math.dist(a, b))
print(math.dist((1, 2, 3), (4, 6, 3)))
print(math.prod([1, 2, 3, 4]), math.isqrt(99))
```

## Named tuples (3.7 and 3.8)

### Built-in defaults (3.7)

In Python 3.7, `namedtuple` got a `defaults` parameter. Defaults are applied from the **right**, the same way as function parameters with default values (they must come after the ones without):

```python run
from collections import namedtuple

NT = namedtuple("NT", "a b c", defaults=(10, 20, 30))
print(NT())

NT = namedtuple("NT", "a b c", defaults=(20, 30))
print(NT(10))
print(NT._field_defaults)
```

`_field_defaults` shows which fields got which default. Multiplying a one-element tuple is a quick way to give every field the same default:

```python run
NT = namedtuple("NT", "a b c d", defaults=("xyz",) * 4)
NT()
```

But be careful with **mutable** defaults. `([],) * 3` is a tuple holding three references to the **same** list:

```python run
NT = namedtuple("NT", "a b c", defaults=([],) * 3)
nt = NT()
nt.a.append(10)
nt
```

Every field shows `[10]`, because there was only ever one list. And it's shared by every future instance too, just like a mutable default argument in a function.

### Other named tuple changes

- The `_source` attribute, which held the generated source code of the class, was **removed in 3.7**. The class is no longer built from a large template of generated source code, which made creating named tuple classes noticeably faster.
- Since 3.8, `_asdict()` returns a plain `dict` instead of an `OrderedDict`, because ordinary dictionaries now keep insertion order.

```python run
Point = namedtuple("Point", "x y")
p = Point(1, 2)
print(p._asdict(), type(p._asdict()).__name__, hasattr(Point, "_source"))
```

## Odds and ends (3.8)

`reversed()` now works on dictionaries and their views, iterating keys from the most recently inserted back to the first:

```python run
d = {'a': 1, 'b': 2, 'c': 3}
print(list(reversed(d)), list(reversed(d.values())), list(reversed(d.items())))
```

`continue` is now allowed inside a `finally` block in a loop (before 3.8 it was a `SyntaxError`).

Finally, recall from Section 03 that `is` compares **identity**, and that small integers and some strings happen to be cached. Comparing with a literal using `is` may appear to work, but it relies on an implementation detail. Since 3.8 the compiler warns about it:

```python run
import warnings

with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    compile("a = 1\nprint(a is 1)", "<demo>", "exec")
    compile("a = 'hello'\nprint(a is 'hello')", "<demo>", "exec")
    compile("a = [1, 2]\nprint(a is [1, 2])", "<demo>", "exec")

for w in caught:
    print(w.category.__name__, "-", w.message)
```

Two warnings for three snippets: comparing with a list display isn't flagged, since it always creates a new object and is simply `False`.

<div class="callout modern">
<span class="callout-title">Modern Python: wording changed</span>

Older notebooks show the message as `"is" with a literal. Did you mean "=="?`. Since Python 3.12 it names the literal's type, as you can see above.

</div>

<div class="takeaways">

## Key takeaways

- Parameters before `/` are positional-only (3.8), so their names are not part of the function's public API.
- `f"{expr=}"` prints the expression and its `repr`; add a format spec after `=` to format the value.
- `as_integer_ratio()` now works on every built-in numeric type, which helps duck typing.
- `@lru_cache` can be used without parentheses; `@cache` (3.9) is the unbounded version.
- `namedtuple(..., defaults=...)` applies defaults from the right (3.7); beware of shared mutable defaults.
- `reversed()` works on dicts, and `x is <literal>` triggers a `SyntaxWarning`.

</div>
