---
title: JSON Serialization
summary: The json module converts dictionaries, lists, strings, numbers, booleans and None to JSON text and back, but some types and keys don't survive the round trip unchanged.
minutes: 14
---

## Why JSON

JSON (JavaScript Object Notation) is the most common format for exchanging data between programs: web APIs, configuration files, log records, message queues. Compared with pickle it has three big advantages:

- it's **text**, so people can read and edit it;
- it's **language-independent**: every mainstream language can read and write it;
- it's **safe to load**: a JSON document can only describe data, never call a function.

The price is that JSON knows only a handful of types:

| JSON | Example | Python (after loading) |
|---|---|---|
| object | `{"a": 1}` | `dict` (keys are always strings) |
| array | `[1, 2]` | `list` |
| string | `"text"` (double quotes only) | `str` |
| number | `10`, `1.5`, `1.3E2` | `int` or `float` |
| `true` / `false` | `true` | `True` / `False` |
| `null` | `null` | `None` |

A Python dictionary of strings, numbers, lists and nested dictionaries *looks* almost exactly like JSON. The difference is that the dictionary is a structure of objects, while JSON is one long string. Serializing means choosing a **text representation** for every object; deserializing means **interpreting** that text as objects again.

## dumps and loads

The `json` module mirrors `pickle`: `dumps` serializes to a string and `loads` deserializes from a string; `dump` and `load` work with text files (any object with `.write()` / `.read()`).

```python run
import json

d1 = {"a": 100, "b": 200}
d1_json = json.dumps(d1)
print(repr(d1_json), type(d1_json))

d2 = json.loads(d1_json)
print(d2, d1 == d2)
```

Pass `indent` to make the output readable, and `sort_keys=True` if you want a stable key order (handy for diffs and tests):

```python run
print(json.dumps({'b': [1, 2], 'a': {'x': None, 'y': True}}, indent=2, sort_keys=True))
```

Notice the Python-to-JSON spelling changes: `None` became `null`, `True` became `true`, and every string uses double quotes.

## Loading a document

Going the other way, each JSON type maps to the natural Python type:

```python run
d_json = '''
{
    "name": "John Cleese",
    "age": 82,
    "height": 1.96,
    "walksFunny": true,
    "sketches": [
        {"title": "Dead Parrot", "costars": ["Michael Palin"]},
        {"title": "Ministry of Silly Walks", "costars": ["Michael Palin", "Terry Jones"]}
    ],
    "boring": null
}
'''
d = json.loads(d_json)

for key, value in d.items():
    print(f'{key:12} {type(value).__name__:6} {value!r:.50}')
```

Integer-looking numbers became `int`, numbers with a decimal point became `float`, arrays became lists and nested objects became dictionaries.

The JSON standard says an object is an **unordered** set of key/value pairs. Python's `json` module happens to keep the keys in document order (because Python dicts preserve insertion order), but another program, or another JSON library, is under no obligation to. Never give meaning to key order in a JSON document you exchange with others.

## Things that change in the round trip

It's tempting to assume `json.loads(json.dumps(d)) == d`. Often it isn't.

**Keys become strings.** Python allows any hashable key; JSON allows only strings. `dumps` converts `int`, `float`, `bool` and `None` keys to strings, and nothing converts them back:

```python run
d1 = {1: 100, 2.5: 200, None: 'nothing'}
s = json.dumps(d1)
print(s)
d2 = json.loads(s)
print(d2)
print(d1 == d2)
```

**Tuples become lists.** JSON has only one sequence type:

```python run
d = {'a': (1, 2, 3)}
print(json.dumps(d))
print(json.loads(json.dumps(d)))
```

And JSON text containing Python syntax is simply invalid. A parse error raises `json.JSONDecodeError` (a subclass of `ValueError`), which tells you exactly where the problem is:

```python run
bad_jsons = [
    '{"a": (1, 2, 3)}',     # tuples aren't JSON
    "{'a': 1}",             # single quotes aren't JSON
    '{"a": 1,}',            # neither are trailing commas
]
for bad in bad_jsons:
    try:
        json.loads(bad)
    except json.JSONDecodeError as ex:
        print(f'{bad:20} -> {ex.msg} (line {ex.lineno}, column {ex.colno})')
```

## Types JSON doesn't know

Anything outside the table above can't be serialized by default. `dumps` raises a `TypeError`:

```python run
from decimal import Decimal
from fractions import Fraction

for value in (Decimal('0.5'), Fraction(1, 3), 1 + 1j, {1, 2, 3}):
    try:
        json.dumps({'a': value})
    except TypeError as ex:
        print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Error message wording</span>

Older Python versions quoted the type name (`Object of type 'set' is not JSON serializable`). Current versions print it without quotes.

</div>

One crude fix is to convert those values to strings yourself, but then you get strings back when you load, and the information about the original type is gone:

```python run
s = json.dumps({'a': str(Decimal('0.5'))})
print(s, json.loads(s))
```

Your own classes fail too, even if they have a nice `__repr__`: `dumps` has no idea which text you want.

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'

p = Person('John', 82)
try:
    json.dumps({'john': p})
except TypeError as ex:
    print('TypeError:', ex)
```

## A first workaround: a toJSON method

One approach is to give the class a method that returns a JSON-friendly dictionary and call it before serializing. `vars(obj)` (the same as `obj.__dict__`) is a convenient shortcut when you want every attribute:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'

    def toJSON(self):
        return vars(self)

p = Person('John', 82)
print(json.dumps({'john': p.toJSON()}, indent=2))
```

For types you don't control, such as sets, you convert them by hand:

```python run
json.dumps({'a': sorted({3, 1, 2})})
```

This works, but it doesn't scale: you must remember to call `.toJSON()` on every custom object, everywhere it might appear in a nested structure, and convert every set, date or decimal by hand before calling `dumps`. The next lessons show how to teach `json` itself to do these conversions.

## Files

`dump` and `load` take an open text file. JSON text is Unicode, so be explicit about the encoding:

```python run
record = {'name': 'Zoë', 'scores': [9.5, 8.0]}

with open('record.json', 'w', encoding='utf-8') as f:
    json.dump(record, f)

with open('record.json', encoding='utf-8') as f:
    print(f.read())

with open('record.json', encoding='utf-8') as f:
    print(json.load(f))
```

The `ë` escape is there because `dumps` defaults to `ensure_ascii=True`, which escapes every non-ASCII character. Pass `ensure_ascii=False` to write the character itself.

<div class="takeaways">

## Key takeaways

- JSON is text, language-independent and safe to load, but supports only objects, arrays, strings, numbers, booleans and `null`.
- `dumps`/`loads` work with strings, `dump`/`load` with text files. `indent` and `sort_keys` control the layout.
- The round trip isn't always exact: non-string keys become strings and tuples become lists.
- Invalid JSON raises `json.JSONDecodeError`; unsupported types (`Decimal`, `set`, `complex`, your own classes) raise `TypeError` on `dumps`.
- Don't rely on key order in exchanged JSON: objects are unordered by definition.
- Converting objects by hand (e.g. a `toJSON` method) works but is easy to forget; the `json` module has hooks for doing it automatically.

</div>
