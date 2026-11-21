---
title: Relevant Python 3.10 Changes
summary: Python 3.10 added structural pattern matching with match/case, a strict mode for zip, and much friendlier syntax error messages.
minutes: 16
---

## A quick tour of 3.10

Python 3.10 (released October 2021) is best known for one big addition, **structural pattern matching**, but it also brought a few smaller changes that quietly prevent bugs. This lesson covers the ones you'll use most:

- clearer `SyntaxError` messages
- the `match` statement
- `zip(..., strict=True)`

For everything else, see the official *What's New in Python 3.10* page.

## Better syntax error messages

Before 3.10, a missing bracket or a typo often produced a bare `invalid syntax`, pointing at a line *after* the real mistake. The new parser (introduced in 3.9) let 3.10 explain much more. We can see the messages without breaking the page by compiling some broken code ourselves:

```python run
broken = [
    "print('hello'\n",
    "if x = 1:\n    pass\n",
    "d = {'a': 1 'b': 2}\n",
    "print 'hi'\n",
]

for src in broken:
    try:
        compile(src, '<demo>', 'exec')
    except SyntaxError as ex:
        print('SyntaxError:', ex.msg)
```

Each message now tells you *what* is probably wrong: an unclosed `(`, a `=` that should be `==`, a missing comma, or Python 2 style `print`.

<div class="callout modern">
<span class="callout-title">Modern Python: it kept getting better</span>

Python 3.11 added fine-grained error locations in tracebacks (the `^^^^` markers under the exact sub-expression that failed). 3.12 and 3.13 added more "Did you mean ...?" suggestions, for example for a forgotten `import` or a misspelled keyword argument, and 3.13 colours tracebacks in the terminal.

</div>

## Structural pattern matching

People coming from C, Java or JavaScript often ask what Python's `switch` statement is. For a long time the answer was "there isn't one, use `if`/`elif`". Python 3.10 added `match`, which can do everything a simple `switch` can, and a lot more.

### Matching literal values

```python run
def respond(language):
    match language:
        case "Java":
            return "Hmm, coffee!"
        case "Python":
            return "I'm not scared of snakes!"
        case "Rust":
            return "Don't drink too much water!"
        case _:
            return "I'm sorry..."

print(respond("Python"))
print(respond("Rust"))
print(respond("COBOL"))
```

Python tries each `case` from top to bottom and runs the **first** one that matches. There is no fall-through, so you don't need a `break`. The pattern `_` is the **wildcard**: it matches anything, so it works as the default branch. If no case matches and there is no wildcard, nothing happens and `match` simply finishes.

### Several alternatives in one case

The `|` symbol inside a pattern means "or":

```python run
def respond(language):
    match language:
        case "Java" | "JavaScript":
            return "Love those braces!"
        case "Python":
            return "I don't need no braces"
        case _:
            return "I have no clue!"

print(respond("Java"), '/', respond("JavaScript"), '/', respond("Python"))
```

## Matching structure, not just values

The word *structural* is the important part. A pattern can describe the **shape** of a value and pull pieces out of it at the same time.

Imagine a small robot that understands commands such as `move` with a direction, `pick` and `drop`. We'll display its actions with arrow symbols:

```python run
symbols = {
    "F": "→", "B": "←", "L": "↑", "R": "↓",
    "pick": "⤣", "drop": "⤥",
}
symbols
```

### Capturing parts of a sequence

A list pattern like `["move", direction]` matches any sequence of exactly two items whose first item is `"move"`, and binds the second item to the name `direction`. Adding `as` lets you restrict a sub-pattern *and* capture it:

```python run
def op(command):
    match command:
        case ["move", ("F" | "B" | "L" | "R") as direction]:
            return symbols[direction]
        case "pick":
            return symbols["pick"]
        case "drop":
            return symbols["drop"]
        case _:
            raise ValueError(f"{command} does not compute!")

print(op(["move", "L"]), op("pick"))
try:
    op("fly")
except ValueError as ex:
    print(ex)
```

<div class="callout note">
<span class="callout-title">Strings are not sequences here</span>

Although a `str` is a sequence, sequence patterns deliberately **never** match `str`, `bytes` or `bytearray`. That's why `"pick"` above is compared as a value, and why `"move F"` would *not* match `["move", direction]`:

```python run
match "move F":
    case ["move", d]:
        print("matched as a sequence:", d)
    case _:
        print("a string is not treated as a sequence")
```

