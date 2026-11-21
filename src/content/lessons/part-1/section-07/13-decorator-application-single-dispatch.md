---
title: Decorator Application - Single Dispatch
summary: One function name, different implementations per argument type. We build a single-dispatch decorator from closures, then switch to functools.singledispatch.
minutes: 22
---

## Overloading, and why Python doesn't have it

In statically typed languages like Java or C#, you can **overload** a function: define several functions with the same name but different parameter types, and the compiler picks the right one from the argument types at each call site.

Python can't do this. Parameters have no declared types (annotations are just hints), and a later `def` with the same name simply re-binds the name to a new function. Distinguishing overloads by the *number* of parameters gets messy too, once `*args` and `**kwargs` come into play.

What we can do is **dispatch**: have one public function that looks at the type of its argument at run time and hands the work to a type-specific implementation. When the choice depends on the type of a single argument (the first one), it's called **single dispatch**. In this lesson we'll build it ourselves with closures and decorators, then use the standard library's version.

## The example: rendering values as HTML

We want to render values as HTML, differently per type:

- integers: the value plus its hex form,
- floats: rounded to 2 decimal places,
- strings: HTML-escaped, with newlines turned into `<br/>`,
- lists and tuples: a bulleted `<ul>` list,
- dicts: a bulleted list of `key=value` pairs,
- anything else: the escaped `str()` of the value.

Start with one function per type:

```python run
from html import escape

def html_escape(arg):
    return escape(str(arg))

def html_int(a):
    return f'{a}(<i>{hex(a)}</i>)'

def html_real(a):
    return f'{a:.2f}'

def html_str(s):
    return html_escape(s).replace('\n', '<br/>\n')

def html_list(l):
    items = (f'<li>{html_escape(item)}</li>' for item in l)
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

def html_dict(d):
    items = (f'<li>{html_escape(k)}={html_escape(v)}</li>' for k, v in d.items())
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

print(html_str('this is\na multi line string\nwith special characters: 10 < 100'))
print(html_int(255))
print(html_escape(3 + 10j))
```

## A hand-written dispatcher

Callers shouldn't have to pick the right `html_...` function themselves. A first dispatcher uses `isinstance` checks:

```python run
from decimal import Decimal

def htmlize(arg):
    if isinstance(arg, int):
        return html_int(arg)
    elif isinstance(arg, (float, Decimal)):
        return html_real(arg)
    elif isinstance(arg, str):
        return html_str(arg)
    elif isinstance(arg, (list, tuple, set)):
        return html_list(arg)
    elif isinstance(arg, dict):
        return html_dict(arg)
    else:
        return html_escape(arg)     # the default

print(htmlize([1, 2, 3]))
print(htmlize(dict(key1=1, key2=2)))
print(htmlize(255))
```

But nested values aren't rendered properly: the list renderer just escapes its items.

```python run
print(htmlize(['first element is\na multi-line string', (1, 2, 3)]))
```

The multi-line string kept its newline, the tuple wasn't turned into a list, and the integers have no hex. The fix is for the container renderers to call `htmlize` on their items:

```python run
def html_list(l):
    items = (f'<li>{htmlize(item)}</li>' for item in l)
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

def html_dict(d):
    items = (f'<li>{html_escape(k)}={htmlize(v)}</li>' for k, v in d.items())
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

print(htmlize(['first element is\na multi-line string', (1, 2, 3)]))
```

Now `htmlize` calls `html_list`, which calls `htmlize`. Is that circular? No problem at all: a function body only looks up names when it **runs**. As long as every function exists by the time `htmlize` is first called, the order of the `def` statements doesn't matter.

The real weakness is that `if/elif` chain. Every new type means editing `htmlize` itself, and code outside our module (say, someone with a custom `Money` class) can't add a renderer without changing our code.

## Building a single-dispatch decorator

Here's the plan: keep a **registry** dictionary mapping types to functions, and look up the argument's type in it. The registry will be a free variable of a closure, and we'll let outside code add entries through a decorator.

**Step 1.** A decorator that registers the decorated function as the default, under the key `object`:

```python run
def singledispatch(fn):
    registry = {object: fn}

    def inner(arg):
        return registry[object](arg)

    return inner

@singledispatch
def htmlizer(arg):
    return escape(str(arg))

htmlizer('a < 10')
```

So far this just calls the original function, but it has a registry.

**Step 2.** Look up the argument's type, falling back to the `object` entry:

