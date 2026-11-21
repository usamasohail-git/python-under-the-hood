---
title: Custom JSON Decoding
summary: Use object_hook, object_pairs_hook and the parse_float, parse_int and parse_constant hooks of loads to turn JSON text into dates, decimals, fractions and your own objects.
minutes: 15
---

## Decoding gives you only basic types

Loading JSON gives you dictionaries, lists, strings, numbers, booleans and `None`, nothing more:

```python run
import json

p = '''
{
    "time": "2024-03-15T09:14:00",
    "message": "created this json string"
}
'''
d = json.loads(p)
print(d, type(d['time']))
```

The value of `"time"` *looks* like a date, but to the decoder it's just a string. JSON has no date type, so any "richer" type in a JSON document is an **interpretation** that the producer and the consumer agree on: a convention, or more formally a **schema**. Decoding custom types always comes down to recognizing that agreed structure and building the right object from it.

## A convention for typed values

Say we agree that any JSON object containing `"objecttype": "datetime"` also contains a `"value"` in ISO format. After loading, we could scan the dictionary and convert those structures:

```python run
from datetime import datetime

p = '''
{
    "time": {"objecttype": "datetime", "value": "2024-03-15T09:14:15"},
    "message": "created this json string"
}
'''
d = json.loads(p)

for key, value in d.items():
    if isinstance(value, dict) and value.get('objecttype') == 'datetime':
        d[key] = datetime.fromisoformat(value['value'])

d
```

`datetime.fromisoformat` parses ISO strings directly. (Older code uses `datetime.strptime(s, '%Y-%m-%dT%H:%M:%S')`, which does the same for one exact layout.)

<div class="callout modern">
<span class="callout-title">fromisoformat</span>

`date.fromisoformat` and `datetime.fromisoformat` arrived in Python 3.7, where they only accepted the exact output of `isoformat()`. Since Python 3.11 they accept most ISO 8601 formats, including a trailing `Z` for UTC.

</div>

This post-processing works, but it has two problems: it's a separate pass over the data, and it only looks at the **top level**. A datetime nested two levels down would be missed unless we write a recursive walker.

## object_hook

`load` and `loads` can do this for us. Pass `object_hook=fn` and the decoder calls `fn` with **every JSON object** it decodes (as a `dict`), and uses whatever `fn` returns in its place. Let's watch when it's called:

```python run
def custom_decoder(arg):
    print('decoding:', arg)
    return arg

j = '''
{
    "a": 1,
    "b": 2,
    "c": {
        "c.1": 1,
        "c.2": 2,
        "c.3": {"c.3.1": 1, "c.3.2": 2}
    }
}
'''
d = json.loads(j, object_hook=custom_decoder)
```

The hook ran three times, **innermost first**, and finally for the root object. That order matters: by the time the hook sees an object, all the objects nested inside it have already been converted. And because the hook sees every object at every depth, nested values are handled for free.

Now a real hook. It must return the dictionary **unchanged** if it isn't one of ours, or that data would be lost:

```python run
from fractions import Fraction

def custom_decoder(arg):
    match arg.get('objecttype'):
        case 'datetime':
            return datetime.fromisoformat(arg['value'])
        case 'fraction':
            return Fraction(arg['numerator'], arg['denominator'])
        case _:
            return arg      # important: keep everything else as-is

j = '''
{
    "cake": "yummy chocolate cake",
    "myShare": {"objecttype": "fraction", "numerator": 1, "denominator": 8},
    "eaten": {
        "at": {"objecttype": "datetime", "value": "2024-03-15T21:30:00"},
        "time_taken": "30 seconds"
    }
}
'''
json.loads(j, object_hook=custom_decoder)
```

(`match` needs Python 3.10+; an `if`/`elif` chain works just as well.)

You can't use `singledispatch` here the way we did for encoding: the hook always receives a `dict`, so the dispatch has to be on the **contents** of the dictionary, not its type.

## Your own classes

Custom classes follow exactly the same pattern. The JSON must say which type an object is, and the hook builds it:

```python run
class Person:
    def __init__(self, name, ssn):
        self.name = name
        self.ssn = ssn

    def __repr__(self):
        return f'Person(name={self.name}, ssn={self.ssn})'

    def toJSON(self):
        return {'objecttype': 'person', 'name': self.name, 'ssn': self.ssn}

def custom_decoder(arg):
    match arg.get('objecttype'):
        case 'datetime':
            return datetime.fromisoformat(arg['value'])
        case 'fraction':
            return Fraction(arg['numerator'], arg['denominator'])
        case 'person':
            return Person(arg['name'], arg['ssn'])
        case _:
            return arg

j = '''
{
    "accountHolder": {"objecttype": "person", "name": "Eric Idle", "ssn": 100},
    "created": {"objecttype": "datetime", "value": "2024-03-15T03:00:00"}
}
'''
json.loads(j, object_hook=custom_decoder)
```

