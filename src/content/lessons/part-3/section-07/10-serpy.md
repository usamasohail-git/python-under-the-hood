---
title: Serpy
summary: serpy is a small, fast, serialization-only library that turns objects into plain dictionaries using declarative serializer classes, with no validation and no deserialization.
minutes: 13
---

## Serialization only, but fast

marshmallow does a lot: dumping, loading, validation, hooks, error reporting. All that flexibility costs time on every object. Often, though, you only need **one direction**: an API endpoint that turns thousands of database objects into JSON responses never needs to load them back, and the objects are already valid because your own code created them.

[serpy](https://serpy.readthedocs.io/) targets exactly that case. It's a tiny library that does only **serialization**, object → dict of native types, and is designed to do it as fast as possible: the fields of a serializer are collected once when the class is created, and serializing an object is little more than a loop of attribute lookups and simple conversions. There is no validation step and no `load`.

serpy isn't available in the in-browser Python on this site, so the serpy examples are static snippets with the output they produce with **serpy 0.3.1** (`pip install serpy`). Afterwards we'll build a miniature version with the standard library, in cells you can run.

<div class="callout note">
<span class="callout-title">Project status</span>

serpy's last release (0.3.1) is several years old. It still works on current Python versions, but it is essentially finished, unmaintained software. The ideas in this lesson apply equally to the serializer classes of frameworks such as Django REST Framework, which serpy's API closely resembles.

</div>

## Serializer classes

Like marshmallow, serpy is declarative: a **serializer** class lists fields with types.

```python
import serpy

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'

class PersonSerializer(serpy.Serializer):
    name = serpy.StrField()
    age = serpy.IntField()

p1 = Person('Michael Palin', 75)
print(PersonSerializer(p1).data)
```

```
{'name': 'Michael Palin', 'age': 75}
```

Note the different usage from marshmallow: you construct the serializer **with the object**, and read the result from its `.data` property. The result is a plain dictionary, ready for `json.dumps`, `yaml.safe_dump`, or anything else that understands native types.

## Nesting and many

A serializer instance can itself be used as a field. `many=True` says the attribute is a list of objects:

```python
class Movie:
    def __init__(self, title, year, actors):
        self.title = title
        self.year = year
        self.actors = actors

class MovieSerializer(serpy.Serializer):
    title = serpy.StrField()
    year = serpy.IntField()
    actors = PersonSerializer(many=True)

movie = Movie('Parrot Sketch', 1989, [p1, Person('John Cleese', 79)])
print(MovieSerializer(movie).data)
```

```
{'title': 'Parrot Sketch', 'year': 1989, 'actors': [{'name': 'Michael Palin', 'age': 75}, {'name': 'John Cleese', 'age': 79}]}
```

`many=True` also works at the top level, to serialize a whole list in one go:

```python
people = [p1, Person('John Cleese', 79)]
print(PersonSerializer(people, many=True).data)
```

```
[{'name': 'Michael Palin', 'age': 75}, {'name': 'John Cleese', 'age': 79}]
```

From there, JSON is one call away:

```python
import json
print(json.dumps(MovieSerializer(movie).data))
```

```
{"title": "Parrot Sketch", "year": 1989, "actors": [{"name": "Michael Palin", "age": 75}, {"name": "John Cleese", "age": 79}]}
```

## Shaping the output

Fields accept a few options, and `MethodField` computes a value with a `get_<name>` method on the serializer:

```python
class PersonSerializer2(serpy.Serializer):
    full_name = serpy.StrField(attr='name')       # rename on output
    age = serpy.IntField()
    is_senior = serpy.MethodField()               # computed value
    nickname = serpy.StrField(required=False)     # skip if missing

    def get_is_senior(self, obj):
        return obj.age >= 65

print(PersonSerializer2(p1).data)
```

```
{'full_name': 'Michael Palin', 'age': 75, 'is_senior': True}
```

`attr='name'` reads the `name` attribute but writes it under the key `full_name`. The person has no `nickname` attribute, and because that field isn't required, it's left out instead of raising `AttributeError`.

## No validation

Typed fields simply apply a conversion: `StrField` calls `str()`, `IntField` calls `int()`, and so on. That's all the "checking" you get, and a value that can't be converted just raises the conversion's own exception:

```python
print(PersonSerializer(Person(123, '42')).data)     # values are converted with str() and int()
try:
    PersonSerializer(Person('Graham Chapman', 'unknown')).data
except ValueError as ex:
    print('ValueError:', ex)
```

```
{'name': '123', 'age': 42}
ValueError: invalid literal for int() with base 10: 'unknown'
```

To serialize dictionaries instead of objects, use `serpy.DictSerializer`, which reads keys instead of attributes (and ignores keys that aren't fields):

```python
class PersonDictSerializer(serpy.DictSerializer):
    name = serpy.StrField()
    age = serpy.IntField()

print(PersonDictSerializer({'name': 'Terry Jones', 'age': 77, 'extra': 'ignored'}).data)
```

```
{'name': 'Terry Jones', 'age': 77}
```

And there's no way back: serializers have no `load` or `loads`. If you need to rebuild objects from the JSON, use `object_hook`, a `JSONDecoder` subclass or a library like marshmallow.

## A mini serpy with the standard library

How does a class full of field declarations turn into a fast serializer? The core trick is to collect the fields **once**, when the class is created, rather than inspecting the class on every call. `__init_subclass__` (Python 3.6+) runs each time a subclass is defined, which makes this easy:

```python run
class Field:
    def __init__(self, convert=lambda v: v, attr=None, required=True):
        self.convert = convert
        self.attr = attr
        self.required = required


class Serializer:
    _fields = ()

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        # Collected once per class: (output key, attribute name, field)
        cls._fields = tuple(
            (name, field.attr or name, field)
            for name, field in vars(cls).items()
            if isinstance(field, Field)
        )

    def __init__(self, instance, many=False):
        self.instance = instance
        self.many = many

    def to_value(self, obj):
        result = {}
        for key, attr, field in self._fields:
            if not field.required and not hasattr(obj, attr):
                continue
            result[key] = field.convert(getattr(obj, attr))
        return result

    @property
    def data(self):
        if self.many:
            return [self.to_value(obj) for obj in self.instance]
        return self.to_value(self.instance)


def StrField(**kwargs):
    return Field(str, **kwargs)

def IntField(**kwargs):
    return Field(int, **kwargs)

def Nested(serializer_cls, many=False):
    return Field(lambda value: serializer_cls(value, many=many).data)
```

Now the same declarations as before work with our version:

```python run
import json

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

class Movie:
    def __init__(self, title, year, actors):
        self.title = title
        self.year = year
        self.actors = actors

class PersonSerializer(Serializer):
    full_name = StrField(attr='name')
    age = IntField()
    nickname = StrField(required=False)

class MovieSerializer(Serializer):
    title = StrField()
    year = IntField()
    actors = Nested(PersonSerializer, many=True)

movie = Movie('Parrot Sketch', 1989, [Person('Michael Palin', 75), Person('John Cleese', 79)])
print(PersonSerializer._fields[0][:2])
print(MovieSerializer(movie).data)
print(json.dumps(PersonSerializer(movie.actors, many=True).data))
```

That's the whole architecture: declarative fields, collected once per class, and a straight loop of `getattr` and a conversion per field. Real serpy adds method fields, more types and a lot of micro-optimizations, but no validation, which is precisely why it's fast.

For the simplest cases, `operator.attrgetter` is all you need to pull several attributes at once:

```python run
from operator import attrgetter

get = attrgetter('name', 'age')
[dict(zip(('name', 'age'), get(p))) for p in movie.actors]
```

<div class="takeaways">

## Key takeaways

- serpy only **serializes** (object → native dict), with no validation and no deserialization, and is built for speed.
- Declare a `serpy.Serializer` subclass with typed fields; use it as `MySerializer(obj).data` or `MySerializer(objs, many=True).data`.
- Serializer instances can be nested as fields; `attr=` renames, `required=False` skips missing attributes, `MethodField` computes values.
- Field types only convert (`str()`, `int()`, …); bad values raise ordinary exceptions.
- The design is easy to reproduce: collect field declarations once per class (e.g. in `__init_subclass__`), then loop over them for each object.
- Choose serpy-style tools for fast one-way output, marshmallow-style tools when you also need validation and loading.

</div>
