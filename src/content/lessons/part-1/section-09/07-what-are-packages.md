---
title: What are Packages
summary: A package is a module that can contain other modules. On disk it's a directory, with an __init__.py for a regular package or without one for a namespace package.
minutes: 15
---

## Why packages?

Imagine an application with fifty functions and classes: database helpers, JSON encoding, validation, authentication, user and blog-post models, logging… Putting it all in one file would be unreadable. Splitting it into a module per topic is better, but you quickly end up with dozens of files side by side at the top level, and no way to say that `authentication.py` and `authorization.py` belong together.

**Packages** add the missing level of structure. They let you group modules hierarchically, the way a book is divided into chapters and sections:

```python
app/
    api.py
    utilities/
        database/
            connections.py
            queries.py
        json/
            encoders.py
            decoders.py
    security/
        authentication.py
        authorization.py
    models/
        users/
            user.py
            user_profile.py
        posts/
            post.py
```

Smaller files with a single purpose are easier to write, test, debug, read and document. And, as the next lesson shows, a package can hide that internal structure from its users and offer them a simple, flat interface.

## A package is a module with a `__path__`

A package is a special kind of module: one that can contain other modules (and other packages, called *sub-packages*). You can tell them apart by one attribute. A package has a `__path__`, the list of locations to search for its sub-modules. A plain module has no `__path__`.

```python run
import json, math, sys

print(type(json), type(math))
print('json  __path__:', json.__path__)
print('math  has __path__?', hasattr(math, '__path__'))
```

`json` is a package (it contains `json.decoder`, `json.encoder`, …), while `math` is a plain module. Both are of type `module`.

Packages and modules don't have to live in a file system (finders and loaders can get code from anywhere), but they almost always do, and then the mapping is simple:

- a **module** is a `.py` file,
- a **regular package** is a directory containing a file named `__init__.py`.

The `__init__.py` is the package's own code. Importing the package executes that file, and its globals become the package's namespace.

## Building a package

Let's build this structure in a scratch directory:

```python
module1.py
pack1/
    __init__.py
    module1a.py
    pack1_1/
        __init__.py
        module1_1a.py
        module1_1b.py
```

Each file just announces itself and defines a `value`:

```python run
import importlib, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

def write(relative_path, source):
    path = workdir / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source)

for rel in ['module1.py', 'pack1/__init__.py', 'pack1/module1a.py',
            'pack1/pack1_1/__init__.py', 'pack1/pack1_1/module1_1a.py',
            'pack1/pack1_1/module1_1b.py']:
    name = rel.removesuffix('.py').removesuffix('/__init__').replace('/', '.')
    write(rel, f"print('executing {name}...')\nvalue = '{name} value'\n")

importlib.invalidate_caches()
for name in [k for k in sys.modules if k == 'module1' or k.startswith('pack1')]:
    del sys.modules[name]

print(sorted(str(p.relative_to(workdir)) for p in workdir.rglob('*.py')))
```

Import the package:

```python run
import pack1

print(pack1)
print(pack1.value)
```

`pack1/__init__.py` ran, and `pack1.value` is the `value` it defined. Compare the attributes of the package with those of an ordinary module:

```python run
import module1

for mod in (module1, pack1):
    print(mod.__name__)
    print('  __file__:   ', mod.__file__)
    print('  __package__:', repr(mod.__package__))
    print('  __path__:   ', getattr(mod, '__path__', 'not set'))
```

- `__file__` of a package points at its `__init__.py`.
- `__path__` is set only for the package: it's the directory that sub-modules will be searched in.
- `__package__` is the package a module belongs to. For a top-level module it's `''`; for a package it's the package itself.

## Sub-modules are loaded only on request

Importing `pack1` ran **only** `pack1/__init__.py`. The modules inside it were not touched:

```python run
print([k for k in sys.modules if k.startswith('pack1')])

try:
    pack1.module1a
except AttributeError as ex:
    print('AttributeError:', ex)
```

To use `module1a` we import it with a dotted name:

```python run
import pack1.module1a

print(pack1.module1a.value)
print([k for k in sys.modules if k.startswith('pack1')])
```

Importing a sub-module also stores it as an **attribute of its parent package**, which is why `pack1.module1a` now works. This is where packages differ from plain modules: what you import decides how much code is executed.

