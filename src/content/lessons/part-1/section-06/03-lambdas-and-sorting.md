---
title: Lambdas and Sorting
summary: The key argument of sorted takes a function that decides what each item is compared by, and lambdas are a natural fit for it.
minutes: 11
---

## `sorted` and the default ordering

The built-in `sorted()` accepts any iterable and returns a **new list** with its items in ascending order. By default, it compares the items themselves using `<`:

```python run
l = ['a', 'B', 'c', 'D']
sorted(l)
```

Upper-case letters come first, because strings are compared character by character using their Unicode code points, and `'B'` (66) is smaller than `'a'` (97):

```python run
print([ord(c) for c in l])
```

What if we want a **case-insensitive** sort?

## The `key` argument

`sorted` has a keyword-only parameter called `key`. You give it a **function of one argument**. `sorted` calls that function once for every item, and then orders the items by the *results* (the sort keys) instead of by the items themselves. The items that end up in the output are still the original ones.

For a case-insensitive sort, compare upper-case versions of the strings:

```python run
sorted(l, key=str.upper)
```

`str.upper` is already a function that takes one string and returns it in upper case, so we can pass it directly. A lambda would work too, but it adds nothing here:

```python run
sorted(l, key=lambda s: s.upper())
```

<div class="callout tip">
<span class="callout-title">Prefer an existing function</span>

When a function that does the job already exists (`str.upper`, `len`, `abs`, `str.casefold`...), pass it directly rather than wrapping it in a lambda. Lambdas are for the cases where no such function exists.

</div>

`sorted` is a **higher-order function**: one of its arguments is itself a function. Notice that we passed `str.upper`, not `str.upper()`. We hand over the function object and let `sorted` call it.

## Sorting a dictionary's keys by value

Iterating over a dictionary produces its **keys**, so sorting a dictionary sorts its keys:

```python run
d = {'def': 300, 'abc': 200, 'ghi': 100}
print(d)
print(sorted(d))
```

To order the keys by their associated **values**, use a key function that looks each key up:

```python run
sorted(d, key=lambda k: d[k])
```

Since the function we need is "look up `k` in `d`", the dictionary's own `get` method also works: `sorted(d, key=d.get)`. And if you want key-value pairs rather than just keys, sort the items, using the second element of each pair as the key:

```python run
sorted(d.items(), key=lambda item: item[1])
```

<div class="callout modern">
<span class="callout-title">Dictionaries keep insertion order</span>

Since Python 3.7, dictionaries are guaranteed to remember the order in which keys were inserted, so `print(d)` above shows `'def'` first. Some notebook front-ends display dictionaries with their keys sorted, which can make it look as if the dictionary itself had been sorted. It hadn't; only the display was.

</div>

## Sorting things that can't be compared

Complex numbers have no natural ordering, so Python refuses to sort them:

```python run
l = [3+3j, 1+1j, 0]
try:
    sorted(l)
except TypeError as ex:
    print('TypeError:', ex)
```

But we can supply our own idea of "size": for example, the squared distance from the origin.

```python run
def dist_sq(x):
    return x.real ** 2 + x.imag ** 2

sorted(l, key=dist_sq)
```

The key values are plain floats, which *can* be compared, so the sort works. If we only need this function once, a lambda saves us from defining it:

```python run
sorted(l, key=lambda x: x.real ** 2 + x.imag ** 2)
```

(The built-in `abs()` returns a complex number's distance from the origin, so `key=abs` would give the same order.)

## Sorting by the last character, and stability

Here is a list of names sorted alphabetically, and then by their **last** character:

```python run
l = ['Cleese', 'Idle', 'Palin', 'Chapman', 'Gilliam', 'Jones']
print(sorted(l))
print(sorted(l, key=lambda s: s[-1]))
```

Look at `'Cleese'` and `'Idle'`. Both end in `'e'`, so their keys are equal. In the output they appear in the same order as in the original list. That is not luck: Python's sort is **stable**, which means items with equal keys always keep their original relative order.

```python run
l = ['Idle', 'Cleese', 'Palin', 'Chapman', 'Gilliam', 'Jones']
sorted(l, key=lambda s: s[-1])
```

Swap the two in the input and they are swapped in the output too. Stability lets you sort by several criteria in successive passes, or, more simply, by returning a **tuple** from the key function. Tuples compare element by element, so the second element breaks ties in the first:

```python run
sorted(l, key=lambda s: (s[-1], s))   # by last letter, then alphabetically
```

## A few more options

- `reverse=True` sorts in descending order (and preserves stability).
- `list.sort()` sorts a list **in place** and returns `None`. It takes the same `key` and `reverse` arguments. `sorted()` works with any iterable and always returns a new list.
- `min()` and `max()` also accept a `key` function.

```python run
words = ['banana', 'fig', 'cherry', 'kiwi']
print(sorted(words, key=len, reverse=True))
print(max(words, key=len), min(words, key=len))

words.sort(key=len)
print(words)
```

`'banana'` and `'cherry'` both have six letters. Thanks to stability, the descending sort keeps them in their original order, and `max` returns the **first** item with the largest key, `'banana'`.

<div class="takeaways">

## Key takeaways

- `sorted(iterable, key=fn)` calls `fn` once per item and orders the items by the returned keys. The output contains the original items.
- Pass an existing function (`str.upper`, `len`, `d.get`) when there is one; use a lambda when there isn't.
- A key function lets you sort things that have no natural order, such as complex numbers.
- Python's sort is stable: items with equal keys keep their original order. Return a tuple from the key to sort by several criteria.

</div>
