---
title: Reloading Modules
summary: Re-importing a changed module does nothing. importlib.reload re-runs it in place, but any names bound directly to its old contents keep pointing at the old objects.
minutes: 11
---

## The problem

Suppose a module's source file changes while your program is running, and you'd like the program to pick up the new code. You already know enough to predict that a second `import` won't help. Let's confirm it, and then look at two ways of forcing a reload, and why both are risky.

The safest approach, nearly always, is to **restart the program**. Reloading is mostly useful in interactive sessions (a REPL or notebook) while you experiment.

## A module we can rewrite

This helper writes a module called `<name>.py` whose single function prints the keyword arguments we pass:

```python run
import importlib, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

def create_module_file(module_name, **kwargs):
    """Write <module_name>.py with a print_values() function."""
    lines = [f"print('running {module_name}.py...')", '', 'def print_values():']
    for key, value in kwargs.items():
        lines.append(f'    print({key!r}, {str(value)!r})')
    (workdir / f'{module_name}.py').write_text('\n'.join(lines) + '\n')
    importlib.invalidate_caches()

for name in ('reload_demo', 'reload_demo2'):
    sys.modules.pop(name, None)

create_module_file('reload_demo', k1=10, k2='python')
print((workdir / 'reload_demo.py').read_text())
```

```python run
import reload_demo
reload_demo.print_values()
```

Now change the file, adding a third value:

```python run
create_module_file('reload_demo', k1=10, k2='python', k3='cheese')

import reload_demo          # cache hit: nothing re-runs
reload_demo.print_values()
```

No change, as expected: the module object in `sys.modules` was built from the old code, and `import` just handed it back.

## Option 1: delete it from `sys.modules`

If the cache is the problem, remove the entry and import again:

```python run
old_module = reload_demo
print('id before:', hex(id(reload_demo)))

del sys.modules['reload_demo']
import reload_demo

print('id after: ', hex(id(reload_demo)))
reload_demo.print_values()
```

The module ran again and we see `k3`. But look at the `id`: this is a **brand-new module object**. Any other module that did `import reload_demo` earlier still holds a reference to the *old* object, here simulated by `old_module`:

```python run
old_module.print_values()
print(old_module is sys.modules['reload_demo'])
```

Now two versions of the "same" module are alive in one program. That's a recipe for bugs that are very hard to track down.

## Option 2: `importlib.reload`

`importlib.reload(module)` is better: it re-executes the module's code **inside the existing module object**. The object keeps its identity, so everyone who imported it sees the new contents.

```python run
create_module_file('reload_demo', k1=10, k2='python', k3='cheese', k4='parrots')

before = id(reload_demo)
importlib.reload(reload_demo)
print('same object:', id(reload_demo) == before)
reload_demo.print_values()
```

The code ran again (`running reload_demo.py...`), the `id` didn't change, and the function now prints `k4`. Problem solved?

## Why reloading is still unsafe

Not quite. `reload` refreshes the module's **namespace**, but it can't reach references that other code took to the objects *inside* it. Watch what happens with a `from` import:

```python run
create_module_file('reload_demo2', k1='python')

from reload_demo2 import print_values
print_values()
```

```python run
import reload_demo2
print(print_values is reload_demo2.print_values)

create_module_file('reload_demo2', k1='python', k2='cheese')
importlib.reload(reload_demo2)

print('via the module:')
reload_demo2.print_values()
print('via the from-import name:')
print_values()
print(print_values is reload_demo2.print_values)
```

Re-running the module's code executed a new `def print_values():`, which created a **new function object** and stored it in the module's namespace. Our name `print_values` was bound to the *old* function, and nothing re-binds it. The same thing happens with any reference taken directly, such as `pv = reload_demo2.print_values`, or an instance of a class defined in the module: old instances keep pointing at the old class.

There's one more surprise. Reloading runs the new code *on top of* the old namespace; it doesn't start from an empty one. So a name you **delete** from the source survives the reload:

```python run
(workdir / 'reload_demo2.py').write_text("print('running reload_demo2.py...')\nk = 'only this now'\n")
importlib.invalidate_caches()

importlib.reload(reload_demo2)
print(reload_demo2.k)
print('print_values still there?', hasattr(reload_demo2, 'print_values'))
```

<div class="callout note">
<span class="callout-title">Stale bytecode on a real file system</span>

When Python imports a `.py` file it normally saves compiled bytecode in `__pycache__`, and on later imports it reuses that bytecode if the source file's recorded modification time and size haven't changed. If you rewrite a file very quickly with content of the same size, a reload may pick up the old bytecode. The browser runtime doesn't write bytecode files, so you won't see this here.

</div>

<div class="callout modern">
<span class="callout-title">Python 3.12: the `imp` module is gone</span>

Older code and tutorials use `imp.reload(module)`. The `imp` module was deprecated for years and was **removed in Python 3.12**. Use `importlib.reload()`.

```python run
try:
    import imp
except ModuleNotFoundError as ex:
    print('ModuleNotFoundError:', ex)
```

</div>

<div class="takeaways">

## Key takeaways

- A changed module is not picked up by a second `import`; the cached object is returned.
- Deleting the entry from `sys.modules` and re-importing creates a **new** module object, while older references keep the old one.
- `importlib.reload(module)` re-runs the code in the **same** module object, but names bound directly to its old functions, classes or values (e.g. via `from m import f`) still point at the old objects, and deleted names linger.
- Prefer restarting the program over reloading; use `reload` only for interactive experiments.

</div>
