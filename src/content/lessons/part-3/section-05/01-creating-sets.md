---
title: Creating Sets
summary: Build sets from literals, the set() constructor, comprehensions and unpacking, and use them to pull the distinct elements out of any collection.
minutes: 12
---

## What a set is

A **set** is an unordered collection of distinct objects. Under the hood it is a hash table, just like a dictionary, except that each slot stores only a key and no value. That has two direct consequences:

- every element must be **hashable** (so ints, strings, tuples of hashables and frozensets are fine, while lists, dicts and plain sets are not);
- there is no "position" for an element, so sets have no indexing, no slicing and no guaranteed iteration order.

<div class="callout note">
<span class="callout-title">About the printed order</span>

When you print a set, Python has to list the elements in *some* order: the order of the hash table's slots. That order depends on the hash values, the table size and the history of insertions and deletions. Small integers often happen to come out sorted, which makes it easy to believe sets are sorted. They aren't. Throughout this section, cells that need a predictable display use `sorted(...)`, and comparisons use `==`.

</div>

## Set literals

Curly braces with comma-separated elements create a set:

```python run
s = {'a', 100, (1, 2)}
print(type(s), len(s))
```

The obvious way to write an *empty* set doesn't work, because `{}` was taken by dictionaries long before sets got a literal syntax:

```python run
print(type({}))      # an empty dict!
print(type(set()))   # this is the empty set
set()
```

Notice that even Python's own `repr` of an empty set is `set()`, not `{}`.

## The `set()` constructor

`set()` accepts any iterable and collects its elements:

```python run
print(sorted(set([1, 2, 3])))
print(sorted(set(range(10))))
print(sorted(set('python')))   # a string is an iterable of characters
```

Every element must be hashable, so a list of lists fails:

```python run
try:
    set([[1, 2], [3, 4]])
except TypeError as ex:
    print('TypeError:', ex)
```

A dictionary is also an iterable, and iterating over a dictionary yields its **keys**. So `set(d)` quietly gives you the set of keys. Keys are always hashable, so this never fails:

```python run
d = {'a': 1, 'b': 2}
s = set(d)
s == {'a', 'b'}
```

## Set comprehensions

A set comprehension looks like a dictionary comprehension with no `key: value` pair, just an expression:

```python run
squares_mod_10 = {n * n % 10 for n in range(100)}
sorted(squares_mod_10)
```

A hundred squares, but their last digits take only six distinct values, and the set keeps exactly one copy of each. When the expression is just the loop variable (`{c for c in 'python'}`), the comprehension adds nothing over `set('python')`; save comprehensions for when you transform or filter.

## Unpacking with `*`

You can't combine two sets by putting them inside another set literal. `{s1, s2}` asks for a set whose two *elements* are sets, and sets aren't hashable:

```python run
s1 = {'a', 'b', 'c'}
s2 = {10, 20, 30}
try:
    {s1, s2}
except TypeError as ex:
    print('TypeError:', ex)
```

What you want is to **unpack** the elements of both sets into a new one:

```python run
s = {*s1, *s2}
print(len(s), s == {'a', 'b', 'c', 10, 20, 30})
```

Unpacking works into other containers and function calls too, with one caveat: whatever you unpack into receives the elements **in the set's iteration order**, which you don't control.

```python run
def my_func(a, b, c):
    print(a, b, c)

args = {'x', 'y', 'z'}
my_func(*args)   # some arrangement of x, y and z
```

Passing a set to positional parameters is only sensible when the function doesn't care about order, like this averager:

```python run
def averager(*args):
    return sum(args) / len(args)

averager(*{10, 20, 30})
```

## Duplicates disappear

Whatever route you take into a set, repeated elements are dropped:

```python run
print(sorted({'a', 'b', 'c', 'a', 'b', 'c'}))
print(sorted(set('baabaa')))
print(sorted({c for c in 'moomoo'}))
```

Unpacking follows the rules of the *target*. Unpack into a set and duplicates vanish; unpack into a tuple or a list and you keep every element:

```python run
s1 = {10, 20, 30}
s2 = {20, 30, 40}
print(len({*s1, *s2}))   # 4 distinct values
print(len((*s1, *s2)))   # 6 elements, 20 and 30 twice
```

Equality also tells you something. Two sets are equal when they have the same elements, regardless of how they were built or what order you wrote them in:

```python run
{3, 1, 2} == set([1, 2, 3, 3, 3]) == {n for n in range(1, 4)}
```

## Application: distinct elements

The most common everyday use of sets is to find the distinct elements of some collection. Here's a function that scores a string by how much of the 26-letter alphabet it uses:

```python run
def scorer(text):
    alphabet = set('abcdefghijklmnopqrstuvwxyz')
    distinct = set(text.lower())
    effective = distinct & alphabet   # keep only letters (intersection, next lessons)
    return len(effective) / len(alphabet)

print(scorer('baa baa'))                    # only a and b: 2/26
print(scorer('baa baa baa!!! 123'))         # punctuation and digits don't count
print(scorer('The quick brown fox jumps over the lazy dog'))
```

No matter how long the string is, `set(text.lower())` collapses it to at most a few dozen distinct characters, and `&` throws away anything that isn't a letter.

<div class="callout tip">
<span class="callout-title">De-duplicating while keeping order</span>

`set(items)` loses the original order. If you need the distinct elements *in the order they first appeared*, use a dictionary, which keeps insertion order: `list(dict.fromkeys(items))`.

```python run
items = ['b', 'a', 'b', 'c', 'a']
print(list(dict.fromkeys(items)))
```

</div>

<div class="takeaways">

## Key takeaways

- A set is a hash table of distinct, hashable elements with no values and no positions.
- `{}` is an empty **dict**; the empty set is `set()`.
- Create sets with literals, `set(iterable)`, set comprehensions, or `{*a, *b}` unpacking. `set(d)` gives a dictionary's keys.
- Duplicates are discarded automatically; unpacking into a list or tuple keeps them.
- Never rely on the order a set prints or iterates in. Sort it, or compare sets with `==`.

</div>
