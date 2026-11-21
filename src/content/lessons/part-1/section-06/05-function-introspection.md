---
title: Function Introspection
summary: Functions are objects with attributes, so code can examine them. The inspect module makes it easy to read a function's signature, source and comments.
minutes: 16
---

## Code that looks at code

**Introspection** means examining objects while the program is running: asking an object what type it is, what attributes it has, what parameters it takes. Because functions are first-class objects, they carry a lot of information about themselves, and Python lets you read it.

```python run
def fact(n: 'some non-negative integer') -> 'n! or 0 if n < 0':
    """Calculates the factorial of a non-negative integer n

    If n is negative, returns 0.
    """
    if n < 0:
        return 0
    elif n <= 1:
        return 1
    else:
        return n * fact(n - 1)
```

## Functions have attributes, including your own

A function object has a `__dict__`, like most objects, so you can attach your own attributes to it:

```python run
fact.short_description = 'factorial function'
print(fact.short_description)
print(fact.__dict__)
```

`dir()` lists all the attributes of an object. Our new attribute is there, along with `__doc__` and `__annotations__` from the previous lesson and many others:

```python run
print(dir(fact))
```

```python run
print(fact.__doc__)
print(fact.__annotations__)
```

Let's look at a few of the others.

## Name, defaults and keyword-only defaults

```python run
def my_func(a, b=2, c=3, *, kw1, kw2=2, **kwargs):
    pass

f = my_func
print(f.__name__)          # the name given in the def statement
print(my_func.__defaults__)
print(my_func.__kwdefaults__)
```

- `__name__` is the name the function was **defined** with. Assigning the function to `f` doesn't change it, so `f.__name__` is still `'my_func'`. This is how code can print the real name of whatever function it was handed.
- `__defaults__` is a **tuple** of the default values of the positional parameters. Notice it holds only `(2, 3)`: parameter `a` has no default and simply isn't represented, so to match defaults with names you have to align them from the right.
- `__kwdefaults__` is a **dictionary** of defaults for keyword-only parameters (`None` if there are none).

## The code object

The compiled body of a function lives in its `__code__` attribute, an object of type `code`:

```python run
def my_func(a, b=1, *args, **kwargs):
    i = 10
    b = min(i, b)
    return a * b

print(my_func('a', 100))
print(type(my_func.__code__))
```

The code object has many `co_` attributes. Two useful ones:

```python run
print(my_func.__code__.co_varnames)
print(my_func.__code__.co_argcount)
```

- `co_varnames` lists the **parameter names first**, then the other local variables (`i`). `b` is reassigned inside the body, but it's still the parameter `b`, so it isn't listed twice.
- `co_argcount` is the number of positional parameters, `2` here. It does **not** count `*args` or `**kwargs` (keyword-only parameters are counted separately in `co_kwonlyargcount`).

You *could* reconstruct a function's signature from these pieces, but it's fiddly: counts that exclude some parameters, a list that mixes in local variables, defaults that must be aligned from the right. There's a much better tool.

## The `inspect` module

The standard library's `inspect` module wraps all this up in a friendly interface. Start with telling functions from methods:

```python run
import inspect

print(inspect.isfunction(my_func))
print(inspect.ismethod(my_func))
```

### Functions vs methods

A **function** is a standalone callable, created with `def` or `lambda`. A **method** is a function that is **bound** to an object: when you access a function through an instance (or, for class methods, through the class), Python creates a method object that remembers what it is bound to and passes it in automatically as the first argument.

```python run
class MyClass:
    def f_instance(self):
        pass

    @classmethod
    def f_class(cls):
        pass

    @staticmethod
    def f_static():
        pass

my_obj = MyClass()

for label, obj in [('MyClass.f_instance', MyClass.f_instance),
                   ('MyClass.f_class', MyClass.f_class),
                   ('MyClass.f_static', MyClass.f_static),
                   ('my_obj.f_instance', my_obj.f_instance),
                   ('my_obj.f_class', my_obj.f_class),
                   ('my_obj.f_static', my_obj.f_static)]:
    print(f'{label:20} function={inspect.isfunction(obj)!s:5}  method={inspect.ismethod(obj)}')
```

- An **instance method** accessed on the **class** is a plain function; accessed on an **instance** it becomes a method bound to that instance.
- A **class method** is bound to the class, whichever way you access it.
- A **static method** is never bound: it's always a plain function.

If you don't care about the difference, `inspect.isroutine()` is true for both:

```python run
print(inspect.isroutine(my_func), inspect.isroutine(my_obj.f_instance), inspect.isroutine(len))
```

Classes, binding and these decorators are covered in depth in the object-oriented part of the series.

### Where was it defined?

`inspect.getmodule()` tells you which module an object came from. Code you run directly (like these cells) lives in the module named `__main__`:

```python run
import math

print(inspect.getmodule(fact).__name__)
print(inspect.getmodule(print))
print(inspect.getmodule(math.sin))
```

### Source code and comments

`inspect.getsource()` returns the source code of a function, and `inspect.getcomments()` returns the block of `#` comments sitting **immediately above** its definition. Both work by reading the source file the function came from. Code typed into a cell has no file on disk, so to try them, let's write a small module to the (in-memory) file system and import it:

```python run
import sys, tempfile, pathlib, importlib

tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / 'mathutils.py').write_text('''\
# setting up variable
i = 10

# TODO: Provide a faster implementation
# (see issue #42)
def fact(n: "some non-negative integer") -> "n! or 0 if n < 0":
    """Calculates the factorial of a non-negative integer n"""
    # comment inside fact
    return 1 if n <= 1 else n * fact(n - 1)
''')
sys.path.insert(0, str(tmp))
importlib.invalidate_caches()

import mathutils
print(inspect.getsource(mathutils.fact))
```

