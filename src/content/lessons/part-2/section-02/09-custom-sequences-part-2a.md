---
title: Custom Sequences - Part 2a
summary: The special methods behind +, +=, *, *=, reflected multiplication and the in operator, and the conventions that make them behave like the built-in versions.
minutes: 14
---

## The operators are just methods

In part 1, our custom sequence supported indexing, slicing and iteration. Built-in sequences can also be concatenated, repeated and searched with `in`. Each of those operators maps to a special method you can implement:

| Expression | Method called |
|---|---|
| `a + b` | `a.__add__(b)` |
| `a += b` | `a.__iadd__(b)` (falls back to `__add__`) |
| `a * n` | `a.__mul__(n)` |
| `n * a` | `n.__mul__(a)`, then `a.__rmul__(n)` |
| `a *= n` | `a.__imul__(n)` (falls back to `__mul__`) |
| `x in a` | `a.__contains__(x)` |

Python doesn't enforce any meaning for these methods. To prove it, here's a class whose operators just announce themselves:

```python run
class Noisy:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Noisy({self.name!r})'

    def __add__(self, other):
        print(f'__add__ called with {self} and {other}')
        return 'result of +'

    def __iadd__(self, other):
        print(f'__iadd__ called with {self} and {other}')
        return 'result of +='

c1 = Noisy('one')
c2 = Noisy('two')
c3 = c1 + c2
print(c3)
c1 += c2
print(c1)
```

Look at the last line: after `c1 += c2`, the name `c1` is bound to whatever `__iadd__` **returned**. That's a crucial detail. Python executes `c1 = c1.__iadd__(c2)`, so an in-place method must return the object (normally `self`), or the name ends up pointing at something else.

## Implementing them properly

Let's give these operators sensible meaning on a simple class that wraps a name. We'll follow the same conventions as lists:

- `+` and `*` return a **new** object of the same type and leave the operands untouched.
- `+=` and `*=` **mutate** `self` and return `self`.

```python run
class MyClass:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'MyClass(name={self.name!r})'

    def __add__(self, other):
        return MyClass(self.name + ' ' + other.name)

    def __iadd__(self, other):
        self.name += ' ' + other.name
        return self

    def __mul__(self, n):
        return MyClass(self.name * n)

    def __imul__(self, n):
        self.name *= n
        return self

c1 = MyClass('Eric')
c2 = MyClass('Idle')
before = id(c1)

print(c1 + c2, c1, c2)          # new object; operands unchanged
c1 += c2
print(c1, id(c1) == before)     # same object, mutated

c3 = MyClass('ab')
print(c3 * 3, c3)
c3 *= 2
print(c3)
```

Notice that `__mul__` didn't validate `n`. It delegates to `str * n`, so a bad argument produces the same error a string would give, for free:

```python run
try:
    MyClass('Eric') * 'hello'
except TypeError as ex:
    print('TypeError:', ex)
```

## Reflected operators: `n * obj`

`c * 2` works, but what about `2 * c`? Python first tries `int.__mul__(2, c)`. The integer has no idea what a `MyClass` is, so it returns the special value `NotImplemented`. Python then tries the **reflected** method on the right operand, `c.__rmul__(2)`. If that doesn't exist either, you get a `TypeError`:

```python run
try:
    2 * MyClass('Monty')
except TypeError as ex:
    print('TypeError:', ex)
```

For repetition, order doesn't matter, so `__rmul__` can simply reuse `__mul__`:

```python run
class MyClass(MyClass):          # extend the previous version
    def __rmul__(self, n):
        return self.__mul__(n)   # must return a NEW object, just like *

c = MyClass('Monty')
print(2 * c, c)
```

<div class="callout note">
<span class="callout-title">Reflected methods are not in-place</span>

It's tempting to write `__rmul__` by mutating `self.name` and returning `self`, but then `2 * c` would silently change `c`. A reflected operator is still the plain `*` operator, so it must leave its operands alone and return a new object.

</div>

## Returning `NotImplemented`

What should `__add__` do when `other` is something it doesn't understand? Raising `TypeError` yourself works, but the more cooperative choice is to **return** `NotImplemented`. That tells Python "I can't handle this", so it can try the other operand's reflected method (`__radd__`), and only raise a `TypeError` if nobody can:

```python run
class Money:
    def __init__(self, amount):
        self.amount = amount

    def __repr__(self):
        return f'Money({self.amount})'

    def __add__(self, other):
        if isinstance(other, Money):
            return Money(self.amount + other.amount)
        return NotImplemented

    def __radd__(self, other):
        if other == 0:            # lets sum() start from 0
            return self
        return self.__add__(other)

print(Money(5) + Money(7))
print(sum([Money(1), Money(2), Money(3)]))
try:
    Money(5) + 'five'
except TypeError as ex:
    print('TypeError:', ex)
```

`sum()` starts from `0` and computes `0 + Money(1)`, which only works thanks to `__radd__`.

## Membership: `__contains__`

`x in obj` calls `obj.__contains__(x)`. If the class doesn't define it, Python falls back to iterating the object and comparing each item, which is what happened with our `Fib` sequence. Defining it lets you give `in` a custom (often faster) meaning:

```python run
class MyClass(MyClass):
    def __contains__(self, value):
        return value in self.name

c = MyClass('MontyPython')
print('ty' in c, 'xyz' in c, 'xyz' not in c)
```

`not in` simply negates the result; there is no separate method for it.

<div class="takeaways">

## Key takeaways

- `+`, `*`, `+=`, `*=` and `in` call `__add__`, `__mul__`, `__iadd__`, `__imul__` and `__contains__`.
- Follow the built-in conventions: `+`/`*` return new objects, `+=`/`*=` mutate and **return `self`**.
- `a += b` re-binds `a` to the return value of `__iadd__`; without `__iadd__`, Python uses `__add__`.
- `n * obj` needs `__rmul__`, which should also return a new object.
- Return `NotImplemented` for unsupported operands so Python can try the other side's reflected method.

</div>
