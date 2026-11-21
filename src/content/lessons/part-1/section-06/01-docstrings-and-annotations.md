---
title: Docstrings and Annotations
summary: Docstrings and annotations attach documentation and metadata to a function. Python stores them on the function object but never enforces them.
minutes: 12
---

## Asking a function for help

The built-in `help()` displays documentation for almost any object: a module, a class, a method or a function.

```python run
help(len)
```

Where does that text come from? For your own functions, from two places: **docstrings** and **annotations**. Let's start with a function that has neither:

```python run
def my_func(a, b):
    return a * b

help(my_func)
```

All `help` can show is the function's name and parameter list. That isn't much to go on.

## Docstrings

If the **very first statement** in a function body is a string literal on its own (not assigned to anything, not a comment), Python treats it as the function's **documentation string**, or docstring. The convention for docstrings is described in PEP 257.

```python run
def my_func(a, b):
    'Returns the product of a and b'
    return a * b

help(my_func)
```

Any string delimiter works, but the convention is to always use triple double quotes, even for a one-liner. It makes docstrings easy to spot, and you can later grow the docstring to several lines without changing the quotes:

```python run
def fact(n):
    """Calculates n! (factorial function)

    Inputs:
        n: non-negative integer
    Returns:
        the factorial of n
    """
    if n < 0:
        """Note that this is not part of the docstring!"""
        return 1
    else:
        return n * fact(n - 1)

help(fact)
```

Only the *first* statement counts. The string inside the `if` block is just an expression statement that evaluates a string and throws it away.

A docstring is not a comment. Comments are discarded by the compiler; a docstring is compiled into the function and stored on the function object, in its `__doc__` attribute. `help()` simply reads that attribute (along with the function's signature) and formats it.

```python run
fact.__doc__
```

```python run
def no_docs():
    pass

print(no_docs.__doc__)
```

A function without a docstring has `__doc__` set to `None`.

<div class="callout modern">
<span class="callout-title">Python 3.13 strips docstring indentation</span>

Look closely at the value of `fact.__doc__` above: the lines start at column 0, even though they were indented inside the function. Since Python 3.13, the compiler removes the common leading whitespace from docstrings (the same clean-up `inspect.cleandoc()` performs). Older versions, and older notebooks, show strings like `'Calculates n!...\n    \n    Inputs:\n        n: ...'`, with all the indentation still in place. Besides looking nicer, this saves memory in large code bases. What `help()` displays is the same either way, because `help` has always cleaned the text up before printing it.

</div>

## Annotations

The second way to document a function is to **annotate** its parameters and its return value (PEP 3107). Put a colon and an expression after a parameter name, and `->` followed by an expression before the final colon of the `def` line:

```python run
def my_func(a: 'annotation for a',
            b: 'annotation for b') -> 'annotation for return':
    return a * b

help(my_func)
```

The return annotation uses `->` because a plain colon already marks the end of the function header.

An annotation can be **any expression**: a string, a type, a list, even a function call. It is evaluated once, when the `def` statement runs, just like a default value:

```python run
x = 3
y = 5

def my_func(a: str) -> 'a repeated ' + str(max(x, y)) + ' times':
    return a * max(x, y)

help(my_func)
```

Notice that the return annotation was computed (`'a repeated 5 times'`). Now see what happens if `x` and `y` change later:

```python run
x, y = 2, 10
print(my_func('a'))           # the body re-reads x and y on every call
print(my_func.__annotations__['return'])   # the annotation was fixed at definition time
```

The body re-evaluates `max(x, y)` on every call, but the annotation still says 5 times. It was evaluated once and stored.

### Where annotations live

Docstrings go in `__doc__`; annotations go in a dictionary called `__annotations__`. Its keys are the parameter names, plus the special key `'return'` for the return annotation:

```python run
def my_func(a: str, b: 'a positive integer') -> str:
    return a * b

my_func.__annotations__
```

The function has no docstring, so its `__doc__` is still `None`. Annotations are stored separately, and `help()` just happens to display both.

### Annotations with defaults, `*args` and `**kwargs`

Every kind of parameter can be annotated. When a parameter also has a default value, the annotation comes first and the default after it:

```python run
def my_func(a: str = 'a', b: int = 1) -> str:
    return a * b

print(my_func())
print(my_func('abc', 3))
help(my_func)
```

```python run
def my_func(a: int = 0, *args: 'additional args', kw: bool = True, **kwargs: 'extra options'):
    print(a, args, kw, kwargs)

my_func.__annotations__
```

## Annotations are not enforced

This is the most important thing to understand about annotations: **Python ignores them when it runs your code.** They do not check, convert or restrict anything:

```python run
def repeat(s: str, n: int) -> str:
    return s * n

print(repeat([1, 2], 3))   # a list, not a str: no complaint
print(repeat(3, 4))        # 3 * 4 is just 12
```

Docstrings and annotations are metadata for **people and tools**. `help()` displays them; documentation generators such as Sphinx turn them into reference pages; editors use them for autocompletion; and static type checkers such as mypy or Pyright read type annotations to warn you about mistakes *before* you run the code. Writing them as you code costs a few seconds and saves your future readers (including you) a lot of guessing.

<div class="callout modern">
<span class="callout-title">From free-form annotations to type hints</span>

Arbitrary strings like `'annotation for a'` are perfectly legal, but modern Python code almost always uses annotations for **type hints** (PEP 484, Python 3.5+): `def f(names: list[str]) -> dict[str, int]:`. Since Python 3.9 you can write `list[str]` with the built-in types, and since 3.10 `int | None` instead of `Optional[int]`. Type hints are still not enforced at run time; they are just a standardized vocabulary for the same metadata.

Two related changes: `inspect.get_annotations(f)` (3.10+) is the recommended way to read annotations, and Python 3.14 evaluates annotations **lazily** (PEP 649), only when something asks for them. On 3.13, which runs here, they are still evaluated when the `def` executes, as you saw above.

</div>

<div class="takeaways">

## Key takeaways

- A string literal as the first statement of a function body is its docstring, stored in `__doc__`.
- Annotations attach any expression to parameters (`a: expr`) and the return value (`-> expr`). They are stored in the `__annotations__` dictionary, with `'return'` as the key for the return annotation.
- Annotations are evaluated once, when the function is defined.
- Neither docstrings nor annotations change how Python runs your code; they exist for `help()`, documentation tools, IDEs and type checkers.
- Python 3.13 strips the common indentation from docstrings at compile time.

</div>
