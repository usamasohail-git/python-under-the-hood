---
title: Project 2 - Solution
summary: The `Mod` project from problem statement to finished class, built step by step - validation, congruence-based equality and hashing, ordering, arithmetic with reflected operators and `pow()`, and in-place operators.
minutes: 30
---

## The problem

Two integers are *congruent modulo n* when they leave the same remainder after division by `n`: `8 ≡ 2 (mod 3)` because both leave remainder 2. That remainder, the number in `range(n)`, is called the **residue**. Your task is to write a class `Mod` for numbers in this "wrap-around" arithmetic.

**Goal 1: construction and representation.**

- `Mod(value, modulus)` accepts only integers for both arguments (otherwise `TypeError`), and the modulus must be positive (otherwise `ValueError`).
- The object stores the **residue**: `Mod(8, 3).value` is `2`. `value` and `modulus` are read-only properties.
- `repr(Mod(8, 3))` is `'Mod(2, 3)'`, and `int(Mod(8, 3))` is `2`.

**Goal 2: equality, hashing and ordering.**

- A `Mod` equals another `Mod` with the **same modulus** when they're congruent, and equals an `int` that is congruent to it: `Mod(8, 3) == 5` is `True`.
- `Mod` objects are hashable.
- `<`, `<=`, `>`, `>=` compare residues, against a `Mod` with the same modulus or an `int` (whose residue is used).

**Goal 3: arithmetic.**

- `+`, `-` and `*` work with a `Mod` of the same modulus or with an `int`, on **either side** of the operator, and return a new `Mod`. `**` takes an integer exponent. Unary `-` is supported.
- A different modulus or an unsupported type raises `TypeError`.

**Goal 4: in-place arithmetic.** `+=`, `-=`, `*=` and `**=` modify the object itself instead of creating a new one.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Each goal is an auto-graded exercise on this section's practice page. Give them a go before reading the walkthrough below.

</div>

## Goal 1: validation, properties and representation

The constructor validates its arguments first, then stores the residue, never the raw value. That's the key design decision of the whole class: once every `Mod` holds a number in `range(modulus)`, comparisons and arithmetic can work directly with `value`.

```python run
class Mod:
    def __init__(self, value, modulus):
        if not isinstance(modulus, int):
            raise TypeError('Unsupported type for modulus')
        if not isinstance(value, int):
            raise TypeError('Unsupported type for value')
        if modulus <= 0:
            raise ValueError('Modulus must be positive')
        self._modulus = modulus
        self._value = value % modulus        # always store the residue

    @property
    def modulus(self):
        return self._modulus

    @property
    def value(self):
        return self._value

    def __repr__(self):
        return f'Mod({self.value}, {self.modulus})'

    def __int__(self):
        return self.value

print(Mod(8, 3), Mod(-1, 5), int(Mod(14, 12)))
for args in [(1.5, 3), (1, 0)]:
    try:
        Mod(*args)
    except (TypeError, ValueError) as ex:
        print(f'Mod{args}: {type(ex).__name__}: {ex}')
```

Python's `%` always returns a result with the sign of the divisor, so negative values work out naturally: `-1 % 5` is `4`. The properties have no setters, so `m.value = 3` raises `AttributeError`. `__int__` is what `int(m)` calls.

From here on we'll add methods to the class one group at a time (assigning them as class attributes) so we don't repeat the whole class body at each step. The complete class is assembled at the end.

## Goal 2: equality via a residue helper

Every remaining method has to answer the same question first: *"Can I work with `other`, and if so, what is its residue?"* An `int` is fine (its residue is `other % modulus`), a `Mod` is fine only if it has the same modulus, and anything else isn't. Let's write that once:

```python run
def _residue(self, other):
    """The residue of other modulo self.modulus, or None if incompatible."""
    if isinstance(other, Mod):
        return other.value if other.modulus == self.modulus else None
    if isinstance(other, int):
        return other % self.modulus
    return None

def __eq__(self, other):
    r = self._residue(other)
    if r is None:
        return NotImplemented
    return self.value == r

def __hash__(self):
    return hash((self.value, self.modulus))

Mod._residue, Mod.__eq__, Mod.__hash__ = _residue, __eq__, __hash__

print(Mod(8, 3) == Mod(2, 3), Mod(8, 3) == 5, 5 == Mod(8, 3))
print(Mod(2, 3) == Mod(2, 7), Mod(2, 3) == 'two')
print(len({Mod(2, 3), Mod(5, 3), Mod(2, 7)}))
```

Why return `NotImplemented` instead of raising a `TypeError` for incompatible operands? Because it's what makes `==` behave well:

