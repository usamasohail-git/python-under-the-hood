---
title: Zipped Packages
summary: A zip archive on sys.path works like a directory. Python can import modules and packages straight out of it, which makes zips a handy way to ship code as one file.
minutes: 11
---

## Imports from zip archives

The path finder doesn't only search directories. If an entry in `sys.path` is a **zip file**, Python looks inside the archive, using the standard library's `zipimport` module, and imports modules and packages from it exactly as if the archive had been unzipped into a folder. No extraction step is needed.

You've actually been relying on this throughout the section. In this browser runtime the whole standard library lives in one archive:

```python run
import sys, fractions

print(sys.path[:2])
print(fractions.__file__)
print(fractions.__spec__.loader)
```

The loader for `fractions` is a `zipimporter`, and its `__file__` points *inside* `python313.zip`. A desktop CPython lists a similar `python3XX.zip` entry in `sys.path` too, although normally that file doesn't exist and the standard library is a plain directory.

## Zipping a package

Let's create a small package on disk, then zip it. `shutil.make_archive` zips a whole directory tree in one call:

```python run
import importlib, shutil, tempfile, zipfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
src = workdir / 'src'

files = {
    'zcommon/__init__.py': "from . import helpers, validators\n",
    'zcommon/helpers/__init__.py': '''
from .text import *
__all__ = text.__all__
''',
    'zcommon/helpers/text.py': '''
__all__ = ['say_hello', 'factorial']

def say_hello(name):
    return f'Hello {name}'

def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)
''',
    'zcommon/validators/__init__.py': '''
from .numeric import *
__all__ = numeric.__all__
''',
    'zcommon/validators/numeric.py': '''
__all__ = ['is_integer']

def is_integer(arg):
    return isinstance(arg, int) and not isinstance(arg, bool)
''',
    'zcommon/greeting.txt': 'Greetings from inside the archive!\n',
}
for rel, source in files.items():
    path = src / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source)

archive = shutil.make_archive(str(workdir / 'zcommon_lib'), 'zip', root_dir=src)
print(archive)
for name in zipfile.ZipFile(archive).namelist():
    print('  ', name)
```

The `zcommon` folder sits at the **root** of the archive. That matters: the zip file plays the role of a directory on `sys.path`, so the package must be at its top level.

To prove that the import really comes from the zip, we'll delete the original folder, then put the archive on `sys.path`:

```python run
shutil.rmtree(src)
print('source folder still exists?', src.exists())

for name in [k for k in sys.modules if k.split('.')[0] == 'zcommon']:
    del sys.modules[name]

sys.path.append(archive)
importlib.invalidate_caches()

import zcommon
from zcommon import helpers, validators

print(helpers.say_hello('Python'), helpers.factorial(5), validators.is_integer(10))
```

Everything works as before: relative imports, `__all__`, sub-packages. Only the locations look different:

```python run
print(zcommon.__file__)
print(zcommon.helpers.text.__file__)
print(zcommon.__path__)
print(zcommon.__spec__.loader)
```

<div class="callout tip">
<span class="callout-title">From a terminal</span>

On a desktop, you'd typically build the archive with the `zipfile` command-line interface and add it to the path with `PYTHONPATH`:

```python
$ python -m zipfile -c zcommon_lib.zip zcommon/
$ PYTHONPATH=zcommon_lib.zip python main.py
```

A `sys.path` entry can even point to a folder *inside* the archive, such as `bundle.zip/lib`.

</div>

## Data files inside an archive

Code that finds its data files with `open()` and a path built from `__file__` breaks once the package is zipped, because `zcommon_lib.zip/zcommon/greeting.txt` is not a real path on disk:

```python run
data_path = Path(zcommon.__file__).parent / 'greeting.txt'
try:
    open(data_path)
except OSError as ex:
    print(type(ex).__name__, ex)
```

The portable way is `importlib.resources` (Python 3.9+ for `files()`), which asks the package's loader for the data, wherever it lives:

```python run
from importlib.resources import files

files('zcommon').joinpath('greeting.txt').read_text()
```

The same call works for a package in a normal directory, so it's the right habit for any package that ships data files.

## Limitations to know about

- **Compiled extension modules** (`.so`, `.pyd`) can't be imported from a zip; the operating system needs a real file to load them. Pure Python code is fine.
- **No bytecode caching**: Python never writes `__pycache__` files into an archive, so `.py` files in a zip are compiled again in every new process. If start-up time matters, put pre-compiled `.pyc` files in the archive, for instance with `zipfile.PyZipFile`:

```python run
compiled = workdir / 'compiled.zip'
with zipfile.PyZipFile(compiled, 'w') as pz:
    tmp = workdir / 'tiny'
    tmp.mkdir()
    (tmp / 'tiny_mod.py').write_text('answer = 42\n')
    pz.writepy(str(tmp / 'tiny_mod.py'))

print(zipfile.ZipFile(compiled).namelist())

sys.modules.pop('tiny_mod', None)
sys.path.append(str(compiled))
importlib.invalidate_caches()
import tiny_mod
print(tiny_mod.answer, tiny_mod.__file__)
```

- **Namespace packages** in a zip need explicit directory entries (like `zcommon/` in the listing above). `shutil.make_archive` adds them; archives built file-by-file with `ZipFile.writestr` may not have them.

## Zips for distribution and for running

Zipped packages are a simple way to ship a library as a single file that's dropped onto `sys.path`. They are also the basis of runnable zip applications: as you saw with `__main__`, an archive that contains a `__main__.py` at its root can be run directly with `python app.zip`, and the standard library's `zipapp` module builds such `.pyz` files. Wheels, the standard format for installing packages with `pip`, are zip archives too, although `pip` unpacks them into `site-packages` instead of importing them zipped.

## Modules and packages: the big picture

To close the section, here is the whole import story in one place:

1. `import a.b` first looks in `sys.modules`; a cache hit returns immediately.
2. Otherwise each finder in `sys.meta_path` is asked for a spec. For file-based code, `PathFinder` searches `sys.path` for top-level names and the parent package's `__path__` for sub-modules. Entries can be directories or zip files.
3. The spec's loader creates the module object, which is cached in `sys.modules` *before* its code runs, and then executes the code inside the module's namespace.
4. Packages are modules with a `__path__`: directories with `__init__.py` (regular) or without it (namespace). Parents are imported before their children.
5. The import statement then binds names in the importing namespace: the module, an alias, or selected attributes.

<div class="takeaways">

## Key takeaways

- A zip archive on `sys.path` behaves like a directory: `zipimport` imports modules and packages from it without extracting anything.
- Packages must sit at the root of the archive (or of the sub-path named in `sys.path`).
- `__file__` and `__path__` then point inside the archive, so read data files with `importlib.resources`, not `open()`.
- Zips can't hold importable C extensions, and Python won't cache bytecode in them; ship `.pyc` files (e.g. with `PyZipFile`) if load time matters.
- A zip with a `__main__.py` is a runnable application.

</div>
