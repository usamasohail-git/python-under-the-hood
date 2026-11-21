---
title: Generator Expressions
summary: Swapping a comprehension's square brackets for parentheses gives a lazy generator instead of a list, with the same scoping rules, near-zero setup cost and far lower memory use.
minutes: 18
---

## Brackets vs. parentheses

A list comprehension builds a whole list right away:

```python run
l = [i ** 2 for i in range(5)]
print(type(l), l)
```

Write the same thing with **parentheses** and you get a **generator expression** instead:

```python run
g = (i ** 2 for i in range(5))
print(type(g))
print(g)
```

Nothing has been computed yet. A generator expression is a compact way to write a generator function: values are produced lazily as you iterate, and like every generator it can be consumed only once:

```python run
for item in g:
    print(item)

print('again:', list(g))
```

When a generator expression is the **only** argument to a function call, you can drop its own parentheses. This is the idiomatic way to feed a calculation into `sum`, `max`, `any`, `all`, `''.join` and friends without building a temporary list:

```python run
print(sum(i ** 2 for i in range(5)))
print(max(len(w) for w in ['generators', 'are', 'lazy']))
print(any(n % 7 == 0 for n in range(1, 10)))
```

| | List comprehension | Generator expression |
|---|---|---|
| Syntax | `[expr for x in it]` | `(expr for x in it)` |
| Result | a `list` (iterable, re-usable) | a `generator` (iterator, single-use) |
| Evaluation | eager: all values now | lazy: one value per `next()` |
| Memory | holds every element | holds only its current state |
| Supports `len()`, indexing | yes | no |

## Scope: a generator expression is a function

