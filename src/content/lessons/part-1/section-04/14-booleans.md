---
title: Booleans
summary: bool is a subclass of int, True and False are singletons equal to 1 and 0, and that explains some surprising (but legal) arithmetic.
minutes: 10
---

## `bool` is an `int`

Python's `bool` type has exactly two instances, `True` and `False`. Perhaps surprisingly, `bool` is a **subclass of `int`**:

```python run
print(issubclass(bool, int))
print(isinstance(True, bool), isinstance(True, int))
print(int(True), int(False))
```

`True` behaves as the integer `1` and `False` as `0`. Historically, Python had no boolean type, and code used `1` and `0` instead. When `bool` was added (Python 2.3), making it a subclass of `int` kept all that existing code working.

## Singletons

`True` and `False` are **singletons**: there is only ever one `True` object and one `False` object, and every boolean expression returns one of them. You can't create new ones, and `bool` can't even be subclassed:

```python run
print(id(True) == id(1 < 2))
print(id(False) == id(1 == 3))
print((1 < 2) is True, (1 < 2) == True)

try:
    class MyBool(bool):
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

So comparing a boolean with `is True` works. But in practice you rarely need either form: `if x > 5:` is better than `if (x > 5) == True:`.

<div class="callout modern">
<span class="callout-title">Python 3.12+: immortal objects</span>

Since Python 3.12, CPython marks objects like `True`, `False`, `None` and the small integers as **immortal**: their reference counts are never changed, and they are never deallocated. Their `id()` values are still fixed for the life of the process, so nothing changes in how you use them.

</div>

## Equal to 1 and 0, but not the same object

Because of the inheritance, booleans compare equal to the integers 1 and 0:

```python run
one, zero = 1, 0
print(one == True, zero == False)
print(one is True, zero is False)
```

The values are equal, but `1` is an `int` object and `True` is a `bool` object, so they aren't the same object. (If you type `1 is True` directly, Python even emits a `SyntaxWarning`, because using `is` with a literal is almost always a mistake.) This equality has real consequences, for example for dictionary keys and sets, where `1` and `True` count as the same key:

```python run
d = {1: 'one', True: 'yes'}
print(d)
print({0, False, 1, True})
```

The dictionary ends up with a single entry: `True` was treated as the existing key `1`, so only the value was replaced. Likewise the set keeps just two elements.

## A chaining trap

Watch out for this one:

```python run
print(1 == 2 == False)
print((1 == 2) == False)
```

The first line is a **chained comparison** (covered later in the section). `a == b == c` means `a == b and b == c`, so it's `1 == 2 and 2 == False`, which is `False`. Only with parentheses do you compare the *result* of `1 == 2` with `False`:

```python run
print(1 == 2, 2 == False, 1 == 2 and 2 == False)
print((1 == 2) == 0)    # False is also 0
```

## Converting to bool

`bool(x)` converts any object to `True` or `False`. For integers the rule is: **zero is `False`, everything else is `True`**.

```python run
print(bool(0))
print(bool(1), bool(100), bool(-1))
```

The next lesson extends this to every kind of object.

## Booleans in arithmetic

Since booleans are integers, every integer operation works on them:

```python run
print(True > False)
print(True + 2)
print(False // 2)
print(True + True + True)
print(-True)
print(100 * False)
```

Writing `True + 2` on purpose is confusing and best avoided. One idiom is genuinely useful, though: **counting how many items meet a condition** by summing booleans:

```python run
scores = [72, 45, 90, 38, 66, 81]
print(sum(s >= 50 for s in scores))   # how many passed
```

<div class="callout modern">
<span class="callout-title">Python 3.12+: `~True` is deprecated</span>

The bitwise inversion `~` works on integers, so `~True` is `~1`, which is `-2`, not `False`. That is almost never what anyone means, so Python 3.12 deprecated `~` on booleans (it emits a `DeprecationWarning`) and plans to make it an error. Use `not x` to negate a boolean.

```python run
import warnings
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter('always')
    flag = True
    result = ~flag
print(result, '|', caught[0].category.__name__)
print(not True)
```

</div>

<div class="takeaways">

## Key takeaways

- `bool` is a subclass of `int`; `True == 1` and `False == 0`.
- `True` and `False` are singletons, but `1 is True` is `False`: equal values, different objects.
- `a == b == c` is a chained comparison; use parentheses to compare a result with `True`/`False`.
- For integers, `bool(x)` is `False` only for `0`. Summing booleans counts how many are `True`.

</div>
