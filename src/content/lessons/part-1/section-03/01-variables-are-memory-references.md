---
title: Variables are Memory References
summary: A Python variable doesn't hold a value. It's a name that points to an object stored somewhere in memory.
minutes: 8
---

## Memory, objects and names

When your program runs, Python stores data in a region of memory called the **heap**. Every piece of data, whether the integer `10`, the string `'Hello'` or a list, is an **object** sitting at some address in that heap.

When you write

```python
my_var = 10
```

Python does two things:

1. It creates (or finds) an `int` object with the value `10` somewhere in the heap.
2. It binds the name `my_var` to that object, so the name now **refers to** the object's memory address.

<figure class="diagram">
<svg viewBox="0 0 560 170" role="img" aria-label="The names my_var and greeting each point to an object in the heap">
<defs><marker id="ah1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<text x="20" y="22" class="d-sub">NAMES (namespace)</text>
<text x="300" y="22" class="d-sub">HEAP (objects)</text>
<rect x="20" y="40" width="130" height="40" rx="8" class="d-name"/><text x="85" y="65" text-anchor="middle" class="d-text">my_var</text>
<rect x="20" y="105" width="130" height="40" rx="8" class="d-name"/><text x="85" y="130" text-anchor="middle" class="d-text">greeting</text>
<rect x="300" y="35" width="230" height="50" rx="8" class="d-obj"/><text x="315" y="56" class="d-sub">0x7f3a…a50 · int</text><text x="315" y="75" class="d-text">10</text>
<rect x="300" y="100" width="230" height="50" rx="8" class="d-obj"/><text x="315" y="121" class="d-sub">0x7f3a…e30 · str</text><text x="315" y="140" class="d-text">'Hello'</text>
<path d="M150 60 L296 60" class="d-arrow-hl" marker-end="url(#ah1)"/>
<path d="M150 125 L296 125" class="d-arrow-hl" marker-end="url(#ah1)"/>
</svg>
<figcaption>A variable is an entry in a namespace that points at an object. The object carries the value and the type.</figcaption>
</figure>

So strictly speaking, `my_var` is not *equal to* 10. `my_var` is a **reference** to an `int` object whose value is 10.

## Looking at the address with `id()`

The built-in `id()` returns a unique identifier for an object during its lifetime. In CPython that identifier is the object's **memory address**, given as a base-10 integer. `hex()` makes it easier to read:

```python run
my_var = 10
print('my_var =', my_var)
print('address (decimal):', id(my_var))
print('address (hex):    ', hex(id(my_var)))
```

```python run
greeting = 'Hello'
print('greeting =', greeting)
print('address (hex):', hex(id(greeting)))
```

The two names point to two different objects, so the addresses differ. The exact numbers change from run to run and machine to machine, so don't rely on them. What matters is comparing addresses with each other.

<div class="callout note">
<span class="callout-title">Why care about addresses?</span>

You will rarely need `id()` in real code. In this section we use it as a microscope: watching addresses is the clearest way to see when Python creates a new object and when it reuses an existing one.

</div>

Try it: change `greeting` to some other text in the cell above and run it again. Do you get a new address?

<div class="takeaways">

## Key takeaways

- Data lives in objects on the heap. Each object has an address, a type and a value.
- A variable is a *name bound to an object*. It does not contain the value itself.
- `id(obj)` gives the object's identity (its memory address in CPython), and `hex()` formats it.

</div>
