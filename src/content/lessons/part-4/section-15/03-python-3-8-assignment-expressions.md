---
title: Python 3.8 - Assignment Expressions
summary: The := "walrus" operator assigns a value inside an expression, which removes repeated work in comprehensions, conditions and loops.
minutes: 14
---

## Expressions vs assignments

An **expression** is a piece of code that evaluates to a value:

```python run
print(1 + 2)
print([1, 2, 3] + [4, 5, 6])
print("  python  ".strip().upper())
```

An **assignment statement** binds the value of an expression to a name. It is a *statement*, so it has no value of its own and can't be used inside a larger expression:

```python run
a = 1 + 2
c = "  python  ".strip().upper()
print(a, c)
```

Python 3.8 (PEP 572) added **assignment expressions**: the `:=` operator assigns a value to a name *and* evaluates to that value, so it can appear inside an expression. It is nicknamed the **walrus operator** because `:=` looks a bit like a walrus lying on its side.

## The basics

```python run
(x := 1 + 2)
```

The expression evaluated to `3`, and as a side effect `x` now refers to `3`:

```python run
x
```

At the top level of a statement the parentheses are required. A bare `x := 1 + 2` is a syntax error, which deliberately stops people from using `:=` where a plain `=` would do:

```python run
try:
    compile("x := 1 + 2", "<demo>", "exec")
except SyntaxError as ex:
    print("SyntaxError:", ex.msg)
```

You can even combine both forms. Here `x` is assigned inside the expression, and the expression's value is then assigned to `a`:

```python run
a = (x := 10 + 20)
a, x
```

Both names end up referring to the **same object**, which matters when the object is mutable:

```python run
l1 = (l2 := [1, 2] + [3, 4])
print(l1 is l2)
l2.append(5)
print(l1)
```

Nothing new there: it's an ordinary shared reference, just created in an unusual place.

## Why it's useful: avoid computing things twice

Here's a function we'll pretend is expensive (think of a database query or a network call). Instead of slowing the page down with `sleep`, it counts how many times it was called:

```python run
import math

calls = 0

def slow_function(x, y):
    global calls
    calls += 1
    return round(math.sqrt(x ** 2 + y ** 2))
```

We want the even results for `i` from 0 to 9. The obvious comprehension calls the function **twice** for every kept value, once to test it and once to store it:

```python run
calls = 0
even_results = [
    slow_function(i, i)
    for i in range(10)
    if slow_function(i, i) % 2 == 0
]
print(even_results, "calls:", calls)
```

A loop with a temporary variable avoids the repeat, but now we're back to building a list by hand:

```python run
calls = 0
even_results = []
for i in range(10):
    result = slow_function(i, i)
    if result % 2 == 0:
        even_results.append(result)
print(even_results, "calls:", calls)
```

With `:=` we can keep the comprehension and call the function once per `i`:

```python run
calls = 0
even_results = [
    result
    for i in range(10)
    if (result := slow_function(i, i)) % 2 == 0
]
print(even_results, "calls:", calls)
```

<div class="callout note">
<span class="callout-title">Why the walrus goes in the if clause</span>

For each item, a comprehension evaluates the `if` condition **first**, and only then the output expression. So the assignment has to happen in the condition. If you put `(result := ...)` in the output expression and test `result` in the `if`, the very first test runs before `result` exists:

```python run
try:
    del result
    [(result := slow_function(i, i)) for i in range(10) if result % 2 == 0]
except NameError as ex:
    print("NameError:", ex)
```

</div>

Memoization (`functools.lru_cache`) is another way to avoid repeated calls, but only for **deterministic** functions, ones that always return the same result for the same arguments. A function that reads a live price or the current time isn't deterministic, so caching would return stale data. The walrus approach works for any function.

### A scoping detail

A name assigned with `:=` inside a comprehension is bound in the **enclosing** scope, not in the comprehension's own scope. So unlike the loop variable, it is still there afterwards:

```python run
values = [y for n in range(5) if (y := n * n) > 3]
print(values, y)
```

This is intentional: it lets you capture, for example, the first item that matched in an `any()` check. One consequence is that `:=` can't rebind the comprehension's own loop variable:

```python run
try:
    compile("[i := 0 for i in range(3)]", "<demo>", "exec")
except SyntaxError as ex:
    print("SyntaxError:", ex.msg)
```

## Tidier loops and conditions

A generator that yields `n` attempts' worth of even random numbers:

```python run
import random

def even_random(n):
    cnt = 0
    while cnt < n:
        cnt += 1
        number = random.randint(0, 10)
        if number % 2 == 0:
            yield number

random.seed(0)
list(even_random(8))
```

The counter update and the random draw can move into the conditions that use them:

```python run
def even_random(n):
    cnt = 0
    while (cnt := cnt + 1) <= n:
        if (number := random.randint(0, 10)) % 2 == 0:
            yield number

random.seed(0)
list(even_random(8))
```

Same output, fewer lines. Whether it's *clearer* is a judgment call. Use the walrus when it removes duplication or a throwaway variable, not just to squeeze code onto one line.

### Read until a condition fails

A classic use is a `while` loop that has to fetch a value before it can test it. This generator produces lists of random lengths:

```python run
def gen():
    while True:
        yield list(range(random.randint(0, 10)))

random.seed(8)
my_gen = gen()
for _ in range(5):
    print(next(my_gen))
```

We want to process lists until we hit one with two or fewer items. Without `:=`, we need an infinite loop and a `break`:

```python run
random.seed(8)
my_gen = gen()
while True:
    lst = next(my_gen)
    if len(lst) <= 2:
        break
    print(lst)
```

With `:=`, fetching and testing happen in the loop header:

```python run
random.seed(8)
my_gen = gen()
while len(lst := next(my_gen)) > 2:
    print(lst)
```

The same shape appears in real code, for example `while chunk := f.read(8192):` to read a file block by block, or `if m := re.match(pattern, text):` to test and use a regex match.

```python run
import re

for text in ["id=42", "no id here"]:
    if m := re.search(r"id=(\d+)", text):
        print("found", m.group(1))
    else:
        print("nothing in", repr(text))
```

<div class="takeaways">

## Key takeaways

- `name := expr` assigns **and** evaluates to the value, so it can be used inside a larger expression (Python 3.8+).
- A bare walrus at statement level needs parentheses; use `=` there instead.
- Its main job is to avoid computing something twice, in comprehensions (put it in the `if`), `while` headers and `if` tests.
- In a comprehension, the walrus target is bound in the enclosing scope and survives the comprehension.
- Prefer clarity: don't use `:=` just to make code shorter.

</div>
