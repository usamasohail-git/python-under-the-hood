---
title: Unpacking Iterables
summary: Split any iterable into separate variables in one assignment, swap variables without a temporary, and see why this mirrors how arguments are passed.
minutes: 10
---

## A side note on tuples: it's the comma

Before we unpack anything, one detail about tuples that trips up a lot of people. What makes a tuple is **the comma**, not the parentheses:

```python run
a = (1, 2, 3)
b = 1, 2, 3
print(type(a), type(b))
```

The parentheses are only there for clarity (and for grouping, when the tuple is part of a bigger expression). That's why a "one-element tuple" written with parentheses alone is just a number in brackets:

```python run
print(type((1)))     # just the int 1, like (1 + 0)
print(type((1,)))    # the comma makes it a tuple
print(type(1,))      # careful: here the comma separates function arguments!
x = 1,
print(type(x), x)
```

It has to work this way, otherwise you couldn't use parentheses to group arithmetic like `(1 + 2) * 3`. The one exception is the empty tuple: `()` on its own (or `tuple()`) is unambiguous, so it is allowed.

```python run
print(type(()), type(tuple()))
```

## Packed values and unpacking

Any **iterable** can be thought of as a bundle of "packed" values: a list or tuple of items, a string of characters, a set of elements, the keys of a dictionary. **Unpacking** splits such a bundle into separate variables in one go. On the left you write a tuple (or list) of names; on the right, any iterable with the same number of items:

```python run
a, b, c, d = [1, 2, 3, 4]
print(a, b, c, d)

a, b, c = 'XYZ'
print(a, b, c)

a, b, c = 10, 20, 'hello'   # the right side is a tuple, too
print(a, b, c)
```

The assignment is **positional**: the first name receives the first item the iterable produces, the second name the second item, and so on. If you think "that sounds just like calling a function", you're exactly right. When you call `f(10, 20, 30)` with `def f(a, b, c)`, Python matches the arguments to the parameters in the same way. Much of this section builds on that similarity.

The counts must match, otherwise Python raises a `ValueError`:

```python run
try:
    a, b = [1, 2, 3]
except ValueError as ex:
    print('ValueError:', ex)

try:
    a, b, c = 'XY'
except ValueError as ex:
    print('ValueError:', ex)
```

## Swapping two variables

A classic use of unpacking is swapping two variables. In many languages you need a temporary variable:

```python run
a, b = 10, 20
tmp = a
a = b
b = tmp
print(a, b)
```

In Python, one line does it:

```python run
a, b = 10, 20
a, b = b, a
print(a, b)
```

Why doesn't this get tangled up? Because Python **evaluates the entire right-hand side first**. `b, a` builds a brand-new tuple holding references to the objects 20 and 10. Only then are the names on the left re-bound, one by one, to the items of that tuple. By that point the original values of `a` and `b` no longer matter; the tuple already holds what we need.

```python run
a, b = 10, 20
print('before:', hex(id(a)), hex(id(b)))
a, b = b, a
print('after: ', hex(id(a)), hex(id(b)))
```

The objects never moved. Only the names were pointed at the other object.

<div class="callout tip">
<span class="callout-title">Keep it readable</span>

`a, b = 10, 20` is a perfectly normal way to initialize a couple of related variables. But if a parallel assignment starts to sprawl across many names and long expressions, split it into separate lines. Being clever isn't worth making your code harder to read.

</div>

## Unpacking in `for` loops

Unpacking also happens in the target of a `for` loop, and that's where you'll use it most:

```python run
points = [(0, 0), (1, 2), (3, 5)]
for x, y in points:
    print(f'x={x}, y={y}')

for i, letter in enumerate('abc'):
    print(i, letter)
```

## Dictionaries and sets

Iterating over a dictionary yields its **keys**, so unpacking a dictionary unpacks its keys too, not the key/value pairs:

```python run
d = {'p': 1, 'y': 2, 't': 3}
a, b, c = d
print(a, b, c)

(k1, v1), (k2, v2), (k3, v3) = d.items()   # .items() gives (key, value) pairs
print(k1, v1, k3, v3)
```

<div class="callout modern">
<span class="callout-title">Modern Python: dictionaries keep insertion order (3.7+)</span>

Older notebooks warn that the order of a dictionary is not guaranteed. That used to be true. Since Python 3.7 it is a **language guarantee** that dictionaries remember the order in which keys were inserted, so the unpacking above always gives `'p'`, `'y'`, `'t'`. You no longer need an `OrderedDict` just to keep insertion order.

</div>

**Sets** are different: they really have no defined order. You can unpack them, and you'll get *some* order, but you can't rely on it. It depends on the hash values of the elements and the set's internal layout:

```python run
s = {'p', 'y', 't', 'h', 'o', 'n'}
print(s)
a, b, c, d, e, f = s
print(a, b, c, d, e, f)
```

The order you see may differ from the order the letters were typed, and it can even change between runs (string hashes are randomized each time Python starts). So unpacking a set into individually named variables is rarely useful. As you'll see in the next lesson, unpacking sets *into other containers* is a different story.

<div class="takeaways">

## Key takeaways

- The comma creates a tuple; parentheses only group. `(1,)` is a tuple, `(1)` is an int.
- `a, b, c = iterable` assigns items by position; the counts must match or you get a `ValueError`.
- The right-hand side is evaluated completely before any names are bound, which is why `a, b = b, a` swaps safely.
- Unpacking a dict unpacks its keys (in insertion order since 3.7). Sets have no reliable order.

</div>