- `5 == Mod(8, 3)` works: `int.__eq__` returns `NotImplemented`, so Python reflects to `Mod.__eq__`.
- `Mod(2, 3) == Mod(2, 7)` and `Mod(2, 3) == 'two'` are simply `False`: both sides give up, and `==` falls back to identity. Raising instead would make innocent code like `x in [Mod(2, 3), 'two']` crash.

The hash uses the same data as equality, residue and modulus, so equal `Mod` objects have equal hashes and the set above keeps two elements (`Mod(2, 3)` and `Mod(5, 3)` are the same element).

<div class="callout note">
<span class="callout-title">The hash contract and integers</span>

There's a catch we can't fully fix. `Mod(2, 5)` equals `2`, `7`, `12`, … but those integers are **not** equal to each other and have different hashes, so no single hash for `Mod(2, 5)` can match all of them. As a result, set and dict lookups don't mix `Mod` objects and ints, even though `==` does:

```python run
print(Mod(2, 5) == 7, 7 in {Mod(2, 5)}, Mod(2, 5) in [7])
```

The list uses `==` and finds it; the set uses the hash first and doesn't. Equality between a class and a *different* value type is a design choice with this trade-off; here it's what the problem asks for, and hashing among `Mod` objects remains consistent.

</div>

## Goal 2: ordering with `total_ordering`

Ordering compares residues. We write `__lt__` with the same helper and let `functools.total_ordering` derive `<=`, `>` and `>=`. Because the decorator just adds methods to an existing class, we can apply it to `Mod` now:

```python run
from functools import total_ordering

def __lt__(self, other):
    r = self._residue(other)
    if r is None:
        return NotImplemented
    return self.value < r

Mod.__lt__ = __lt__
Mod = total_ordering(Mod)          # the same thing @total_ordering does

print(Mod(1, 5) < Mod(3, 5), Mod(4, 5) >= 9, 3 > Mod(1, 5))
print(sorted([Mod(4, 5), Mod(0, 5), Mod(7, 5)]))
try:
    Mod(1, 5) < Mod(1, 7)
except TypeError as ex:
    print('TypeError:', ex)
```

`Mod(4, 5) >= 9` compares residues, `4 >= 4`. `3 > Mod(1, 5)` is reflected to `Mod(1, 5) < 3`. For different moduli both sides return `NotImplemented`, and ordering, unlike `==`, then raises `TypeError`.

## Goal 3: arithmetic without repetition

A first `__add__` written out by hand looks like this:

```python
def __add__(self, other):
    r = self._residue(other)
    if r is None:
        return NotImplemented
    return Mod(self.value + r, self.modulus)
```

`__sub__` and `__mul__` would be identical except for the operator. The `operator` module has every operator as a plain function (`operator.add(2, 3)` is `5`), so we can write the logic once and pass in the operation:

```python run
import operator

def _op(self, other, op, *, reflected=False):
    r = self._residue(other)
    if r is None:
        return NotImplemented
    a, b = (r, self.value) if reflected else (self.value, r)
    return Mod(op(a, b), self.modulus)        # the constructor reduces the result

Mod._op = _op
Mod.__add__ = lambda self, other: self._op(other, operator.add)
Mod.__sub__ = lambda self, other: self._op(other, operator.sub)
Mod.__mul__ = lambda self, other: self._op(other, operator.mul)
Mod.__neg__ = lambda self: Mod(-self.value, self.modulus)

print(Mod(2, 5) + Mod(4, 5), Mod(2, 5) - 3, Mod(3, 5) * 4, -Mod(2, 5))
try:
    3 + Mod(2, 5)
except TypeError as ex:
    print('TypeError:', ex)
```

(Lambdas keep this walkthrough short; the final class below uses ordinary `def` methods.) Notice that `_op` doesn't reduce the result itself: `Mod(op(a, b), ...)` goes through the constructor, which always stores the residue.

## Goal 3: reflected operators

`3 + Mod(2, 5)` still fails. As you know, `int.__add__` gives up on a `Mod`, and Python then looks for `Mod.__radd__`. Addition and multiplication are commutative, but subtraction isn't: `3 - Mod(1, 5)` must compute `3 - 1`, **not** `1 - 3`. That's what the `reflected` flag in `_op` is for: it swaps the operands.

```python run
Mod.__radd__ = lambda self, other: self._op(other, operator.add, reflected=True)
Mod.__rsub__ = lambda self, other: self._op(other, operator.sub, reflected=True)
Mod.__rmul__ = lambda self, other: self._op(other, operator.mul, reflected=True)

print(3 + Mod(2, 5), 3 - Mod(1, 5), 2 * Mod(3, 5))
for expr in ('Mod(1, 5) + Mod(1, 7)', 'Mod(1, 5) * 1.5', "'a' - Mod(1, 5)"):
    try:
        eval(expr)
    except TypeError as ex:
        print(f'{expr}: TypeError: {ex}')
```

