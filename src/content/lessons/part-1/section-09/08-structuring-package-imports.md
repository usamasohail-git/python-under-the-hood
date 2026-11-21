---
title: Structuring Package Imports
summary: Use relative imports and __all__ in a package's __init__.py files to expose a small, flat public interface while keeping the implementation split into many modules.
minutes: 16
---

## Two points of view

A package has two kinds of people looking at it:

- **its developer**, who wants many small, focused modules that are easy to write and test;
- **its users** (often the same developer, later), who just want to call `validators.is_json(...)` without knowing which file it lives in.

The `__init__.py` files are where you reconcile the two. Let's build a package called `common` and see how.

## The package

```python
common/
    __init__.py
    validators/
        __init__.py
        boolean.py      is_boolean     + private helpers
        date.py         is_date        + private helpers
        json.py         is_json        + private helpers
        numeric.py      is_integer, is_numeric
    models/
        __init__.py
        posts/
            __init__.py
            post.py     Post
            posts.py    Posts
        users/
            __init__.py
            user.py     User
```

We'll write all the files from a dictionary of `path: source`. This first version has **empty** `__init__.py` files:

```python run
import importlib, sys, tempfile
from pathlib import Path

workdir = Path(tempfile.mkdtemp())
sys.path.insert(0, str(workdir))

def write_files(files):
    for rel, source in files.items():
        path = workdir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(source)
    importlib.invalidate_caches()

def forget(prefix):
    """Remove a package and all its sub-modules from the module cache."""
    for name in [k for k in sys.modules if k == prefix or k.startswith(prefix + '.')]:
        del sys.modules[name]

modules = {
    'common/validators/boolean.py': '''
__all__ = ['is_boolean']

def is_boolean(arg):
    return _normalize(arg) in {'true', 'false'}

def _normalize(arg):
    return str(arg).strip().lower()
''',
    'common/validators/date.py': '''
__all__ = ['is_date']
from datetime import date

def is_date(arg):
    try:
        date.fromisoformat(arg)
        return True
    except (TypeError, ValueError):
        return False
''',
    'common/validators/json.py': '''
__all__ = ['is_json']
import json      # absolute import: this is the standard library's json

def is_json(arg):
    try:
        json.loads(arg)
        return True
    except (TypeError, ValueError):
        return False

def json_helper():
    return 'not exported'
''',
    'common/validators/numeric.py': '''
__all__ = ['is_integer', 'is_numeric']

def is_integer(arg):
    return isinstance(arg, int) and not isinstance(arg, bool)

def is_numeric(arg):
    return isinstance(arg, (int, float)) and not isinstance(arg, bool)
''',
    'common/models/posts/post.py': "__all__ = ['Post']\n\nclass Post:\n    pass\n",
    'common/models/posts/posts.py': "__all__ = ['Posts']\n\nclass Posts:\n    pass\n",
    'common/models/users/user.py': "__all__ = ['User']\n\nclass User:\n    pass\n",
}
empty_inits = {
    'common/__init__.py': '',
    'common/validators/__init__.py': '',
    'common/models/__init__.py': '',
    'common/models/posts/__init__.py': '',
    'common/models/users/__init__.py': '',
}
write_files(modules | empty_inits)
forget('common')
print(sorted(str(p.relative_to(workdir)) for p in workdir.rglob('*.py')))
```

## With empty `__init__.py` files

Importing a package only runs its `__init__.py`, and these are empty, so nothing below the top level is loaded:

```python run
import common

try:
    common.validators.is_json('{}')
except AttributeError as ex:
    print('AttributeError:', ex)
```

Users have to spell out the internal layout for everything they need:

```python run
from common.validators.json import is_json
from common.validators.date import is_date
from common.models.posts.post import Post
from common.models.users.user import User

print(is_json('{"a": 1}'), is_date('2024-02-29'), Post, User)
```

It works, but every import exposes an implementation detail. If the developer later moves `is_date` into another file, all of that user code breaks.

## Flattening with relative imports and `__all__`

Now let's write `__init__.py` files that pull the public names up to the package level. Two tools make this work:

- **Relative imports**: inside a package, `from .boolean import *` means "from the `boolean` module in *this* package". One dot is the current package, two dots (`..`) its parent, and so on.
- **`__all__`**: each module lists its public names, so a star-import brings in exactly those, never helpers like `_normalize` or `json_helper`.

