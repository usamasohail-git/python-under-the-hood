---
title: Map, Filter, Zip and List Comprehensions
summary: The higher-order functions map and filter apply and select with a function, zip pairs up iterables, and comprehensions often express all three more readably.
minutes: 13
---

## Higher-order functions

A **higher-order function** is a function that takes a function as an argument, returns a function, or both. You've already used one: `sorted(..., key=fn)`. Python has two classic higher-order built-ins inherited from functional programming: `map` and `filter`.

## `map`

`map(func, iterable)` applies `func` to every element of `iterable`:

```python run
def fact(n):
    return 1 if n < 2 else n * fact(n - 1)

map(fact, [1, 2, 3, 4, 5])
```

That didn't give us a list of factorials. `map` returns a **map object**, an *iterator* that computes each result only when it's asked for (this is called **lazy evaluation**). To see the values, iterate over it, or feed it to `list()`:

```python run
l = list(map(fact, [1, 2, 3, 4, 5]))
print(l)
```

Being an iterator has a consequence that surprises many people: you can only go through it **once**.

```python run
m = map(fact, [1, 2, 3])
print(list(m))
print(list(m))    # already exhausted
```

The second `list(m)` is empty, because the iterator has already produced all its values. Iterators and laziness get a whole section of their own in Part 2.

### `map` with several iterables

If the function takes several arguments, pass several iterables. `map` takes one element from each and calls the function with them:

```python run
l1 = [1, 2, 3, 4, 5]
l2 = [10, 20, 30, 40, 50]

list(map(lambda x, y: x + y, l1, l2))
```

If the iterables have different lengths, `map` stops as soon as the **shortest** one runs out.

## `filter`

`filter(func, iterable)` keeps the elements for which `func(element)` is **truthy**, and drops the rest. Like `map`, it returns a lazy iterator.

If you pass `None` instead of a function, `filter` keeps the elements that are truthy themselves:

```python run
l = [0, 1, 2, 3, 4, 5, 6]
for e in filter(None, l):
    print(e, end=' ')
```

`0` is falsy, so it was dropped. To keep only even numbers, pass a predicate (a function that returns true or false):

```python run
def is_even(n):
    return n % 2 == 0

l = [1, 2, 3, 4, 5, 6, 7, 8, 9]
print(list(filter(is_even, l)))
print(list(filter(lambda x: x % 2 == 0, l)))
```

## `zip`

`zip` takes one or more iterables and produces **tuples**, each holding one element from every iterable, position by position:

```python run
l1 = 1, 2, 3
l2 = 'a', 'b', 'c'
print(list(zip(l1, l2)))

l3 = [10, 20, 30]
print(list(zip(l1, l3, 'xyz')))
```

The iterables can be of any type (tuples, lists, strings, ranges). Like `map`, `zip` stops at the **shortest** input:

```python run
list(zip(range(100), 'python'))
```

<div class="callout modern">
<span class="callout-title">`zip(..., strict=True)` (Python 3.10+)</span>

Silently dropping the leftovers can hide bugs when the inputs were supposed to be the same length. Since Python 3.10, `strict=True` makes `zip` raise an error instead. (When you *want* to keep everything, `itertools.zip_longest` pads the shorter inputs with a fill value.)

```python run
try:
    list(zip([1, 2, 3], ['a', 'b'], strict=True))
except ValueError as ex:
    print('ValueError:', ex)
```

</div>

## List comprehensions: the alternative

Python also has dedicated syntax for building lists: the **list comprehension**. Its basic form is:

```python
[expression for item in iterable]
[expression for item in iterable if condition]
```

It evaluates `expression` for every `item`, optionally keeping only those that pass the `if` condition, and collects the results in a new list. Comprehensions are covered in depth later in the series; here's how they replace `map` and `filter`.

### Map with a comprehension

```python run
l = [1, 2, 3, 4, 5]
[fact(i) for i in l]
```

For two iterables, combine the comprehension with `zip`, and **unpack** each tuple into two variables:

```python run
l1 = [1, 2, 3, 4, 5]
l2 = [10, 20, 30, 40, 50]
[i + j for i, j in zip(l1, l2)]
```

### Filter with a comprehension

```python run
l = [1, 2, 3, 4, 5, 6, 7, 8, 9]
[i for i in l if i % 2 == 0]
```

No lambda needed: the condition is written as ordinary code.

## Combining map and filter

Suppose we want the squares of `0..9` that are less than 25. With the functions, we nest the calls, which reads inside-out:

```python run
list(filter(lambda y: y < 25, map(lambda x: x ** 2, range(10))))
```

With a comprehension, the same thing reads left to right:

```python run
[x ** 2 for x in range(10) if x ** 2 < 25]
```

The comprehension computes `x ** 2` twice per element. If that's expensive, the walrus operator (Python 3.8+) can store it: `[y for x in range(10) if (y := x ** 2) < 25]`.

## Which should you use?

Both styles produce the same results, so this is largely about readability:

- If you already have a named function, `map(fact, data)` is short and clear.
- If you'd have to write a lambda, a comprehension is usually easier to read: `[x * 2 for x in data]` beats `list(map(lambda x: x * 2, data))`.
- A list comprehension builds the **whole list** immediately. `map` and `filter` are lazy, which matters for very large or infinite inputs. (Generator expressions, written with parentheses instead of brackets, give you laziness with comprehension syntax. You'll meet them in Part 2.)

<div class="takeaways">

## Key takeaways

- `map(f, it, ...)` applies `f` to each element (or to elements taken in parallel from several iterables); `filter(f, it)` keeps the elements where `f` is truthy, or the truthy elements when `f` is `None`.
- Both return **lazy iterators** that can only be consumed once. Wrap them in `list()` to see all the values.
- `zip` combines iterables into tuples and stops at the shortest; `strict=True` (3.10+) turns a length mismatch into an error.
- List comprehensions (`[expr for x in it if cond]`) can replace `map` and `filter`, and are often easier to read, especially instead of a lambda.

</div>
