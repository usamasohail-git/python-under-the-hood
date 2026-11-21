---
title: Marshmallow
summary: marshmallow declares a schema as a class and uses it to convert objects to plain data (dump), back to objects (load), and to validate input along the way.
minutes: 18
---

## What marshmallow is for

The previous lessons showed that the hard part of JSON isn't the text: it's converting between **your objects** (a `Person` with a `date` of birth, a `Decimal` price) and the **native types** JSON can carry (dicts, lists, strings, numbers). Doing that by hand means writing an encoder, a decoder, type markers, recursive walks and validation code, for every class.

[marshmallow](https://marshmallow.readthedocs.io/) (the name comes from *marshalling*) is a popular third-party library that does all of this from one declaration. You describe a **schema** as a class whose attributes are typed **fields**, and the schema can then:

- **dump**: object → dict of native types (or `dumps` → JSON string);
- **load**: dict (or JSON string with `loads`) → validated, converted data, optionally a real object;
- **validate**: report every problem in the input, per field.

marshmallow isn't available in the in-browser Python on this site, so the marshmallow examples below are static snippets, each followed by the output it produces with **marshmallow 4.4** (`pip install marshmallow`). At the end we'll build the same ideas with the standard library, in cells you can run.

<div class="callout modern">
<span class="callout-title">marshmallow 4 vs. older examples</span>

Many tutorials and older notebooks use marshmallow 2.x, whose API was quite different:

- `dump()`/`load()` used to return a `MarshalResult`/`UnmarshalResult` with `.data` and `.errors`. Since 3.0 they **return the data directly**, so there's no `.data` and no `.errors`.
- Invalid input used to be reported in `.errors`; now `load()` **raises `ValidationError`**, whose `.messages` holds the per-field errors. (`schema.validate(data)` still returns an error dict without raising.)
- Unknown input fields are now **rejected** by default (`unknown=RAISE`); pass `unknown=EXCLUDE` or `INCLUDE` to change that.
- Hook methods such as `@post_load` are called with extra keyword arguments (`many`, `partial`, …), so they must accept `**kwargs`.
- Naive `DateTime` values are dumped as they are (2.x appended `+00:00`), and version 4 removed the schema `context` and several deprecated field arguments.

</div>

## Declaring a schema

Start with an ordinary class:

```python
from datetime import date

class Person:
    def __init__(self, first_name, last_name, dob):
        self.first_name = first_name
        self.last_name = last_name
        self.dob = dob

    def __repr__(self):
        return f'Person({self.first_name!r}, {self.last_name!r}, {self.dob!r})'
```

The schema lists the fields to serialize, each with a marshmallow field type. There are field types for strings, integers, floats, decimals, booleans, dates, datetimes, emails, URLs, lists, nested schemas and more:

```python
from marshmallow import Schema, fields

class PersonSchema(Schema):
    first_name = fields.Str()
    last_name = fields.Str()
    dob = fields.Date()
```

## Dumping: objects to native data

Create a schema **instance** and call `dump` for a dict, or `dumps` for a JSON string. The `date` became an ISO string:

```python
person_schema = PersonSchema()
p1 = Person('John', 'Cleese', date(1939, 10, 27))

print(person_schema.dump(p1))
print(person_schema.dumps(p1))
```

```
{'first_name': 'John', 'last_name': 'Cleese', 'dob': '1939-10-27'}
{"first_name": "John", "last_name": "Cleese", "dob": "1939-10-27"}
```

The schema doesn't care about the object's class, only its attributes (duck typing). Attributes the object doesn't have are simply left out:

```python
from collections import namedtuple

PT = namedtuple('PT', 'first_name last_name dob')
print(person_schema.dumps(PT('Eric', 'Idle', date(1943, 3, 29))))

PT2 = namedtuple('PT2', 'first_name last_name age')
print(person_schema.dumps(PT2('Michael', 'Palin', 75)))   # no dob attribute
```

```
{"first_name": "Eric", "last_name": "Idle", "dob": "1943-03-29"}
{"first_name": "Michael", "last_name": "Palin"}
```

`only` and `exclude` choose a subset of fields per schema instance:

```python
print(PersonSchema(only=('first_name', 'last_name')).dumps(p1))
print(PersonSchema(exclude=('dob',)).dumps(p1))
```

```
{"first_name": "John", "last_name": "Cleese"}
{"first_name": "John", "last_name": "Cleese"}
```

Dumping assumes your objects are valid; it converts, it doesn't check. The integer `100` is formatted as the string `'100'` and `None` passes through. (An attribute that can't be formatted at all, such as an `int` in a `Date` field, raises an ordinary exception like `TypeError`.)