```python run
inits = {
    'common/validators/__init__.py': '''
from .boolean import *
from .date import *
from .json import *
from .numeric import *

__all__ = boolean.__all__ + date.__all__ + json.__all__ + numeric.__all__
''',
    'common/models/posts/__init__.py': '''
from .post import *
from .posts import *

__all__ = post.__all__ + posts.__all__
''',
    'common/models/users/__init__.py': '''
from .user import *

__all__ = user.__all__
''',
    'common/models/__init__.py': '''
from .posts import *
from .users import *

__all__ = posts.__all__ + users.__all__
''',
    'common/__init__.py': '''
from . import models, validators
''',
}
write_files(inits)
forget('common')

import common
from common import validators, models

print(validators.is_boolean('True'), validators.is_json('{]'), validators.is_integer(10))
print(models.Post(), models.User())
print(validators.__all__)
print(models.__all__)
```

Now the user code is short and doesn't care which file defines what. The developer can reorganize the modules freely, as long as the `__init__.py` files keep exporting the same names.

<div class="callout note">
<span class="callout-title">Where did `boolean.__all__` come from?</span>

Inside `validators/__init__.py` we never wrote `import boolean`, yet the name `boolean` is available. Remember from the last lesson: importing a sub-module sets it as an **attribute of its parent package**. The package's attributes *are* the globals of its `__init__.py`, so `from .boolean import *` also creates the global `boolean` there.

```python run
print(validators.boolean)
print(sorted(name for name in vars(validators) if not name.startswith('__')))
```

</div>

The helpers stay out of the flat interface, though they're still reachable through the module if someone really wants them:

```python run
print(hasattr(validators, 'json_helper'))
print(validators.json.json_helper())
```

And a star-import from a package respects the package's `__all__`:

```python run
ns = {}
exec('from common.models import *', ns)
print([name for name in ns if name != '__builtins__'])
```

## Why relative imports?

We could have written `from common.validators.boolean import *` instead. It works, but it hard-codes the package's own name. Rename the package directory, or vendor it into another project as `myproject.common`, and every such import breaks. Relative imports only describe positions *within* the package, so they survive a rename. Let's copy our package under a new name:

```python run
import shutil

shutil.copytree(workdir / 'common', workdir / 'common_v2')
importlib.invalidate_caches()
forget('common_v2')

import common_v2
print(common_v2.validators.is_date('2025-13-01'))
print(common_v2.validators.boolean.__name__)
```

The copy works without any edits, and its modules are genuinely separate: `common_v2.validators.boolean`, not `common.validators.boolean`.

Relative imports have one restriction: they only make sense inside a package. Code that isn't part of a package, such as a script or this cell, has no "current package" to be relative to:

```python run
try:
    exec('from . import something', {'__name__': '__main__'})
except ImportError as ex:
    print('ImportError:', ex)
```

<div class="callout note">
<span class="callout-title">`validators/json.py` doesn't hide the real `json`</span>

Our package has a module named `json`, and inside it we wrote `import json`. Since Python 3 every plain `import` is **absolute**, searched from `sys.path`, so that line got the standard library module, not the file itself. Only an explicit `from . import json` would refer to the sibling. That's why `is_json` above could call `json.loads`.

</div>

## Code in `__init__.py`: keep it to wiring

An `__init__.py` can contain any code, including function definitions. It works, but readers looking for where `say_hello` is defined rarely think to look in `__init__.py`. Treat `__init__.py` mostly as the package's table of contents: imports, `__all__`, maybe a version string.

Also keep in mind that everything an `__init__.py` imports runs whenever *anything* in the package is imported. With the flattening above, `import common` loads every validator and model. For a small package that's ideal; for a big one with expensive sub-modules, you may want something lazier.

<div class="callout modern">
<span class="callout-title">Python 3.7+: lazy sub-modules with `__getattr__`</span>

A module-level `__getattr__` (PEP 562) in `__init__.py` is called only when an attribute isn't found. That lets a package import a sub-module the first time someone touches it:

```python run
write_files({
    'lazypkg/__init__.py': '''
import importlib

_submodules = {'heavy'}

def __getattr__(name):
    if name in _submodules:
        return importlib.import_module(f'.{name}', __name__)
    raise AttributeError(f'module {__name__!r} has no attribute {name!r}')
''',
    'lazypkg/heavy.py': "print('loading lazypkg.heavy (expensive!)')\nanswer = 42\n",
})
forget('lazypkg')

import lazypkg
print('lazypkg.heavy' in sys.modules)
print(lazypkg.heavy.answer)        # first access triggers the import
print('lazypkg.heavy' in sys.modules)
```

</div>

<div class="takeaways">

## Key takeaways

- Structure the code for the developer (many small modules) and the interface for the user (a few flat names) by importing public names in `__init__.py`.
- Give each module an `__all__`, and combine them in the package's `__all__`; star-imports then bring in only the public API.
- Use relative imports (`from .module import name`, `from .. import pkg`) inside a package, so the package can be renamed or moved. They don't work outside packages.
- Plain `import x` is always absolute, so a sub-module named like a standard-library module doesn't shadow it.
- Keep `__init__.py` to imports and metadata; remember that everything it imports is loaded with the package.

</div>