The `toJSON` method produces exactly the structure the hook recognizes, so combined with a `default=` function that calls it, `Person` objects now survive a full round trip:

```python run
s = json.dumps({'holder': Person('Eric Idle', 100)}, default=lambda obj: obj.toJSON())
print(s)
print(json.loads(s, object_hook=custom_decoder))
```

## Hooks for numbers and constants

Three more hooks intercept individual values. Each one receives the **original text** from the document (a `str`), which matters: converting it after it has already become a `float` would be too late.

- `parse_float`: called for numbers with a fraction or exponent (default: `float`)
- `parse_int`: called for integer numbers (default: `int`)
- `parse_constant`: called for `-Infinity`, `Infinity` and `NaN`

The classic use is reading money values as exact `Decimal`s instead of binary floats:

```python run
from decimal import Decimal

def make_decimal(arg):
    print('Received:', type(arg), arg)
    return Decimal(arg)

d = json.loads('{"a": 100, "b": 0.1, "c": 0.2}', parse_float=make_decimal)
print(d)
print(d['b'] + d['c'], 0.1 + 0.2)
```

`Decimal('0.1')` is exact because it was built from the text `"0.1"`; `Decimal(0.1)` built from a float would carry the float's rounding error. Since `Decimal` accepts a string, `parse_float=Decimal` is all you need in practice.

`parse_int` and `parse_constant` work the same way:

```python run
def make_int_binary(arg):
    print('Received:', type(arg), arg)
    return bin(int(arg))

def make_const_none(arg):
    print('Received:', type(arg), arg)
    return None

json.loads('{"a": 100, "b": Infinity}', parse_int=make_int_binary, parse_constant=make_const_none)
```

`parse_constant` is a neat way to **reject** the non-standard `NaN`/`Infinity` values that Python accepts by default: make it raise a `ValueError`.

## object_pairs_hook

`object_pairs_hook` is like `object_hook`, but it receives each object as a **list of `(key, value)` pairs**, in the order they appear in the document, instead of an already-built dict. If you pass both hooks, `object_pairs_hook` wins and `object_hook` is ignored.

```python run
j = '''
{
    "a": [1, 2],
    "b": 100,
    "c": 10.5,
    "d": NaN,
    "e": null
}
'''

def obj_hook(arg):
    print('object_hook:', arg)
    return arg

def pairs_hook(arg):
    print('object_pairs_hook:', arg)
    return dict(arg)

json.loads(j, object_hook=obj_hook)
json.loads(j, object_pairs_hook=pairs_hook)
json.loads(j, object_hook=obj_hook, object_pairs_hook=pairs_hook)
```

<div class="callout modern">
<span class="callout-title">Do you still need object_pairs_hook for ordering?</span>

Before dictionaries kept insertion order (guaranteed from Python 3.7), `object_pairs_hook=collections.OrderedDict` was the standard way to keep a document's key order. Today the plain `dict` that `loads` builds already preserves document order. The hook is still the only way to see **duplicate keys**, though, which a dict silently collapses.

</div>

JSON technically permits repeated keys, and `loads` keeps only the last value. A pairs hook can catch that:

```python run
def no_duplicates(pairs):
    keys = [key for key, _ in pairs]
    dupes = {key for key in keys if keys.count(key) > 1}
    if dupes:
        raise ValueError(f'duplicate keys: {sorted(dupes)}')
    return dict(pairs)

doc = '{"user": "alice", "role": "viewer", "role": "admin"}'
print(json.loads(doc))
try:
    json.loads(doc, object_pairs_hook=no_duplicates)
except ValueError as ex:
    print('ValueError:', ex)
```

<div class="takeaways">

## Key takeaways

- JSON only decodes to basic types; anything richer is a convention between producer and consumer.
- `object_hook` is called for every decoded JSON object, innermost first, and its return value replaces the dict. Return unrecognized dicts unchanged.
- Dispatch inside the hook on the dictionary's contents, e.g. a type-marker key.
- `parse_float`, `parse_int` and `parse_constant` receive the raw text of numbers and constants; `parse_float=Decimal` gives exact decimals.
- `object_pairs_hook` receives a list of `(key, value)` pairs, takes precedence over `object_hook`, and can detect duplicate keys.

</div>