`Mod(1, 5) + Mod(1, 7)` raises `TypeError`, and Python doesn't even try `__radd__`: both operands are `Mod` objects, and reflected methods are only used for different types.

## Goal 3: powers

Raising to a power deserves care, for correctness and for speed.

**Correctness.** It's tempting to reduce the exponent modulo `n` too, but that gives wrong answers. Congruent *bases* give congruent powers, but congruent *exponents* don't:

```python run
print(2 ** 5 % 5, 2 ** (5 % 5) % 5)      # 2 vs 1: reducing the exponent is wrong
print(2 ** 1 % 5, 2 ** 6 % 5)            # exponents 1 and 6 are congruent mod 5...
```

The second line also shows why we accept only an `int` as the exponent: a `Mod(1, 5)` exponent could stand for 1 or for 6, which give different results. So `__pow__` returns `NotImplemented` for anything but an `int`.

**Speed.** `self.value ** exp` builds the full, possibly enormous, integer before reducing it. The built-in three-argument `pow(base, exp, mod)` reduces at every step and is dramatically faster. Since Python 3.8 it also accepts a **negative** exponent, which gives the *modular inverse* (`pow(3, -1, 7)` is `5`, because `3 * 5 ≡ 1 (mod 7)`), and raises `ValueError` when no inverse exists.

```python run
def __pow__(self, exp):
    if not isinstance(exp, int):
        return NotImplemented
    return Mod(pow(self.value, exp, self.modulus), self.modulus)

Mod.__pow__ = __pow__

print(Mod(2, 5) ** 5, Mod(3, 7) ** -1, Mod(3, 7) * (Mod(3, 7) ** -1))
print(Mod(12345, 1_000_007) ** 10**18)      # instant with three-argument pow
try:
    Mod(2, 4) ** -1
except ValueError as ex:
    print('ValueError:', ex)
```

## Goal 4: in-place operators

Without `__iadd__`, `m += 1` already works by falling back to `m = m + 1`, but that creates a **new** object. The problem asks for in-place modification, so the in-place methods compute the result with the regular operator and then update `self`. If the operand is incompatible, they return `NotImplemented` as well; Python then tries the regular operator, which fails in the same way, and finally raises `TypeError`:

```python run
def _iop(self, result):
    if result is NotImplemented:
        return NotImplemented
    self._value = result.value      # mutate this object
    return self                     # += rebinds the name to this return value

Mod._iop = _iop
Mod.__iadd__ = lambda self, other: self._iop(self.__add__(other))
Mod.__isub__ = lambda self, other: self._iop(self.__sub__(other))
Mod.__imul__ = lambda self, other: self._iop(self.__mul__(other))
Mod.__ipow__ = lambda self, exp: self._iop(self.__pow__(exp))

m = Mod(1, 5)
alias = m
m += 7
m *= Mod(3, 5)
m **= 2
print(m, alias, m is alias)
try:
    m += 1.5
except TypeError as ex:
    print('TypeError:', ex)
```

`alias` sees every change because there's only one object. Reusing `__add__` inside `__iadd__` keeps all the validation and the reduction in one place. Note that we call the method `self.__add__(other)` rather than writing `self + other`: the method *returns* `NotImplemented` for a bad operand, which `_iop` can pass on, whereas the expression `self + other` would already *raise* a `TypeError` inside `__iadd__`. Passing `NotImplemented` on lets Python finish the normal protocol (try `__add__`, then the other operand's `__radd__`) and produce the standard error message for `+=`.

<div class="callout note">
<span class="callout-title">Mutable and hashable don't mix</span>

The in-place operators change `value`, and the hash depends on `value`. A `Mod` that's mutated while it sits in a set or is used as a dict key ends up in the wrong hash slot:

```python run
m = Mod(1, 5)
s = {m}
m += 1
print(m in s, m in list(s))
```

The set can no longer find an object it contains. That's the reason built-in numbers are immutable and `+=` on them creates a new object. If you need `Mod` objects as keys, the safer design is to leave out the in-place methods (so `+=` rebinds instead of mutating). Here the problem explicitly asks for mutation, so just be aware of the trade-off.

</div>

## The complete class

Here is everything assembled into one class definition, followed by a set of checks. When refactoring code like this (for example, when we replaced hand-written `__add__`/`__sub__`/`__mul__` with `_op`), a test suite like this one lets you prove you didn't break anything.

