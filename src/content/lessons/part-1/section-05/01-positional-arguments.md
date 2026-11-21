---
title: Positional Arguments
summary: Parameters are the names in a function definition, arguments are the values you pass in. Python matches them by position, by name, or with defaults.
minutes: 10
---

## Parameters vs arguments

Two words get mixed up all the time, so let's pin them down first:

- **Parameters** are the names listed in the function *definition*. In `def my_func(a, b):`, `a` and `b` are parameters. They are ordinary variables that are local to the function.
- **Arguments** are the values you supply when you *call* the function. In `my_func(x, y)`, `x` and `y` are the arguments.

In everyday conversation people use the two terms loosely, and nobody will misunderstand you. What really matters is what happens at the moment of the call: each parameter becomes **another name for the argument's object**. Nothing is copied. You already saw this in the section on variables and memory, and it's worth checking once more:

```python run
def my_func(a, b):
    print('inside: a ->', hex(id(a)), ' b ->', hex(id(b)))

x = 10
y = 'a'
print('outside: x ->', hex(id(x)), ' y ->', hex(id(y)))
my_func(x, y)
```

The addresses match. `a` and `x` refer to the same object, and so do `b` and `y`.

## Matching by position

The most common way to assign arguments to parameters is by **position**: the first argument goes to the first parameter, the second to the second, and so on.

```python run
def my_func(a, b, c):
    print(f'a={a}, b={b}, c={c}')

my_func(1, 2, 3)
my_func(3, 2, 1)
```

Swapping the order of the arguments swaps the values the parameters receive. If you pass too few or too many arguments, Python refuses to guess:

```python run
try:
    my_func(1, 2)
except TypeError as ex:
    print('TypeError:', ex)

try:
    my_func(1, 2, 3, 4)
except TypeError as ex:
    print('TypeError:', ex)
```

## Default values make arguments optional

Give a parameter a default value with `=` and the caller may leave that argument out:

```python run
def my_func(a, b=2, c=3):
    print(f'a={a}, b={b}, c={c}')

my_func(10, 20, 30)
my_func(10, 20)
my_func(10)
```

Python still fills parameters from the left. When it runs out of arguments, every remaining parameter falls back to its default. `a` has no default, so it is **required**:

```python run
try:
    my_func()
except TypeError as ex:
    print('TypeError:', ex)
```

### Defaults must come last

Imagine `def fn(a, b=2, c):` and the call `fn(5, 25)`. Should 25 go into `b` or into `c`? There is no sensible answer, so Python forbids the definition altogether: **once a positional parameter has a default, every positional parameter after it needs one too.** This is a syntax rule, so the error appears before the function even exists. (We use `compile` here so that we can catch the error and keep going.)

```python run
try:
    compile('def fn(a, b=2, c): pass', '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

If you don't have a meaningful default for `c`, you can still give it one like `None` and handle that inside the function.

## Keyword (named) arguments

What if you want to pass `a` and `c` but let `b` keep its default? Positions alone can't express that: `my_func(1, 2)` would put 2 into `b`. The answer is to **name** the parameter in the call:

```python run
my_func(1, c=30)          # a by position, c by name, b uses its default
my_func(a=1, c=30)        # everything by name
my_func(c=30, a=1)        # order of keyword arguments doesn't matter
```

Keyword arguments are not only for parameters with defaults. Any ordinary parameter can be passed by name, which can make a call much easier to read:

```python run
def area(width, height):
    return width * height

print(area(3, 4))
print(area(height=4, width=3))
```

`area(height=4, width=3)` documents itself; a reader doesn't need to remember which argument comes first.

### Once you name one, name the rest

In a call, **positional arguments must come before keyword arguments**. After the first keyword argument, Python can no longer be sure which position a bare value was meant for, so it is a syntax error:

```python run
try:
    compile('my_func(10, b=20, 30)', '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

You also can't supply the same parameter twice, once by position and once by name:

```python run
try:
    my_func(10, a=20)
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">Two separate rules</span>

Don't confuse the rule for *definitions* with the rule for *calls*:

- **Definition:** parameters without defaults come before parameters with defaults.
- **Call:** positional arguments come before keyword arguments.

They look similar, and both exist for the same reason (avoiding ambiguity), but they are checked at different places.

</div>

## Positional-only parameters

Sometimes a function author wants the opposite: parameters that can **only** be passed by position. Many built-ins work like this. You can't write `len(obj=[1, 2])`, for example:

```python run
try:
    len(obj=[1, 2])
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Modern Python: the `/` marker (3.8+)</span>

Since Python 3.8 your own functions can declare positional-only parameters too. Everything **before** a `/` in the parameter list can only be passed by position:

```python run
def distance(x, y, /, scale=1):
    return (x ** 2 + y ** 2) ** 0.5 * scale

print(distance(3, 4))
print(distance(3, 4, scale=10))
try:
    distance(x=3, y=4)
except TypeError as ex:
    print('TypeError:', ex)
```

Why would you want that? It keeps the parameter names out of your public API, so you can rename `x` and `y` later without breaking anybody's code. It is also why you'll see a `/` in the help text of many built-ins, such as `divmod(x, y, /)`. Older notebooks predate this syntax, so they never use it.

</div>

<div class="takeaways">

## Key takeaways

- Parameters are the names in the definition; arguments are the values in the call. Each parameter becomes a reference to its argument's object.
- Positional arguments are matched left to right. Parameters with defaults are optional and must come after those without.
- Any parameter can be passed by name (`f(b=2, a=1)`), in any order, but positional arguments must come before keyword arguments in a call.
- Parameters before a `/` (Python 3.8+) are positional-only.

</div>
