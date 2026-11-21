---
title: YAML
summary: YAML is a human-friendly serialization format popular for configuration files; PyYAML reads and writes it, and safe_load is the only loader to use on untrusted input.
minutes: 16
packages: ['pyyaml']
---

## A format for humans

YAML ("YAML Ain't Markup Language") is another data serialization standard. It represents the same kinds of data as JSON (scalars, lists and dictionaries, which YAML calls *sequences* and *mappings*), but it's designed to be **read and written by people**. Structure comes from indentation instead of brackets, strings rarely need quotes, and you can write comments. That's why it dominates configuration files in the DevOps world: Docker Compose, Kubernetes, GitHub Actions, Ansible and many more.

```
# A movie, in YAML
title: Parrot Sketch
year: 1989
actors:
  - first_name: John
    last_name: Cleese
    dob: 1939-10-27
  - first_name: Michael
    last_name: Palin
    dob: 1943-05-05
```

The flexibility that makes YAML pleasant to write makes it much harder to parse than JSON, so Python doesn't include a YAML parser in the standard library. The usual choice is the third-party **PyYAML** package (`pip install pyyaml`, imported as `yaml`), available in the browser on this page.

<div class="callout note">
<span class="callout-title">Like pickle, full YAML loading can run code</span>

YAML has *tags* that PyYAML can use to construct arbitrary Python objects and even call functions. Loading untrusted YAML with an unsafe loader is as dangerous as unpickling untrusted data. Use `yaml.safe_load` unless you have a specific reason not to; we'll see the difference below.

</div>

## Loading

`yaml.safe_load` parses a string (or an open file) into Python objects:

```python run
import yaml
from pprint import pprint

data = '''
---
title: Parrot Sketch
year: 1989
actors:
  - first_name: John
    last_name: Cleese
    dob: 1939-10-27
  - first_name: Michael
    last_name: Palin
    dob: 1943-05-05
'''

d = yaml.safe_load(data)
print(type(d))
pprint(d)
```

The `---` marks the start of a document and is optional for a single document. Notice the `dob` values: unlike `json`, YAML recognized `1939-10-27` as a **date** and produced `datetime.date` objects. YAML infers types from the way a plain (unquoted) value looks: integers, floats, booleans, `null`/`~`, dates and timestamps.

<div class="callout modern">
<span class="callout-title">yaml.load needs a Loader</span>

Older code calls `yaml.load(data)` with no other arguments. That printed a warning in PyYAML 5.1 and is an **error** since PyYAML 6.0: you must choose a loader explicitly, e.g. `yaml.load(data, Loader=yaml.SafeLoader)`, which is what `yaml.safe_load(data)` does.

</div>

```python run
try:
    yaml.load(data)
except TypeError as ex:
    print('TypeError:', ex)

print(yaml.load(data, Loader=yaml.SafeLoader) == yaml.safe_load(data))
```

## Type inference surprises

Guessing types from the way values look is convenient until it guesses wrong. PyYAML implements YAML 1.1, where a few innocent-looking values are not strings:

```python run
config = '''
country: NO          # Norway... or False?
answer: yes
version: 3.10        # a float, so the trailing zero is lost
octal: 010           # a leading 0 means octal in YAML 1.1
duration: 1:30       # base-60 number!
quoted_version: "3.10"
empty:
'''
pprint(yaml.safe_load(config))
```

`NO`, `yes`, `on` and `off` are booleans, `3.10` is the float `3.1`, `010` is 8 and `1:30` is 90 (base 60). An empty value is `None`. When a value must be a string, **quote it**. (YAML 1.2 dropped most of these rules, but PyYAML still follows 1.1.)

## Dumping

`yaml.dump` (or the safer `yaml.safe_dump`) turns Python data into YAML text:

```python run
d = {'title': 'Holy Grail', 'year': 1975, 'rating': 8.2, 'released': True,
     'tags': ['comedy', 'medieval'], 'sequel': None}
print(yaml.safe_dump(d))
```

Two defaults stand out: keys are **sorted**, and nested collections use the indented *block style*. Both can be changed:

```python run
print(yaml.safe_dump(d, sort_keys=False, default_flow_style=None))
```

With `default_flow_style=None`, collections that contain only scalars are written in the compact *flow style*, `[comedy, medieval]`, which is also valid YAML (as is `{a: 1, b: 2}` for mappings). Pass `allow_unicode=True` to write non-ASCII characters as-is.

