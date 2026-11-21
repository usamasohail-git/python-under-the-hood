---
title: Booleans
summary: Python decides an object's truth value by calling `__bool__`, falling back to `__len__`, and otherwise treating the object as true; `__bool__` must return an actual `bool`.
minutes: 9
---

## Every object has a truth value

You can use any object in an `if`, a `while`, with `and`, `or` and `not`, or pass it to `bool()`. Built-in types follow familiar conventions: zero numbers, `None` and empty containers are *falsy*; everything else is *truthy*. For your own classes, Python determines the truth value in three steps:

1. If the class defines **`__bool__`**, call it. It must return `True` or `False`.
2. Otherwise, if it defines **`__len__`**, the object is falsy when the length is `0` and truthy otherwise.
3. Otherwise, the object is **always truthy**.

## Step 3: the default is `True`

```python run
class Person:
    pass

p = Person()
print(bool(p))
if p:
    print('p is truthy')
```

## Step 2: `__len__` is used as a fallback

A class that has a length but no `__bool__` behaves like a built-in container: empty means false.

```python run
class MyList:
    def __init__(self, length):
        self._length = length

    def __len__(self):
        print('  __len__ called')
        return self._length

print(bool(MyList(0)))
print(bool(MyList(10)))
```

That's very convenient: if you write a custom collection and implement `__len__`, truth testing is consistent with lists, dicts and strings without any extra code.

## Step 1: `__bool__` takes priority

When both methods exist, Python calls only `__bool__`:

```python run
class MyList:
    def __init__(self, length):
        self._length = length

    def __len__(self):
        print('  __len__ called')
        return self._length

    def __bool__(self):
        print('  __bool__ called')
        return self._length > 0

print(bool(MyList(0)))
print(bool(MyList(100)))
```

`__bool__` is the natural choice for objects that don't have a length. Say the origin of a 2-D plane should be falsy and every other point truthy:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __bool__(self):
        return self.x != 0 or self.y != 0

origin, p = Point(0, 0), Point(1, 1)
print(bool(origin), bool(p))
for pt in (origin, p):
    print(f'({pt.x}, {pt.y}):', 'off the origin' if pt else 'at the origin')
```

## `__bool__` must return a real `bool`

It's tempting to shorten the method to `return self.x or self.y`. That expression is falsy exactly when both coordinates are zero, but remember that `or` returns one of its **operands**, not a `bool`. Python checks the type:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __bool__(self):
        return self.x or self.y          # returns an int, not a bool

p = Point(0, 0)
print(repr(p.__bool__()))
try:
    bool(p)
except TypeError as ex:
    print('TypeError:', ex)
```

Wrap the expression in `bool(...)` if you like the short form: `return bool(self.x or self.y)`. Python is equally strict about the fallback: `__len__` must return an `int` that's `>= 0` (a negative length raises `ValueError`).

## Truthiness vs. `is None`

Once a class can be falsy, `if obj:` and `if obj is not None:` stop meaning the same thing:

```python run
def describe(items=None):
    if not items:                     # also true for an EMPTY collection!
        return 'nothing passed?'
    return f'{len(items)} items'

def describe_fixed(items=None):
    if items is None:
        return 'nothing passed'
    return f'{len(items)} items'

print(describe([]), '|', describe_fixed([]))
print(describe_fixed(MyList(0)))
```

When "missing" and "empty" mean different things, test for `None` explicitly.

<div class="takeaways">

## Key takeaways

- Truth value lookup: `__bool__` first, then `__len__` (zero means false), otherwise always true.
- Implementing `__len__` is enough to make a collection behave like the built-ins in an `if`.
- `__bool__` must return an actual `bool`; returning `self.x or self.y` raises `TypeError`, so wrap it in `bool(...)`.
- `if obj:` and `if obj is not None:` differ for objects that can be falsy. Pick the one you mean.

</div>
