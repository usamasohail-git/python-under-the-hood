---
title: Keyword Arguments
summary: Parameters placed after *args or a bare * are keyword-only. Use them to force callers to name important options.
minutes: 10
---

## Named arguments are usually optional

So far, passing an argument by name has been the caller's choice. With `def func1(a, b, c)`, all three of these calls do the same thing:

```python run
def func1(a, b, c):
    print(a, b, c)

func1(10, 20, 30)
func1(b=20, c=30, a=10)
func1(10, c=30, b=20)
```

Sometimes the function author wants to make that choice instead. Consider a flag like `reverse` or `ignore_case`. In a call such as `sort_words(words, True)`, it's anyone's guess what `True` means; `sort_words(words, reverse=True)` is clear. We can **require** callers to write the name.

## Keyword-only parameters after `*args`

The trick follows directly from the last lesson: `*args` swallows every remaining positional argument. So any parameter declared **after** it can never receive a value by position. The only way to fill it is by name. Such a parameter is called **keyword-only**:

```python run
def func2(a, b, *args, d):
    print(a, b, args, d)

func2(10, 20, 'x', 'y', d=100)
func2(10, 20, d=100)
try:
    func2(10, 20, 'x', 'y', 100)
except TypeError as ex:
    print('TypeError:', ex)
```

You can even have no regular positional parameters at all, only extra positionals plus a keyword-only parameter:

```python run
def func3(*args, d):
    print(args, d)

func3(1, 2, 3, d='hello')
func3(d='hello')
try:
    func3()
except TypeError as ex:
    print('TypeError:', ex)
```

`d` has no default, so it's a required keyword-only argument. Give it a default and it becomes optional:

```python run
def func4(*args, d='n/a'):
    print(args, d)

func4(1, 2, 3)
func4()
```

## The bare `*`: keyword-only without extra positionals

What if you want keyword-only parameters but **no** extra positional arguments? Writing `*args` and then ignoring it would silently accept junk. Instead, write a bare `*`. It marks the end of the positional parameters without collecting anything:

```python run
def func5(a, b, *, verbose=False):
    print(a, b, verbose)

func5(1, 2)
func5(1, 2, verbose=True)
try:
    func5(1, 2, True)
except TypeError as ex:
    print('TypeError:', ex)
```

The error tells the caller exactly what went wrong. A bare `*` must be followed by at least one named parameter; `def f(a, *):` is a syntax error, because the marker wouldn't mean anything.

If the keyword-only parameters have no defaults, callers are forced to name every one of them:

```python run
def make_point(*, x, y):
    return (x, y)

print(make_point(x=1, y=2))
print(make_point(y=2, x=1))
try:
    make_point(1, 2)
except TypeError as ex:
    print('TypeError:', ex)
```

## Defaults can go in any order

Remember the rule that positional parameters with defaults must come after those without? It exists to keep positional matching unambiguous. Keyword-only parameters are always matched by name, so the rule doesn't apply to them. A required keyword-only parameter may follow an optional one:

```python run
def func6(a, *, b='hello', c):
    print(a, b, c)

func6(5, c='bye')
func6(5, c='bye', b='hi')
```

## Mixing everything we have so far

A signature can now have four kinds of parameters, always in this order: positional without defaults, positional with defaults, `*args`, then keyword-only parameters (with or without defaults, in any order):

```python run
def func7(a, b=20, *args, d=0, e='n/a'):
    print(a, b, args, d, e)

func7(5, 4, 3, 2, 1, d=0, e='all engines running')
func7(0, 600, d='good morning', e='python!')
func7(11, 'm/s', 24, 'mph', d='unladen', e='swallow')
```

<div class="callout modern">
<span class="callout-title">Modern Python: positional-only, normal and keyword-only together (3.8+)</span>

With the `/` marker you can now control every parameter from both sides: parameters before `/` are positional-only, those after `*` are keyword-only, and those in between can be passed either way.

```python run
def describe(value, /, unit='m', *, precision=2):
    return f'{value:.{precision}f} {unit}'

print(describe(3.14159))
print(describe(3.14159, 'km', precision=1))
print(describe(3.14159, unit='cm'))
try:
    describe(value=1.0)
except TypeError as ex:
    print('TypeError:', ex)
```

The `inspect` module reports what kind each parameter is:

```python run
import inspect
for name, p in inspect.signature(describe).parameters.items():
    print(f'{name:10} {p.kind.name}')
```

</div>

<div class="takeaways">

## Key takeaways

- Any parameter after `*args` or a bare `*` is keyword-only: it can be set only by name.
- Keyword-only parameters without defaults are required; with defaults they are optional.
- Keyword-only parameters with and without defaults can appear in any order.
- Use keyword-only parameters for flags and options so calls stay readable.

</div>
