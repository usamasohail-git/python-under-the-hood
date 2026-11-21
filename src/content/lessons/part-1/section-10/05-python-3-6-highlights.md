---
title: Python 3.6 Highlights
summary: Python 3.6 introduced ordered dicts, ordered **kwargs, underscores in numbers, f-strings and variable annotations, features that now feel like they were always there.
minutes: 10
---

## Why 3.6 was a big release

Python 3.6 (December 2016) was the release that convinced many people to finally leave Python 2 behind. Several of its features are so convenient that today's code uses them everywhere. This lesson is a quick overview; the next four lessons look at the main ones in detail.

## Dictionaries remember insertion order

CPython 3.6 shipped a new, more compact dictionary implementation, and a side effect of its design was that keys come back in the order they were **inserted**:

```python run
d = {'z': 1, 'a': 2}
d['m'] = 3
list(d)
```

In 3.6 this was officially an *implementation detail* of CPython that other Pythons didn't have to copy. Python 3.7 made it a **language guarantee**, so you can rely on it in any Python 3.7+.

## `**kwargs` keep the order they were passed in

Separately from the dict change, PEP 468 guaranteed that keyword arguments collected into `**kwargs` arrive in the same order the caller wrote them:

```python run
def show(**kwargs):
    return list(kwargs)

show(zebra=1, apple=2, mango=3)
```

That makes it possible to build ordered structures straight from keyword arguments, as you'll see with named tuples.

## Underscores in numeric literals

Long numbers are hard to read. You can now group digits with underscores; Python ignores them:

```python run
print(1_000_000)
print(0x_FFFF_FFFF)
print(1_000_000 == 1000000)
```

## f-strings

Formatted string literals put expressions directly inside the string. Prefix the string with `f` (or `F`) and write expressions in braces, with optional format specifiers after a colon:

```python run
numerator = 10
denominator = 3
f'{numerator}/{denominator} = {numerator / denominator:0.3f}'
```

## Variable annotations

PEP 484 (Python 3.5) introduced type hints for function parameters and return values. Python 3.6 (PEP 526) added the same syntax for **variables**:

```python run
from typing import List

def squares(values: List[int]) -> List[int]:
    return [e ** 2 for e in values]

my_list: List[int] = [1, 2, 3, 4]
my_list, squares(my_list)
```

The key thing to understand is that Python itself **does not check** these hints. They're stored as metadata, and tools such as type checkers (mypy, pyright) and IDEs use them to find bugs *before* you run the code. At run time, nothing stops you from passing a dictionary to a function annotated to take a list:

```python run
d = {1: 'a', 2: 'b', 3: 'c', 4: 'd'}
print(squares(d))          # iterating a dict gives its keys, so this "works"
print(squares.__annotations__)
```

Python remains a dynamically typed language; annotations don't change how your code runs, and they are optional.

<div class="callout modern">
<span class="callout-title">Modern Python: lighter type-hint syntax</span>

Since 3.9 you can write `list[int]` instead of importing `List` from `typing`, and since 3.10 `int | None` instead of `Optional[int]`. Python 3.12 added the `type` statement for aliases (`type Vector = list[float]`) and a compact syntax for generic functions and classes (`def first[T](items: list[T]) -> T:`).

</div>

## And more

3.6 also added `async` generators and asynchronous comprehensions (a topic for later parts), the `secrets` module for cryptographically secure random tokens, and the `__init_subclass__` and `__set_name__` hooks used in metaprogramming. The complete list is on the *What's New in Python 3.6* page.

<div class="takeaways">

## Key takeaways

- Dicts keep insertion order: an implementation detail in CPython 3.6, guaranteed by the language from 3.7.
- `**kwargs` preserve the caller's order (3.6).
- Underscores can group digits in numeric literals.
- f-strings embed expressions and format specs directly in string literals.
- Variable annotations (`x: int = 5`) are metadata for tools; Python doesn't enforce them.

</div>
