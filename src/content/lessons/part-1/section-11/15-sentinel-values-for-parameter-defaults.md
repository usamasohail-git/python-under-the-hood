---
title: Sentinel Values for Parameter Defaults
summary: When None is a meaningful argument, use a private object() as the default to tell "not provided" apart from "provided as None".
minutes: 9
---

## The `None` default and its blind spot

`None` is the usual default for an optional parameter. It lets the function detect "the caller didn't give me anything" and react, and it avoids the mutable-default trap:

```python run
def validate(a=None):
    if a is not None:
        print('Argument was provided')
    else:
        print('Argument was not provided')

validate(100)
validate()
validate(None)
```

The last call is the problem. The caller **did** pass an argument, it just happened to be `None`, and the function can't tell the difference. Often that's fine. But sometimes `None` is a perfectly valid value with its own meaning, and you need three distinct cases:

1. a non-`None` value was passed
2. `None` was passed explicitly
3. nothing was passed at all

A real example is a `dict.get`-style function: `get(key, default)` must behave differently when the caller asks for `None` as the fallback versus not supplying a fallback at all. Another is an "update" function where passing `None` means "clear this field" and omitting it means "leave it alone".

## Choosing a sentinel

A **sentinel** is a special value that stands for "nothing was provided". It must be something the caller can never pass by accident. An "unlikely" value such as `-1`, `''` or `'__missing__'` is not good enough: unlikely is not impossible, and one day someone's data will contain exactly that value.

The reliable answer is a brand new object that only your module has a reference to:

```python run
_sentinel = object()

def validate(a=_sentinel):
    if a is not _sentinel:
        print('Argument was provided')
    else:
        print('Argument was not provided')

validate(100)
validate(None)
validate()
validate(object())
```

Why this works:

- `object()` creates a unique object. No other object in the program is identical to it, so the **identity** test `is not` can only fail for that exact object.
- Even another `object()` instance is a different object, so `validate(object())` counts as "provided".
- The leading underscore signals that `_sentinel` is private. A caller *could* import it and pass it in deliberately, but Python never stops you from shooting yourself in the foot if you try hard enough. The point is that nobody can do it by accident.

Always compare sentinels with `is`, never `==`. A class can define `__eq__` to claim it's equal to anything, but it can't fake identity.

## Keeping the sentinel inside the function

Instead of a module-level variable, you can create the sentinel directly in the signature and fetch it back through the function's `__defaults__` tuple. Default values are evaluated **once**, when the `def` statement runs, and stored on the function object:

```python run
def validate(a=object()):
    default_a = validate.__defaults__[0]
    if a is not default_a:
        print('Argument was provided')
    else:
        print('Argument was not provided')

print(validate.__defaults__)
validate(100)
validate(None)
validate()
```

This keeps everything self-contained, at the cost of being a little harder to read. It works for several parameters too. Positional defaults live in `__defaults__` (in order), and keyword-only defaults live in the dictionary `__kwdefaults__`:

```python run
def validate(a=object(), b=object(), *, kw=object()):
    default_a, default_b = validate.__defaults__
    default_kw = validate.__kwdefaults__['kw']
    for name, value, default in (('a', a, default_a), ('b', b, default_b), ('kw', kw, default_kw)):
        status = 'provided' if value is not default else 'not provided'
        print(f'  {name}: {status}')

print('validate(100, 200, kw=None)')
validate(100, 200, kw=None)
print('validate(b=100)')
validate(b=100)
print('validate()')
validate()
```

<div class="callout note">
<span class="callout-title">A nicer repr for your sentinel</span>

A bare `object()` shows up in `help()` and error messages as something like `<object object at 0x...>`, which tells the reader nothing. A tiny class fixes that while keeping the sentinel unique:

```python run
class _Missing:
    def __repr__(self):
        return '<MISSING>'

MISSING = _Missing()

def get(mapping, key, default=MISSING):
    if key in mapping:
        return mapping[key]
    if default is MISSING:
        raise KeyError(key)
    return default

import inspect
print(inspect.signature(get))
print(get({'a': 1}, 'b', None))
try:
    get({'a': 1}, 'b')
except KeyError as ex:
    print('KeyError:', ex)
```

The standard library uses this pattern too: `dataclasses.MISSING` and `inspect.Parameter.empty` are sentinels for "no default given".

</div>

<div class="takeaways">

## Key takeaways

- A `None` default can't distinguish "not provided" from "provided as `None`".
- Use a unique sentinel, typically `_sentinel = object()`, as the default, and test it with `is`.
- "Unlikely" values like `-1` or a magic string are not safe sentinels.
- Defaults are evaluated once and stored in `__defaults__` and `__kwdefaults__`, so a sentinel can also be created in the signature and read back from there.
- A small class with a custom `__repr__` makes a sentinel readable in signatures and messages.

</div>
