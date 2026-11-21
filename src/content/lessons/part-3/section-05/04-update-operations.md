---
title: Update Operations
summary: The in-place versions of union, intersection, difference and symmetric difference, which mutate a set instead of building a new one.
minutes: 12
---

## New set, or the same set changed?

You can't "update" an element of a set in the way you update a list item: there's no position to assign to. An element is either in the set or not, so the only changes are adding and removing. (A dictionary is similar: you can change the *value* stored under a key, but never the key itself, and a set is basically a dictionary with keys only.)

What you *can* do is change a set by combining it with others. The operations from the previous lesson always build a **new** set. Assigning the result back to the same name just re-binds the name:

```python run
s1 = {1, 2, 3}
s2 = {2, 3, 4}
before = id(s1)
s1 = s1 & s2
print(s1, id(s1) == before)
```

Different object. Any other name that referred to the original set still sees `{1, 2, 3}`. Often that's fine, but sometimes you really want to **mutate** the existing set, for example because a function received it as an argument and is supposed to modify it. For that, each operation has an in-place form:

| Operation | Augmented operator | Method |
|---|---|---|
| union | `s1 \|= s2` | `s1.update(s2, ...)` |
| intersection | `s1 &= s2` | `s1.intersection_update(s2, ...)` |
| difference | `s1 -= s2` | `s1.difference_update(s2, ...)` |
| symmetric difference | `s1 ^= s2` | `s1.symmetric_difference_update(s2)` |

All of them change `s1` in place and return `None` (the methods) or leave the name bound to the same object (the operators).

## Seeing the mutation

A small helper makes the identity check easy to read:

```python run
def show(label, s, original_id):
    same = 'same object' if id(s) == original_id else 'NEW object'
    print(f'{label:<22} {sorted(s)}  ({same})')

s1 = {1, 2, 3}; i = id(s1)
s1 |= {4, 5, 6}
show('|= union', s1, i)

s1 = {1, 2, 3}; i = id(s1)
s1.update({4, 5, 6})
show('update()', s1, i)

s1 = {1, 2, 3}; i = id(s1)
s1 &= {2, 3, 4}
show('&= intersection', s1, i)

s1 = {1, 2, 3, 4}; i = id(s1)
s1 -= {2, 3}
show('-= difference', s1, i)

s1 = {1, 2, 3, 4, 5}; i = id(s1)
s1 ^= {4, 5, 6, 7}
show('^= symmetric diff', s1, i)
```

Every line says "same object": the set was mutated, not replaced.

The difference matters as soon as there's a second reference:

```python run
a = {1, 2, 3}
alias = a
a = a | {99}       # new set: alias doesn't see it
print(sorted(alias))

a = {1, 2, 3}
alias = a
a |= {99}          # same set mutated: alias sees it
print(sorted(alias))
```

## Careful with multiple sets in a difference

`difference_update` accepts several arguments and removes the elements of **all** of them. That's not the same as `-=` with a compound right-hand side, because difference isn't associative. The augmented operator always evaluates the entire right-hand side first:

```python run
s1 = {1, 2, 3, 4}
s2 = {2, 3}
s3 = {3, 4}

print(sorted(s1 - (s2 - s3)))   # what  s1 -= s2 - s3  computes
print(sorted((s1 - s2) - s3))   # what  s1.difference_update(s2, s3)  computes

a = set(s1); a -= s2 - s3
b = set(s1); b.difference_update(s2, s3)
print(sorted(a), sorted(b))
```

`s2 - s3` is `{2}`, so the first version only removes `2`. The method removes everything in `s2` *and* everything in `s3`, leaving `{1}`. If you want the method's meaning with operators, write `s1 -= s2 | s3`.

## Why have methods as well as operators?

Same reason as last lesson: the methods accept **any iterables** (of hashable elements), and several at once. The operators insist on sets:

```python run
s1 = {1, 2, 3}
s1.update([3, 4, 5], (6, 7, 8), 'abc')
print(sorted(s1, key=str))

try:
    s1 |= [9, 10]
except TypeError as ex:
    print('TypeError:', ex)
```

With operators you'd have to convert each piece yourself: `s1 |= set([3, 4, 5]) | set((6, 7, 8)) | set('abc')`. That works, but builds several temporary sets along the way.

This mirrors lists: `my_list.extend(any_iterable)` is happy with a tuple, but `my_list + a_tuple` is a `TypeError`. (One quirk: `my_list += a_tuple` works for lists, because list `+=` is implemented as `extend`. For sets, `|=` stays strict.)

## Where mutation is useful

### Collecting words from several sources

Here a function adds words to a set the caller owns, and another removes filler words from it. Neither returns anything; they work purely by mutating the argument:

```python run
def combine(text, target):
    target.update(text.split())

def cleanup(words):
    words -= {'the', 'and', 'a', 'or', 'is', 'of'}   # mutates the caller's set

result = set()
combine('lumberjacks sleep all night', result)
combine('the mystery of silly walks', result)
combine('this parrot is a late parrot', result)
cleanup(result)
sorted(result)
```

Notice that `cleanup` works only because `-=` mutates. If it said `words = words - {...}`, it would re-bind its local name and the caller's set would be unchanged.

### Filtering paged data

A more realistic example: a data source (an API or a database cursor) hands you results one page at a time. You want the distinct cities across every page, minus some you don't care about. A generator stands in for the data source:

```python run
def read_pages():
    yield ['Paris', 'Beijing', 'New York', 'London', 'Madrid', 'Mumbai']
    yield ['Hyderabad', 'New York', 'Milan', 'Phoenix', 'Berlin', 'Cairo']
    yield ['Stockholm', 'Cairo', 'Paris', 'Barcelona', 'San Francisco']

def filter_incoming(*cities, data_set):
    data_set.difference_update(cities)

result = set()
for page in read_pages():
    result.update(page)
    filter_incoming('Paris', 'London', data_set=result)

sorted(result)
```

`update` takes the page list directly (no conversion), duplicates such as `'New York'` and `'Cairo'` collapse automatically, and `difference_update` takes the tuple of ignored cities as-is.

<div class="takeaways">

## Key takeaways

- `a = a & b` builds a new set and re-binds `a`; `a &= b` mutates the existing set. The same goes for `|`, `-` and `^`.
- The in-place methods are `update`, `intersection_update`, `difference_update` and `symmetric_difference_update`.
- `s1 -= s2 - s3` is **not** `s1.difference_update(s2, s3)`; the latter equals `s1 -= s2 | s3`.
- The methods accept any iterables (several at once for all but the symmetric difference); the augmented operators need sets.
- Mutate when other code holds a reference to the set and should see the change, such as a set passed into a function.

</div>