```python run
print(inspect.getcomments(mathutils.fact))
```

Only the two comment lines directly above `def` are returned: not `# setting up variable` (separated by code), and not the comment inside the body. That's how an editor or a build script could collect every `TODO` attached to your functions. Remember that comments are not docstrings: they are not stored on the function object; `getcomments` has to dig them out of the source file.

```python run
try:
    inspect.getsource(fact)    # fact was defined in a cell, not a file
except OSError as ex:
    print('OSError:', ex)
```

## Signatures

The most useful introspection tool is `inspect.signature()`. It returns a `Signature` object describing every parameter:

```python run
# TODO: Provide implementation
def my_func(a: 'a string',
            b: int = 1,
            *args: 'additional positional args',
            kw1: 'first keyword-only arg',
            kw2: 'second keyword-only arg' = 10,
            **kwargs: 'additional keyword-only args') -> str:
    """does something
       or other"""
    pass

sig = inspect.signature(my_func)
print(type(sig))
sig
```

`sig.parameters` is an ordered mapping from parameter names to `Parameter` objects, and `sig.return_annotation` holds the return annotation:

```python run
for name, param in sig.parameters.items():
    print(f'{name:7} kind={param.kind.name:22} default={param.default!r:<28} annotation={param.annotation!r}')

print('returns:', sig.return_annotation)
```

When a parameter has no default or no annotation, the attribute is the special marker `inspect.Parameter.empty` (its repr is `<class 'inspect._empty'>`). Compare with `is`: `param.default is param.empty`.

### Parameter kinds

Every parameter has a `kind`. There are five of them:

| Kind | Example | Meaning |
|---|---|---|
| `POSITIONAL_ONLY` | `a` in `def f(a, /)` | can only be passed by position |
| `POSITIONAL_OR_KEYWORD` | `a` in `def f(a)` | the normal kind |
| `VAR_POSITIONAL` | `*args` | collects extra positional arguments |
| `KEYWORD_ONLY` | `kw` in `def f(*, kw)` | can only be passed by name |
| `VAR_KEYWORD` | `**kwargs` | collects extra keyword arguments |

## Positional-only parameters

Many built-in functions have parameters that **cannot** be passed by keyword. Their documentation marks this with a `/`: everything before the slash is positional-only.

```python run
help(divmod)
```

```python run
print(divmod(10, 3))
try:
    divmod(x=10, y=3)
except TypeError as ex:
    print('TypeError:', ex)
```

`inspect.signature` reports these as `POSITIONAL_ONLY`:

```python run
print([p.kind.name for p in inspect.signature(divmod).parameters.values()])
```

<div class="callout modern">
<span class="callout-title">You can write `/` yourself (Python 3.8+)</span>

Older notebooks say Python has no syntax for positional-only parameters in your own functions. That changed in **Python 3.8** (PEP 570): put a `/` in the parameter list and every parameter before it becomes positional-only.

```python run
def dist(x, y, /, *, squared=False):
    d2 = x ** 2 + y ** 2
    return d2 if squared else d2 ** 0.5

print(dist(3, 4), dist(3, 4, squared=True))
print([p.kind.name for p in inspect.signature(dist).parameters.values()])
try:
    dist(x=3, y=4)
except TypeError as ex:
    print('TypeError:', ex)
```

This is useful when parameter names are an implementation detail you want to be free to rename later.

</div>

<div class="callout modern">
<span class="callout-title">`str.replace` is now properly documented</span>

Older versions showed `help(str.replace)` as `S.replace(old, new[, count])`, hiding the fact that its arguments were positional-only. On 3.13 the signature is shown as `replace(self, old, new, /, count=-1)`, and **`count` can now be passed by keyword** (new in 3.13). `old` and `new` are still positional-only.

```python run
print('a-b-c-d'.replace('-', '+', count=2))
try:
    'abcdefg'.replace(old='abc', new='xyz')
except TypeError as ex:
    print('TypeError:', ex)
```

</div>

## Putting it together

With `signature`, `cleandoc` and `getcomments` we can write a little documentation generator. (`inspect.cleandoc` removes the indentation from a docstring; on 3.13 the compiler already does this, but older versions need it.) `getcomments` returns `None` when it finds no comments (or no source file), so we only print comments when there are some:

```python run
def print_info(f: 'callable') -> None:
    print(f.__name__)
    print('=' * len(f.__name__))
    comments = inspect.getcomments(f)
    if comments:
        print(comments.strip())
    print(inspect.cleandoc(f.__doc__ or ''))
    print('\nInputs')
    print('------')
    sig = inspect.signature(f)
    for param in sig.parameters.values():
        default = '(none)' if param.default is param.empty else repr(param.default)
        print(f'  {param.name}: kind={param.kind.name}, default={default}, annotation={param.annotation!r}')
    print('\nOutput')
    print('------')
    print(' ', sig.return_annotation)

print_info(mathutils.fact)
```

The same function works on the cell-defined `my_func` from earlier. Its `# TODO` comment is skipped because no source file is available, but the signature details still come through:

```python run
print_info(my_func)
```

<div class="takeaways">

## Key takeaways

- Functions are objects: you can attach your own attributes and list all attributes with `dir()`.
- `__name__`, `__defaults__` (tuple, positional), `__kwdefaults__` (dict, keyword-only) and `__code__` (with `co_varnames`, `co_argcount`) describe a function, but they are awkward to use directly.
- `inspect` makes introspection easy: `isfunction`, `ismethod`, `isroutine`, `getmodule`, `getsource`, `getcomments`, and above all `signature`.
- A method is a function bound to an object (an instance, or the class for class methods).
- Parameters have five kinds. Since Python 3.8 you can declare positional-only parameters with `/`.

</div>
