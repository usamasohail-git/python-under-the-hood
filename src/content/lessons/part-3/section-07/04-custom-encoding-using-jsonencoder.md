---
title: Custom Encoding using JSONEncoder
summary: Subclass json.JSONEncoder and override default to bundle your type conversions and formatting options into one reusable encoder class.
minutes: 13
---

## The class behind dumps

`json.dumps` is a thin convenience wrapper. The real work is done by an instance of `json.JSONEncoder`, which knows how to encode this fixed set of types:

| Python | JSON |
|---|---|
| `dict` | object |
| `list`, `tuple` | array |
| `str` | string |
| `int`, `float`, and `int`/`float` enums | number |
| `True` / `False` | `true` / `false` |
| `None` | `null` |

You can use an encoder directly through its `encode` method:

```python run
import json

default_encoder = json.JSONEncoder()
print(default_encoder.encode([1, 2, (3, 4)]))
print(default_encoder.encode({'ok': True, 'value': None}))

try:
    default_encoder.encode(1 + 1j)
except TypeError as ex:
    print('TypeError:', ex)
```

For anything else, the encoder calls its own `default(obj)` method, and the base implementation simply raises that `TypeError`. The `default=` argument from the previous lesson is just a way of replacing that method for one call.

## Overriding default

Subclass `JSONEncoder` and override `default`. Handle the types you care about and hand everything else to `super().default(obj)`, which raises the standard `TypeError`:

```python run
from datetime import datetime, date
from decimal import Decimal

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, arg):
        if isinstance(arg, datetime):
            return arg.isoformat()
        if isinstance(arg, Decimal):
            return str(arg)
        return super().default(arg)

custom_encoder = CustomJSONEncoder()
print(custom_encoder.encode(True))
print(custom_encoder.encode(datetime(2024, 3, 15, 22, 27, 19)))
```

To use the class with `dump`/`dumps`, pass the **class** (not an instance) as `cls`. `dumps` creates an instance with the other keyword arguments you pass:

```python run
record = {'name': 'test', 'time': datetime(2024, 3, 15, 22, 27, 20), 'price': Decimal('9.99')}
print(json.dumps(record, cls=CustomJSONEncoder))

try:
    json.dumps({'z': 1 + 1j}, cls=CustomJSONEncoder)
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">Always return super().default(...)</span>

`super().default(arg)` always raises, so strictly speaking the `return` isn't needed. Write it anyway: it states your intent, and it keeps the method correct if the parent class ever does return something. Forgetting to call the parent at all is the real bug: the method returns `None` and unknown objects become `null`.

</div>

## You can't override built-in types

Both `default=` and `JSONEncoder.default` are only consulted for objects the encoder **can't** handle. You can't use them to change how strings, numbers or lists are written:

```python run
def custom_encoder(arg):
    print('custom encoder called')
    return f'some string: {arg}'

json.dumps({'name': 'Python'}, default=custom_encoder)
```

Nothing was printed: `'Python'` is a `str`, so the function never ran. The same is true for tuples (they always become arrays) and for subclasses of supported types. If you need a different representation for a built-in type, convert the data before encoding it.

## The formatting options

`dumps` and the `JSONEncoder` constructor share a set of keyword-only options. The ones you'll use most:

- `indent`: pretty-print with this many spaces (or this string) per level.
- `separators`: a `(item_separator, key_separator)` pair, `(', ', ': ')` by default.
- `sort_keys`: write object keys in sorted order.
- `ensure_ascii`: escape non-ASCII characters as `\uXXXX` (default `True`).
- `allow_nan`: allow `NaN` and infinities (default `True`).
- `skipkeys`: silently drop keys that aren't `str`, `int`, `float`, `bool` or `None` instead of raising.

### allow_nan

The JSON standard has no way to write infinity or NaN. Python writes `Infinity` and `NaN` anyway (JavaScript understands them), which produces technically invalid JSON that strict parsers reject:

```python run
d = {'a': float('inf'), 'b': [1, 2, 3]}
print(json.dumps(d))

try:
    json.dumps(d, allow_nan=False)
except ValueError as ex:
    print('ValueError:', ex)
```

### skipkeys

```python run
d = {10: 'int', 10.5: 'float', 1 + 1j: 'complex'}
try:
    json.dumps(d)
except TypeError as ex:
    print('TypeError:', ex)

