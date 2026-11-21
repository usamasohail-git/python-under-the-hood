---
title: Arithmetic Operators
summary: Operators like `+`, `*` and `@` call special methods; returning `NotImplemented` lets Python try the reflected method on the other operand, and in-place operators may mutate or rebind.
minutes: 20
---

## Operators are method calls

When Python evaluates `a + b`, it doesn't know or care what `a` and `b` are. It calls a special method and lets the objects decide. Here are the binary arithmetic operators and the methods behind them:

| Operator | Method | Reflected | In-place (`op=`) |
|---|---|---|---|
| `+` | `__add__` | `__radd__` | `__iadd__` |
| `-` | `__sub__` | `__rsub__` | `__isub__` |
| `*` | `__mul__` | `__rmul__` | `__imul__` |
| `@` | `__matmul__` | `__rmatmul__` | `__imatmul__` |
| `/` | `__truediv__` | `__rtruediv__` | `__itruediv__` |
| `//` | `__floordiv__` | `__rfloordiv__` | `__ifloordiv__` |
| `%` | `__mod__` | `__rmod__` | `__imod__` |
| `**` | `__pow__` | `__rpow__` | `__ipow__` |

There are also the unary operators `-a` (`__neg__`), `+a` (`__pos__`) and `~a` (`__invert__`), and the built-in `abs(a)` (`__abs__`). The bitwise operators `&`, `|`, `^`, `<<`, `>>` follow the same pattern (`__and__`, `__or__`, …).

You can see that built-in types work the same way:

```python run
print((2).__add__(3))
print('ab'.__mul__(3))
print([1, 2].__add__([3]))
```

## A `Vector` class

Let's build a vector of any number of real components. The components are validated and stored in a tuple, so a `Vector` is immutable:

```python run
from numbers import Real

class Vector:
    def __init__(self, *components):
        if len(components) < 1:
            raise ValueError('Cannot create an empty Vector.')
        for component in components:
            if not isinstance(component, Real):
                raise ValueError(f'Vector components must be real numbers, {component!r} is invalid.')
        self._components = tuple(components)

    @property
    def components(self):
        return self._components

    def __len__(self):
        return len(self._components)

    def __repr__(self):
        return f'Vector{self._components}'

    def _compatible(self, other):
        return isinstance(other, Vector) and len(other) == len(self)

    def __add__(self, other):
        if not self._compatible(other):
            return NotImplemented
        return Vector(*(x + y for x, y in zip(self.components, other.components)))

    def __sub__(self, other):
        if not self._compatible(other):
            return NotImplemented
        return Vector(*(x - y for x, y in zip(self.components, other.components)))

v1 = Vector(1, 2)
v2 = Vector(10, 10)
print(v1 + v2, v2 - v1)
```

Adding vectors of different dimensions, or a vector and a number, makes no sense, so in those cases `__add__` returns `NotImplemented`. Python then raises the same `TypeError` you get for `'a' + 1`:

```python run
for expr in ('v1 + Vector(1, 2, 3)', 'v1 + 100'):
    try:
        eval(expr)
    except TypeError as ex:
        print(f'{expr}: TypeError: {ex}')
```

## `NotImplemented` is not `NotImplementedError`

The two names look alike but do completely different jobs:

- **`NotImplemented`** is a built-in singleton **value** (like `None`). An operator method *returns* it to say "I don't know how to combine myself with this operand". It's a polite answer that tells Python to try the other operand's method next.
- **`NotImplementedError`** is an **exception** class. You *raise* it to say "this feature is missing", typically in a base-class method that subclasses are supposed to override.

Mixing them up has real consequences. If an operator method raises `NotImplementedError`, the exception propagates immediately and Python never gets the chance to ask the other operand:

```python run
class Raises:
    def __add__(self, other):
        raise NotImplementedError        # wrong tool for an operator

class Returns:
    def __add__(self, other):
        return NotImplemented            # "not with this type, try the other side"

class Other:
    def __radd__(self, other):
        return f'Other.__radd__ handled {type(other).__name__}'

print(Returns() + Other())
try:
    Raises() + Other()
except NotImplementedError:
    print('NotImplementedError escaped: Other.__radd__ was never tried')
```