```python run
def singledispatch(fn):
    registry = {object: fn}
    registry[int] = lambda arg: f'{arg}(<i>{hex(arg)}</i>)'
    registry[float] = lambda arg: f'{arg:.2f}'

    def inner(arg):
        impl = registry.get(type(arg), registry[object])
        return impl(arg)

    return inner

@singledispatch
def htmlize(a):
    return escape(str(a))

print(htmlize(10), htmlize(3.1415), htmlize('<b>'))
```

That works, but the entries are still hard-coded inside the decorator.

**Step 3.** Let outside code register implementations. We need a parameterized decorator, `register(type_)`, that stores the decorated function in the registry. Since it must modify *this particular* registry, it has to be a closure over it, created inside `singledispatch`. To make it reachable from outside, we attach it to the returned function **as an attribute** (functions are objects, so they can carry attributes). While we're at it, we also expose a `dispatch(type_)` helper and a read-only view of the registry:

```python run
def singledispatch(fn):
    registry = {object: fn}

    def register(type_):
        def inner(fn):
            registry[type_] = fn
            return fn            # return fn so register() calls can be stacked
        return inner

    def dispatch(type_):
        return registry.get(type_, registry[object])

    def decorator(arg):
        return dispatch(type(arg))(arg)

    decorator.register = register
    decorator.dispatch = dispatch
    decorator.registry = registry.keys()
    return decorator

@singledispatch
def htmlize(arg):
    return escape(str(arg))

print(htmlize.registry)
print(htmlize.dispatch(str))
```

`register`, `dispatch` and `decorator` all close over the **same** `registry` cell, because they were created in the same call to `singledispatch`. Now we can register implementations from anywhere:

```python run
@htmlize.register(int)
def html_int(a):
    return f'{a}(<i>{hex(a)}</i>)'

@htmlize.register(float)
def html_real(a):
    return f'{a:.2f}'

@htmlize.register(str)
def html_str(s):
    return escape(s).replace('\n', '<br/>\n')

@htmlize.register(tuple)
@htmlize.register(list)
def html_list(l):
    items = (f'<li>{htmlize(item)}</li>' for item in l)
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

@htmlize.register(dict)
def html_dict(d):
    items = (f'<li>{htmlize(k)}={htmlize(v)}</li>' for k, v in d.items())
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

print(htmlize.registry)
print(htmlize.dispatch(int))
print(htmlize([1, 2, 3]))
print(htmlize((1, 'a < b')))
```

Because `inner` returns `fn` unchanged, the two stacked `register` lines put the same function under both `list` and `tuple`.

### Where our version falls short

Our dispatcher matches `type(arg)` **exactly**. That breaks down with inheritance:

```python run
from numbers import Integral

print(isinstance(100, Integral), isinstance(True, Integral))
print(type(100) is Integral, type(True))
print(htmlize(True))          # bool isn't int, so it falls back to the default
```

`bool` is a subclass of `int`, but `registry.get(bool)` finds nothing and uses the default. Likewise, registering the abstract base class `numbers.Integral`, or `collections.abc.Sequence` for "any sequence", wouldn't match anything, because no value's `type()` is ever exactly `Integral` or `Sequence`. Fixing this means walking the class hierarchy and choosing the closest registered type, which is fiddly. We also only support functions of a single argument.

## `functools.singledispatch`

The standard library has a complete implementation with the same interface: `register`, `dispatch` and `registry`. It dispatches on the type of the **first positional argument**, and it understands inheritance and abstract base classes.

```python run
from functools import singledispatch
from collections.abc import Sequence

@singledispatch
def htmlize(a):
    return escape(str(a))

@htmlize.register(Integral)
def htmlize_int(a):
    return f'{a}(<i>{hex(a)}</i>)'

print(htmlize.dispatch(int).__name__, htmlize.dispatch(bool).__name__)
print(htmlize(100), htmlize(True))
```

Registering `Integral` covers `int`, `bool`, and any other integral type.

### The closest match wins

Now register a renderer for any `Sequence`:

```python run
@htmlize.register(Sequence)
def html_sequence(l):
    items = (f'<li>{htmlize(item)}</li>' for item in l)
    return '<ul>\n' + '\n'.join(items) + '\n</ul>'

print(htmlize.dispatch(list).__name__)
print(htmlize.dispatch(tuple).__name__)
print(htmlize.dispatch(str).__name__)
```

