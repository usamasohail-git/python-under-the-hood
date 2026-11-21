---
title: Multi-Line Statements and Strings
summary: How Python joins several physical lines into one logical statement, and how triple-quoted strings keep every character you type.
minutes: 12
---

## Physical lines vs logical lines

A Python source file is just text. Every time you press Enter you end a **physical line**. Python's tokenizer, however, works with **logical lines**: one complete statement, ended by a special NEWLINE token.

Most of the time the two are the same thing. But Python lets you spread one logical line over several physical lines, purely for readability. The interpreter doesn't care how you lay the code out; the people who read it later (including you, six months from now) care a lot.

There are two ways to join physical lines:

- **implicitly**, inside a pair of brackets: `( )`, `[ ]` or `{ }`
- **explicitly**, by ending a line with a backslash `\`

## Implicit joining inside brackets

As long as a bracket is open, Python ignores the physical newlines. That covers list, tuple, set and dict literals, as well as the parameters of a `def` and the arguments of a call.

```python run
a = [1,
     2,
     3]
a
```

You can also put a comment at the end of each physical line. Comments are thrown away before the lines are joined:

```python run
a = [1,  # first element
     2,  # second element
     3,  # third element
    ]
a
```

The same works for tuples, sets and dictionaries:

```python run
t = (1,  # first element
     2,  # second element
     3,  # third element
    )
s = {1,  # first element
     2,  # second element
    }
d = {'key1': 'value1',  # comment
     'key2':            # comment
         'value2'       # comment
    }
print(t)
print(s)
print(d)
```

And for function definitions and calls:

```python run
def my_func(a,  # some comment
            b, c):
    print(a, b, c)

my_func(10,  # comment
        20,  # comment
        30)
```

### Watch where the comment ends

A comment runs to the end of the physical line, so anything after the `#` is gone, including a comma or a closing bracket. Here the `]` is part of the comment, and the list is never closed:

```python run
source = '''
a = [1,  # first element
     2   # second element]
'''
try:
    compile(source, '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

The fix is to keep the separators *before* the comment and to put the closing bracket on its own line, as in the examples above.

<div class="callout modern">
<span class="callout-title">Clearer syntax errors (Python 3.10+)</span>

Older versions reported a vague `invalid syntax` or "unexpected EOF" for an unclosed bracket. Since Python 3.10 the parser names the culprit directly: `'[' was never closed`. (We use `compile()` inside `try` here only so the page can show the error instead of stopping.)

</div>

## Explicit joining with a backslash

Outside brackets, a newline ends the statement. A long `if` condition therefore can't simply be split across lines. Ending a line with `\` tells Python "this logical line continues on the next one":

```python run
a = 10
b = 20
c = 30
if a > 5 \
    and b > 10 \
    and c > 20:
    print('yes!!')
```

The indentation of the continuation lines doesn't matter, because the lines are glued together before indentation is checked:

```python run
if a > 5 \
    and b > 10 \
            and c > 20:
    print('yes!!')
```

A backslash must be the **very last character** of the line. That means you can't put a comment after it:

```python run
source = 'x = 1 + \\  # a comment\n    2\n'
try:
    compile(source, '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

<div class="callout tip">
<span class="callout-title">Prefer parentheses over backslashes</span>

Since anything inside brackets joins implicitly, you can usually avoid `\` altogether by wrapping the expression in parentheses. This is the style PEP 8 recommends, and it lets you add comments:

```python run
if (a > 5        # first check
        and b > 10
        and c > 20):
    print('yes!!')
```

</div>

## Multi-line strings

Triple quotes, either `'''` or `"""`, create a string literal that can span several physical lines:

```python run
a = '''this is
a multi-line string'''
print(a)
a
```

Unlike bracket joining, nothing is removed here. The newline you typed is part of the string (you can see it as `\n` in the repr). In fact, **every** character between the delimiters is kept: newlines, tabs and spaces. It's still an ordinary `str`, so escape sequences work too:

```python run
a = """some items:\n
    1. item 1
    2. item 2"""
print(a)
```

The `\n` plus the newline you typed gives an empty line, and the four spaces before each item are kept.

### Indentation becomes part of the string

This is the classic trap. When a triple-quoted string sits inside an indented block, the indentation of its continuation lines is part of the text:

```python run
def my_func():
    a = '''a multi-line string
    that is actually indented in the second line'''
    return a

print(my_func())
```

To avoid the extra spaces you'd have to start the continuation line in column 0, which looks odd inside a function:

```python run
def my_func():
    a = '''a multi-line string
that is not indented in the second line'''
    return a

print(my_func())
```

A cleaner option is `textwrap.dedent`, which removes the whitespace that all lines have in common:

```python run
import textwrap

def my_func():
    return textwrap.dedent('''\
        a multi-line string
        with tidy indentation in the source''')

print(my_func())
```

(The `\` right after the opening quotes prevents the string from starting with a newline.)

## Strings are not comments

A triple-quoted string that isn't assigned to anything is still a real string. It is compiled into your program, whereas `#` comments are discarded by the tokenizer. Python has **no multi-line comment syntax**: to comment several lines, put a `#` on each one.

```python
# this is
#    a multi-line
#    comment
```

The one place a bare string has an official job is a **docstring**: a string as the first statement of a module, class or function is stored as its documentation.

```python run
def area(w, h):
    """Return the area of a rectangle.

    Both sides must be positive numbers.
    """
    return w * h

print(repr(area.__doc__))
```

<div class="callout modern">
<span class="callout-title">Docstrings are dedented automatically (Python 3.13)</span>

Starting with Python 3.13 the compiler strips the common leading indentation from docstrings, which is why the repr above shows `\n\nBoth sides…` with no spaces before `Both`. Older versions kept those four spaces (and the ones before the closing quotes) in `__doc__`, and tools like `help()` cleaned them up with `inspect.cleandoc`. Regular triple-quoted strings are **not** affected: only docstrings get this treatment.

</div>

<div class="takeaways">

## Key takeaways

- Python executes **logical** lines; a logical line may span several **physical** lines.
- Inside `()`, `[]` or `{}`, newlines are joined implicitly, and you can add comments at the end of each line (but watch for commas and brackets swallowed by a comment).
- Elsewhere, a trailing `\` joins lines explicitly. Nothing, not even a comment, may follow it. Parentheses are usually the cleaner choice.
- Triple-quoted strings keep every character you type, including newlines and indentation.
- Multi-line strings aren't comments. Python has only `#` comments; docstrings are strings with a special role.

</div>
