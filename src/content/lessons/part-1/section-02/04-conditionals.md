---
title: Conditionals
summary: Branching with if, elif and else, the conditional expression X if cond else Y, and a first look at match.
minutes: 9
---

## Branching with `if` / `else`

A **conditional** lets your program choose which block of code to run, depending on whether a condition holds:

```python run
a = 2
if a < 3:
    print('a < 3')
else:
    print('a >= 3')
```

The condition doesn't have to be a `bool`. Python tests its **truthiness**: `0`, `0.0`, `''`, `[]`, `{}`, `None` and other "empty" values count as false, and almost everything else counts as true.

```python run
for value in [0, 42, '', 'hi', [], [0], None]:
    if value:
        print(repr(value), '-> truthy')
    else:
        print(repr(value), '-> falsy')
```

(You'll study truthiness, and how a class can control it, in the section on numeric types.)

## Nesting vs `elif`

`if` statements can be nested inside each other:

```python run
a = 15

if a < 5:
    print('a < 5')
else:
    if a < 10:
        print('5 <= a < 10')
    else:
        print('a >= 10')
```

That works, but every extra case adds another level of indentation. `elif` ("else if") flattens the chain so all the cases line up:

```python run
a = 15
if a < 5:
    print('a < 5')
elif a < 10:
    print('5 <= a < 10')
else:
    print('a >= 10')
```

Python checks the conditions **top to bottom** and runs only the **first** block whose condition is true. That's why the second test can be just `a < 10`: if we reach it, we already know `a >= 5`.

<div class="callout tip">
<span class="callout-title">Chained comparisons</span>

Python lets you write range checks the way you'd write them in math. `5 <= a < 10` means `5 <= a and a < 10`, with `a` evaluated only once.

```python run
a = 7
print(5 <= a < 10)
```

</div>

## The conditional expression

`if` is a **statement**: it controls which code runs, but it doesn't produce a value. Sometimes you just want to pick one of two values. For that, Python has a **conditional expression** (often called the ternary operator):

```python
X if condition else Y
```

It evaluates to `X` when `condition` is truthy, otherwise to `Y`.

```python run
a = 5
res = 'a < 10' if a < 10 else 'a >= 10'
print(res)

a = 15
res = 'a < 10' if a < 10 else 'a >= 10'
print(res)
```

Note the order: the condition is in the *middle*, unlike the `cond ? X : Y` form of C or JavaScript.

`X` and `Y` can be any expressions, including function calls. Only the chosen branch is **evaluated**; the other one never runs:

```python run
def say_hello():
    print('Hello!')
    return 'hello'

def say_goodbye():
    print('Goodbye!')
    return 'goodbye'

a = 5
result = say_hello() if a < 10 else say_goodbye()
print('result:', result)
```

Only `Hello!` was printed: `say_goodbye()` was never called. This matters when a branch is expensive, has side effects, or would fail:

```python run
items = []
first = items[0] if items else None   # items[0] would raise IndexError
print(first)
```

Use the conditional expression for short "pick a value" decisions. If you find yourself nesting them, an `if`/`elif` statement is usually easier to read.

## `match` (Python 3.10+)

For a long time, `if`/`elif` chains were Python's closest equivalent to the `switch`/`case` statement found in other languages. Python 3.10 added **structural pattern matching** with `match`/`case`:

```python run
def describe(command):
    match command:
        case 'start' | 'go':
            return 'starting'
        case 'stop':
            return 'stopping'
        case _:
            return f'unknown command {command!r}'

for c in ['go', 'stop', 'jump']:
    print(c, '->', describe(c))
```

`|` combines alternatives, and `_` is a wildcard that matches anything. `match` can do much more than compare constants: it can unpack sequences and check the shape of objects. For a simple value lookup, though, a plain `if`/`elif` chain or a dictionary is often all you need.

<div class="callout modern">
<span class="callout-title">New in Python 3.10</span>

`match` doesn't exist in Python 3.9 or earlier, so older code (and older notebooks) always use `if`/`elif`. Unlike `switch` in C, there's no fall-through between cases: exactly one `case` block runs, the first one that matches.

</div>

<div class="takeaways">

## Key takeaways

- `if` / `elif` / `else` runs the block of the **first** condition that is truthy; `elif` avoids deep nesting.
- Conditions use truthiness: empty and zero values are falsy.
- `X if cond else Y` is an **expression** that produces a value, and only the selected branch is evaluated.
- Python 3.10+ adds `match`/`case`, a more powerful relative of `switch`.

</div>
