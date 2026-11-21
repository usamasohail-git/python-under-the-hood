---
title: What is a Module
summary: A module is just an object of type module. Importing one creates a name in your namespace that points at an object cached in sys.modules.
minutes: 10
---

## A module is an object

You've written `import math` many times. But what does the name `math` actually refer to? The same thing every Python name refers to: an **object**.

```python run
import math

print(type(math))
print(math)
print(hex(id(math)))
```

`math` is an ordinary label in our namespace, bound to an object whose type is `module`. Like any other object it has a type, an identity (memory address) and some state.

Every cell on this page runs in one shared namespace, and we can look at it with `globals()`. Filtering out the dunder entries leaves just the names we created:

```python run
[name for name in globals() if not name.startswith('__')]
```

The `import` statement added the name `math`, and `globals()['math']` is the very same object:

```python run
globals()['math'] is math
```

## Where does the module object live?

If `math` is just a name, what happens when we re-bind it?

```python run
original_id = id(math)

math = None          # the label now points at None
print(type(math))

import math          # import again
print(id(math) == original_id)
```

Re-importing gave us back **exactly the same object**. Python didn't build a second `math` module. It found the existing one in a system-wide cache: the dictionary `sys.modules`.

```python run
import sys

print(type(sys.modules))
print(sys.modules['math'] is math)
print(len(sys.modules), 'modules are loaded right now')
```

<div class="callout note">
<span class="callout-title">Two places hold a reference</span>

After `import math`, the module object is referenced from **two** places: the `'math'` key in `sys.modules`, and the `math` name in the namespace that ran the import. If ten of your modules all import `math`, there is still only one module object. Each importer just gets its own name pointing at it.

</div>

<div class="callout tip">
<span class="callout-title">Don't do this in real code</span>

Re-binding `math = None` was only to prove a point. Clobbering a module name in real code is a fast way to get confusing errors.

</div>

## What is inside a module?

A module is a **namespace**: a container of names (its global variables, functions and classes). That namespace is stored in the module's `__dict__`, and dotted access is just a lookup in it:

```python run
print(math.sqrt is math.__dict__['sqrt'])
print(math.pi == math.__dict__['pi'])
sorted(math.__dict__)[:8]
```

So `math.sqrt` means "find the key `'sqrt'` in the `math` module's dictionary". Modules also carry some metadata, all as ordinary attributes:

```python run
print(math.__name__)
print(math.__spec__)
print(hasattr(math, '__file__'))
```

`math` is written in C and compiled into the interpreter itself (it's a **built-in** module), so it has no `__file__`. A module from the standard library written in Python does:

```python run
import fractions

print(fractions)
print(fractions.__file__)
print(fractions.__spec__.origin)
```

<div class="callout note">
<span class="callout-title">Why does the path mention a .zip?</span>

In this browser runtime (Pyodide), the standard library is shipped as a single archive, `python313.zip`, and Python imports `fractions.py` straight out of it. On a normal installation you'd see a path like `/usr/lib/python3.13/fractions.py`. Importing from zip files is the subject of the last lesson in this section.

</div>

So a module is an object that:

- has a namespace (`__dict__`) that holds its global variables,
- usually, but not always, gets its code from a file (`__file__`),
- is an execution environment: its code runs inside that namespace when it is loaded (next lesson).

## Modules are instances of `types.ModuleType`

The class behind every module is available as `types.ModuleType`:

```python run
import types

print(isinstance(fractions, types.ModuleType))
print(types.ModuleType is type(math))
```

Since it's a class, we can create module objects ourselves, without any file at all:

```python run
mod = types.ModuleType('point', 'A module for handling points.')
print(mod)
print(mod.__doc__)
```

An empty module is not very useful, so let's add some attributes. Anything we assign becomes an entry in the module's namespace:

```python run
from collections import namedtuple

mod.Point = namedtuple('Point', 'x y')

def points_distance(pt1, pt2):
    return math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2)

mod.distance = points_distance

p1 = mod.Point(0, 0)
p2 = mod.Point(1, 1)
print(mod.distance(p1, p2))
print([k for k in mod.__dict__ if not k.startswith('__')])
```

It behaves just like a module loaded from a file. There is one difference, though: nothing else in the program knows about it, because it isn't in `sys.modules`. So `import point` fails:

```python run
sys.modules.pop('point', None)   # make sure we start clean

try:
    import point
except ModuleNotFoundError as ex:
    print('ModuleNotFoundError:', ex)
```

Register it in the cache, and `import` finds it immediately, without looking for any file:

```python run
sys.modules['point'] = mod

import point
print(point is mod)
print(point.distance(point.Point(0, 0), point.Point(3, 4)))
```

That's a preview of how imports work: **the first thing `import` does is look in `sys.modules`**.

<div class="callout modern">
<span class="callout-title">Python 3.7+: module-level `__getattr__`</span>

Because attribute access on a module is a dictionary lookup, a module can also define a function named `__getattr__` (PEP 562). Python calls it only when a name is **not** found in the module's namespace. This is handy for deprecation warnings or for loading heavy parts of a module lazily.

```python run
def module_getattr(name):
    if name == 'origin':
        return mod.Point(0, 0)
    raise AttributeError(f'module {mod.__name__!r} has no attribute {name!r}')

mod.__getattr__ = module_getattr

print(point.origin)          # not in __dict__, so __getattr__ is called
try:
    point.nothing_here
except AttributeError as ex:
    print('AttributeError:', ex)
```

</div>

<div class="takeaways">

## Key takeaways

- A module is an object of type `module` (`types.ModuleType`). `import math` binds the name `math` to it.
- Loaded modules are cached in the dictionary `sys.modules`. Importing again returns the cached object.
- A module's namespace lives in its `__dict__`, so `mod.name` is a dictionary lookup.
- Built-in modules have no `__file__`; modules loaded from source do.
- You can create modules dynamically with `types.ModuleType(name, doc)`, and putting one in `sys.modules` makes it importable.

</div>
