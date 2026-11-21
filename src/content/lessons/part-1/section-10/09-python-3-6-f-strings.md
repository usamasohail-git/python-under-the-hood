---
title: Python 3.6 - f-Strings
summary: f-strings evaluate expressions inside string literals, use the full format-spec language, and became even more flexible in Python 3.12.
minutes: 13
---

## From `format()` to f-strings

f-strings, short for **formatted string literals**, arrived in Python 3.6 (PEP 498). To appreciate them, start with what came before. `str.format()` fills `{}` placeholders with its arguments, either in order, by index or by name:

```python run
print('{} % {} = {}'.format(10, 3, 10 % 3))
print('{1} % {2} = {0}'.format(10 % 3, 10, 3))
print('{a} % {b} = {mod}'.format(a=10, b=3, mod=10 % 3))
```

All three work, but the values live far away from where they appear, and with names you end up typing each one several times. An f-string is a string literal prefixed with `f` (or `F`) whose braces contain **expressions**, evaluated right where the string is:

```python run
a = 10
b = 3
f'{a} % {b} = {a % b}'
```

Compare the "named" style:

```python run
name = 'Python'
print('{name} rocks!'.format(name=name))   # "name" three times
print(f'{name} rocks!')                    # once
```

## Format specifiers and conversions

After the expression you can add everything `format()` supports: a `!` conversion, then `:` and a format spec.

```python run
x = 10 / 3
print(f'{x:0.5f}')        # 5 decimal places
print(f'{x:>10.2f}|')     # right-aligned in 10 characters
print(f'{42:08b}')        # binary, zero-padded to 8 digits
print(f'{0.256:.1%}')     # percentage
```

The conversions `!r`, `!s` and `!a` apply `repr()`, `str()` or `ascii()` before formatting:

```python run
word = 'café'
print(f'{word} | {word!r} | {word!a}')
```

The format spec itself can contain nested expressions in braces, which is handy when the width or precision is computed:

```python run
import math
width, precision = 12, 4
print(f'[{math.pi:{width}.{precision}f}]')
```

To get a literal brace, double it:

```python run
print(f'{{a}} is {a}')
```

## Where names come from

An f-string sees exactly the names that normal code at that point would see: locals, then enclosing functions, then globals and built-ins. That includes closures. In this example `name` lives in `outer`, and the f-string in `inner` reads it, making `inner` a closure:

```python run
def outer():
    name = 'Python'

    def inner():
        return f'{name} rocks!'

    return inner

fn = outer()
print(fn())
print(fn.__code__.co_freevars)
```

The f-string's reference to `name` is enough to make it a free variable of `inner`, just as if you had written `return name + ' rocks!'`.

f-strings are evaluated **when the line runs**, every time. Change a variable and the next evaluation reflects it:

```python run
messages = []
for count in range(3):
    messages.append(f'count is {count}')
messages
```

## Don't overdo it

Any expression is allowed, which means you *can* write things like this:

```python run
sq = lambda x: x ** 2
a, b = 10, 1
print(f'{sq(a) if b > 5 else a}')
b = 10
print(f'{(lambda x: x ** 2)(a) if b > 5 else a}')
```

It works, but nobody wants to read it. Keep the expressions in f-strings simple: names, attribute access, an index, a short call or arithmetic. Compute anything more complicated in a separate, well-named variable first.

<div class="callout modern">
<span class="callout-title">Modern Python: what changed after 3.6</span>

- **3.8** added the `=` specifier for debugging: `f'{a=}'` prints `a=10` (covered in the 3.8 / 3.7 lesson).
- **3.12** (PEP 701) made f-strings part of the real grammar. You can now reuse the **same quote** inside the braces, use **backslashes**, and split expressions over several lines, even with comments. Older Pythons reject all three of the examples below.
- **3.14** adds *template strings* (`t'...'`), which look like f-strings but produce a template object instead of a finished string, so a library can process the values safely (for example, escaping HTML or SQL).

```python run
names = ['Ann', 'Bob']
print(f'{', '.join(names)}')        # same quote type inside: 3.12+
print(f'{'\n'.join(names)}')        # backslash inside the braces: 3.12+
print(f'total: {
    len(names)  # a comment inside an f-string: 3.12+
}')
```

</div>

<div class="takeaways">

## Key takeaways

- f-strings (`f'...'`, 3.6+) evaluate expressions inside braces, using the normal scope rules, closures included.
- They support all of `format()`'s machinery: `!r`/`!s`/`!a`, format specs, and nested `{}` inside the spec.
- Double the braces to print a literal `{` or `}`.
- They're evaluated each time the line runs.
- Since 3.12 you can reuse quotes, use backslashes and write multi-line expressions inside them; keep them readable anyway.

</div>
