---
title: Putting it all Together
summary: The full order of parameter kinds in a signature, how Python matches a call against it, and real examples like print().
minutes: 12
---

## The complete signature

You've now met every kind of parameter Python supports. In a function definition they must appear in this order (every part is optional):

| Part | Example | Filled by |
|---|---|---|
| positional-only (3.8+) | `a, b, /` | position only |
| positional-or-keyword | `c, d=4` | position or name |
| extra positionals | `*args` | leftover positional arguments (tuple) |
| *or* a bare marker | `*` | nothing; only starts the keyword-only part |
| keyword-only | `e, f=6` | name only |
| extra keywords | `**kwargs` | leftover keyword arguments (dict) |

Two rules about defaults: among the positional parameters, those without defaults come first; among the keyword-only ones, defaults can appear in any order.

```python run
def everything(a, b, /, c, d=4, *args, e, f=6, **kwargs):
    print(f'a={a} b={b} c={c} d={d} args={args} e={e} f={f} kwargs={kwargs}')

everything(1, 2, 3, e=5)
everything(1, 2, 3, 40, 'x', 'y', e=5, f=60, g=7)
everything(1, 2, c=3, e=5, z=0)
```

## How Python matches a call

When you call a function, Python roughly works through these steps:

1. Positional arguments fill positional parameters, left to right. Any surplus goes into `*args` (or causes a `TypeError` if there is no `*args`).
2. Keyword arguments are matched by name to positional-or-keyword and keyword-only parameters. Names that match nothing go into `**kwargs` (or cause a `TypeError`).
3. A parameter that received two values (one by position, one by name) is an error.
4. Parameters that are still empty take their defaults; if one has no default, it's a `TypeError`.

Let's walk through common combinations.

### Positional parameters only

```python run
def func(a, b='world', c=10):
    print(a, b, c)

func('hello')
func('hello', c='!')
func(c='!', a='hi')
```

### Extra positionals, and a surprise with defaults

```python run
def func(a, b=2, *args, c=3, d):
    print(a, b, args, c, d)

func(1, 2, 'x', 'y', 'z', c=3, d=4)
func(1, 'x', 'y', 'z', d=4)
```

In the second call, `b` received `'x'`. Positional arguments always fill the named positional parameters **before** anything reaches `*args`, so as soon as you pass extra positionals, a default on `b` can never be used. Keep that in mind when you design a signature with both defaults and `*args`.

You might try to get around this by passing the extras by position and setting `b` by name. That doesn't work:

```python run
def f(a, b=10, *args):
    return a, b, args

try:
    f(1, 2, 3, b=5)
except TypeError as ex:
    print('TypeError:', ex)
```

Follow the steps above. In step 1, `1` fills `a`, `2` fills `b` and `3` goes into `args`. In step 2, `b=5` tries to fill `b` a second time, so step 3 raises the error. A default doesn't make a parameter "keyword-only". It only says what to use if nothing fills it, and `b` is still the second positional slot.

Leaving out the `2` doesn't help either. The `3` would just take `b`'s place:

```python run
try:
    f(1, 3, b=5)
except TypeError as ex:
    print('TypeError:', ex)
```

If you want callers to pass any number of extra positionals **and** optionally set `b` by name, move `b` after `*args`. That makes it keyword-only:

```python run
def g(a, *args, b=10):
    return a, b, args

print(g(1, 2, 3, b=5))
print(g(1, 2, 3))
```

### Keyword-only parameters, with and without extras

```python run
def func(a, b, *, c, d=4, **kwargs):
    print(a, b, c, d, kwargs)

func(1, 2, c=3, x=100, y=200)
func(x=100, y=200, c=3, b=2, a=1)
```

```python run
def func(a, b, *args, c, d=4, **kwargs):
    print(a, b, args, c, d, kwargs)

func(1, 2, 'x', 'y', 'z', c=3, d=5, x=100, y=200)
```

### Only extras

```python run
def func(*args, **kwargs):
    print(args, kwargs)

func(1, 2, 3, x=100, y=200)
func()
```

## A real example: `print`

The built-in `print` is a perfect illustration. Its signature is:

```python
print(*args, sep=' ', end='\n', file=None, flush=False)
```

It accepts any number of values to print (`*args`), followed by keyword-only options. They *must* be keyword-only: otherwise `print('a', 'b')` couldn't tell whether `'b'` is a value or a separator.

```python run
print(1, 2, 3)
print(1, 2, 3, sep='--')
print(1, 2, 3, end='***\n')
print(1, 2, 3, sep='\t', end='\t***\t')
print(4, 5, 6, sep='\t', end='\t***\n')
```

## Designing your own

Here's a function in the same spirit: any number of values, plus an option that should always be named.

```python run
def calc_hi_lo_avg(*args, log_to_console=False):
    hi = max(args, default=0)
    lo = min(args, default=0)
    avg = (hi + lo) / 2
    if log_to_console:
        print(f'high={hi}, low={lo}, avg={avg}')
    return avg

print(calc_hi_lo_avg(1, 2, 3, 4, 5))
print(calc_hi_lo_avg(1, 2, 3, 4, 5, log_to_console=True))
print(calc_hi_lo_avg())
```

<div class="callout note">
<span class="callout-title">Handling "no values"</span>

`max()` and `min()` raise a `ValueError` on an empty iterable. The `default=` keyword (Python 3.4+) gives them a value to return instead. Older code often uses tricks like `int(bool(args)) and max(args)`, which relies on `and` short-circuiting: if `args` is empty, the left side is `0` and `max` is never called. It works, but `default=0` says what it means.

</div>

<div class="callout tip">
<span class="callout-title">Inspect any signature</span>

`inspect.signature(fn)` shows the full parameter list of a function, including the `/` and `*` markers. Try it on your own functions, or on built-ins such as `sorted` and `divmod`:

```python run
import inspect
print(inspect.signature(everything))
print(inspect.signature(sorted))
print(inspect.signature(divmod))
```

</div>

<div class="takeaways">

## Key takeaways

- Order in a definition: positional-only, `/`, positional-or-keyword, `*args` or `*`, keyword-only, `**kwargs`.
- Positional arguments fill named positional parameters before anything reaches `*args`, so defaults before `*args` are only used when there are no extras. Setting such a parameter by name as well (`f(1, 2, 3, b=5)`) is a `TypeError`: "got multiple values for argument 'b'".
- Options that must not be confused with data (like `print`'s `sep` and `end`) belong in keyword-only parameters.

</div>
