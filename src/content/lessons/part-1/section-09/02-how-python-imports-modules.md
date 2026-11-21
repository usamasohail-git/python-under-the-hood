---
title: How Python Imports Modules
summary: Import happens at run time. Python checks the sys.modules cache, finds the source, creates a module object, caches it, then executes the code inside it.
minutes: 14
---

## Imports happen at run time

In compiled languages like C, libraries are located and linked when the program is **built**. Python does it while your program is **running**: an `import` statement is just a statement that executes when the interpreter reaches it. That means imports can be inside `if` blocks, functions or `try` statements, and it means Python has to search for the code at that moment.

## Where does Python look?

A few attributes of `sys` describe the installation and the search path:

```python run
import sys

print('prefix:     ', sys.prefix)        # where Python is installed
print('exec_prefix:', sys.exec_prefix)   # where the compiled C parts live
for entry in sys.path:
    print('path entry: ', repr(entry))
```

`sys.prefix` and `sys.exec_prefix` are how virtual environments work: a venv is a separate directory tree, and these prefixes point Python at it instead of the system installation.

`sys.path` is the list of locations searched, in order, for modules that come from files. The output above is from the browser runtime. On a desktop install you'd see the directory of the script you ran first, then the standard library directories, then `site-packages` where third-party packages are installed.

<div class="callout tip">
<span class="callout-title">Debugging `ModuleNotFoundError`</span>

If Python can't import something that you know exists, print `sys.path` first. Nine times out of ten the module's directory simply isn't on it, or a different Python interpreter (with a different `sys.path`) is running your code.

</div>

## The import steps

Leaving out many details, here is what `import module1` does:

<figure class="diagram">
<svg viewBox="0 0 560 300" role="img" aria-label="Import steps: check sys.modules; if found return it; otherwise find the source, create a module object, add it to sys.modules, compile and execute the code in the module namespace, then bind the name">
<defs><marker id="imp2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker><marker id="imp2h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<rect x="20" y="15" width="250" height="36" rx="8" class="d-obj-hl"/><text x="145" y="38" text-anchor="middle" class="d-text">1. 'module1' in sys.modules?</text>
<rect x="330" y="15" width="210" height="36" rx="8" class="d-name"/><text x="435" y="38" text-anchor="middle" class="d-text">yes: reuse cached object</text>
<rect x="20" y="75" width="250" height="36" rx="8" class="d-obj"/><text x="145" y="98" text-anchor="middle" class="d-text">2. find the source (sys.path)</text>
<rect x="20" y="135" width="250" height="36" rx="8" class="d-obj"/><text x="145" y="158" text-anchor="middle" class="d-text">3. create an empty module object</text>
<rect x="20" y="195" width="250" height="36" rx="8" class="d-obj"/><text x="145" y="218" text-anchor="middle" class="d-text">4. sys.modules['module1'] = it</text>
<rect x="20" y="255" width="250" height="36" rx="8" class="d-obj"/><text x="145" y="278" text-anchor="middle" class="d-text">5. compile + exec in its __dict__</text>
<rect x="330" y="255" width="210" height="36" rx="8" class="d-name"/><text x="435" y="278" text-anchor="middle" class="d-text">bind name module1</text>
<path d="M270 33 L326 33" class="d-arrow-hl" marker-end="url(#imp2h)"/>
<text x="285" y="66" class="d-sub">no</text>
<path d="M145 51 L145 71" class="d-arrow" marker-end="url(#imp2)"/>
<path d="M145 111 L145 131" class="d-arrow" marker-end="url(#imp2)"/>
<path d="M145 171 L145 191" class="d-arrow" marker-end="url(#imp2)"/>
<path d="M145 231 L145 251" class="d-arrow" marker-end="url(#imp2)"/>
<path d="M270 273 L326 273" class="d-arrow" marker-end="url(#imp2)"/>
<path d="M435 51 L435 251" class="d-arrow-hl" marker-end="url(#imp2h)"/>
</svg>
<figcaption>The cache is checked first. Only a cache miss leads to finding, creating, caching and executing a new module.</figcaption>
</figure>

1. Check the `sys.modules` cache. If the name is there, use that object and stop.
2. Otherwise, find the module's source (searching `sys.path` for file-based modules).
3. Create a new, empty module object (`types.ModuleType`).
4. Put it in `sys.modules` under its name.
5. Compile the source and **execute** it, using the module's `__dict__` as the global namespace.

Finally the importing namespace gets a name bound to the module object.

The most important consequence: **importing a module runs its code**. Every top-level statement (function definitions, assignments, `print` calls) executes the first time the module is imported.

## Example 1: module code executes on import

The browser has a writable in-memory file system, so we can create real `.py` files and import them. This first cell creates a scratch directory, puts it at the front of `sys.path`, and defines a small helper to write modules into it:

```python run
import importlib, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

def write_module(name, source):
    """Write <name>.py into workdir and make sure Python will see it."""
    (workdir / f'{name}.py').write_text(source)
    importlib.invalidate_caches()   # forget any cached directory listings
    sys.modules.pop(name, None)     # forget any earlier version of this module

print(workdir)
```

