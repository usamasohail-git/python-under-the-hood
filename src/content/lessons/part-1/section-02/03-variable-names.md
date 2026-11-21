---
title: Variable Names
summary: The rules every identifier must follow, what leading and trailing underscores signal, and the PEP 8 naming conventions.
minutes: 10
---

## Identifiers are case-sensitive

Names for variables, functions, classes, modules and so on are called **identifiers**. Python treats uppercase and lowercase letters as different, so these are four separate names:

```python run
my_var = 1
my_Var = 2
ham = 3
Ham = 4
print(my_var, my_Var, ham, Ham)
```

That works, but it's a recipe for confusion. Don't make names that differ only in case.

## The rules (must)

An identifier **must**:

1. start with a letter or an underscore `_`,
2. continue with any number of letters, digits or underscores,
3. not be a **reserved word** (keyword).

So `var`, `my_var`, `index1`, `index_1`, `_var`, `__var` and `__lt__` are all legal. `1index` and `my-var` are not.

`str.isidentifier()` applies the rules for you:

```python run
for name in ['var', 'my_var', 'index1', '_var', '__lt__', '1index', 'my-var', 'my var', 'café']:
    print(f'{name!r:>10}  {name.isidentifier()}')
```

Notice `'café'`: since Python 3, identifiers can contain Unicode letters, not just `a`–`z`. That's legal, but ASCII names are easier for everyone to type and read.

### Reserved words

Keywords are the words that make up the language itself, like `if`, `def` and `return`, so you can't use them as names:

```python run
import keyword

print(len(keyword.kwlist), 'keywords:')
print(', '.join(keyword.kwlist))

try:
    compile('class = 5', '<example>', 'exec')
except SyntaxError as ex:
    print('\nSyntaxError:', ex.msg)
```

<div class="callout modern">
<span class="callout-title">Modern Python: soft keywords</span>

Newer Python versions added **soft keywords**. These words act as keywords only in a specific context, so existing code that uses them as names keeps working: `match`, `case` and `_` (pattern matching, 3.10) and `type` (type aliases, 3.12).

```python run
print(keyword.softkwlist)
match = 'still a valid variable name'
print(match)
```

</div>

## The conventions for underscores (should)

Underscores at the start or end of a name don't change whether it's *legal*, but by convention they carry meaning.

### `_name`: internal

A single leading underscore says "this is internal, please don't rely on it". Python has no truly private names, so this is a signal to other programmers. There is one real effect: `from module import *` skips names that start with an underscore.

```python run
import sys, tempfile, importlib, pathlib

folder = tempfile.mkdtemp()
pathlib.Path(folder, 'shapes_demo.py').write_text(
    "public_value = 'visible'\n"
    "_internal_value = 'hidden from import *'\n"
)
sys.path.insert(0, folder)
importlib.invalidate_caches()

namespace = {}
exec('from shapes_demo import *', namespace)
print('public_value' in namespace, '_internal_value' in namespace)

import shapes_demo
print(shapes_demo._internal_value)   # still reachable directly
```

### `__name`: name mangling

Two leading underscores, inside a class, trigger **name mangling**: Python renames `__secret` to `_ClassName__secret`. This keeps a subclass from accidentally overwriting a parent's attribute of the same name. You'll see why that matters in Part 4.

```python run
class Account:
    def __init__(self):
        self.__pin = 1234          # stored as _Account__pin

acct = Account()
print([name for name in vars(acct)])
try:
    acct.__pin
except AttributeError as ex:
    print('AttributeError:', ex)
```

### `__name__`: dunder names

Names that start **and** end with two underscores ("dunder" names) are reserved for Python's own special meanings: `__init__`, `__len__`, `__lt__` and many more. Python looks for these names when you use built-in syntax. For example, `x < y` runs `x.__lt__(y)`:

```python run
class Version:
    def __init__(self, major, minor):
        self.major, self.minor = major, minor
    def __lt__(self, other):
        return (self.major, self.minor) < (other.major, other.minor)

print(Version(3, 12) < Version(3, 13))
print(Version(3, 12).__lt__(Version(3, 13)))   # what the < operator actually calls
```

**Use** the dunder names Python defines, but **never invent your own**. A future Python version could give your made-up dunder name a meaning, and then your code would behave strangely.

## PEP 8 naming conventions

[PEP 8](https://peps.python.org/pep-0008/) is Python's official style guide, and it's well worth reading in full. Its naming conventions:

| Kind of name | Convention | Example |
|---|---|---|
| Package | short, all lowercase, preferably no underscores | `utilities` |
| Module | short, all lowercase, underscores allowed | `db_utils`, `dbutils` |
| Class | CapWords (each word capitalized, no underscores) | `BankAccount` |
| Function / method | lowercase words separated by underscores (snake_case) | `open_account` |
| Variable | snake_case | `account_id` |
| Constant | all uppercase with underscores | `MIN_APR` |

You don't *have* to follow PEP 8, and some teams have their own rules. But it's what most Python code looks like, so following it makes your code instantly familiar to other Python programmers. Tools like `ruff`, `flake8` and `pylint` can check names for you.

<div class="callout tip">
<span class="callout-title">Constants are a convention too</span>

Python has no `const` keyword. `MIN_APR = 0.05` can still be reassigned; the uppercase name just tells readers "don't change this". (Type checkers understand `typing.Final` if you want a tool to enforce it.)

</div>

<div class="takeaways">

## Key takeaways

- Identifiers are case-sensitive, must start with a letter or `_`, may contain letters, digits and `_`, and can't be keywords. `str.isidentifier()` and `keyword.kwlist` check this for you.
- `_name` marks something internal and is skipped by `from module import *`.
- `__name` inside a class is mangled to `_ClassName__name`.
- `__name__` dunder names belong to Python: use them, never invent them.
- Follow PEP 8: `snake_case` for functions and variables, `CapWords` for classes, `UPPER_CASE` for constants, short lowercase names for modules and packages.

</div>
