---
title: "Python Optimizations: String Interning"
summary: CPython automatically interns strings that look like identifiers. You can intern others with sys.intern(), which can speed up heavy comparisons.
minutes: 11
---

## Which strings get interned?

Python code is full of names: variables, functions, classes, attributes, dictionary keys. Behind the scenes Python compares these names constantly, so CPython **interns** them: each identifier is stored once and reused.

CPython also automatically interns **string literals that look like identifiers**, meaning they contain only letters, digits and underscores. To see the effect, let's assign each literal in its own cell, so the compiler can't merge them as shared constants (see the previous lesson):

```python run
a = 'hello'
```

```python run
b = 'hello'
print(a is b)
```

Long identifier-like strings, even ones starting with a digit, are interned too:

```python run
a = 'hello_world'
x = '_this_is_a_long_string_that_could_be_used_as_an_identifier'
s = '1_hello_world'
```

```python run
b = 'hello_world'
y = '_this_is_a_long_string_that_could_be_used_as_an_identifier'
t = '1_hello_world'
print(a is b, x is y, s is t)
```

But as soon as the string contains a space or punctuation, it is not automatically interned:

```python run
a = 'hello world'
s = 'hello, world!'
```

```python run
b = 'hello world'
t = 'hello, world!'
print(a is b, s is t)
print(a == b, s == t)    # still equal, of course
```

## Why intern strings?

Checking `a == b` on two strings may need to compare them character by character, while `a is b` is a single address comparison. If both strings are known to be interned, identity *implies* equality, so you can use the faster check.

## Interning strings yourself: `sys.intern()`

```python run
import sys

a = sys.intern('hello world')
b = sys.intern('hello world')
c = ''.join(['hello', ' world'])   # built at run time, not interned

print(a is b)    # both interned, so the same object
print(a is c)    # c is a separate object
print(a == c)    # but equal in value
```

`is` only works as an equality test if **both** strings were interned. Here `a == c` is `True` but `a is c` is `False`.

## Does it really make a difference?

Only when you do a *lot* of comparisons of long strings. A quick (and rough) benchmark, scaled down to run in your browser:

```python run
import time

def compare_using_equals(n):
    a = 'a long string that is not interned' * 200
    b = 'a long string that is not interned' * 200
    for i in range(n):
        if a == b:
            pass

def compare_using_interning(n):
    a = sys.intern('a long string that is not interned' * 200)
    b = sys.intern('a long string that is not interned' * 200)
    for i in range(n):
        if a is b:
            pass

for fn in (compare_using_equals, compare_using_interning):
    start = time.perf_counter()
    fn(1_000_000)
    print(f'{fn.__name__}: {time.perf_counter() - start:.3f}s')
```

Identity checks win by a wide margin here, because each `==` has to scan about 6,800 characters.

<div class="callout tip">
<span class="callout-title">When should you use <code>sys.intern</code>?</span>

Almost never. Consider it only when you have a measured performance problem involving a huge number of comparisons among a limited set of strings, such as tokenizing source code or processing many repeated keys. For everyday code, compare strings with `==`.

</div>

<div class="takeaways">

## Key takeaways

- CPython automatically interns identifiers and identifier-like string literals.
- Strings with spaces or punctuation, and strings built at run time, are generally not interned.
- `sys.intern()` forces interning. Only then is `is` a safe (and fast) equality test, and it's rarely worth it.

</div>