A generator expression behaves like a small generator function that Python writes for you. It has its own local scope (the loop variable doesn't leak), and its body can read names from enclosing and global scopes.

You can see the hidden function by compiling an expression and looking for code objects among its constants:

```python run
ge = compile('(i ** 2 for i in range(5))', '<string>', 'eval')
lc = compile('[i ** 2 for i in range(5)]', '<string>', 'eval')

print('genexpr:', [c.co_name for c in ge.co_consts if hasattr(c, 'co_name')])
print('listcomp:', [c.co_name for c in lc.co_consts if hasattr(c, 'co_name')])
```

The generator expression is compiled into its own `<genexpr>` code object, which is turned into a function and called to create the generator.

<div class="callout modern">
<span class="callout-title">List comprehensions are inlined since Python 3.12</span>

Older notebooks show a nested `<listcomp>` code object for list comprehensions too, exactly like `<genexpr>`. Since Python 3.12 (PEP 709), list, set and dict comprehensions are **inlined** into the surrounding code for speed, so the `listcomp` line above prints an empty list. The visible behavior is unchanged: the loop variable still doesn't leak out. Generator expressions still get their own function, because they need a frame that can be suspended.

</div>

One detail of that hidden function matters a lot: **only the first (outermost) iterable is evaluated immediately**, when the generator expression is created. Everything else, including the expression on the left and any conditions, is evaluated later, during iteration, by looking names up at that moment.

```python run
n = 3
g = (i * n for i in range(n))   # range(3) is evaluated right now
n = 100                         # ...but n in "i * n" is read later
list(g)
```

`range(n)` was fixed at creation (3 items), but the multiplication used `n = 100`. This is the same late binding you met with closures, and it explains a classic surprise with nested generator expressions.

## Nested generator expressions

Here's a 10×10 multiplication table as a nested list comprehension:

```python run
start, stop = 1, 10
mult_list = [[i * j for j in range(start, stop + 1)]
             for i in range(start, stop + 1)]
mult_list[:3]
```

Swap both pairs of brackets for parentheses and we get a generator of generators:

```python run
mult_gen = ((i * j for j in range(start, stop + 1))
            for i in range(start, stop + 1))
table = list(mult_gen)
print(table[:2])
```

`list()` consumed the *outer* generator, so `table` is a list of ten row generators, none of which has run yet. Materialize the rows:

```python run
[list(row) for row in table][:3]
```

Every row is the 10-times table! Each inner generator expression reads `i` from the outer one's scope (as a free variable, through a closure cell), and reads it **when it runs**. By the time we iterated the rows, the outer generator had finished and `i` was `10`. Only `range(start, stop + 1)`, the inner expression's first iterable, was evaluated when each row was created.

The fix is to consume each row while the outer generator is still positioned on it, which is what a normal nested loop does:

```python run
mult_gen = ((i * j for j in range(start, stop + 1))
            for i in range(start, stop + 1))
[list(row) for row in mult_gen][:3]
```

You can also mix the two styles. With a lazy outer generator and **list** rows, each row is built completely at the moment the outer generator yields it, so the timing problem disappears:

```python run
mult_gen = ([i * j for j in range(start, stop + 1)]
            for i in range(start, stop + 1))
for row in mult_gen:
    print(row)
```

### Pascal's triangle

Each entry of Pascal's triangle is a binomial coefficient, `C(n, k) = n! / (k! (n-k)!)`, with row `n` holding `C(n, 0) … C(n, n)`:

```python run
from math import factorial

def combo(n, k):
    return factorial(n) // (factorial(k) * factorial(n - k))

size = 6
pascal = ((combo(n, k) for k in range(n + 1)) for n in range(size + 1))
for row in pascal:
    print(list(row))
```

The same late-binding rule applies: iterating row by row is fine, but `[list(r) for r in list(pascal)]` would compute every row with the final `n`. (Try it, recreating `pascal` first.)

<div class="callout tip">
<span class="callout-title">`math.comb`</span>

Since Python 3.8, `math.comb(n, k)` computes binomial coefficients directly and much faster than three factorials. We keep `combo` here because it makes the cost of each element visible in the timings below.

</div>

## Timing: lazy setup is (almost) free

Creating a nested list comprehension does all the work up front. Creating a nested generator expression does none of it:

```python run
from timeit import timeit

size = 200
print('list: ', timeit('[[combo(n, k) for k in range(n + 1)] for n in range(size + 1)]',
                       globals=globals(), number=1))
print('gen:  ', timeit('((combo(n, k) for k in range(n + 1)) for n in range(size + 1))',
                       globals=globals(), number=1))
```

The generator expression "wins" by a huge factor, but only because nothing was computed. Even a list comprehension *inside* a generator expression costs nothing until rows are requested, so you can set up an absurdly large triangle instantly:

```python run
size = 100_000
timeit('([combo(n, k) for k in range(n + 1)] for n in range(size + 1))',
       globals=globals(), number=1)
```

What if we consume every element?

```python run
def pascal_list(size):
    l = [[combo(n, k) for k in range(n + 1)] for n in range(size + 1)]
    for row in l:
        for item in row:
            pass

def pascal_gen(size):
    g = ((combo(n, k) for k in range(n + 1)) for n in range(size + 1))
    for row in g:
        for item in row:
            pass

print('list:', timeit('pascal_list(200)', globals=globals(), number=1))
print('gen: ', timeit('pascal_gen(200)', globals=globals(), number=1))
```

Roughly the same: the same values get computed either way. Laziness saves time only when you **don't** need all the values (stop early, take the first few, search until found).

## Memory: the real win

Memory is a different story. The list version keeps the whole triangle alive at once. The generator version holds only the current row's state; each value can be freed as soon as the loop moves on. `tracemalloc` lets us measure the peak memory allocated while each function runs:

```python run
import tracemalloc

for func in (pascal_list, pascal_gen):
    tracemalloc.start()
    func(200)
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f'{func.__name__}: peak {peak:,} bytes')
```

The exact numbers depend on the platform, but the list version needs hundreds of kilobytes while the generator needs about a kilobyte, and that gap grows with the size of the data. This is the same reason you iterate over a file line by line instead of reading it all into memory: with lazy iteration, the size of the data you can process is no longer limited by RAM.

<div class="takeaways">

## Key takeaways

- `(expr for x in iterable)` creates a lazy, single-use generator; `[...]` creates a full list.
- As the sole argument to a call, drop the extra parentheses: `sum(x * x for x in data)`.
- A generator expression is compiled into its own function scope. Only the outermost iterable is evaluated immediately; everything else is looked up during iteration.
- Nested generator expressions read outer loop variables late: consume each inner generator while the outer one is on that item, or make the inner one a list.
- Lazy evaluation makes setup nearly free and saves time when you stop early; if you consume everything, total time is about the same.
- Memory is where generators win decisively: they never hold the whole data set.

</div>