```python run fresh
import operator
from functools import total_ordering

@total_ordering
class Mod:
    def __init__(self, value, modulus):
        if not isinstance(modulus, int):
            raise TypeError('Unsupported type for modulus')
        if not isinstance(value, int):
            raise TypeError('Unsupported type for value')
        if modulus <= 0:
            raise ValueError('Modulus must be positive')
        self._modulus = modulus
        self._value = value % modulus

    @property
    def modulus(self):
        return self._modulus

    @property
    def value(self):
        return self._value

    def __repr__(self):
        return f'Mod({self.value}, {self.modulus})'

    def __int__(self):
        return self.value

    def _residue(self, other):
        if isinstance(other, Mod):
            return other.value if other.modulus == self.modulus else None
        if isinstance(other, int):
            return other % self.modulus
        return None

    def __eq__(self, other):
        r = self._residue(other)
        return NotImplemented if r is None else self.value == r

    def __hash__(self):
        return hash((self.value, self.modulus))

    def __lt__(self, other):
        r = self._residue(other)
        return NotImplemented if r is None else self.value < r

    def _op(self, other, op, *, reflected=False):
        r = self._residue(other)
        if r is None:
            return NotImplemented
        a, b = (r, self.value) if reflected else (self.value, r)
        return Mod(op(a, b), self.modulus)

    def __add__(self, other):
        return self._op(other, operator.add)

    def __radd__(self, other):
        return self._op(other, operator.add, reflected=True)

    def __sub__(self, other):
        return self._op(other, operator.sub)

    def __rsub__(self, other):
        return self._op(other, operator.sub, reflected=True)

    def __mul__(self, other):
        return self._op(other, operator.mul)

    def __rmul__(self, other):
        return self._op(other, operator.mul, reflected=True)

    def __pow__(self, exp):
        if not isinstance(exp, int):
            return NotImplemented
        return Mod(pow(self.value, exp, self.modulus), self.modulus)

    def __neg__(self):
        return Mod(-self.value, self.modulus)

    def _iop(self, result):
        if result is NotImplemented:
            return NotImplemented
        self._value = result.value
        return self

    def __iadd__(self, other):
        return self._iop(self.__add__(other))

    def __isub__(self, other):
        return self._iop(self.__sub__(other))

    def __imul__(self, other):
        return self._iop(self.__mul__(other))

    def __ipow__(self, exp):
        return self._iop(self.__pow__(exp))


def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

# Goal 1
assert repr(Mod(8, 3)) == 'Mod(2, 3)' and int(Mod(-1, 5)) == 4
assert raises(TypeError, lambda: Mod(1.0, 3)) and raises(ValueError, lambda: Mod(1, -3))
assert raises(AttributeError, lambda: setattr(Mod(1, 3), 'value', 2))
# Goal 2
assert Mod(8, 3) == Mod(2, 3) == 5 and Mod(2, 3) != Mod(2, 7)
assert len({Mod(2, 3), Mod(5, 3)}) == 1
assert Mod(1, 5) < Mod(3, 5) <= 8 and Mod(4, 5) > 3
assert raises(TypeError, lambda: Mod(1, 5) < Mod(1, 7))
# Goal 3
assert Mod(2, 5) + Mod(4, 5) == Mod(1, 5) and 3 - Mod(1, 5) == 2 and 2 * Mod(3, 5) == 1
assert Mod(2, 5) ** 5 == 2 and Mod(3, 7) ** -1 == 5 and -Mod(2, 5) == 3
assert raises(TypeError, lambda: Mod(1, 5) + Mod(1, 7))
assert raises(TypeError, lambda: Mod(1, 5) ** Mod(1, 5))
# Goal 4
m = Mod(1, 5); before = id(m)
m += 7; m -= Mod(1, 5); m *= 3; m **= 2
assert m == Mod(1, 5) and id(m) == before
print('all checks passed')
```

<div class="takeaways">

## Key takeaways

- Normalize state in `__init__` (here: store the residue), so every other method can rely on it.
- One helper that answers "is `other` compatible, and what's its value?" removes most of the repetition; the `operator` module removes the rest.
- Return `NotImplemented` for incompatible operands, so `==` stays safe and reflected operators like `__radd__` and `__rsub__` get their chance. Remember to swap the operands for non-commutative reflected operations.
- Use three-argument `pow(base, exp, mod)` for modular powers; never reduce the exponent by the modulus. A negative exponent gives the modular inverse (Python 3.8+).
- Equality with plain ints can't be fully matched by a hash, and objects that mutate in place shouldn't be used as dict keys or set members.

</div>