Now a module that announces itself and shows its own global namespace:

```python run
write_module('module1', '''
print(f'----- Running {__name__} -----')

def pprint_dict(header, d):
    print(f'*** {header} ***')
    for key, value in d.items():
        if key != '__builtins__':
            print(f'  {key}: {value!r:.60}')

pprint_dict('module1.globals', globals())
print(f'----- End of {__name__} -----')
''')

import module1
```

The `print` calls ran during the `import`. Notice that module1's globals are its own: `__name__` is `'module1'`, `__file__` is the file we wrote, and `pprint_dict` exists there. None of our names (`workdir`, `write_module`, …) are visible to it. **Each module has its own global namespace.**

Import it again:

```python run
import module1
print(module1)
print('module1' in sys.modules)
```

Nothing printed this time. The second import found `'module1'` in `sys.modules` and stopped at step 1. The module's code runs **once per program**, no matter how many times or from how many places it is imported.

## Example 2: import really does trust the cache

To prove that step 1 is just a dictionary lookup, let's put something that isn't even a module into `sys.modules`:

```python run
sys.modules['test_cache'] = lambda: 'Testing module caching'

import test_cache
print(test_cache)
print(test_cache())

del sys.modules['test_cache']   # clean up
```

`import` simply returned whatever was stored under that key. This is a hack you should never use, but it shows clearly that `import test_cache` is, at its core, `test_cache = sys.modules['test_cache']` when the key exists.

## Example 3: an import of our own

Using the built-ins `compile()` and `exec()`, we can rebuild the five steps by hand. `compile()` turns source text into a code object, and `exec(code, namespace)` runs that code with `namespace` as its globals:

```python run
import types

def import_(module_name, module_path):
    # 1. check the cache
    if module_name in sys.modules:
        return sys.modules[module_name]

    # 2. read the source
    module_file = Path(module_path) / f'{module_name}.py'
    source_code = module_file.read_text()

    # 3. create an empty module object
    mod = types.ModuleType(module_name)
    mod.__file__ = str(module_file)

    # 4. cache it BEFORE running any of its code
    sys.modules[module_name] = mod

    # 5. compile and execute the code inside the module's namespace
    code = compile(source_code, filename=str(module_file), mode='exec')
    exec(code, mod.__dict__)
    return mod
```

We'll keep this module's source in a different directory, one that is **not** on `sys.path`, so a normal `import` couldn't find it:

```python run
hidden = Path(tempfile.mkdtemp())
(hidden / 'greeter.py').write_text('''
print('Running greeter.py')

def hello():
    print('greeter says Hello!')
''')
sys.modules.pop('greeter', None)

greeter = import_('greeter', hidden)
greeter.hello()
print(sys.modules['greeter'])
```

Because our function put the module in `sys.modules`, any other module can now use a plain `import greeter`, and it gets the cached object without running the code again:

```python run
write_module('module2', '''
print('Running module2.py')
import greeter

def hello():
    print('module2 says Hello! and...')
    greeter.hello()
''')

import module2
module2.hello()
```

`Running module2.py` printed, but `Running greeter.py` did not: `module2`'s `import greeter` was a cache hit.

## Why cache *before* executing? Circular imports

Step 4 happens before step 5 for a reason. Suppose module `a` imports `b`, and `b` imports `a`. When `b` runs `import a`, the module `a` is already in `sys.modules` (half-built), so Python hands back that object instead of starting an endless loop.

The catch is that the object is **partially initialized**. If `b` tries to use something `a` hasn't defined yet, it fails:

```python run
write_module('mod_a', '''
import mod_b          # runs mod_b before VALUE exists
VALUE = 'from a'
''')
write_module('mod_b', '''
import mod_a          # cache hit: the half-built mod_a
print('mod_b sees', mod_a.VALUE)
''')
sys.modules.pop('mod_b', None)

try:
    import mod_a
except AttributeError as ex:
    print('AttributeError:', ex)
```

The error message even suggests the likely cause. The usual fixes are to move the shared code into a third module, or to access the attribute later (inside a function) rather than at import time.

<div class="callout modern">
<span class="callout-title">Python 3.11+: keep the script's folder off the path</span>

When you run `python app.py`, Python puts the folder containing `app.py` at the front of `sys.path`, so a file named `random.py` sitting next to your script would hide the standard library's `random`. Since Python 3.11 you can turn this off with the `-P` option or the `PYTHONSAFEPATH` environment variable:

```python
$ python -P app.py
```

</div>

<div class="takeaways">

## Key takeaways

- Imports happen at run time; file-based modules are searched for in the directories listed in `sys.path`.
- `import` first checks `sys.modules`. On a miss it finds the code, creates a module object, caches it, then compiles and executes the code in the module's own namespace.
- A module's top-level code runs **once**, on its first import. Later imports are cache hits.
- The module is cached before its code runs, which keeps circular imports from looping forever but can expose a partially initialized module.

</div>
