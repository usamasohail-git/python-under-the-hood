---
title: JSONSchema
summary: JSON Schema is a language-independent standard for describing the structure of JSON documents, and the jsonschema library checks documents against it.
minutes: 15
packages: ['jsonschema']
---

## Data with a contract

JSON exchanged between systems is rarely free-form. A web API that creates a person expects a body shaped in a very particular way, and returns responses with a particular shape too. That agreed shape is a **schema**, much like the schema of a relational database table: which fields exist, what types they have, which are required, and what values are allowed.

You could describe the schema in a Word document, but a machine-readable description is far more useful. **JSON Schema** ([json-schema.org](https://json-schema.org/)) is a standard for exactly that, and a JSON Schema is itself a JSON document. It's language-independent: the same schema can validate requests in a Python server and in a JavaScript client, and generate documentation.

A schema is useful whenever data crosses a boundary:

- **validating input** before you trust it (requests, uploaded files, config);
- **testing your own serializers**, to make sure your encoder really produces what you promised;
- writing deserialization code that can rely on the structure being right.

## A first schema

We want to accept person records like this:

```
{"firstName": "...", "middleInitial": "...", "lastName": "...", "age": ...}
```

As a Python dict, a first schema looks like this:

```python run
person_schema = {
    "type": "object",
    "properties": {
        "firstName": {"type": "string"},
        "middleInitial": {"type": "string"},
        "lastName": {"type": "string"},
        "age": {"type": "number"}
    }
}
```

The third-party `jsonschema` library implements the standard. Its `validate(instance, schema)` function returns `None` if the data conforms and raises `ValidationError` if it doesn't. It validates **Python objects**, not JSON text, so we parse with `json.loads` first, which also means invalid JSON is reported separately, as a `JSONDecodeError`:

```python run
import json
from jsonschema import validate, ValidationError

def check(json_text, schema):
    try:
        validate(json.loads(json_text), schema)
    except json.JSONDecodeError as ex:
        print('Invalid JSON:', ex)
    except ValidationError as ex:
        print('Validation error:', ex.message)
    else:
        print('JSON is valid')

p1 = '{"firstName": "John", "middleInitial": "M", "lastName": "Cleese", "age": 79}'
p2 = '{"firstName": "John", "middleInitial": 100, "lastName": "Cleese", "age": "Unknown"}'
p3 = '{"firstName": "John", "age": -10.5}'

for p in (p1, p2, p3, '{"firstName": "John",}'):
    check(p, person_schema)
```

`p2` fails because `middleInitial` should be a string (and `age` a number, but `validate` stops at the first error). And `p3` **passes**: properties are optional unless listed as required, and `-10.5` is a perfectly good number. The schema is too loose.

## Tightening the schema

JSON Schema has many *keywords* for constraints. A few common ones:

- strings: `minLength`, `maxLength`, `pattern` (a regular expression), `enum`
- numbers: `"type": "integer"`, `minimum`, `maximum`, `exclusiveMinimum`
- objects: `required`, `additionalProperties`
- arrays: `items`, `minItems`, `uniqueItems`

```python run
person_schema = {
    "type": "object",
    "properties": {
        "firstName": {"type": "string", "minLength": 1},
        "middleInitial": {"type": "string", "minLength": 1, "maxLength": 1},
        "lastName": {"type": "string", "minLength": 1},
        "age": {"type": "integer", "minimum": 0},
        "eyeColor": {
            "type": "string",
            "enum": ["amber", "blue", "brown", "gray", "green", "hazel", "red", "violet"]
        }
    },
    "required": ["firstName", "lastName"]
}

for p in (p1, p2, p3):
    check(p, person_schema)
```

Now `p3` fails too: it has no `lastName`, which is now required. It has a second problem as well (`-10.5` isn't an integer, and as `-10` it would still fail the `minimum`), but `validate` only reports one error. We'll see how to get all of them shortly.

## What a ValidationError tells you

Printing the exception itself gives a long report: the message, the failing part of the schema, and the offending part of the instance. Its attributes are more useful in code:

```python run
try:
    validate(json.loads(p2), person_schema)
except ValidationError as ex:
    print('message:  ', ex.message)
    print('validator:', ex.validator, '=', ex.validator_value)
    print('path:     ', list(ex.path))          # where in the data
    print('schema:   ', list(ex.schema_path))   # where in the schema
```

`ex.path` is the location in the **data** (here the key `middleInitial`); for nested data it's a sequence of keys and list indices, which is exactly what you want to show to a user.

## Reporting every error

`validate` raises on the first problem. To collect all of them, create a **validator** object for the schema and call `iter_errors`:

```python run
from jsonschema import Draft202012Validator

validator = Draft202012Validator(person_schema)

p4 = '''
{
    "firstName": "John",
    "middleInitial": null,
    "lastName": "Cleese",
    "eyeColor": "blue-gray"
}
'''

for error in validator.iter_errors(json.loads(p4)):
    print(f'{"/".join(map(str, error.path)) or "<root>"}: {error.message}')

print(validator.is_valid(json.loads(p1)))
```

`is_valid` just returns a boolean when you don't care about the details. The validator also checks that the schema itself is sensible: `Draft202012Validator.check_schema(schema)` raises `SchemaError` for a malformed schema.

<div class="callout modern">
<span class="callout-title">Schema drafts</span>

JSON Schema has evolved through several "drafts" (4, 6, 7, 2019-09, 2020-12). Older examples use `Draft4Validator`; current versions of `jsonschema` (4.x here) support all drafts, and `validate` picks the right one from the schema's `"$schema"` key, defaulting to the newest. For new schemas, use draft 2020-12 and say so with `"$schema": "https://json-schema.org/draft/2020-12/schema"`. The simple keywords in this lesson behave the same in all drafts.

</div>

## Nested data and stricter objects

Schemas nest, just like the data. Here a movie has a list of actors, each of which must be a person. `additionalProperties: false` rejects keys the schema doesn't mention, which catches typos like `"titel"`:

```python run
movie_schema = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "year": {"type": "integer", "minimum": 1888},
        "actors": {"type": "array", "items": person_schema, "minItems": 1}
    },
    "required": ["title", "actors"],
    "additionalProperties": False
}

movie = {
    "titel": "Holy Grail",
    "year": 1975,
    "actors": [
        {"firstName": "Graham", "lastName": "Chapman"},
        {"firstName": "Eric", "lastName": "Idle", "age": "old"}
    ]
}

for error in Draft202012Validator(movie_schema).iter_errors(movie):
    print(list(error.path), error.message)
```

The path `['actors', 1, 'age']` points straight at the problem: the `age` of the second actor.

<div class="callout note">
<span class="callout-title">Some JSON Schema surprises</span>

- `"type": "integer"` accepts `10.0` as well as `10`: JSON Schema cares about the mathematical value, not the spelling.
- `"format": "email"` (or `"date"`, `"uri"`…) is only an **annotation** by default. To enforce it, pass `format_checker=Draft202012Validator.FORMAT_CHECKER` to the validator.
- `true`/`false` are **not** numbers in JSON Schema, even though `bool` is a subclass of `int` in Python.

</div>

```python run
schema = {"type": "object", "properties": {"n": {"type": "integer"}, "born": {"format": "date"}}}
print(Draft202012Validator(schema).is_valid({"n": 10.0}))
print(Draft202012Validator(schema).is_valid({"n": True}))
print(Draft202012Validator(schema).is_valid({"born": "not a date"}))
strict = Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER)
print(strict.is_valid({"born": "not a date"}), strict.is_valid({"born": "1939-10-27"}))
```

Validation tells you whether a document has the right shape; it doesn't turn that document into Python objects. That's the job of the marshalling libraries in the next lessons.

<div class="takeaways">

## Key takeaways

- A JSON Schema is a language-independent, JSON description of what a document must look like.
- Use `type`, `properties`, `required`, `enum`, `minimum`, `minLength`, `items`, `additionalProperties` and friends to express constraints. Properties are optional unless listed in `required`.
- `jsonschema.validate(instance, schema)` validates **parsed** data and raises `ValidationError` on the first problem.
- A validator object (e.g. `Draft202012Validator(schema)`) offers `iter_errors` for all errors and `is_valid` for a yes/no answer; each error's `path` locates the problem in the data.
- `format` is not enforced unless you pass a format checker.

</div>
