---
title: Global and Local Scopes
summary: Where a name is assigned decides where it lives. Python looks names up local first, then enclosing, global and built-in.
minutes: 12
---

## Names, namespaces and scopes

When you write `a = 10`, Python **binds** the name `a` to an `int` object. That binding has to be stored somewhere, and it is: in a **namespace**, which you can picture as a table (in practice, usually a dictionary) mapping names to objects.

A name binding is not visible everywhere in your program. The region of code where a name can be used to reach its object is called the name's **scope**. In Python, scope is **lexical**: it's determined by *where in the source code* the name is assigned, not by the order in which functions happen to be called.

Every scope has its own namespace. The three you meet first are:

- **Built-in scope**: names like `print`, `len`, `True`, `None`, `dict`, `ValueError`. They're available everywhere, in every module.
- **Global scope**: the top level of a module (one `.py` file, or here, the page you're reading). Despite the name, there's no scope that spans *all* modules of a program; "global" in Python always means *module-level*.
- **Local scope**: created each time a function is **called**. Parameters and any names assigned inside the function body live here, and the namespace disappears when the call ends.

<figure class="diagram">
<svg viewBox="0 0 560 200" role="img" aria-label="Nested scopes: local scopes inside the module scope, which is inside the built-in scope. Lookup goes outward.">
<defs><marker id="sc1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<rect x="10" y="10" width="540" height="180" rx="10" class="d-obj"/>
<text x="25" y="32" class="d-sub">BUILT-IN SCOPE · print, len, True, None, dict …</text>
<rect x="30" y="45" width="370" height="130" rx="10" class="d-name"/>
<text x="45" y="66" class="d-sub">GLOBAL (module) SCOPE · a = 10</text>
<rect x="50" y="80" width="150" height="80" rx="8" class="d-obj-hl"/>
<text x="62" y="102" class="d-sub">LOCAL · my_func()</text>
<text x="62" y="126" class="d-text">n, c</text>
<rect x="225" y="80" width="155" height="80" rx="8" class="d-obj-hl"/>
<text x="237" y="102" class="d-sub">LOCAL · other_func()</text>
<text x="237" y="126" class="d-text">x</text>
<path d="M125 160 C125 185, 430 185, 470 60" class="d-arrow-hl" marker-end="url(#sc1)"/>
<text x="420" y="110" class="d-sub">lookup goes</text>
<text x="420" y="126" class="d-sub">outward only</text>
</svg>
<figcaption>Scopes nest. When a name isn't found in the current namespace, Python checks the enclosing one, and so on out to the built-ins.</figcaption>
</figure>

## Looking a name up

When Python needs the object behind a name, it searches the namespaces from the inside out: **L**ocal, then **E**nclosing functions (next lesson), then **G**lobal, then **B**uilt-in. This is often remembered as **LEGB**. If the name isn't found anywhere, you get a `NameError`.

```python run
a = 10

def my_func(n):
    print('global a:', a)   # not local, so Python finds it in the module
    c = a ** n              # c and n are local
    return c

my_func(2)
```

Inside `my_func`, `n` and `c` are local. `a` is never assigned inside the function, so it's looked up in the enclosing (global) scope. `print` isn't local or global either, so Python finds it in the built-in scope.

## Assignment makes a name local

Here's the crucial rule: **if a function assigns to a name anywhere in its body, that name is local to the function**, for the whole function, unless you say otherwise. A local name can **mask** (hide) a global with the same name:

```python run
a = 10

def my_func(n):
    a = 2          # a brand-new local 'a', unrelated to the global one
    return a ** n

print(my_func(3))
print('global a is still', a)
```

## The `global` keyword

To re-bind a module-level name from inside a function, declare it with `global`:

```python run
a = 10

def my_func(n):
    global a       # 'a' in this function means the module's 'a'
    a = 2
    return a ** n

print(my_func(3))
print('global a is now', a)
```

`global` can even **create** a module-level variable. The variable doesn't exist until the function actually runs:

```python run
def make_var():
    global var
    var = 'hello world'

print('var' in globals())   # globals() returns the module's namespace dict
make_var()
print(var)
```

<div class="callout tip">
<span class="callout-title">Use `global` sparingly</span>

A function that silently changes module state is hard to test and hard to reason about. Most of the time it's better to **return** a value and let the caller decide what to do with it. You'll rarely need `global` outside of small scripts.

</div>

## Scope is decided at compile time

Python works out which names are local when it **compiles** the function, before any line of it runs. It doesn't matter *where* in the body the assignment is, or whether that line ever executes. This leads to one of the most common surprises in Python:

```python run
a = 10
b = 100

def my_func():
    print(a)
    print(b)     # b is local here, because of the assignment below
    b = 1000

try:
    my_func()
except UnboundLocalError as ex:
    print('UnboundLocalError:', ex)
```

The first `print` works: `a` is never assigned in `my_func`, so it's global. But `b = 1000` made `b` local to the **entire** function, so the earlier `print(b)` tries to read a local variable that hasn't been given a value yet. Python does *not* fall back to the global `b`.

You can see the compiler's decision on the function's code object. `co_varnames` lists the local variable names:

```python run
my_func.__code__.co_varnames
```

<div class="callout modern">
<span class="callout-title">Clearer error message</span>

`UnboundLocalError` is a subclass of `NameError`. Since Python 3.11 its message reads *"cannot access local variable 'b' where it is not associated with a value"*. Older versions (and older notebooks) say *"local variable 'b' referenced before assignment"*. Same error, friendlier wording.

</div>

## Built-ins can be masked too

Functions are objects bound to names like any other, so the scoping rules apply to them. If you assign to `print` at module level, your module-level `print` masks the built-in one:

```python run
print = lambda x: f'hello {x}!'

def greet(name):
    return print(name)      # LEGB finds the module-level 'print' first

greet('world')
```

The real `print` hasn't gone anywhere; it still lives in the built-in namespace. Deleting the global name unmasks it:

```python run
del print
print('the built-in print is back')
```

This is exactly why you should avoid naming your own variables `list`, `dict`, `str`, `id`, `max` and so on. It works, until the moment you need the built-in.

## Loops and `if` blocks don't create scopes

If you come from Java, C# or C++, you might expect a variable assigned inside a loop to disappear after the loop. In Python, only modules, functions (including lambdas), classes and comprehensions create scopes. A `for`, `while`, `if` or `with` block does not:

```python run
for i in range(10):
    x = 2 * i

print(i, x)    # both are ordinary module-level names
```

Comprehensions are the exception you should know about: their loop variable stays inside the comprehension.

```python run
squares = [k * k for k in range(5)]
print(squares)
print('k' in globals())
```

<div class="callout modern">
<span class="callout-title">Comprehensions in Python 3.12+</span>

Since 3.12 (PEP 709) list, set and dict comprehensions are *inlined* into the surrounding code instead of running as a hidden nested function, which makes them faster. The scoping behavior you see is unchanged: the loop variable still doesn't leak.

</div>

<div class="takeaways">

## Key takeaways

- A **namespace** maps names to objects; a **scope** is the region of code where a binding is visible. Python's scopes are lexical.
- "Global" means **module** level. Built-ins sit in an outer scope available everywhere.
- Name lookup goes **L**ocal → **E**nclosing → **G**lobal → **B**uilt-in.
- Any assignment in a function body makes that name local for the **whole** function, decided at compile time. Reading it before assigning raises `UnboundLocalError`.
- `global name` lets a function re-bind (or create) a module-level name.
- Loops and `if` blocks don't create scopes; functions, classes, modules and comprehensions do.

</div>
