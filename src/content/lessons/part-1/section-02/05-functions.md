---
title: Functions
summary: Built-in and imported functions, defining your own with def and lambda, why annotations aren't enforced, and why every function returns something.
minutes: 11
---

## Functions you already have

Some functions are available everywhere, with no import. They are the **built-ins**, such as `len`, `print`, `sorted` or `max`:

```python run
s = [1, 2, 3]
len(s)
```

Many more live in modules of the standard library. You can import a single name from a module:

```python run
from math import sqrt
sqrt(4)
```

or import the whole module and reach its contents with a dot:

```python run
import math
print(math.exp(1))
print(math.pi)
```

## Defining your own

`def` creates a function: a name, a parenthesized parameter list (possibly empty) and an indented body.

```python run
def func_1():
    print('running func1')

func_1()
```

The parentheses are what **call** (invoke) the function. The bare name, without `()`, just refers to the function object:

```python run
func_1
```

<div class="callout modern">
<span class="callout-title">How a function displays</span>

In a plain Python session (and on this page), a function's repr is `<function func_1 at 0x…>`, including its memory address. Jupyter notebooks may show a shorter form such as `<function __main__.func_1>`. It is the same object either way.

</div>

## Parameters and duck typing

Parameters are just names. Nothing says what type the arguments must be:

```python run
def func_2(a, b):
    return a * b

print(func_2(3, 2))
print(func_2('a', 3))
print(func_2([1, 2, 3], 2))
```

The same code multiplies numbers, repeats a string and repeats a list. Python only cares whether the objects **support the operation** being used, here `*`. This is a form of **polymorphism**, often called *duck typing*: "if it supports `*`, it's good enough". If the objects don't support it, you find out when the line runs:

```python run
try:
    func_2('a', 'b')
except TypeError as ex:
    print('TypeError:', ex)
```

## Type annotations are hints, not checks

You can annotate parameters (and the return value) with types:

```python run
def func_3(a: int, b: int) -> int:
    return a * b

print(func_3(2, 3))
print(func_3('a', 2))
```

`func_3('a', 2)` happily returns `'aa'`. Python does **not** enforce annotations at run time. They are metadata, stored on the function, which editors, linters and type checkers such as mypy use to catch mistakes before the code runs:

```python run
func_3.__annotations__
```

<div class="callout modern">
<span class="callout-title">Modern annotation syntax</span>

Since Python 3.9 you can write `list[int]` and `dict[str, float]` directly, and since 3.10 you can write unions as `int | None` instead of `Optional[int]` from `typing`. Older code imports `List`, `Dict` and `Optional` from `typing`.

</div>

## Functions are objects

A function is an object like any other, so you can assign it to another name and call it through that name:

```python run
my_func = func_3
print(my_func('a', 2))
print(my_func is func_3)
```

Both names refer to the **same** function object. You'll use this constantly later: passing functions as arguments, returning them from other functions, storing them in dictionaries.

## Every function returns something

If a function ends without a `return` statement (or with a bare `return`), Python returns `None` for you:

```python run
def func_4():
    # does something but does not return a value
    a = 2

res = func_4()
print(res)
```

## `def` is executed

`def` isn't a declaration that the compiler reads ahead of time. It's a statement that **runs**: when Python reaches it, it builds a function object and binds it to the name. The *body*, however, isn't executed until the function is called.

So a function may refer to another function that is defined later, as long as that later function exists by the time the call actually happens:

```python run
def fn_1():
    fn_2()        # fn_2 doesn't exist yet, but this line hasn't run yet

def fn_2():
    print('Hello')

fn_1()            # by now both names are defined
```

If you call too early, the name lookup fails at run time:

```python run fresh
def fn_3():
    fn_4()

try:
    fn_3()        # fn_4 hasn't been defined yet
except NameError as ex:
    print('NameError:', ex)

def fn_4():
    print('Hello')
```

## `lambda`: functions without a name

`lambda` also creates a function object, but as an **expression**. It doesn't bind a name; it simply produces the function, which you can assign, pass around or call:

```python run
func_5 = lambda x: x ** 2
print(func_5)
print(func_5(2))
```

The body of a lambda is a single expression, and its value is what the function returns. Lambdas shine as short throwaway functions, for example as a sort key:

```python run
words = ['banana', 'Apple', 'cherry']
sorted(words, key=lambda w: w.lower())
```

If you're assigning a lambda to a name, as in `func_5` above, a regular `def` is usually clearer (and gives the function a proper name in error messages). You'll look at lambdas in detail in the First-Class Functions section.

<div class="takeaways">

## Key takeaways

- `name()` calls a function; `name` alone is the function object.
- Parameters have no fixed type: any object that supports the operations used will work.
- Type annotations are not enforced at run time; they're hints for tools and readers.
- A function without an explicit `return` value returns `None`.
- `def` runs when reached and binds a name; the body runs only when called. `lambda` creates an unnamed function from a single expression.

</div>
