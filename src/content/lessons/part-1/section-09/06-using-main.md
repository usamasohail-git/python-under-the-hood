---
title: Using __main__
summary: A module's __name__ tells it whether it was imported or run as the program. The `if __name__ == '__main__'` guard, `__main__.py` files and runnable zip archives all build on that.
minutes: 13
---

## Every module knows its name

When Python loads a module, it sets the module's global `__name__`. For an imported module that's simply the module's name. But the code Python is **running as the program**, the script you started or the code you type in a notebook cell, gets the special name `'__main__'`:

```python run
print(__name__)
```

Let's write a module that prints its own name and import it:

```python run
import importlib, runpy, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

def write_module(name, source):
    (workdir / f'{name}.py').write_text(source)
    importlib.invalidate_caches()
    sys.modules.pop(name, None)

write_module('module6', '''
print(f'loading module6: __name__ = {__name__}')

if __name__ == '__main__':
    print('module6 was run as the program')
''')

import module6
```

Imported, its `__name__` is `'module6'`, so the `if` block was skipped.

## Running a file as a script

From a terminal you'd run the same file directly:

```python
$ python module6.py
loading module6: __name__ = __main__
module6 was run as the program
```

There is no terminal in the browser, but the standard library's `runpy` module does the same job: `runpy.run_path(path, run_name='__main__')` executes a file as if it were the program, with `__name__` set to `'__main__'`.

```python run
_ = runpy.run_path(str(workdir / 'module6.py'), run_name='__main__')
```

Same file, different `__name__`, different behavior. That's the whole trick behind the guard:

```python
if __name__ == '__main__':
    # runs only when this file is the program, not when it's imported
    ...
```

<div class="callout note">
<span class="callout-title">`__main__` is also a module</span>

The running program is itself a module object, stored in `sys.modules['__main__']`. In a regular script, `import __main__` gives you access to the script's globals from anywhere. (In this browser environment, each lesson page runs in a separate namespace, so `sys.modules['__main__']` belongs to the runtime itself.)

</div>

## Why the guard matters

Without the guard, *importing* a module that is meant to be run would also execute its "program" part. The guard lets one file be both:

- a **library**, whose functions other code can import, and
- a **script**, with a command-line interface for direct use.

Here is a small timing utility in that style. Its functions are reusable, and the part under the guard parses command-line arguments with `argparse`:

```python run
write_module('timing', '''
"""Times how long a snippet of code takes to run over multiple iterations."""
import argparse
from collections import namedtuple
from time import perf_counter

Timing = namedtuple('Timing', 'repeats elapsed average')

def timeit(code, repeats=10):
    code = compile(code, filename='<string>', mode='exec')
    start = perf_counter()
    for _ in range(repeats):
        exec(code)
    elapsed = perf_counter() - start
    return Timing(repeats, elapsed, elapsed / repeats)

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('code', help='The Python code snippet to be timed.')
    parser.add_argument('-r', '--repeats', type=int, default=10,
                        help='Number of times to repeat the test.')
    args = parser.parse_args(argv)
    print(f'timing: {args.code}...')
    result = timeit(args.code, repeats=args.repeats)
    print(f'{result.repeats} repeats, average {result.average:.6f}s')

if __name__ == '__main__':
    main()
''')

import timing
result = timing.timeit('sum(range(10_000))', repeats=5)
print(result.repeats, result.elapsed > 0)
```

Importing `timing` printed nothing: the guard kept `main()` from running, so we could just use `timing.timeit` as a library function.

On the command line, the same file becomes a tool:

```python
$ python timing.py "sum(range(10_000))" -r 20
timing: sum(range(10_000))...
20 repeats, average 0.000071s
```

When run as a script, `parse_args()` reads the arguments from `sys.argv`. We can simulate exactly that by setting `sys.argv` the way the terminal would, then running the file as `__main__`:

```python run
saved_argv = sys.argv
try:
    sys.argv = ['timing.py', 'sum(range(10_000))', '-r', '20']
    runpy.run_path(str(workdir / 'timing.py'), run_name='__main__')
finally:
    sys.argv = saved_argv
```

<div class="callout tip">
<span class="callout-title">Put the script logic in a `main()` function</span>

Keeping only `main()` under the guard, and letting `main` accept an optional argument list, makes the command-line part testable too: you can call `timing.main(['1 + 1', '-r', '3'])` without touching `sys.argv`. It also keeps the script's variables out of the module's global namespace.

```python run
timing.main(['1 + 1', '-r', '3'])
```

</div>

## `__main__.py`: making folders and packages runnable

Python can also run a **directory** or a **zip file**, as long as it contains a file named `__main__.py`. That file is executed as the program:

```python
$ python my_app/          # runs my_app/__main__.py
$ python my_app.zip       # runs __main__.py inside the archive
$ python -m my_package    # runs my_package/__main__.py
```

The `-m` option runs a module found on `sys.path`; for a package it runs the package's `__main__` submodule. That's how standard-library tools like `python -m json.tool`, `python -m zipfile` or `python -m venv` work. `runpy.run_module` is the in-code equivalent:

```python run
pkg = workdir / 'tools6'
pkg.mkdir(exist_ok=True)
(pkg / '__init__.py').write_text("print(f'package init: __name__ = {__name__}')\n")
(pkg / '__main__.py').write_text("print(f'package __main__.py: __name__ = {__name__}')\n")
importlib.invalidate_caches()
for name in ('tools6', 'tools6.__main__'):
    sys.modules.pop(name, None)

_ = runpy.run_module('tools6', run_name='__main__')
```

The package's `__init__.py` ran first, as a normal import (`__name__` is `'tools6'`), and then its `__main__.py` ran as the program.

## Shipping an app as a single zip file

Because a zip file with a `__main__.py` is runnable, you can bundle a small application into one file. The other modules in the archive are importable, because Python puts the archive itself on `sys.path` while it runs. Let's build one with the `zipfile` module:

```python run
import zipfile

app_zip = workdir / 'my_app.zip'
with zipfile.ZipFile(app_zip, 'w') as zf:
    zf.write(workdir / 'timing.py', arcname='timing.py')
    zf.writestr('__main__.py', '''
print(f'running __main__.py from the archive: __name__ = {__name__}')
import timing
print(timing.__file__)
timing.main(['[i ** 2 for i in range(1000)]', '-r', '5'])
''')

print(zipfile.ZipFile(app_zip).namelist())
```

```python run
sys.modules.pop('timing', None)   # so the archive's copy gets imported
_ = runpy.run_path(str(app_zip), run_name='__main__')
```

Look at `timing.__file__`: the module was imported from **inside** the zip archive. From a terminal, this is just `python my_app.zip`. The standard library's `zipapp` module automates building such archives (conventionally with a `.pyz` extension), and can even add a `#!` line so the file runs like any executable:

```python
$ python -m zipapp my_app -o my_app.pyz
$ python my_app.pyz
```

<div class="takeaways">

## Key takeaways

- `__name__` is the module's name when it's imported, and `'__main__'` for the code running as the program.
- `if __name__ == '__main__':` lets a file work as both an importable module and a script. Put the script logic in a `main()` function.
- `python dir/`, `python app.zip` and `python -m package` all run a `__main__.py` file.
- `runpy.run_path` and `runpy.run_module` run code as `__main__` from within Python.
- A zip file containing `__main__.py` (and your modules) is a self-contained, runnable application; `zipapp` builds them.

</div>
