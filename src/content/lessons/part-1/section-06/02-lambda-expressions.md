---
title: Lambda Expressions
summary: A lambda is an expression that creates a small, anonymous function object, handy when you need a function for a moment and nowhere else.
minutes: 10
---

## Another way to create a function

You already know the `def` statement: it creates a function object *and* binds it to a name. A **lambda expression** also creates a function object, but it is an *expression*, so it can appear anywhere a value can: as an argument, inside a list, as a dictionary value.

The syntax is:

```python
lambda [parameter list]: expression
```

- `lambda` is the keyword that says "make a function".
- The parameter list is optional and is **not** wrapped in parentheses.
- The colon ends the parameter list.
- The expression after the colon is the body. When the function is called, the expression is evaluated and its value is **returned** automatically. There is no `return` keyword.

```python run
lambda x: x ** 2
```

Evaluating that line produced a function object. Its name is `<lambda>`, which is why lambdas are also called **anonymous functions**: nothing was bound to a name. We never kept a reference to it, so it was immediately discarded.

Some more examples, as static snippets:

```python
lambda x, y: x + y        # two parameters
lambda: 'hello'           # no parameters at all
lambda s: s[::-1].upper() # any single expression
```

## Assigning a lambda to a name

Since a lambda is just an expression that evaluates to a function, you can assign it to a variable and call it:

```python run
func = lambda x: x ** 2
print(type(func))
print(func(3))
```

`func` is a perfectly ordinary function object. The only difference from a `def` function is its name:

```python run
def square(x):
    return x ** 2

print(square.__name__, func.__name__)
```

<div class="callout tip">
<span class="callout-title">Style: don't name your lambdas</span>

PEP 8 recommends `def` whenever you want to give a function a name: `def square(x): return x ** 2` is just as short as `square = lambda x: x ** 2`, and it gets a real `__name__`, which makes tracebacks and debugging output far more helpful. Lambdas shine when the function is used **once, inline**, for example as a sorting key.

</div>

## Parameters work just like `def`

A lambda's parameter list accepts everything a `def` parameter list does: defaults, `*args`, keyword-only parameters and `**kwargs`.

```python run
func_1 = lambda x, y=10: (x, y)
print(func_1(1, 2))
print(func_1(1))
```

```python run
func_2 = lambda x, *args, y, **kwargs: (x, *args, y, {**kwargs})
func_2(1, 'a', 'b', y=100, a=10, b=20)
```

## What a lambda cannot do

The body is a **single expression**, which brings a few limitations:

- **No statements**: no assignments with `=`, no `for` or `while` loops, no `try`, no `return`.
- **No annotations**: there is no place to put `: str` or `-> int` in a lambda.
- **No docstring**: there is no body to put one in.

```python run
try:
    compile('lambda x: y = x + 1', '<example>', 'eval')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

You can still do a surprising amount with expressions alone, such as conditional expressions and calls to other functions:

```python run
sign = lambda n: 'negative' if n < 0 else 'zero' if n == 0 else 'positive'
print(sign(-5), sign(0), sign(7))
```

And yes, a lambda *can* call `print()`, because a function call is an expression. Its return value (`None`) becomes the lambda's return value.

<div class="callout modern">
<span class="callout-title">The walrus operator in a lambda</span>

Python 3.8 added the assignment *expression* `:=`. Because it is an expression, it is allowed in a lambda, e.g. `lambda x: (y := x + 1) * y`. That doesn't make it a good idea: if a lambda needs intermediate variables, it's usually clearer as a `def`.

</div>

## Passing lambdas to other functions

The main reason lambdas exist is to be passed to **higher-order functions**, functions that take other functions as arguments:

```python run
def apply_func(x, fn):
    return fn(x)

print(apply_func(3, lambda x: x ** 2))
print(apply_func(3, lambda x: x ** 3))
```

Using `*args` and `**kwargs`, we can make `apply_func` work with a function of any signature:

```python run
def apply_func(fn, *args, **kwargs):
    return fn(*args, **kwargs)

print(apply_func(lambda x, y: x + y, 1, 2))
print(apply_func(lambda x, *, y: x + y, 1, y=2))
print(apply_func(lambda *args: sum(args), 1, 2, 3, 4, 5))
```

The last call didn't really need a lambda at all. `sum` is already a function that does the job; we just have to pass it the iterable it expects:

```python run
apply_func(sum, (1, 2, 3, 4, 5))
```

And of course `apply_func` doesn't care how its function was created. A `def` function works the same way:

```python run
def multiply(x, y):
    return x * y

print(apply_func(multiply, 'a', 5))
print(apply_func(lambda x, y: x * y, 'a', 5))
```

You'll see lambdas used this way throughout the rest of this section: as keys for `sorted`, with `map` and `filter`, and with `reduce`.

<div class="takeaways">

## Key takeaways

- `lambda params: expression` creates a function object that returns the value of the expression. It is an expression, so it can be written inline.
- Lambdas are anonymous: their `__name__` is `'<lambda>'`.
- The parameter list supports defaults, `*args`, keyword-only parameters and `**kwargs`, but a lambda can't have annotations, a docstring or statements.
- Use lambdas for short, throwaway functions passed to other functions. If you want a named function, use `def`.

</div>