</div>

### Collecting the rest with `*`

Sending one command per step is tedious. A starred name in a pattern works like extended unpacking: it collects any number of remaining items into a list.

```python run
def op(command):
    match command:
        case ["move", *directions]:
            return tuple(symbols[d] for d in directions)
        case "pick":
            return symbols["pick"]
        case "drop":
            return symbols["drop"]
        case _:
            raise ValueError(f"{command} does not compute!")

[
    op(["move", "F", "F", "L"]),
    op("pick"),
    op(["move", "R", "L", "F"]),
    op("drop"),
]
```

But an unknown direction now slips through the pattern and blows up later, with an unhelpful error:

```python run
try:
    op(["move", "up"])
except Exception as ex:
    print(type(ex).__name__, ex)
```

### Guards

A **guard** is an `if` condition attached to a case. The case runs only if the pattern matches **and** the guard is true; otherwise matching continues with the next case.

```python run
def op(command):
    match command:
        case ["move", *directions] if set(directions) <= {"F", "B", "L", "R"}:
            return tuple(symbols[d] for d in directions)
        case "pick":
            return symbols["pick"]
        case "drop":
            return symbols["drop"]
        case _:
            raise ValueError(f"{command} does not compute!")

print(op(["move", "F", "L"]))
try:
    op(["move", "up"])
except ValueError as ex:
    print(type(ex).__name__, ex)
```

Now the bad command falls through to the wildcard and we get our own `ValueError`.

### Mappings and classes

Patterns can also match dictionaries (only the listed keys are checked, extra keys are ignored) and objects by type. `int(x)` means "is an `int`, and call it `x`":

```python run
def describe(point):
    match point:
        case {"x": 0, "y": 0}:
            return "origin"
        case {"x": x, "y": y} if x == y:
            return f"on the diagonal at {x}"
        case {"x": int(x)}:
            return f"somewhere with x={x}"
        case _:
            return "not a point"

for p in [{"x": 0, "y": 0, "label": "O"}, {"x": 2, "y": 2}, {"x": 3, "y": 1}, "hello"]:
    print(p, "->", describe(p))
```

<div class="callout tip">
<span class="callout-title">When to reach for match</span>

If you are only comparing one value against a few constants, `if`/`elif` or a dictionary lookup is just as clear. `match` shines when you need to check the **shape** of data (its length, its keys, its type) and unpack it at the same time, for example when interpreting commands, parsed JSON or syntax trees.

</div>

## `zip` with `strict=True`

`zip` stops as soon as the **shortest** iterable runs out, silently dropping the rest:

```python run
l1 = ['a', 'b', 'c']
l2 = [10, 20, 30, 40]
print(list(zip(l1, l2)))

from itertools import zip_longest
print(list(zip_longest(l1, l2, fillvalue='???')))
```

Often, though, you *expect* the inputs to have the same length, and a mismatch means a bug somewhere. Checking first is awkward with iterators, because measuring them uses them up:

```python run
g1 = (i ** 2 for i in range(4))
g2 = (i ** 3 for i in range(3))

print(len(list(g1)) == len(list(g2)))
print(list(zip(g1, g2)))    # both generators are already exhausted
```

Python 3.10 added a keyword-only `strict` parameter. With `strict=True`, `zip` works normally but raises `ValueError` if one input ends before the others:

```python run
g1 = (i ** 2 for i in range(4))
g2 = (i ** 3 for i in range(3))
try:
    list(zip(g1, g2, strict=True))
except ValueError as ex:
    print('ValueError:', ex)

g1 = (i ** 2 for i in range(4))
g2 = (i ** 3 for i in range(4))
list(zip(g1, g2, strict=True))
```

This is the "easier to ask forgiveness than permission" style: just zip, and let Python complain if the assumption was wrong. Whenever you zip things that *should* line up, `strict=True` is a cheap safety net.

<div class="takeaways">

## Key takeaways

- 3.10 syntax errors point at the real problem and often suggest a fix.
- `match`/`case` tries patterns top to bottom and runs the first match; `_` is the wildcard and `|` combines alternatives.
- Patterns can capture values (`as`, names, `*rest`), match dictionaries and types, and be refined with an `if` guard.
- Sequence patterns never match strings.
- `zip(..., strict=True)` raises `ValueError` instead of silently truncating mismatched inputs.

</div>
