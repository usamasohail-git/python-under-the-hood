---
title: Imports and importlib
summary: The importlib module exposes Python's import machinery. Finders locate a module and return a spec, loaders run its code, and sys.path decides where file-based modules can be found.
minutes: 12
---

## `importlib.import_module`

The hand-made importer from the previous lesson was only for understanding. Python's real import machinery is written (mostly) in Python and is available to you as the standard library package `importlib`.

Its most useful function is `import_module()`, which imports a module whose name is a **string**:

```python run
import importlib, importlib.util, sys

importlib.import_module('statistics')
```

The module was imported and cached. But unlike the `import` statement, `import_module()` doesn't bind any name in our namespace:

```python run
print('statistics' in sys.modules)
print('statistics' in globals())
```

It *returns* the module, so you assign it yourself:

```python run
stats = importlib.import_module('statistics')
stats.mean([1, 2, 3, 4])
```

This is exactly what you want when the module name is only known at run time, for example a plugin named in a configuration file:

```python run
for name in ['json', 'csv', 'fractions']:
    module = importlib.import_module(name)
    print(f'{name:10} -> {module.__name__}, has {len(dir(module))} attributes')
```

<div class="callout note">
<span class="callout-title">What about `__import__`?</span>

The `import` statement calls the built-in function `__import__()` behind the scenes. You'll see it in older code, but it has an awkward interface (for `'a.b'` it returns `a`, not `a.b`). The documentation recommends `importlib.import_module()` for programmatic imports.

</div>

## Where module code comes from

Modules can come from several kinds of sources:

- **built-in** modules compiled into the interpreter, like `math` and `sys`,
- `.py` source files,
- `.pyc` files of compiled bytecode (normally cached in `__pycache__` folders),
- compiled extension modules: `.so` files on Linux and macOS, `.pyd` on Windows,
- **zip archives** containing any of the Python files above.

```python run
import math, fractions

print(math)
print(fractions)
```

## Finders, loaders and specs

Most of the complexity of importing is in *locating* the code. Python splits the job into two roles:

- A **finder** works out where a module is and returns a **module spec** (`ModuleSpec`) describing it, or `None` if it can't find it.
- A **loader**, named in that spec, creates the module and executes its code.

An object that does both jobs is called an **importer**. The spec of a loaded module is stored in its `__spec__` attribute:

```python run
print(math.__spec__)
print(fractions.__spec__)
```

`math` is loaded by `BuiltinImporter` and its origin is `'built-in'`. `fractions` was found inside the browser's zipped standard library, so its loader is a `zipimporter`; on a desktop install you'd see a `SourceFileLoader` and an ordinary file path instead. Either way, the spec records *which* loader to use and *where* the code came from.

How does Python pick a finder? It doesn't. It asks every finder in the list `sys.meta_path`, in order, until one returns a spec:

```python run
for finder in sys.meta_path:
    print(finder)
```

The first three are standard in CPython: `BuiltinImporter` for built-in modules, `FrozenImporter` for frozen modules (modules whose bytecode is embedded in the interpreter), and `PathFinder`, which searches the entries of `sys.path`. The extra entries are specific to Pyodide, the browser runtime. Finders are pluggable: you could write one that loads code from a database or a web server.

If no finder recognises the name, you get `ModuleNotFoundError` (a subclass of `ImportError`):

```python run
try:
    import no_such_module
except ModuleNotFoundError as ex:
    print('ModuleNotFoundError:', ex)
```

You can run just the *finding* half yourself with `importlib.util.find_spec()`. It returns the spec without importing anything, or `None` if the module can't be found:

```python run
print(importlib.util.find_spec('math'))
print(importlib.util.find_spec('no_such_module'))
```

<div class="callout modern">
<span class="callout-title">Always `import importlib.util`</span>

`importlib.util` is a submodule. Importing a package does **not** automatically import its submodules, so after only `import importlib`, the attribute `importlib.util` exists only if some other code happened to import it already. Older code often gets away with this by luck. Write `import importlib.util` explicitly.

</div>

## Finding our own modules

Let's write a module file to a scratch directory that is on `sys.path`:

```python run
import tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

for name in ('lesson3_mod1', 'lesson3_mod2'):
    sys.modules.pop(name, None)

(workdir / 'lesson3_mod1.py').write_text("print('running lesson3_mod1.py...')\na = 100\n")
importlib.invalidate_caches()

importlib.util.find_spec('lesson3_mod1')
```

`PathFinder` found the file, and the spec says a `SourceFileLoader` will load it. Now import it:

```python run
import lesson3_mod1
lesson3_mod1.a
```

<div class="callout note">
<span class="callout-title">Why `invalidate_caches()`?</span>

To keep imports fast, the path finders cache the contents of each directory they've looked at. A file created *while the program is running* may not be noticed until that cache is refreshed. `importlib.invalidate_caches()` clears it. You only need it when your program writes new modules and then imports them, as we do here.

</div>

Now put a module somewhere Python doesn't look:

```python run
elsewhere = Path(tempfile.mkdtemp())
(elsewhere / 'lesson3_mod2.py').write_text("print('running lesson3_mod2.py...')\nx = 'python'\n")
importlib.invalidate_caches()

print(importlib.util.find_spec('lesson3_mod2'))
print(str(elsewhere) in sys.path)
```

No spec: none of the `sys.path` entries contains that file. Imports can be wrapped in `try`, so we could react to the failure:

```python run
try:
    import lesson3_mod2
except ModuleNotFoundError as ex:
    print('Not found:', ex)
```

<div class="callout tip">
<span class="callout-title">Don't just swallow import errors</span>

Catching `ModuleNotFoundError` is fine when you have a real fallback, for example using an optional, faster third-party library if it's installed and a standard-library module otherwise. Printing a message and carrying on just moves the crash to a later, more confusing place.

</div>

`sys.path` is an ordinary list, so we can add the directory to it:

```python run
sys.path.append(str(elsewhere))

print(importlib.util.find_spec('lesson3_mod2').origin)
import lesson3_mod2
lesson3_mod2.x
```

## Better ways to extend the search path

Editing `sys.path` in code works, but it hard-codes paths in your program. Common alternatives (not available in the browser) are:

- the `PYTHONPATH` environment variable, whose directories are added to `sys.path` at start-up,
- `.pth` files in `site-packages`, each line naming a directory to add (see the `site` module's documentation),
- installing your code as a package (`pip install -e .`) into a virtual environment, which is usually the cleanest option.

```python
$ PYTHONPATH=/home/me/mylibs python app.py
```

<div class="takeaways">

## Key takeaways

- `importlib.import_module('name')` imports a module named by a string and **returns** it; it doesn't bind a name for you.
- Finders (listed in `sys.meta_path`) locate a module and return a `ModuleSpec`; the spec's loader executes the code. `module.__spec__` records how a module was loaded.
- `importlib.util.find_spec()` tells you whether, and from where, a module would be imported.
- File-based modules are searched for in `sys.path`. If a directory isn't listed there, its modules can't be imported.
- After writing module files at run time, call `importlib.invalidate_caches()`.

</div>
