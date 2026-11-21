---
title: "Python Optimizations: Interning"
summary: CPython pre-creates and reuses the integers -5 to 256. That's why some numbers are always "the same object".
minutes: 9
---

## What is interning?

**Interning** means reusing objects on demand instead of creating new ones. When CPython starts up, it pre-creates the integers **-5 to 256** (the ones used most often) and keeps them cached. Whenever your code produces an integer in that range, you get the cached object back. In effect, those integers are **singletons**.

## Watch the cache at work

To see interning clearly, we'll build integers at **run time** with `int('…')`, so Python can't have prepared them in advance:

```python run
print(int('10') is int('10'))     # inside the cache
print(int('256') is int('256'))   # top of the cache
print(int('-5') is int('-5'))     # bottom of the cache
```

```python run
print(int('257') is int('257'))   # just outside: two separate objects
print(int('-6') is int('-6'))
print(int('500') == int('500'))   # but of course they're still equal
```

All the different ways of making 10 end up at the same object:

```python run
a = 10
b = int(10)
c = int('10')
d = int('1010', 2)
print(a, b, c, d)
print(a is b, a is c, a is d)
```

## The same experiment with variables

Now let's do it the way you'd naturally try it, one assignment per cell:

```python run
a = 500
```

```python run
b = 500
print(a is b)
```

`False`, as expected for a number outside [-5, 256]. Now put both assignments **in the same cell**:

```python run
a = 500
b = 500
print(a is b)
```

<div class="callout modern">
<span class="callout-title">Why is it True now? Compile-time constants</span>

This isn't interning. Python compiles a whole block of code (a module, a function body, or one notebook cell) at once. While compiling, it collects the **constants** in that block and stores each distinct value only once. So both `500` literals in one cell become a single constant object, and `a is b` is `True`.

Older notebooks show `False` for this example, because Jupyter used to compile each statement in a cell separately. The interactive `python` prompt still compiles one statement at a time. So the result depends on *how your code was compiled*, which is exactly why you should **never use `is` to compare numbers**. Use `==`.

</div>

## Why intern at all?

Small integers show up everywhere: loop counters, indexes, lengths, `0` and `1`. Creating and destroying millions of identical tiny objects would waste time and memory. Caching them is a cheap win, and it's perfectly safe because integers are immutable.

<div class="takeaways">

## Key takeaways

- CPython caches the integers **-5 to 256**; every occurrence of them is the same object.
- Outside that range, run-time integers are separate objects, but identical literals compiled together may share one constant.
- Interning is an implementation detail: compare numbers with `==`, never `is`.

</div>
