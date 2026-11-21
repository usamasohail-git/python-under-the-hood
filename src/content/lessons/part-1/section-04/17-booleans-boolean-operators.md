---
title: Booleans - Boolean Operators
summary: "and and or don't return True or False: they return one of their operands, which enables idioms like defaults with or and guarded access with and."
minutes: 10
---

## `and` / `or` return an operand

In many languages, `X or Y` produces a boolean. In Python it produces **one of the operands themselves**. Only the truth value of the **left** operand is ever tested.

### `or`

> `X or Y`: if `X` is truthy, return `X`. Otherwise, evaluate and return `Y`.

```python run
print(repr('' or 'abc'))
print(0 or 100)
print([] or [1, 2, 3])
print([1, 2] or [1, 2, 3])
print(None or 0)          # X is falsy, so Y is returned, even though Y is falsy too
```

The truth value of `Y` never matters. If `X` is falsy, `Y` is the answer, whatever it is. And if `X` is truthy, `Y` is never even evaluated, which is short-circuiting again:

```python run
print(1 or 1 / 0)   # the division never runs
```

We could *almost* write `or` as a function:

```python run
def _or(x, y):
    if x:
        return x
    else:
        return y

print(_or(0, 100) == (0 or 100))
print(_or(None, 'n/a') == (None or 'n/a'))
print(_or('abc', 'n/a') == ('abc' or 'n/a'))
```

Why only *almost*? Function arguments are evaluated **before** the function is called, so `_or` can't short-circuit:

```python run
try:
    _or(1, 1 / 0)
except ZeroDivisionError as ex:
    print('ZeroDivisionError:', ex)
```

### `and`

> `X and Y`: if `X` is falsy, return `X`. Otherwise, evaluate and return `Y`.

```python run
print(0 and 100)
print(repr('' and 'abc'))
print([1] and [2, 3])
print(None and None.upper())   # the attribute access never runs
```

### Longer chains

With several operands, the same rule applies from left to right:

- `a or b or c` returns the **first truthy** operand, or the last operand if none is truthy;
- `a and b and c` returns the **first falsy** operand, or the last operand if all are truthy.

```python run
print(0 or '' or 'first truthy' or 'never reached')
print(0 or '' or [])
print(1 and 'x' and 0 and 'never reached')
print(1 and 'x' and 'last')
```

## Idioms built on this

### Defaults with `or`

`value or default` gives you `value` unless it's falsy:

```python run
def greet(name):
    name = name or 'stranger'
    return f'Hello, {name}!'

print(greet('Ada'))
print(greet(''))
print(greet(None))
```

<div class="callout tip">
<span class="callout-title">Watch out for falsy-but-valid values</span>

`x or default` replaces **every** falsy value, including `0`, `0.0` and `''`. That's a bug if zero is a legitimate value:

```python run
def set_volume(level=None):
    level = level or 50              # bug: 0 becomes 50
    return level

def set_volume_fixed(level=None):
    level = 50 if level is None else level
    return level

print(set_volume(0), set_volume_fixed(0), set_volume_fixed())
```

Python has no `??` (null-coalescing) operator, so a conditional expression with `is None` is the precise way to say "use the default only when the value is missing".

</div>

### Guarded access with `and`

`s and s[0]` returns the first character only when `s` is non-empty, and otherwise returns `s` itself (`None` or `''`) without failing:

```python run
s1 = None
s2 = ''
s3 = 'abc'
print(repr(s1 and s1[0]))
print(repr(s2 and s2[0]))
print(repr(s3 and s3[0]))
```

Combined with `or`, it gives a default for the bad cases:

```python run
print((s1 and s1[0]) or 'n/a')
print((s2 and s2[0]) or 'n/a')
print((s3 and s3[0]) or 'n/a')
```

## `not` always returns a bool

`not` is different: it always returns `True` or `False`, never an operand:

```python run
print(not 'abc')
print(not [])
print(not None)
print(not 0, type(not 0))
```

If you need an actual boolean from `and`/`or`, wrap the expression with `bool(...)`. `not not x` also works, but it's harder to read.

<div class="takeaways">

## Key takeaways

- `X or Y` returns `X` if `X` is truthy, otherwise `Y`; `X and Y` returns `X` if `X` is falsy, otherwise `Y`.
- Only the left operand's truth value is tested, and the right operand is evaluated only if it's returned.
- `value or default` and `s and s[0]` are common idioms; use `default if value is None else value` when falsy values are valid.
- `not` always returns a `bool`.

</div>
