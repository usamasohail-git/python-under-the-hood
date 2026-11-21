---
title: Nonlocal Scopes
summary: Functions defined inside functions can read the enclosing function's variables, and re-bind them with the nonlocal keyword.
minutes: 10
---

## Functions inside functions

A `def` statement is just code that creates a function object and binds it to a name. Like any other statement, it can appear inside another function. The inner function is then created **each time the outer function runs**, and its name is local to the outer function.

This gives us a new kind of scope in between local and global: the **enclosing** (or **nonlocal**) scope. It's the "E" in LEGB.

```python run
def outer_func():
    x = 'hello'

    def inner_func():
        print(x)       # not local to inner_func: found in outer_func's scope

    inner_func()

outer_func()
```

When `inner_func` runs, `x` isn't in its own namespace, so Python looks in the enclosing function's scope, finds `x` there, and uses it. The search continues outward through as many levels of nesting as there are, then to the module and finally the built-ins:

```python run
def outer_func():
    x = 'hello'
    def inner1():
        def inner2():
            print(x)   # two levels up
        inner2()
    inner1()

outer_func()
```

<figure class="diagram">
<svg viewBox="0 0 560 170" role="img" aria-label="Nested scopes: built-in contains global contains outer contains inner">
<rect x="10" y="10" width="540" height="150" rx="10" class="d-obj"/>
<text x="25" y="30" class="d-sub">BUILT-IN</text>
<rect x="30" y="40" width="500" height="110" rx="10" class="d-name"/>
<text x="45" y="60" class="d-sub">GLOBAL · module</text>
<rect x="50" y="70" width="460" height="70" rx="8" class="d-obj"/>
<text x="65" y="90" class="d-sub">ENCLOSING · outer() · x = 'hello'</text>
<rect x="270" y="80" width="225" height="50" rx="8" class="d-obj-hl"/>
<text x="285" y="100" class="d-sub">LOCAL · inner()</text>
<text x="285" y="120" class="d-text">print(x) → looks outward</text>
</svg>
<figcaption>Each function call creates a local scope. An inner function's scope is nested inside the scope of the call that created it.</figcaption>
</figure>

## Assigning masks, just like with globals

The rule from the previous lesson still holds: assigning to a name inside a function makes it local to that function. So an inner function that assigns to `x` gets its **own** `x`, which masks the enclosing one:

```python run
def outer():
    x = 'hello'
    def inner():
        x = 'python'     # a new local x, belonging to inner
    inner()
    print(x)

outer()
```

## The `nonlocal` keyword

To re-bind the enclosing function's variable instead, declare it `nonlocal`. It works like `global`, but it targets the nearest **enclosing function** scope:

```python run
def outer():
    x = 'hello'
    def inner():
        nonlocal x       # 'x' here means outer's x
        x = 'python'
    inner()
    print(x)

outer()
```

Python resolves a `nonlocal` name by walking outward through enclosing **function** scopes and stopping at the **first** one that has a local variable with that name. That's not necessarily the outermost one:

```python run
def outer():
    x = 'hello'
    def inner1():
        x = 'python'           # local to inner1, masks outer's x
        def inner2():
            nonlocal x         # nearest enclosing x: inner1's
            x = 'monty'
        print('inner1 (before):', x)
        inner2()
        print('inner1 (after): ', x)
    inner1()
    print('outer:          ', x)

outer()
```

`inner2` changed `inner1`'s `x`; `outer`'s `x` was never touched. If `inner1` also declares `x` nonlocal, then `inner1` doesn't have a local `x` at all, and both inner functions share `outer`'s variable:

```python run
def outer():
    x = 'hello'
    def inner1():
        nonlocal x             # outer's x
        x = 'python'
        def inner2():
            nonlocal x         # inner1 has no local x, so this is outer's x too
            x = 'monty'
        print('inner1 (before):', x)
        inner2()
        print('inner1 (after): ', x)
    inner1()
    print('outer:          ', x)

outer()
```

## Mixing `global` and `nonlocal`

You can use both in one nest of functions. Each declaration only affects the function it appears in:

```python run
x = 100

def outer():
    x = 'python'               # local to outer (masks the global)
    def inner1():
        nonlocal x             # outer's x
        x = 'monty'
        def inner2():
            global x           # the module's x
            x = 'hello'
        print('inner1 (before):', x)
        inner2()
        print('inner1 (after): ', x)
    inner1()
    print('outer:          ', x)

outer()
print('global:         ', x)
```

`inner2` re-bound the **global** `x`, so `inner1`'s view (which is `outer`'s `x`) still says `monty`, and the module-level `x` is now `'hello'`.

## What `nonlocal` can't do

`nonlocal` only ever looks at enclosing **functions**. It never reaches the module scope, and it requires the variable to already exist there. Both mistakes are caught when the code is **compiled**, as a `SyntaxError`. Because the error happens at compile time, we pass the source to `compile()` so we can catch it:

```python run
module_level = '''
x = 1
def f():
    nonlocal x      # the only x is global, not in an enclosing function
    x = 2
'''

declared_global = '''
def outer():
    global x
    x = 'python'
    def inner():
        nonlocal x  # outer's x is global, not local to outer
        x = 'monty'
'''

for src in (module_level, declared_global):
    try:
        compile(src, '<demo>', 'exec')
    except SyntaxError as ex:
        print('SyntaxError:', ex.msg)
```

The second case is subtle: `outer` *has* a name `x`, but it declared it `global`, so `x` isn't one of `outer`'s local variables and `nonlocal` finds nothing to bind to.

<div class="callout note">
<span class="callout-title">Reading doesn't need a declaration</span>

You only need `nonlocal` (or `global`) to **re-bind** a name with `=`, `+=` and friends. Reading an enclosing variable, or **mutating** the object it refers to (e.g. `items.append(1)` on an enclosing list), works without any declaration, because neither of those assigns to the name.

</div>

<div class="takeaways">

## Key takeaways

- A function defined inside another function can read the enclosing function's variables: the **E** in LEGB.
- Assigning to a name inside the inner function creates a new local that masks the enclosing one.
- `nonlocal name` re-binds the variable in the **nearest** enclosing function that has a local `name`.
- `nonlocal` never refers to globals and needs an existing binding; violations are `SyntaxError`s at compile time.
- Declarations are only needed for re-binding, not for reading or mutating.

</div>
