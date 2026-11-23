---
title: Strings
summary: Creating, indexing and slicing strings, the methods you'll use every day, f-strings, and why string immutability changes how you build text.
minutes: 12
---

## Creating strings

A `str` is an immutable sequence of Unicode characters. Single and double quotes are interchangeable; pick whichever saves you from escaping a quote inside the text:

```python run
a = 'hello'
b = "it's fine"
c = 'say "hi"'
print(a, b, c)
print(type(a), len(b))
```

Triple quotes create strings that span several lines. They keep every character you type, indentation included, which [Multi-Line Statements and Strings](/part-1/section-02/02-multi-line-statements-and-strings/) covers in detail.

The `str()` constructor turns other objects into text, and a few prefixes change how a literal is read:

```python run
print(str(42), str(3.5), str([1, 2]))
print('tab:\there')       # \t is an escape sequence
print(r'tab:\there')      # raw string: backslashes are kept as-is
name = 'Ada'
print(f'Hello, {name}!')  # f-string: expressions inside {} are evaluated
```

Raw strings are handy for regular expressions and Windows paths, where backslashes are common.

## Indexing and slicing

Strings are sequences, so each character has a position starting at `0`. Negative indices count from the end:

```python run
s = 'Python'
print(s[0], s[1], s[-1], s[-2])
```

A **slice** `s[start:stop:step]` returns a new string. `start` is included, `stop` is excluded, and any part can be left out:

```python run
print(s[0:2])     # 'Py'
print(s[2:])      # from index 2 to the end
print(s[:-2])     # everything except the last two
print(s[::2])     # every second character
print(s[::-1])    # reversed
```

Indexing past the end raises `IndexError`, but slicing never does. Out-of-range slice bounds are simply clipped:

```python run
try:
    s[10]
except IndexError as ex:
    print('IndexError:', ex)
print(repr(s[10:20]))
```

There's no separate character type: `s[0]` is just a string of length 1.

## Strings are immutable

You can't change a string in place. Every "modifying" operation returns a **new** string:

```python run
s = 'Python'
try:
    s[0] = 'J'
except TypeError as ex:
    print('TypeError:', ex)

t = 'J' + s[1:]
print(s, t)
```

Methods like `upper()` or `replace()` follow the same rule. A classic beginner mistake is calling one and forgetting to keep the result:

```python run
word = 'hello'
word.upper()          # result thrown away
print(word)
word = word.upper()   # rebind the name to the new string
print(word)
```

## Everyday methods

| Method | What it does |
|---|---|
| `s.lower()`, `s.upper()`, `s.title()` | change case |
| `s.strip()`, `s.lstrip()`, `s.rstrip()` | remove surrounding whitespace (or given characters) |
| `s.split(sep)`, `sep.join(items)` | break apart / glue together |
| `s.replace(old, new)` | replace every occurrence |
| `s.find(sub)`, `s.index(sub)` | position of `sub` (`-1` vs `ValueError` when missing) |
| `s.count(sub)` | number of non-overlapping occurrences |
| `s.startswith(p)`, `s.endswith(p)` | test a prefix or suffix (accepts a tuple) |
| `s.isdigit()`, `s.isalpha()`, `s.isspace()` | test what the characters are |
| `s.removeprefix(p)`, `s.removesuffix(p)` | drop a prefix or suffix if present (3.9+) |

```python run
line = '  alice,bob , carol  '
names = [n.strip() for n in line.split(',')]
print(names)
print(' | '.join(names))
print('banana'.count('an'), 'banana'.find('n'), 'banana'.find('z'))
print('report.csv'.endswith(('.csv', '.txt')))
```

`split()` with no argument is special: it splits on any run of whitespace and ignores leading and trailing whitespace.

```python run
print('  one   two\tthree\n'.split())
print('a,,b'.split(','))
```

<div class="callout modern">
<span class="callout-title">`removeprefix` and `removesuffix` (Python 3.9)</span>

Before 3.9 people often reached for `strip`, which is a trap: `strip('abc')` removes any of those *characters* from the ends, not the substring.

```python run
filename = 'test_cats.py'
print(filename.removeprefix('test_'))
print(filename.removesuffix('.py'))
print('test_set.py'.lstrip('test_'))   # strips the characters t, e, s, _
```

</div>

Membership tests with `in` look for substrings, not just single characters:

```python run
print('ell' in 'hello', 'z' not in 'hello')
```

## Iterating over a string

A `for` loop hands you one character at a time; add `enumerate` when you need positions:

```python run
for i, ch in enumerate('abc'):
    print(i, ch)
```

Comprehensions and generator expressions work well with strings, and `''.join` turns the pieces back into one string:

```python run
s = 'Hello World 2024'
print(''.join(ch for ch in s if ch.isalpha()))
print([ord(ch) for ch in 'AZ'])
print(sum(ch.isdigit() for ch in s))
```

## Building strings: `join` beats `+=` in a loop

Because strings are immutable, `result += piece` can't extend `result`; it has to create a new string and copy the old contents into it. In a loop that can mean copying the text over and over. CPython sometimes optimizes this case, but you shouldn't rely on it. The idiomatic pattern is to collect pieces in a list and join once:

```python run
parts = []
for i in range(5):
    parts.append(str(i))
print('-'.join(parts))
print('-'.join(str(i) for i in range(5)))   # same thing, shorter
```

`join` only accepts strings, so convert numbers first:

```python run
try:
    ', '.join([1, 2, 3])
except TypeError as ex:
    print('TypeError:', ex)
print(', '.join(map(str, [1, 2, 3])))
```

## f-strings in one minute

f-strings accept any expression and an optional format specification after a colon:

```python run
price = 1234.5678
item = 'coffee'
print(f'{item!r} costs {price:,.2f}')
print(f'[{item:>10}] [{item:<10}] [{item:^10}]')
print(f'{price=}')        # self-documenting form (3.8+)
print(f'{255:#x} {255:08b} {0.256:.1%}')
```

<div class="callout modern">
<span class="callout-title">Quotes inside f-strings (Python 3.12)</span>

Since Python 3.12, an f-string's expressions can reuse the same quote character as the string itself, as in `f'{d['key']}'`. Older versions required a different quote type inside the braces, so you'll often see `f"{d['key']}"` in existing code.

</div>

## Comparing strings

`==` compares contents. `<` and `>` compare character by character using code points, so uppercase letters sort before lowercase ones. Use `key=str.lower` (or `str.casefold`) when you want case-insensitive ordering:

```python run
words = ['banana', 'apple', 'Cherry']
print(sorted(words))
print(sorted(words, key=str.lower))
print('apple' < 'banana', 'Zebra' < 'apple')
```

<div class="callout note">
<span class="callout-title">Where to go deeper</span>

Strings are one of the sequence types explored in [Part 2 · Sequences](/part-2/section-02/), which covers slicing, the sequence protocol and immutable sequences in depth. For what immutability means at the memory level, and why `s += 'x'` rebinds a name rather than changing an object, see [Part 1 · Variables and Memory](/part-1/section-03/).

</div>

<div class="takeaways">

## Key takeaways

- A `str` is an immutable sequence of characters: index with `s[i]`, slice with `s[start:stop:step]`.
- Slicing clips out-of-range bounds; indexing out of range raises `IndexError`.
- String methods never change the original: they return a new string, so keep the result.
- Build text from many pieces with `sep.join(pieces)` rather than `+=` in a loop.
- `removeprefix` / `removesuffix` (3.9+) remove substrings; `strip` removes *characters*.
- f-strings evaluate expressions and support format specs like `:,.2f`, `:>10` and `=`.

</div>