<div class="callout modern">
<span class="callout-title">Changed defaults</span>

Before PyYAML 5.1, `dump` defaulted to flow style for inner collections (`d: [1, 2, 3]`), and older examples pass `default_flow_style=False` to get block style. That's now the default. The `sort_keys` parameter (default `True`) was also added in 5.1.

</div>

YAML can also hold several documents in one stream, separated by `---`; `safe_load_all` returns an iterator over them:

```python run
stream = '''
name: web
replicas: 3
---
name: worker
replicas: 1
'''
for doc in yaml.safe_load_all(stream):
    print(doc)
```

And since JSON is (essentially) a subset of YAML, `safe_load` reads most JSON too:

```python run
yaml.safe_load('{"a": [1, 2, {"b": null}], "c": true}')
```

## Python objects in YAML

The full `yaml.dump` can serialize arbitrary Python objects, using a **tag** that names the class:

```python run
from datetime import date

class Person:
    def __init__(self, name, dob):
        self.name = name
        self.dob = dob

    def __repr__(self):
        return f'Person(name={self.name}, dob={self.dob})'

text = yaml.dump({'john': Person('John Cleese', date(1939, 10, 27))})
print(text)
print(yaml.unsafe_load(text))
```

The `!!python/object:__main__.Person` tag tells PyYAML which class to instantiate, and the unsafe loader imported it and rebuilt the object. That is exactly the problem: tags such as `!!python/object/apply` make the loader **call** a function. Here's a harmless one that calls `os.getcwd()`; a malicious file could just as easily call `subprocess.check_output` or `os.system`:

```python run
evil = '''
cwd: !!python/object/apply:os.getcwd []
'''
print(yaml.unsafe_load(evil))      # the function ran during loading!

try:
    yaml.safe_load(evil)
except yaml.YAMLError as ex:
    print(type(ex).__name__, '-', ex.problem)
```

`safe_load` only builds standard YAML types (strings, numbers, booleans, `None`, dates, lists and dicts), so it refuses the tag. `yaml.full_load` (`FullLoader`) sits in between: it can build some Python objects but refuses the dangerous `apply` tags. Still, `safe_load` is the one to reach for.

## Safe custom tags with YAMLObject

You can have both safety and custom types: subclass `yaml.YAMLObject`, choose a short tag, and register the class with the **safe** loader and dumper. Only the classes you register this way can be built from a document:

```python run
class Person(yaml.YAMLObject):
    yaml_tag = '!Person'
    yaml_loader = yaml.SafeLoader
    yaml_dumper = yaml.SafeDumper

    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'

text = yaml.safe_dump({'john': Person('John Cleese', 79), 'michael': Person('Michael Palin', 74)})
print(text)

yaml_data = '''
john: !Person
  name: John Cleese
  age: 79
michael: !Person
  name: Michael Palin
  age: 74
'''
yaml.safe_load(yaml_data)
```

Without `yaml_loader = yaml.SafeLoader`, the class would only be registered with the unsafe loaders, and `safe_load` would reject `!Person`. Note that, like pickle, the loader restores the attributes **without** calling `__init__`.

For anything more elaborate (validation, renamed keys, nested object graphs), a common pattern is to `safe_load` the YAML into plain data, then convert it with a schema-based tool like marshmallow, or check it with `jsonschema`: a schema written for JSON works just as well on data loaded from YAML.

<div class="takeaways">

## Key takeaways

- YAML represents the same data as JSON, but with indentation, comments and minimal quoting; it's popular for configuration.
- PyYAML: `yaml.safe_load` / `safe_load_all` to read, `yaml.safe_dump` / `dump` to write (keys sorted and block style by default).
- `yaml.load` requires an explicit `Loader` since PyYAML 6.0.
- YAML infers types: dates become `date` objects, and in YAML 1.1 `no`/`yes` are booleans and `3.10` is a float. Quote values that must be strings.
- Unsafe loading can construct objects and call functions from tags. **Never** use `unsafe_load` (or `Loader=yaml.Loader`) on untrusted input.
- For custom types, subclass `yaml.YAMLObject` with a `yaml_tag` and register it with `SafeLoader`/`SafeDumper`.

</div>
