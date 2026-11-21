---
title: Rich Comparisons
summary: The six comparison operators each call their own special method; Python can swap the operands to use the mirrored method, and `functools.total_ordering` derives the rest of the ordering from one method.
minutes: 16
---

## Six operators, six methods

Each comparison operator has its own special method, and each one has a **mirror**: the method that answers the same question with the operands swapped.

| Expression | Method called | Mirror (used when reflected) |
|---|---|---|
| `a == b` | `a.__eq__(b)` | `b.__eq__(a)` |
| `a != b` | `a.__ne__(b)` | `b.__ne__(a)` |
| `a < b` | `a.__lt__(b)` | `b.__gt__(a)` |
| `a <= b` | `a.__le__(b)` | `b.__ge__(a)` |
| `a > b` | `a.__gt__(b)` | `b.__lt__(a)` |
| `a >= b` | `a.__ge__(b)` | `b.__le__(a)` |

They're called *rich* comparisons because each method may return anything (usually `True` or `False`, but NumPy, for example, returns arrays of booleans) and because each one can be implemented independently.

## The default `==` is identity

A class that doesn't define `__eq__` inherits `object.__eq__`, which only considers an object equal to itself:

```python run
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Vector(x={self.x}, y={self.y})'

v1 = Vector(0, 0)
v2 = Vector(0, 0)
print(v1 == v2, v1 == v1)
try:
    v1 < v2
except TypeError as ex:
    print('TypeError:', ex)
```

Two vectors with the same coordinates aren't equal, and ordering isn't supported at all. Let's define value equality. When the other object isn't something we understand, we return `NotImplemented`, exactly like the arithmetic operators do:

```python run
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Vector(x={self.x}, y={self.y})'

    def __eq__(self, other):
        if isinstance(other, tuple):
            other = Vector(*other)
        if isinstance(other, Vector):
            return self.x == other.x and self.y == other.y
        return NotImplemented

v1, v2, v3 = Vector(1, 1), Vector(1, 1), Vector(10, 10)
print(v1 == v2, v1 is v2, v1 == v3)
print(v1 == (1, 1))
print((1, 1) == v1)
print(v1 == 'hello')
```

Three things happened here:

- `v1 == (1, 1)` works because our `__eq__` converts tuples.
- `(1, 1) == v1` works too, even though `tuple.__eq__` knows nothing about vectors: it returns `NotImplemented`, so Python **reflects** the comparison and calls `v1.__eq__((1, 1))`.
- `v1 == 'hello'`: our method returns `NotImplemented`, and so does `str.__eq__`. For `==` and `!=` only, Python then falls back to comparing identity, so the answer is a quiet `False` rather than an error. That's important: `x in some_list` must never blow up just because the list holds mixed types.

## `!=` comes for free

