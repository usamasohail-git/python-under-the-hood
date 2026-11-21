---
title: Garbage Collection
summary: Reference counting can't free objects that point at each other. The garbage collector finds and cleans up those cycles.
minutes: 10
---

## The problem: circular references

Reference counting is fast and immediate, but it has a blind spot. Suppose object **A** holds a reference to object **B**, and **B** holds a reference back to **A**. When your variable `my_var` stops pointing to A, both objects still have a reference count of 1, from each other, even though *your code* can no longer reach either of them.

<figure class="diagram">
<svg viewBox="0 0 560 190" role="img" aria-label="my_var points to A; A and B reference each other; once my_var is removed the cycle is unreachable">
<defs>
<marker id="ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="ah3b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="20" y="70" width="110" height="40" rx="8" class="d-name"/><text x="75" y="95" text-anchor="middle" class="d-text">my_var</text>
<path d="M130 90 L226 90" class="d-dash"/><text x="140" y="80" class="d-sub">removed</text>
<rect x="230" y="60" width="110" height="60" rx="8" class="d-obj-hl"/><text x="285" y="85" text-anchor="middle" class="d-text">A instance</text><text x="285" y="104" text-anchor="middle" class="d-sub">refcount 1</text>
<rect x="430" y="60" width="110" height="60" rx="8" class="d-obj-hl"/><text x="485" y="85" text-anchor="middle" class="d-text">B instance</text><text x="485" y="104" text-anchor="middle" class="d-sub">refcount 1</text>
<path d="M340 75 C380 50, 400 50, 428 72" class="d-arrow-hl" marker-end="url(#ah3b)"/><text x="385" y="45" text-anchor="middle" class="d-sub">self.b</text>
<path d="M430 108 C400 135, 380 135, 343 108" class="d-arrow-hl" marker-end="url(#ah3b)"/><text x="385" y="150" text-anchor="middle" class="d-sub">self.a</text>
<text x="285" y="178" class="d-sub" text-anchor="middle">Unreachable, but the counts never reach 0, so only the GC can free them.</text>
</svg>
<figcaption>A reference cycle: each object keeps the other alive.</figcaption>
</figure>

Without help, this memory would leak. That's what the **garbage collector** (the `gc` module) is for. It periodically looks for groups of objects that only reference each other and frees them.

## Seeing it happen

We'll reuse the `ref_count` helper from the previous lesson, plus a helper that asks the GC whether an object with a given id still exists:

```python run
import ctypes
import gc

def ref_count(address):
    return ctypes.c_long.from_address(address).value

def object_by_id(object_id):
    for obj in gc.get_objects():
        if id(obj) == object_id:
            return 'Object exists'
    return 'Not found'
```

Now two classes that build a cycle: creating an `A` creates a `B` and hands it a reference back to the `A`.

```python run
class A:
    def __init__(self):
        self.b = B(self)
        print(f'A: self: {hex(id(self))}, b: {hex(id(self.b))}')

class B:
    def __init__(self, a):
        self.a = a
        print(f'B: self: {hex(id(self))}, a: {hex(id(self.a))}')
```

Turn the automatic GC off so we can watch reference counting alone, then create the cycle:

```python run
gc.disable()

my_var = A()
a_id = id(my_var)
b_id = id(my_var.b)

print('refcount(a) =', ref_count(a_id))   # my_var + b.a
print('refcount(b) =', ref_count(b_id))   # a.b
print('a:', object_by_id(a_id))
print('b:', object_by_id(b_id))
```

The A instance has two references (`my_var` and `B.a`), and the B instance has one (`A.b`). Now remove our only outside reference:

```python run
my_var = None

print('refcount(a) =', ref_count(a_id))
print('refcount(b) =', ref_count(b_id))
print('a:', object_by_id(a_id))
print('b:', object_by_id(b_id))
```

Both counts are now 1: a pure cycle. Reference counting alone will never free these objects. Let's run the collector by hand:

```python run
collected = gc.collect()
print('a:', object_by_id(a_id))
print('b:', object_by_id(b_id))
gc.enable()   # put things back the way they were
```

Both objects are gone. (We don't read `ref_count` after collection: that memory no longer belongs to any object.)

## How the collector decides when to run

CPython's GC runs **automatically**, triggered by the number of objects allocated since the last collection. You can inspect and tune it with `gc.get_threshold()`, `gc.get_count()`, `gc.collect()` and `gc.disable()`, but you rarely need to. Disabling it is only reasonable when you're sure your code creates no cycles and you've measured a real benefit.

<div class="callout modern">
<span class="callout-title">Modern Python</span>

In older Python versions (before 3.4), objects in a cycle that defined a `__del__` method could not be collected and ended up in `gc.garbage`. That is no longer the case: modern Python collects them too.

</div>

<div class="takeaways">

## Key takeaways

- Reference counting can't free *cycles*: objects that only keep each other alive.
- The garbage collector finds unreachable cycles and frees them; it runs automatically.
- `gc.collect()` forces a collection; `gc.disable()`/`gc.enable()` turn automatic collection off and on.

</div>