## Importing deeply nested modules

What does `import pack1.pack1_1.module1_1a` do? Python can't load a module inside `pack1_1` before it has `pack1_1`, and it can't load `pack1_1` before `pack1`. So it imports each level in turn, top-down, and caches every one of them:

```python run
import pack1.pack1_1.module1_1a

print([k for k in sys.modules if k.startswith('pack1')])
```

`pack1` was already cached, so only `pack1_1` and `module1_1a` executed. And what was added to *our* namespace? Only the top-level name:

```python run
print('pack1' in globals(), 'pack1_1' in globals(), 'module1_1a' in globals())
print(pack1.pack1_1.module1_1a.value)
```

The statement binds `pack1`, and you reach the rest through attributes. To bind the nested module directly, use a `from` import (or `as`):

```python run
from pack1.pack1_1 import module1_1a
import pack1.pack1_1.module1_1b as m11b

print(module1_1a.value)
print(m11b.value)
```

<div class="callout note">
<span class="callout-title">Each package has its own search path</span>

When importing `pack1.pack1_1`, Python doesn't search `sys.path`. It searches the parent's `__path__`. That's how a sub-package name like `json` inside your own package doesn't collide with the standard library's `json`.

```python run
print(pack1.__path__)          # searched for pack1.module1a, pack1.pack1_1, ...
print(pack1.pack1_1.__path__)  # searched for pack1.pack1_1.module1_1a, ...
```

</div>

## Namespace packages

Since Python 3.3 (PEP 420) there is a second kind of package. A directory **without** an `__init__.py` is still importable, as an *implicit namespace package*:

```python run
write('plugins/csv_export.py', "NAME = 'csv'\n")
importlib.invalidate_caches()
for name in [k for k in sys.modules if k.startswith('plugins')]:
    del sys.modules[name]

import plugins
import plugins.csv_export

print(plugins)
print('__file__:', plugins.__file__)
print('__path__:', plugins.__path__)
print(plugins.csv_export.NAME)
```

The repr says `(namespace)`, there's no `__init__.py` so `__file__` is `None`, and `__path__` is a special read-only `_NamespacePath` rather than a list. Because there is no `__init__.py`, a namespace package has no code of its own: it's purely a container.

Their party trick is that **one namespace package can be spread over several directories**. Every directory on `sys.path` that contains a `plugins/` folder (without `__init__.py`) contributes to the same package:

```python run
other_root = Path(tempfile.mkdtemp())
(other_root / 'plugins').mkdir()
(other_root / 'plugins' / 'pdf_export.py').write_text("NAME = 'pdf'\n")
sys.path.append(str(other_root))
importlib.invalidate_caches()

import plugins.pdf_export

print(plugins.pdf_export.NAME)
for location in plugins.__path__:
    print(location)
```

`plugins.csv_export` and `plugins.pdf_export` live in completely different directories, yet they are sub-modules of one package. The namespace path was recomputed when `sys.path` changed. This is how separately installed distributions can share a top-level package name (for example, several independently installed `mycompany.*` libraries).

| | Regular package | Namespace package |
|---|---|---|
| Directory has `__init__.py` | yes | no |
| Has its own code | yes (`__init__.py`) | no |
| `__file__` | path of `__init__.py` | `None` |
| `__path__` | a list | a read-only `_NamespacePath` |
| Can span several directories | no | yes |

<div class="callout tip">
<span class="callout-title">Prefer regular packages</span>

Unless you specifically need to split one package across directories or distributions, give your package directories an `__init__.py` (even an empty one). Python can stop searching at the first directory that matches instead of scanning all of `sys.path`, the intent is explicit, and you get a place for package-level code, which the next lesson puts to good use.

</div>

<div class="takeaways">

## Key takeaways

- Packages group related modules into a hierarchy; they make large code bases easier to navigate, test and document.
- A package is a module with a `__path__` attribute. On disk, a regular package is a directory with an `__init__.py`, which runs when the package is imported.
- Sub-modules are loaded only when imported. `import a.b.c` imports and caches `a`, `a.b` and `a.b.c`, but binds only `a`.
- Importing a sub-module makes it an attribute of its parent package.
- Directories without `__init__.py` become namespace packages: no code of their own, `__file__` is `None`, and they can span several directories.

</div>