You almost never need `__ne__`. The default `object.__ne__` calls `__eq__` and inverts the result (unless it's `NotImplemented`):

```python run
def traced_eq(self, other):
    print('  __eq__ called')
    if isinstance(other, Vector):
        return self.x == other.x and self.y == other.y
    return NotImplemented

Vector.__eq__ = traced_eq
print(Vector(0, 0) != Vector(1, 1))
```

(Python 2 didn't do this, which is why older code sometimes defines `__ne__` by hand.)

## Ordering, and reflection between `<` and `>`

Let's say one vector is "less than" another when it's shorter. We'll use `abs()` for the length:

```python run
from math import hypot

class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Vector(x={self.x}, y={self.y})'

    def __eq__(self, other):
        if isinstance(other, tuple):
            other = Vector(*other)
        if isinstance(other, Vector):
            return self.x == other.x and self.y == other.y
        return NotImplemented

    def __abs__(self):
        return hypot(self.x, self.y)

    def __lt__(self, other):
        print(f'  __lt__({self}, {other})')
        if isinstance(other, tuple):
            other = Vector(*other)
        if isinstance(other, Vector):
            return abs(self) < abs(other)
        return NotImplemented

v1, v2 = Vector(0, 0), Vector(1, 1)
print(v1 < v2)
print(v2 > v1)
print((1, 1) > v1)
```

We never wrote `__gt__`, yet `v2 > v1` works. There's no `Vector.__gt__`, so Python uses the mirror: `v2 > v1` asks the same question as `v1 < v2`, and the trace shows `__lt__` was called with the operands swapped. The tuple case works the same way: `tuple.__gt__` returns `NotImplemented` for a `Vector`, so Python calls `v1.__lt__((1, 1))`.

Unlike arithmetic, the mirrored method **is** tried even when both operands have the same type. And there's no identity fallback for ordering: if both sides return `NotImplemented`, you get a `TypeError`.

## Python doesn't combine methods

Having `<` and `==` doesn't give you `<=`. Python never combines two methods on its own; it only swaps operands:

```python run
try:
    v1 <= v2
except TypeError as ex:
    print('TypeError:', ex)
```

You could add `__le__` by hand (`return self == other or self < other`), and then `>=` would work by reflection. But there's a neater tool.

## `functools.total_ordering`

Given `==` and any one ordering method, the rest follow logically. With `<` and `==`:

- `a <= b` is `a < b or a == b`
- `a > b` is `not (a < b) and a != b`
- `a >= b` is `not (a < b)`

The class decorator `functools.total_ordering` writes these methods for you. Precisely, it:

- requires the class to define **at least one** of `__lt__`, `__le__`, `__gt__` or `__ge__` (otherwise it raises `ValueError`); if you define several, it builds the missing ones from the first available in the order `__lt__`, `__le__`, `__gt__`, `__ge__`;
- **never replaces** a method you wrote, it only fills the gaps;
- **does not create `__eq__`**. The generated methods use `==`, so you should define `__eq__` yourself; without it, they'd silently rely on the identity comparison inherited from `object`;
- passes `NotImplemented` through: if your root method returns it, the generated method returns it too, so reflection and the final `TypeError` still behave correctly.

```python run
from functools import total_ordering

@total_ordering
class Number:
    def __init__(self, x):
        self.x = x

    def __eq__(self, other):
        print('  __eq__ called')
        if isinstance(other, Number):
            return self.x == other.x
        return NotImplemented

    def __lt__(self, other):
        print('  __lt__ called')
        if isinstance(other, Number):
            return self.x < other.x
        return NotImplemented

a, b, c = Number(1), Number(2), Number(1)
print('a <= b:', a <= b)
print('a <= c:', a <= c)
print('a >= b:', a >= b)
print([name for name in ('__lt__', '__le__', '__gt__', '__ge__') if name in Number.__dict__])
```

`a <= b` only needed `__lt__` (it was `True`, so the `or` short-circuited). `a <= c` needed both: `1 < 1` is false, so it then checked `==`. The class now has all four ordering methods.

The convenience has a small cost: each generated comparison makes an extra method call, and may make two. In performance-critical code, write the methods out by hand.

<div class="callout tip">
<span class="callout-title">What `sorted()` needs</span>

`sorted()`, `list.sort()`, `min()` and `max()` only ever use `<`. Defining `__lt__` alone is enough to sort your objects, but users will expect `<=`, `>` and `>=` to work as well, so `total_ordering` (or a `@dataclass(order=True)`) is the friendly choice.

</div>

<div class="takeaways">

## Key takeaways

- `==`, `!=`, `<`, `<=`, `>`, `>=` call `__eq__`, `__ne__`, `__lt__`, `__le__`, `__gt__`, `__ge__`.
- Return `NotImplemented` for operands you don't understand. Python then tries the **mirrored** method on the other operand (`<` ↔ `>`, `<=` ↔ `>=`, `==` ↔ `==`), even for two objects of the same type.
- If both sides give up, `==`/`!=` fall back to identity, while ordering raises `TypeError`.
- `!=` is derived from `__eq__` automatically. Nothing else is combined for you.
- `@functools.total_ordering` fills in the missing ordering methods from one you define; it doesn't define `__eq__`, so write that yourself.

</div>