print(json.dumps(d, skipkeys=True))
```

The complex key was dropped instead of causing an error. Use this with care: it silently loses data.

### separators and indent

`separators` controls the punctuation. The most useful setting is `(',', ':')`, which removes all optional whitespace, producing the most compact JSON for transmission:

```python run
d = {'name': 'Python', 'age': 27, 'created_by': 'Guido van Rossum', 'list': [1, 2, 3]}
print(json.dumps(d))
print(json.dumps(d, separators=(',', ':')))
print(len(json.dumps(d)), len(json.dumps(d, separators=(',', ':'))))
```

You can also produce something that is no longer JSON at all, which is occasionally handy for display:

```python run
print(json.dumps(d, indent='---', separators=('', ' = ')))
```

## Bundling the options into the encoder

If your application always wants the same settings (say, strict NaN handling, skipping bad keys, readable Unicode and your custom types), remembering to pass every argument to every `dumps` call is error-prone. Put the settings into the encoder class instead.

There's one trap. When you call `dumps(obj, cls=YourEncoder)`, `dumps` instantiates your class passing **every** option explicitly, including the ones you didn't specify:

```python run
class SpyEncoder(json.JSONEncoder):
    def __init__(self, **kwargs):
        print(kwargs)
        super().__init__(**kwargs)

json.dumps([1], cls=SpyEncoder)
```

So you can't tell "the caller asked for `sort_keys=False`" apart from "the caller said nothing". The encoder has to **force** the options it insists on. Options whose default is `None` (`indent`, `separators`) *can* be detected, so we only choose compact separators when the caller didn't ask for any layout:

```python run
class AppEncoder(json.JSONEncoder):
    def __init__(self, **kwargs):
        kwargs.update(allow_nan=False, skipkeys=True, ensure_ascii=False)
        if kwargs.get('indent') is None and kwargs.get('separators') is None:
            kwargs['separators'] = (',', ':')
        super().__init__(**kwargs)

    def default(self, arg):
        if isinstance(arg, datetime):
            return arg.isoformat()
        return super().default(arg)

d = {'time': datetime(2024, 3, 15, 22, 27, 26), 1 + 1j: 'complex', 'name': 'Zoë'}
print(json.dumps(d, cls=AppEncoder))
print(json.dumps(d, cls=AppEncoder, indent=2))   # callers can still choose a layout
```

The complex key was skipped, `ë` was written as-is and the datetime was converted, without the caller passing any of those options.

## Richer representations

`default` isn't limited to returning a string. Returning a dictionary lets you include extra information, such as a type marker that a decoder can later use to rebuild the right object:

```python run
class CustomEncoder(json.JSONEncoder):
    def default(self, arg):
        if isinstance(arg, datetime):
            return {
                'datatype': 'datetime',
                'iso': arg.isoformat(),
                'date': arg.date().isoformat(),
                'time': arg.time().isoformat(),
                'year': arg.year,
                'month': arg.month,
                'day': arg.day,
            }
        if isinstance(arg, date):
            return {'datatype': 'date', 'iso': arg.isoformat()}
        return super().default(arg)

d = {'time': datetime(2024, 3, 15, 22, 27, 27), 'birthday': date(1991, 2, 20)}
print(json.dumps(d, cls=CustomEncoder, indent=2))
```

The order of the checks matters: `datetime` is a **subclass** of `date`, so a `datetime` would also pass `isinstance(arg, date)`. Always test the more specific type first. That `"datatype"` key is a convention we made up; JSON itself attaches no meaning to it. In the next two lessons we'll use markers like it to decode objects back into the right types.

<div class="takeaways">

## Key takeaways

- `dumps` uses a `JSONEncoder`; pass your own subclass with `cls=YourEncoder`.
- Override `default(self, obj)`: convert the types you support, and `return super().default(obj)` for the rest.
- `default` is never called for built-in JSON types, so you can't change how strings, numbers or lists are encoded.
- Useful options: `indent`, `separators=(',', ':')` for compact output, `sort_keys`, `ensure_ascii`, `allow_nan=False` for strict JSON, `skipkeys`.
- Bundle your standard options into the encoder's `__init__` so every caller gets them consistently.
- `default` can return a dict with a type marker, which makes decoding possible later. Check subclasses (`datetime`) before base classes (`date`).

</div>
