---
title: Variable Equality
summary: "`is` asks whether two names refer to the same object; `==` asks whether their values are equal. They aren't the same question."
minutes: 8
---

## Two kinds of "equal"

Python gives you two ways to compare variables:

| Operator | Compares | Question it answers | Negation |
|---|---|---|---|
| `is` | identity (memory address) | "Are these the *same object*?" | `is not` |
| `==` | value (contents) | "Do these objects have *equal values*?" | `!=` |

`a is b` is the same as `id(a) == id(b)`.

## Same object → both are true

```python run
a = 10
b = 10
print(hex(id(a)), hex(id(b)))
print('a is b:', a is b)
print('a == b:', a == b)
```

## Different objects, equal values

```python run
a = [1, 2, 3]
b = [1, 2, 3]
print(hex(id(a)), hex(id(b)))
print('a is b:', a is b)
print('a == b:', a == b)
```

Two distinct list objects that happen to hold equal values: `is` is `False`, `==` is `True`.

## Equal values across types

`==` compares values as sensibly as it can, even across different numeric types:

```python run
a = 10       # int
b = 10.0     # float
c = 10 + 0j  # complex
print(type(a), type(b), type(c))
print('a is b:', a is b, '| a == b:', a == b)
print('a is c:', a is c, '| a == c:', a == c)
```

An `int` and a `float` can never be the same object, but their values compare equal.

## The `None` object

`None` is the object Python uses for "no value". It is the single instance of the type `NoneType`, and since it is immutable, **every** reference to `None` points to the same object:

```python run
a = None
b = None
print(type(a))
print(hex(id(a)), hex(id(b)), hex(id(None)))
print(a is None, a is b)
```

Because there is exactly one `None`, the idiomatic check is **`is None`** (and `is not None`), not `== None`:

```python run
l = []
print('l is None:', l is None)
print('l == None:', l == None)
```

<div class="callout tip">
<span class="callout-title">Rule of thumb</span>

Use `==` to compare **values** (numbers, strings, lists, …). Use `is` only to check **identity**, and in practice that means comparing with singletons: `x is None`, `x is not None`. A class can override `==` (you'll see `__eq__` in Part 4), but nothing can override `is`, so `is None` is always reliable.

</div>

<div class="takeaways">

## Key takeaways

- `is` compares identity (same object?); `==` compares values (equal contents?).
- Distinct objects can be `==` without being `is`.
- `None` is a singleton: test for it with `is None` / `is not None`.

</div>
