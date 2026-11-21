---
title: Class Attributes
summary: Names assigned in a class body become class attributes, stored in the class namespace and readable, writable and deletable at run time.
minutes: 12
---

## Defining class attributes

Any name you assign inside a class body becomes an **attribute of the class**:

```python run
class Program:
    language = 'Python'
    version = '3.6'

print(Program.language)
print(Program.version)
print(Program.__name__)
```

`language` and `version` are attributes we created. `__name__` is one Python created for us. All of them are accessed the same way, with **dotted notation**: `object.attribute`.

## Reading and writing: dots, `getattr` and `setattr`

Dotted notation works for assignment too, so class attributes can be changed after the class is created:

```python run
Program.version = '3.13'
Program.version
```

The built-in functions `getattr` and `setattr` do the same thing, but take the attribute name as a **string**. That's what makes them useful: the name can be computed at run time, read from a config file, and so on.

```python run
print(getattr(Program, 'version'))
setattr(Program, 'version', '3.12')
print(Program.version)

field = 'language'
print(getattr(Program, field))
```

`getattr` also accepts a default, returned when the attribute doesn't exist, instead of raising `AttributeError`:

```python run
print(getattr(Program, 'author', 'unknown'))
try:
    Program.author
except AttributeError as ex:
    print('AttributeError:', ex)
```

Python is dynamic, so you're not limited to the attributes in the class body. You can create brand-new ones at any time:

```python run
Program.x = 100
setattr(Program, 'y', 200)
print(Program.x, Program.y)
```

## Where the state lives: the class namespace

Every class has a **namespace**, a dictionary that maps attribute names to values. It's exposed as `__dict__`:

```python run
Program.__dict__
```

There are `language`, `version`, `x` and `y`, along with some housekeeping entries Python added: `__module__` (where the class was defined), `__doc__` (the docstring, `None` here), and descriptors for `__dict__` and `__weakref__` that instances will use.

<div class="callout modern">
<span class="callout-title">New entries in Python 3.13</span>

Older notebooks show a shorter class `__dict__`. Python 3.13 adds two entries to every class defined in Python code: `__firstlineno__`, the line number where the `class` statement starts, and `__static_attributes__`, a tuple of the names assigned as `self.<name>` inside the class's methods. Both exist mainly for tools such as `inspect`.

</div>

Notice that `__dict__` isn't a plain `dict`, but a `mappingproxy`:

```python run
print(type(Program.__dict__))
print(Program.__dict__['language'])
print(list(Program.__dict__)[:4])
```

A `mappingproxy` is a **read-only view** of the real dictionary. You can look things up, iterate over it and so on, but you can't assign through it:

```python run
try:
    Program.__dict__['language'] = 'Java'
except TypeError as ex:
    print('TypeError:', ex)
```

Why the restriction? The interpreter keeps internal shortcuts for every class: a cache that speeds up attribute lookups, and C-level slots for special methods such as `__add__` or `__len__`. Changing the namespace has to go through `setattr` (or dotted assignment) so Python can keep those shortcuts in sync. Changes made that way show up in the view immediately:

```python run
setattr(Program, 'x', -10)
Program.__dict__['x']
```

## Deleting attributes

Attributes can be removed with the `del` statement or the `delattr` function:

```python run
del Program.x
delattr(Program, 'y')
print('x' in Program.__dict__, 'y' in Program.__dict__)
```

Deleting something that doesn't exist raises `AttributeError`, just like reading it would.

## Not everything is in `__dict__`

A word of caution: the class `__dict__` holds the attributes *defined* in the class, but a class can have attributes that live somewhere else. `__name__`, for example, is stored in the class object's internal C structure and provided by `type`:

```python run
print(Program.__name__)
print('__name__' in Program.__dict__)
```

So "is it in `__dict__`?" and "does the attribute exist?" are different questions. To check existence, use `hasattr` (or `getattr` with a default):

```python run
print(hasattr(Program, '__name__'), hasattr(Program, 'language'), hasattr(Program, 'x'))
```

<div class="takeaways">

## Key takeaways

- Names assigned in the class body are **class attributes**, stored in the class namespace.
- Read and write them with dotted notation or `getattr`/`setattr`; remove them with `del` or `delattr`.
- `getattr(obj, name, default)` returns `default` instead of raising `AttributeError`.
- `Class.__dict__` is a read-only `mappingproxy`: modify the class through `setattr`, not through the proxy.
- Not every attribute is in `__dict__` (`__name__` isn't). Use `hasattr` to test for existence.

</div>