Careful: a `str` is a `Sequence` too! Calling `htmlize('abc')` right now would render each character with `htmlize`, and each character is itself a one-character string, which is a sequence, which renders its one character with `htmlize`... an infinite recursion that ends in `RecursionError`. (We won't run it.) The fix is to register `str` explicitly:

```python run
@htmlize.register(str)
def html_str(s):
    return escape(s).replace('\n', '<br/>\n')

print(htmlize.dispatch(str).__name__)
print(htmlize('abc'))
```

A string is both a `str` and a `Sequence`, and `singledispatch` picks the **most specific** registered type, following the class's method resolution order. Our hand-made version couldn't do this. The same rule lets us special-case tuples while lists keep the generic sequence renderer:

```python run
@htmlize.register(tuple)
def html_tuple(t):
    items = (escape(str(item)) for item in t)
    return '(' + ', '.join(items) + ')'

print(htmlize.dispatch(list).__name__, htmlize.dispatch(tuple).__name__)
print(htmlize(['a', 100, 3.14]))
print(htmlize(('a', 100, 3.14)))
```

Types with no better match fall back to the function we decorated with `@singledispatch`, which is registered under `object`:

```python run
print(htmlize.dispatch(type(None)).__name__)
print(htmlize.dispatch(complex).__name__)
print(htmlize(1 + 1j))
```

### Dispatch uses the first argument only

The implementations can take extra arguments; only the first one's type matters:

```python run
@singledispatch
def describe(value, prefix='value'):
    return f'{prefix}: something'

@describe.register(int)
def _(value, prefix='value'):
    return f'{prefix}: the integer {value}'

print(describe(42, prefix='answer'))
print(describe('hi', 'greeting'))

try:
    describe(prefix='nothing to dispatch on')
except TypeError as ex:
    print('TypeError:', ex)
```

## The `_` naming convention

Notice the implementation above is called `_`. The registered functions are reached through the dispatcher, so their own names hardly matter, and `_` is the conventional "I don't care about this name" name. You can even register a lambda by calling `register(type)` directly:

```python run
@singledispatch
def htmlize(a):
    return escape(str(a))

@htmlize.register(int)
def _(a):
    return f'{a}({hex(a)})'

@htmlize.register(str)
def _(s):
    return escape(s).replace('\n', '<br/>\n')

htmlize.register(float)(lambda f: f'{f:.2f}')

print(htmlize(100), htmlize(3.1415), htmlize('a < 10'))
print(htmlize.registry.keys())
print(htmlize.registry[int] is htmlize.registry[str])
```

Both implementations were bound to the name `_`, one after the other. The second `def` re-bound `_` to a new function, but the first function wasn't lost: the registry still holds a reference to it. Two separate function objects that happen to share a `__name__`:

```python run
print(htmlize.registry[int].__name__, htmlize.registry[str].__name__)
print(hex(id(htmlize.registry[int])), hex(id(htmlize.registry[str])))
```

This is the same thing that happens whenever you re-define a function while another name still refers to the old one: names point to objects, and re-binding a name doesn't destroy the object it used to point to.

<div class="callout modern">
<span class="callout-title">Registering by type annotation (3.7+), unions (3.11+), and methods (3.8+)</span>

Older code always passes the type to `register`. Since Python 3.7 you can let `register` read the type from the annotation of the first parameter instead, and since 3.11 a union type registers the function for each member:

```python run
@singledispatch
def to_json(value):
    raise TypeError(f'cannot serialize {type(value).__name__}')

@to_json.register
def _(value: bool):
    return 'true' if value else 'false'

@to_json.register
def _(value: int | float):           # union: needs Python 3.11+
    return repr(value)

@to_json.register
def _(value: str):
    return '"' + value.replace('"', '\\"') + '"'

@to_json.register
def _(value: list):
    return '[' + ', '.join(to_json(v) for v in value) + ']'

print(to_json([1, 2.5, True, 'say "hi"']))
try:
    to_json({1, 2})
except TypeError as ex:
    print('TypeError:', ex)
```

Note that `True` became `true`, not `1`: `bool` is more specific than `int`, so its implementation wins. For methods, where the first argument is `self`, use `functools.singledispatchmethod` (3.8+), which dispatches on the first argument *after* `self`.

</div>

<div class="takeaways">

## Key takeaways

- Python has no type-based overloading; **single dispatch** picks an implementation at run time from the type of the first argument.
- A big `if/elif isinstance` chain works but is closed to extension. A **registry** of type → function is open: anyone can add to it.
- We built `singledispatch` from closures: the registry is a free variable, and `register`/`dispatch` are closures attached to the returned function as attributes.
- `functools.singledispatch` does it properly: it understands subclasses and ABCs like `Integral` and `Sequence`, and picks the **most specific** registered type.
- Watch for overlapping types, like `str` being a `Sequence`; register the more specific type explicitly.
- Implementations are often named `_`. Since 3.7 `register` can read the type from an annotation, unions work since 3.11, and `singledispatchmethod` handles methods.

</div>