So: operator and comparison methods **return** `NotImplemented`; everything else that isn't finished **raises** `NotImplementedError`.

<div class="callout note">
<span class="callout-title">Don't test `NotImplemented` for truth</span>

`NotImplemented` is meant to be returned and compared with `is`, never used as a boolean. Since Python 3.9, `if NotImplemented:` issues a `DeprecationWarning`, and Python 3.14 makes it a `TypeError`.

</div>

## Multiplying by a scalar, and the reflected `__rmul__`

Let's allow `vector * number`. We'll attach the new methods to the existing class instead of repeating the whole class body each time (in real code you'd simply write them inside the class):

```python run
def __mul__(self, other):
    print('  __mul__ called')
    if isinstance(other, Real):
        return Vector(*(other * x for x in self.components))
    return NotImplemented

Vector.__mul__ = __mul__

v1 = Vector(1, 2)
print(v1 * 10)
try:
    10 * v1
except TypeError as ex:
    print('TypeError:', ex)
```

`v1 * 10` works, but `10 * v1` fails, and `__mul__` wasn't even called the second time. That's because `10 * v1` starts with the **left** operand: Python calls `int.__mul__(10, v1)`. An `int` has no idea what a `Vector` is, so it returns `NotImplemented`:

```python run
(10).__mul__(v1)
```

Python then tries the **reflected** method of the right operand, `v1.__rmul__(10)`. We don't have one yet, hence the `TypeError`. Multiplying by a scalar is commutative, so `__rmul__` can simply delegate:

```python run
def __rmul__(self, other):
    print('  __rmul__ called')
    return self * other

Vector.__rmul__ = __rmul__

print(10 * v1)
```

## How Python evaluates `a + b`

Putting it together, for a binary operator like `a + b` Python does this:

1. If `type(b)` is a **subclass** of `type(a)` and provides its own `__radd__`, call `b.__radd__(a)` first. (This lets a subclass override how it combines with its parent.)
2. Otherwise call `a.__add__(b)`. If it returns a result, that's the answer.
3. If it's missing or returned `NotImplemented`, and `b` is of a **different type**, call `b.__radd__(a)`.
4. If that's missing or also returned `NotImplemented`, raise `TypeError: unsupported operand type(s)`.

Step 3 has a detail worth knowing: the reflected method is **not** tried when both operands have the same type. If `Vector.__add__` returns `NotImplemented` for another `Vector`, Python goes straight to the `TypeError`. You can watch the order with tracing methods:

```python run
class A:
    def __add__(self, other):
        print('  A.__add__')
        return NotImplemented
    def __radd__(self, other):
        print('  A.__radd__')
        return NotImplemented

class B(A):
    def __radd__(self, other):
        print('  B.__radd__')
        return 'B handled it'

class C:
    def __radd__(self, other):
        print('  C.__radd__')
        return 'C handled it'

print('A() + A():')
try:
    A() + A()
except TypeError as ex:
    print('  TypeError:', ex)
print('A() + B():')
print(' ', A() + B())
print('A() + C():')
print(' ', A() + C())
```

`A() + A()` never calls `__radd__` (same type). `A() + B()` asks the subclass `B` **first**. `A() + C()` tries `A.__add__`, gets `NotImplemented`, then falls back to `C.__radd__`.

## The dot product and `@`

A *dot product* multiplies two vectors pairwise and adds up the results. We could overload `*` again (if `other` is a `Vector`, compute the dot product), but then `*` would mean two different things depending on the type of the right operand. Python 3.5 added the `@` operator (`__matmul__`) for exactly this situation; NumPy uses it for matrix multiplication and for the dot product of 1-D arrays. Let's follow that convention:

```python run
def __matmul__(self, other):
    if not self._compatible(other):
        return NotImplemented
    return sum(x * y for x, y in zip(self.components, other.components))

Vector.__matmul__ = __matmul__

print(Vector(1, 2) @ Vector(3, 4))     # 1*3 + 2*4
```

No built-in type implements `@`; it exists purely so libraries and your own classes can give it a meaning.

## Unary operators and `abs`

The negation of a vector negates each component, and `abs()` is the natural place for its Euclidean length:

```python run
from math import hypot

def __neg__(self):
    return Vector(*(-x for x in self.components))

def __abs__(self):
    return hypot(*self.components)     # sqrt of the sum of squares

Vector.__neg__ = __neg__
Vector.__abs__ = __abs__

v1, v2 = Vector(1, 2), Vector(10, 10)
print(-v1, v2 + -v1)
print(abs(Vector(3, 4)), abs(Vector(1, 1)))
```

## In-place operators

`a += b` looks like shorthand for `a = a + b`, but it's its own operation. Python first looks for `__iadd__`. If it exists, `a.__iadd__(b)` is called and the name `a` is bound to **whatever it returns**. Only if there's no `__iadd__` (or it returns `NotImplemented`) does Python fall back to `a = a + b`.

Mutable built-ins use this to **mutate in place**. Immutable ones have no `__iadd__`, so they produce a new object:

```python run
l = [1, 2]
alias = l
print(hex(id(l)))
l += [3]                     # list.__iadd__ mutates (it's like extend)
print(hex(id(l)), l, alias)

t = (1, 2)
print(hex(id(t)))
t += (3,)                    # no tuple.__iadd__: t = t + (3,)
print(hex(id(t)), t)
```

The list kept its address and the change is visible through `alias`; the tuple was replaced by a new one. Compare that with `l = l + [3]`, which always builds a new list and leaves `alias` alone.

Our `Vector` is immutable and has no `__iadd__`, so `+=` already works by falling back to `__add__` and rebinding:

```python run
v = Vector(1, 2)
before = id(v)
v += Vector(10, 20)
print(v, id(v) == before)
```

That's usually what you want for value-like objects. If your object is a mutable container, implement `__iadd__` to change `self` and **return `self`**. Forgetting the `return` is a classic bug: `__iadd__` then returns `None`, and the name on the left is rebound to `None`.

## Not just for numbers

Operators are a way to express meaning, and that meaning doesn't have to be arithmetic. Here a `Family` uses `+=` to add a child:

```python run
class Person:
    def __init__(self, name):
        self.name = name
    def __repr__(self):
        return f'Person({self.name!r})'

class Family:
    def __init__(self, mother, father):
        self.mother = mother
        self.father = father
        self.children = []

    def __iadd__(self, other):
        if not isinstance(other, Person):
            return NotImplemented
        self.children.append(other)
        return self                     # without this, f would become None

f = Family(Person('Mary'), Person('John'))
before = id(f)
f += Person('Eric')
f += Person('Michael')
print(f.children, id(f) == before)
```

Use this power with taste: an operator should do what a reader would guess. `pathlib` (`Path('a') / 'b'`) and sets (`s1 | s2`) are good examples of intuitive overloads.

<div class="takeaways">

## Key takeaways

- Every operator maps to a special method: `+` → `__add__`, `*` → `__mul__`, `@` → `__matmul__`, `-x` → `__neg__`, `abs(x)` → `__abs__`, and so on.
- Return **`NotImplemented`** (a value) from an operator method when you can't handle the operand; raise **`NotImplementedError`** (an exception) only for missing features. Raising stops Python from trying the other operand.
- For `a + b`, Python tries `a.__add__(b)`, then the reflected `b.__radd__(a)` if the types differ; a subclass on the right gets its reflected method called first.
- Implement `__rmul__`/`__radd__` so that `10 * v` works as well as `v * 10`.
- `a += b` calls `__iadd__` and rebinds `a` to its return value; without `__iadd__` it falls back to `a = a + b`. Mutating `__iadd__` methods must `return self`.

</div>
