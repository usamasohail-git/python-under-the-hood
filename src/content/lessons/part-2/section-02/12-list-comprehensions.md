---
title: List Comprehensions
summary: Comprehensions build lists by transforming and filtering iterables. They have their own scope, support nesting, and interact with closures in one famously surprising way.
minutes: 18
---

## From loop to comprehension

A **list comprehension** builds a new list by transforming, and optionally filtering, the items of an iterable. Here's the "build it up with a loop" approach:

```python run
squares = []
for i in range(1, 101):
    squares.append(i ** 2)
squares[:10]
```

and the same thing as a comprehension:

```python run
squares = [i ** 2 for i in range(1, 101)]
squares[:10]
```

Read it left to right as "*the value* `i ** 2`, *for each* `i` *in* `range(1, 101)`". Adding an `if` clause filters which items make it into the result:

```python run
even_squares = [i ** 2 for i in range(1, 101) if i % 2 == 0]
even_squares[:10]
```

Long comprehensions can be split across lines inside the brackets, which often reads better:

```python run
even_squares = [i ** 2
                for i in range(1, 101)
                if i % 2 == 0]
len(even_squares)
```

The general shape is `[expression for target in iterable if condition]`. The comprehension states *what* the list contains, rather than *how* to assemble it step by step, and it's usually a little faster than the equivalent `append` loop too.

## Comprehensions have their own scope

A comprehension behaves like a small function: its loop variable is **local** to the comprehension and doesn't leak into the surrounding scope, even if a variable with the same name already exists there.

```python run
globals().pop('number', None)      # make sure no global `number` exists yet

l = [number ** 2 for number in range(5)]
print(l, 'number' in globals())

number = 100
l = [number ** 2 for number in range(5)]
print(l, number)           # the global number is untouched
```

Names that the comprehension only *reads* are looked up in the enclosing scopes, exactly like a function reading a global or nonlocal variable:

```python run
number = 100
[number * i for i in range(5)]
```

<div class="callout modern">
<span class="callout-title">Python 3.12: inlined comprehensions</span>

Up to Python 3.11, a comprehension really was compiled into a hidden function (shown as `<listcomp>` in the bytecode) that was created and called on the spot. Since 3.12 (PEP 709), CPython **inlines** list, set and dict comprehensions into the surrounding code for speed. The scoping rules didn't change: the loop variable is still isolated, and older notebooks that show `MAKE_FUNCTION` in the disassembly reflect the earlier implementation.

</div>

You can see the inlining for yourself: there's no separate function in the bytecode, only a loop with `LIST_APPEND`:

```python run
import dis
dis.dis(compile('[i ** 2 for i in (1, 2, 3)]', filename='', mode='eval'))
```

## Nested comprehensions

The expression part of a comprehension can itself be a comprehension. A multiplication table is a list of rows, and each row is a list:

```python run
table = [[i * j for j in range(1, 6)]
         for i in range(1, 6)]
table
```

The inner comprehension uses `j` (its own local) and `i` (from the outer comprehension). That's exactly the relationship between a nested function and its enclosing function: the inner one sees the outer one's variables.

Pascal's triangle is a nice example. Row `n` contains the binomial coefficients `C(n, k)` for `k = 0 .. n`:

```python run
from math import comb      # Python 3.8+; before that you'd compute it with factorials

size = 8
pascal = [[comb(n, k) for k in range(n + 1)] for n in range(size + 1)]
for row in pascal:
    print(row)
```

Here the outer comprehension reads the global `size`, creates its own local `n`, and the inner one creates `k` and reads `n` from the enclosing comprehension.

## Multiple `for` clauses

A comprehension can also have several `for` clauses **without** nesting one comprehension inside another. They behave like nested loops, written in the same order you'd write the loops:

```python run
l1 = ['a', 'b', 'c']
l2 = ['x', 'y', 'z']

result = []
for s1 in l1:
    for s2 in l2:
        result.append(s1 + s2)
print(result)

print([s1 + s2 for s1 in l1 for s2 in l2])
```

The difference between the two forms matters: `[[... for j] for i]` produces a list of lists, while `[... for i for j]` produces one flat list.

`if` clauses can refer to any variable bound so far:

```python run
l1 = ['a', 'b', 'c']
l2 = ['b', 'c', 'd']
[s1 + s2 for s1 in l1 for s2 in l2 if s1 != s2]
```

Comprehensions combine nicely with functions that consume iterables. A dot product of two vectors pairs up their components with `zip`, multiplies, and sums:

```python run
v1 = (1, 2, 3, 4, 5, 6)
v2 = (10, 20, 30, 40, 50, 60)

print(sum([a * b for a, b in zip(v1, v2)]))
print(sum(a * b for a, b in zip(v1, v2)))    # no brackets: a generator expression
```

The second form skips building the intermediate list; you'll study generator expressions properly later.

<div class="callout tip">
<span class="callout-title">Readability first</span>

Two `for` clauses and an `if` are usually fine. Beyond that, a comprehension quickly becomes harder to read than the loop it replaced. Recreating `zip` with two `for` clauses and an index check is possible, but simply calling `zip` is far clearer.

</div>

## The closure trap

Suppose we want a list of functions where `funcs[n](x)` returns `x ** n`. A loop seems natural:

```python run
funcs = []
for i in range(6):
    funcs.append(lambda x: x ** i)

print([f(10) for f in funcs])
print(i)
```

Every function returns `10 ** 5`. Why? None of the lambdas stored the value of `i`. Each one contains the *name* `i`, and looks it up **when it's called**. Here `i` is a global, and by the time we call the functions, the loop has finished and left `i` at `5`. Change `i` and every function changes with it:

```python run
i = 2
print([f(10) for f in funcs])
```

A comprehension has exactly the same problem, just one level down. The loop variable is now local to the comprehension, and each lambda is a **closure** over that one shared variable, whose final value is `5`:

```python run
del i                      # remove the global i left over from the loop above

funcs = [lambda x: x ** i for i in range(6)]
print([f(10) for f in funcs])
print('i' in globals())
print(funcs[0].__code__.co_freevars, funcs[0].__closure__[0] is funcs[3].__closure__[0])
```

All six closures share the same cell, as the last line shows.

### Fixing it

To freeze the *current* value of `i` into each function, make it a **default parameter value**. Defaults are evaluated once, when the function is created, which here means once per iteration:

```python run
funcs = [lambda x, power=i: x ** power for i in range(6)]
print([f(10) for f in funcs])
```

This works, but it relies on a subtle rule and adds a parameter callers could accidentally override. A clearer alternative is a small factory function, so each call creates its own scope with its own `power`:

```python run
def make_power(power):
    return lambda x: x ** power

funcs = [make_power(i) for i in range(6)]
print([f(10) for f in funcs])
```

The same square-bracket syntax, with small changes, also builds sets (`{...}`), dictionaries (`{k: v ...}`) and generators (`(...)`), which you'll meet later.

<div class="takeaways">

## Key takeaways

- `[expr for target in iterable if condition]` transforms and filters an iterable into a new list.
- The loop variable is local to the comprehension; other names are looked up in enclosing scopes like a function.
- Since Python 3.12 comprehensions are inlined for speed, but their scoping rules are unchanged.
- Nested comprehensions build lists of lists; multiple `for` clauses act like nested loops and produce a flat list.
- Lambdas created in a loop or comprehension all see the variable's **final** value; bind it with a default argument or a factory function.

</div>