```python
print(person_schema.dump(Person(100, None, date(2000, 1, 1))))
```

```
{'first_name': '100', 'last_name': None, 'dob': '2000-01-01'}
```

### Nested schemas

Schemas compose. A movie has a list of actors, each dumped with `PersonSchema`:

```python
class Movie:
    def __init__(self, title, year, actors):
        self.title = title
        self.year = year
        self.actors = actors

    def __repr__(self):
        return f'Movie({self.title!r}, {self.year!r}, {self.actors!r})'

class MovieSchema(Schema):
    title = fields.Str()
    year = fields.Integer()
    actors = fields.List(fields.Nested(PersonSchema))

parrot = Movie('Parrot Sketch', 1989,
               [p1, Person('Michael', 'Palin', date(1943, 5, 5))])
print(MovieSchema().dumps(parrot, indent=2))
```

```
{
  "title": "Parrot Sketch",
  "year": 1989,
  "actors": [
    {
      "first_name": "John",
      "last_name": "Cleese",
      "dob": "1939-10-27"
    },
    {
      "first_name": "Michael",
      "last_name": "Palin",
      "dob": "1943-05-05"
    }
  ]
}
```

(`fields.Nested(PersonSchema, many=True)` is an equivalent spelling. Extra keyword arguments to `dumps`, like `indent`, are passed on to `json.dumps`.)

## Loading: native data back to objects

`load` takes a dict (`loads` takes a JSON string), **validates** it and converts each field. The ISO string became a real `date`:

```python
data = person_schema.load({'first_name': 'John', 'last_name': 'Cleese', 'dob': '1939-10-27'})
print(data)
```

```
{'first_name': 'John', 'last_name': 'Cleese', 'dob': datetime.date(1939, 10, 27)}
```

To get a `Person` instead of a dict, add a method decorated with `@post_load`. It receives the validated dict, and its return value becomes the result of `load`. Mark the fields `required=True` so the method can count on all of them being present:

```python
from marshmallow import post_load

class PersonSchema(Schema):
    first_name = fields.Str(required=True)
    last_name = fields.Str(required=True)
    dob = fields.Date(required=True)

    @post_load
    def make_person(self, data, **kwargs):
        return Person(**data)

print(PersonSchema().load({'first_name': 'John', 'last_name': 'Cleese', 'dob': '1939-10-27'}))
```

```
Person('John', 'Cleese', datetime.date(1939, 10, 27))
```

The same works through nesting: give `MovieSchema` its own `post_load` (and define it after the new `PersonSchema`, so it nests the version that builds `Person` objects), and `loads` returns a complete object graph from a JSON string:

```python
class MovieSchema(Schema):
    title = fields.Str()
    year = fields.Integer()
    actors = fields.List(fields.Nested(PersonSchema))

    @post_load
    def make_movie(self, data, **kwargs):
        return Movie(**data)

json_data = '''
{"title": "Parrot Sketch", "year": 1989,
 "actors": [
    {"first_name": "John", "last_name": "Cleese", "dob": "1939-10-27"},
    {"first_name": "Michael", "last_name": "Palin", "dob": "1943-05-05"}
 ]}
'''
movie = MovieSchema().loads(json_data)
print(type(movie).__name__)
print(movie)
```

```
Movie
Movie('Parrot Sketch', 1989, [Person('John', 'Cleese', datetime.date(1939, 10, 27)), Person('Michael', 'Palin', datetime.date(1943, 5, 5))])
```

## Validation

If anything is wrong, `load` raises `ValidationError`. It checks **every** field before raising, so `messages` lists all the problems at once, and `valid_data` holds the fields that did pass. Note the unknown `age` key: rejected by default.

```python
from marshmallow import ValidationError

try:
    PersonSchema().load({'first_name': 'John', 'last_name': 42,
                         'dob': 'yesterday', 'age': 84})
except ValidationError as ex:
    print(ex.messages)
    print(ex.valid_data)
```

```
{'last_name': ['Not a valid string.'], 'dob': ['Not a valid date.'], 'age': ['Unknown field.']}
{'first_name': 'John'}
```

Fields take `required=True` and a `validate=` argument with ready-made validators (`Length`, `Range`, `OneOf`, `Email`, `Regexp`…) or any function of your own. `schema.validate(data)` returns the error dict instead of raising (empty means valid), and `unknown=EXCLUDE` drops unexpected keys instead of rejecting them:

