---
title: Import Variants and Misconceptions
summary: Every form of import loads and caches the whole module. The variants only differ in which names they add to your namespace.
minutes: 13
---

## Five ways to write an import

| Statement | Module loaded and cached in `sys.modules`? | Names added to *your* namespace |
|---|---|---|
| `import math` | yes, the whole module | `math` → the module |
| `import math as r_math` | yes, the whole module | `r_math` → the module |
| `from math import sqrt` | yes, the whole module | `sqrt` → `math.sqrt` (no `math`) |
| `from math import sqrt as r_sqrt` | yes, the whole module | `r_sqrt` → `math.sqrt` (no `math`) |
| `from math import *` | yes, the whole module | every public name of `math` (no `math`) |

The middle column is the same in every row. That's the point of this lesson: the variants **never** change what gets loaded. They only decide which names are bound in the namespace that ran the import.

## Misconception 1: `from` imports load less

A common belief is that `from module import one_function` is lighter than `import module` because "only one function gets loaded". Let's test it with a module of our own that reports when its code runs:

```python run
import importlib, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

(workdir / 'geometry4.py').write_text('''
print('executing geometry4.py: the WHOLE module runs')

PI = 3.14159

def area(r):
    return PI * r ** 2

def circumference(r):
    return 2 * PI * r
''')
importlib.invalidate_caches()
sys.modules.pop('geometry4', None)

from geometry4 import area
```

The entire file executed. Python has no way to run "only the part that defines `area`". Besides, `area` needs `PI`, which needs the module's namespace. So the module was imported exactly as with `import geometry4`. The only difference is in our namespace:

```python run
print('area' in globals())
print('geometry4' in globals())
print('geometry4' in sys.modules)
```

The module object is right there in the cache, fully built. We can even grab it:

```python run
geometry4 = sys.modules['geometry4']
print(geometry4.circumference(1))
print(area is geometry4.area)
```

So `from geometry4 import area` is roughly:

```python
area = importlib.import_module('geometry4').area   # module fully loaded and cached
```

<div class="callout note">
<span class="callout-title">Packages are a little different</span>

For a *package*, which can contain sub-modules, what you import can change how much code runs, because sub-modules are only loaded when someone imports them. You'll see this in the packages lessons. For a plain module, though, it's always all or nothing.

</div>

## Misconception 2: `import *` is evil

`from module import *` copies every **public** name of the module into your namespace. That makes code shorter, but has two real problems.

First, a reader can't tell where a name came from. Second, a later import can silently **replace** an earlier name. `math` and `cmath` (complex math) both define `sqrt`, `exp`, `pi` and more:

```python run
from cmath import *
print(sqrt, 'comes from', sqrt.__module__)
print(sqrt(-4))
```

```python run
from math import *
print(sqrt, 'comes from', sqrt.__module__)

try:
    sqrt(-4)
except ValueError as ex:
    print('ValueError:', ex)
```

The second star-import re-bound `sqrt` (and the other shared names) to the `math` versions, without any warning. Code that worked a moment ago now fails. The same clobbering happens with explicit `from` imports:

```python run
from cmath import sqrt
from math import sqrt   # this one wins
sqrt.__module__
```

The fix is to keep the module prefix or to rename on import with `as`:

```python run
import math as r_math
import cmath as c_math
from math import sqrt as r_sqrt
from cmath import sqrt as c_sqrt

print(r_math.sqrt(2), c_math.sqrt(2))
print(r_sqrt(4), c_sqrt(-4))
```

These are equivalent to plain assignments:

```python run
r_math = importlib.import_module('math')
c_sqrt = importlib.import_module('cmath').sqrt
print(r_math, c_sqrt)
```

So `import *` isn't evil, it's just *unsafe* when names can collide. It does have legitimate uses, most notably inside a package's `__init__.py`, as you'll see later.

### What counts as "public"?

A star-import skips names that start with an underscore. A module can take full control by listing its public names in `__all__`:

```python run
(workdir / 'shapes4.py').write_text('''
__all__ = ['Square']

class Square: ...
class Circle: ...     # public name, but not listed in __all__
def _helper(): ...    # private by convention
''')
importlib.invalidate_caches()
sys.modules.pop('shapes4', None)

ns = {}
exec('from shapes4 import *', ns)
print([name for name in ns if name != '__builtins__'])
```

Only `Square` was imported: when `__all__` exists, it is the complete list. Without `__all__`, star-import would take every name that doesn't start with `_`. Either way, `__all__` doesn't stop anyone from writing `from shapes4 import Circle` explicitly.

## Misconception 3: an import inside a function reloads the module

```python
def my_func(a):
    import math
    return math.sqrt(a)
```

People sometimes claim this re-imports `math` on every call. It doesn't: after the first time, the `import` is a lookup in `sys.modules` plus binding a local name. Putting imports at the top of the module is still the right style, because it shows all of a module's dependencies in one place, but the cost is small. Let's measure. (Timings in the browser vary from run to run; look at the rough proportions.)

```python run
from time import perf_counter

N = 500_000

def timed(func):
    start = perf_counter()
    func()
    return perf_counter() - start

def qualified():
    for _ in range(N):
        math.sqrt(2)

def direct():
    for _ in range(N):
        sqrt(2)

import math
from math import sqrt

t_qualified = timed(qualified)
t_direct = timed(direct)
print(f'math.sqrt(2): {t_qualified:.3f}s')
print(f'sqrt(2):      {t_direct:.3f}s')
```

The two are practically the same. Run the cell a few times: either one may come out ahead, and the difference over half a million calls is a tiny fraction of a second.

<div class="callout modern">
<span class="callout-title">Python 3.11+: the specializing interpreter</span>

Older notebooks (on Python 3.6) measured `sqrt(2)` as clearly faster than `math.sqrt(2)`, because every `math.sqrt` paid for a dictionary lookup of the attribute. Since 3.11, CPython's adaptive interpreter notices that `math` is a module and specializes that attribute access, so the advantage of `from` imports has mostly disappeared.

</div>

Now the nested imports:

```python run
def nested_import():
    import math
    return math.sqrt(2)

def nested_from_import():
    from math import sqrt
    return sqrt(2)

def plain_call():
    return math.sqrt(2)

def call_many(func):
    def run():
        for _ in range(N):
            func()
    return run

print(f'function, no import:     {timed(call_many(plain_call)):.3f}s')
print(f'function, import math:   {timed(call_many(nested_import)):.3f}s')
print(f'function, from-import:   {timed(call_many(nested_from_import)):.3f}s')
```

Both nested imports are noticeably slower than a plain call (often around twice as slow), because every call still executes an import statement: look up `sys.modules`, then bind a local name. But nothing is being reloaded, and the module's code ran exactly once. Spread over half a million calls, the extra cost is still well under a second.

<div class="callout tip">
<span class="callout-title">Measure before optimizing</span>

Rewriting `import math` as `from math import sqrt` "for speed" only matters for code that runs millions of times in a hot loop. Find the real bottleneck first (it's often I/O, like opening a database connection for every query), then optimize that.

</div>

<div class="takeaways">

## Key takeaways

- Every import variant loads the **entire** module and caches it in `sys.modules`. The variants only differ in which names they bind in your namespace.
- `from m import x` does not bind `m`, but the module is still in `sys.modules`.
- `from m import *` imports public names (or exactly the names in `__all__`) and can silently overwrite names you already have. Use `as` to avoid collisions.
- An `import` inside a function doesn't reload the module; after the first time it's a cache lookup. Keep imports at the top for readability, and measure before micro-optimizing.

</div>
