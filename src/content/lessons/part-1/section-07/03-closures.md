---
title: Closures
summary: A closure is a function bundled with the variables it uses from an enclosing scope, kept alive through cell objects even after that scope has finished.
minutes: 16
---

## Free variables

Start with a familiar shape: an inner function that reads a variable from its enclosing function.

```python
def outer():
    x = 'python'
    def inner():
        print(f'{x} rocks!')
    inner()
```

Inside `inner`, the name `x` is not local (it's never assigned there) and it's not global either. It belongs to the enclosing function. A variable like this, *used* in a function but *defined* in an enclosing function's scope, is called a **free variable** of that function.

So far, `outer` calls `inner` before it finishes, so nothing unusual is going on. Now make one small change: instead of calling `inner`, **return** it.

```python run
def outer():
    x = 'python'
    def inner():
        print(f'{x} rocks!')
    return inner

fn = outer()   # outer has finished; its local scope is gone
fn()           # ...and yet inner can still find x
```

By the time we call `fn()`, the call to `outer` is long over and its local namespace has been thrown away. Still, `fn` knows what `x` is. The function object that `outer` returned carries its free variables with it. That combination, **a function plus the free variables it needs from an enclosing scope**, is called a **closure**. You can think of the free variables as the function's *extended scope*.

## How Python keeps the variable alive: cells

If `inner` simply held a direct reference to the string `'python'`, things would break as soon as `outer` re-bound `x` to something else: the two functions would disagree about the value of `x`. Python avoids that with one extra level of indirection.

When the compiler sees that a local variable of `outer` is used by an inner function, it stores that variable in a **cell** object. Both `outer`'s `x` and `inner`'s `x` refer to the *same cell*, and the cell refers to the actual value:

<figure class="diagram">
<svg viewBox="0 0 560 190" role="img" aria-label="outer's x and inner's free variable x both point to one cell object, which points to the string 'python'">
<defs>
<marker id="cl1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="cl2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<text x="20" y="22" class="d-sub">SCOPES</text>
<text x="230" y="22" class="d-sub">CELL</text>
<text x="410" y="22" class="d-sub">OBJECT</text>
<rect x="20" y="40" width="150" height="50" rx="8" class="d-name"/><text x="32" y="60" class="d-sub">outer · local</text><text x="32" y="80" class="d-text">x</text>
<rect x="20" y="115" width="150" height="50" rx="8" class="d-name"/><text x="32" y="135" class="d-sub">inner · free var</text><text x="32" y="155" class="d-text">x</text>
<rect x="230" y="75" width="120" height="55" rx="8" class="d-obj-hl"/><text x="245" y="97" class="d-sub">cell</text><text x="245" y="118" class="d-text">→ str</text>
<rect x="410" y="75" width="130" height="55" rx="8" class="d-obj"/><text x="425" y="97" class="d-sub">str</text><text x="425" y="118" class="d-text">'python'</text>
<path d="M170 65 C200 65, 205 90, 226 95" class="d-arrow" marker-end="url(#cl1)"/>
<path d="M170 140 C200 140, 205 115, 226 110" class="d-arrow" marker-end="url(#cl1)"/>
<path d="M350 102 L406 102" class="d-arrow-hl" marker-end="url(#cl2)"/>
</svg>
<figcaption>Both scopes share the cell, not the string. When <code>x</code> is re-bound, the cell is updated, so everyone sees the new value. The closure keeps the cell alive after <code>outer</code> returns.</figcaption>
</figure>

When either function reads `x`, Python follows two hops: name → cell → object. This is all handled for you, and it's what makes the closure work after `outer` has returned: the cell (and therefore the value) is still referenced by `inner`.

## Looking inside a closure

The compiler records which names are free variables in the function's code object, and the function object holds the actual cells in `__closure__`:

```python run
print(fn.__code__.co_freevars)       # names inner needs from outside
print(outer.__code__.co_cellvars)    # outer's locals that live in cells
print(fn.__closure__)                # the cells themselves
print(fn.__closure__[0].cell_contents)
```

To check that the cell really points at the same object `outer` created, use a list (so interning can't confuse things) and compare addresses:

```python run
def outer():
    x = [1, 2, 3]
    print('outer:', hex(id(x)))
    def inner():
        print('inner:', hex(id(x)))
        print(x)
    return inner

fn = outer()
print('cell: ', hex(id(fn.__closure__[0].cell_contents)))
fn()
```

All three addresses are the same: one list, reached through one cell.

## The value is looked up when the closure runs

A closure captures the **variable** (via its cell), not a snapshot of the value at the time the inner function was defined. The value is looked up only when the closure is **called**:

```python run
def outer():
    x = 'first'
    def inner():
        return x
    x = 'second'       # re-bound after inner was defined
    return inner

outer()()
```

Keep this in mind. It's the root of the most famous closure bug, which we'll get to shortly.

## Modifying a free variable

Reading a free variable needs no declaration. To **re-bind** it, use `nonlocal`, exactly as in the previous lesson. Because the variable lives in a cell, the change persists between calls. This gives you a function with private, persistent state:

```python run
def counter():
    count = 0              # lives in a cell once inc() uses it

    def inc():
        nonlocal count
        count += 1
        return count

    return inc

c = counter()
print(c(), c(), c())
```

Nothing outside can touch `count` directly; the only way to change it is to call `c()`.

## Shared extended scopes

Two closures created in the **same** call share the same cells, so they share state:

```python run
def outer():
    count = 0
    def inc1():
        nonlocal count
        count += 1
        return count
    def inc2():
        nonlocal count
        count += 1
        return count
    return inc1, inc2

fn1, fn2 = outer()
print(fn1.__closure__[0] is fn2.__closure__[0])   # the very same cell
print(fn1(), fn1(), fn2())
```

## Every call creates a new closure

Each call to the outer function creates a fresh local scope, so the closures it returns get **new** cells:

```python run
def power(n):
    def inner(x):
        return x ** n      # n is a free variable
    return inner

square = power(2)
cube = power(3)
print(square(5), cube(5))
print(square.__closure__[0].cell_contents, cube.__closure__[0].cell_contents)
print(square.__closure__[0] is cube.__closure__[0])
```

`square` and `cube` were produced by the same code, but they're two different function objects, each with its own cell for `n`.

## Beware: closures in a loop

Suppose we want a list of functions that add 1, 2, 3 and 4 to their argument. Writing a factory function works fine:

```python run
def adder(n):
    def inner(x):
        return x + n
    return inner

add_1, add_2, add_3, add_4 = adder(1), adder(2), adder(3), adder(4)
add_1(10), add_2(10), add_3(10), add_4(10)
```

Now try to be clever and build them in a loop with lambdas:

```python run
def create_adders():
    adders = []
    for n in range(1, 5):
        adders.append(lambda x: x + n)
    return adders

adders = create_adders()
[f(10) for f in adders]
```

Every function adds **4**. Why? There's only one variable `n` in `create_adders`, and the loop keeps re-binding it. All four lambdas close over that single variable, so they all share **one cell**. By the time we call them, the loop has finished and the cell refers to `4`:

```python run
print(adders[0].__code__.co_freevars)
print(all(f.__closure__[0] is adders[0].__closure__[0] for f in adders))
print(adders[0].__closure__[0].cell_contents)
```

The classic fix is to make the current value a **default argument**. Defaults are evaluated once, when the function is *created*, so each lambda gets its own value:

```python run
def create_adders():
    adders = []
    for n in range(1, 5):
        adders.append(lambda x, step=n: x + step)
    return adders

adders = create_adders()
print([f(10) for f in adders])
print(adders[0].__closure__, adders[0].__code__.co_freevars)
```

Notice that these lambdas aren't closures any more: they never read `n` in their body, so `n` isn't a free variable and `__closure__` is `None`. The other clean fix is the `adder(n)` factory from above: each **call** creates its own `n`, so `[adder(n) for n in range(1, 5)]` works as intended.

## Nested closures

Closures can be nested. Each level captures what it needs from the levels around it:

```python run
def incrementer(n):
    def inner(start):
        current = start
        def inc():
            nonlocal current
            current += n
            return current
        return inc
    return inner

fn = incrementer(2)        # a closure over n
print(fn.__code__.co_freevars)

inc_2 = fn(100)            # a closure over current and n
print(inc_2.__code__.co_freevars)
print(inc_2(), inc_2())

print(inc_2.__closure__[1] is fn.__closure__[0])   # same cell for n
```

`inc` needs `n` from two levels up, so Python passes the cell for `n` down through `inner`: `inc_2` and `fn` share it.

<div class="callout modern">
<span class="callout-title">Cells in modern Python</span>

Since Python 3.7 `cell_contents` is writable, and since 3.8 the cell type is available as `types.CellType`. You almost never need either; they're handy for debugging and for tools that build functions dynamically. Reading `__closure__` and `co_freevars` works the same in every Python 3 version.

</div>

<div class="takeaways">

## Key takeaways

- A **free variable** is used in a function but defined in an enclosing function. A **closure** is the function together with those variables.
- Python shares a captured variable through a **cell**: the enclosing scope and the closure both point to the cell, which points to the value.
- The closure keeps its cells alive, so it works after the enclosing function has returned.
- Values are looked up when the closure is **called**, not when it's created. Closures made in a loop share the loop variable's cell; fix it with a default argument or a factory function.
- Use `nonlocal` to re-bind a free variable. Closures from the same call share cells; closures from different calls don't.
- Inspect with `__code__.co_freevars`, `__code__.co_cellvars` and `__closure__`.

</div>