```python
from marshmallow import validate, EXCLUDE

class StrictPersonSchema(Schema):
    first_name = fields.Str(required=True, validate=validate.Length(min=1))
    last_name = fields.Str(required=True, validate=validate.Length(min=1))
    dob = fields.Date(validate=validate.Range(min=date(1900, 1, 1)))

schema = StrictPersonSchema()
print(schema.validate({'first_name': '', 'dob': '1066-10-14'}))
print(schema.validate({'first_name': 'John', 'last_name': 'Cleese'}))
print(StrictPersonSchema(unknown=EXCLUDE).load({'first_name': 'John', 'last_name': 'Cleese', 'age': 84}))
```

```
{'first_name': ['Shorter than minimum length 1.'], 'last_name': ['Missing data for required field.'], 'dob': ['Must be greater than or equal to 1900-01-01.']}
{}
{'first_name': 'John', 'last_name': 'Cleese'}
```

Errors in nested data are reported under the field name and list index, much like `jsonschema`'s error paths:

```python
try:
    MovieSchema().load({'title': 'Holy Grail', 'year': 'MCMLXXV',
                        'actors': [{'first_name': 'Graham'}, {'last_name': 7}]})
except ValidationError as ex:
    print(ex.messages)
```

```
{'year': ['Not a valid integer.'], 'actors': {0: {'last_name': ['Missing data for required field.'], 'dob': ['Missing data for required field.']}, 1: {'first_name': ['Missing data for required field.'], 'last_name': ['Not a valid string.'], 'dob': ['Missing data for required field.']}}}
```

`post_load` only runs when validation succeeds, so it never sees broken data.

## The same idea with the standard library

There's no magic in marshmallow: a schema is a table of fields, each knowing how to convert a value **to** native data and **from** it, plus validation. We can sketch that design in a few lines of plain Python. Each field is a pair of functions, and `load` collects errors per field just like marshmallow:

```python run
import json
from dataclasses import dataclass, asdict
from datetime import date

@dataclass
class Person:
    first_name: str
    last_name: str
    dob: date

def as_str(value):
    if not isinstance(value, str):
        raise ValueError('Not a valid string.')
    return value

PERSON_FIELDS = {                     # name -> (dump function, load function)
    'first_name': (str, as_str),
    'last_name': (str, as_str),
    'dob': (date.isoformat, date.fromisoformat),
}

def dump(obj, fields):
    return {name: to_native(getattr(obj, name)) for name, (to_native, _) in fields.items()}

def load(data, fields, cls):
    result, errors = {}, {}
    for name, (_, from_native) in fields.items():
        if name not in data:
            errors[name] = ['Missing data for required field.']
            continue
        try:
            result[name] = from_native(data[name])
        except (TypeError, ValueError) as ex:
            errors[name] = [str(ex)]
    for name in data.keys() - fields.keys():
        errors[name] = ['Unknown field.']
    if errors:
        raise ValueError(errors)
    return cls(**result)

john = Person('John', 'Cleese', date(1939, 10, 27))
text = json.dumps(dump(john, PERSON_FIELDS))
print(text)
print(load(json.loads(text), PERSON_FIELDS, Person))

try:
    load({'first_name': 'John', 'last_name': 42, 'dob': 'yesterday', 'age': 84}, PERSON_FIELDS, Person)
except ValueError as ex:
    print(ex)
```

For simple cases, `dataclasses` alone gets you surprisingly far: `asdict` dumps (recursively, including nested dataclasses and lists of them), and a `default=` function handles the leftover types:

```python run
@dataclass
class Movie:
    title: str
    year: int
    actors: list[Person]

parrot = Movie('Parrot Sketch', 1989, [john, Person('Michael', 'Palin', date(1943, 5, 5))])
json.dumps(asdict(parrot), default=date.isoformat)
```

What the standard library doesn't give you is everything around it: a large library of field types and validators, nested error reports, `only`/`exclude`, renaming keys (`data_key`), partial loading, and hooks before and after each step. That's what you get from marshmallow (or similar libraries such as pydantic or cattrs) once your data model grows.

<div class="takeaways">

## Key takeaways

- marshmallow schemas are classes of typed fields; the same schema handles serialization, deserialization and validation.
- `dump`/`dumps` convert objects (any object with the right attributes) to native data or JSON; they don't validate.
- `load`/`loads` validate and convert native data; `@post_load` (accepting `**kwargs`) turns the result into your own objects.
- Invalid input raises `ValidationError` with per-field `messages`; unknown fields are rejected unless you choose `EXCLUDE` or `INCLUDE`.
- In marshmallow 3+ and 4, results are returned directly: there's no `.data`/`.errors` as in 2.x code.
- The underlying design (a table of to/from converters per field) is easy to sketch with the standard library; `dataclasses.asdict` covers simple dumping.

</div>
