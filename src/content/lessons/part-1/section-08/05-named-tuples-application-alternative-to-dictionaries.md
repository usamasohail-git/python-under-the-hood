---
title: Named Tuples - Application - Alternative to Dictionaries
summary: Turn dictionaries with string keys into named tuples safely with `**` unpacking, keep the dictionary conveniences via `getattr`, and convert a whole list of dicts with a shared structure.
minutes: 14
---

## When a dictionary is really a record

Dictionaries are often used as little records: a fixed set of string keys, created once, then only read.

```python run
data_dict = dict(key1=100, key2=200, key3=300)
data_dict['key2']
```

If the keys never change and you don't need to mutate the values, a named tuple fits that job well: field access reads better (`data.key2`), the record is immutable, and every instance shares one set of field names stored on the class instead of carrying its own hash table.

```python run
import sys
from collections import namedtuple

Data = namedtuple('Data', 'key1 key2 key3')
print(sys.getsizeof(data_dict), sys.getsizeof(Data(100, 200, 300)))
```

(Exact sizes vary between versions, but the tuple is consistently the smaller one.)

<div class="callout note">
<span class="callout-title">Only for string keys that are valid field names</span>

Dictionary keys can be any hashable object: ints, tuples, and so on. Named tuple fields must be valid identifiers that don't start with an underscore. Everything in this lesson assumes keys like `'first_name'`, not `42` or `'_private'` or `'first name'` (`rename=True` can patch invalid names, but then the fields no longer match the keys).

</div>

## From one dictionary to a named tuple

Rather than typing the field names, take them from the dictionary itself. `namedtuple` accepts any iterable of strings, including `dict.keys()`:

```python run
Data = namedtuple('Data', data_dict.keys())
Data._fields
```

Now for the values. It's tempting to unpack `data_dict.values()` positionally:

```python run
d1 = Data(*data_dict.values())
d1
```

That looks right, but it only works because the dictionary happened to list its values in the same order as the named tuple's fields. Watch what happens with a dictionary whose keys were inserted in a different order:

```python run
data_dict_2 = dict(key1=100, key3=300, key2=200)
d2 = Data(*data_dict_2.values())
d2
```

`key2` received 300 and `key3` received 200, silently. Dictionaries preserve **insertion** order, which isn't necessarily the order of your fields.

The robust approach is to unpack the dictionary with `**`, which passes each item as a **keyword argument**. The field names are the constructor's parameter names, so every value lands in the right place regardless of order:

```python run
d2 = Data(**data_dict_2)
d2
```

So the pattern is:

```python
Struct = namedtuple('Struct', d.keys())
record = Struct(**d)
```

A bonus of `**`: a key that isn't a field (or a missing one) raises an error instead of quietly producing a wrong record.

```python run
try:
    Data(**{'key1': 1, 'key2': 2, 'key4': 4})
except TypeError as ex:
    print('TypeError:', ex)
```

## Choosing the field order

Because the values are matched by name, you're free to order the fields however you like, for example alphabetically:

```python run
data_dict = dict(first_name='John', last_name='Cleese', age=42, complaint='dead parrot')

Struct = namedtuple('Struct', sorted(data_dict.keys()))
print(Struct._fields)

person = Struct(**data_dict)
print(person)
print(person.complaint)
```

## Keeping the dictionary conveniences

Two common dictionary idioms seem to have no named tuple equivalent at first.

**The key is in a variable.** With a dict you write `data_dict[key_name]`. With a named tuple, `person.key_name` looks for a field literally called `key_name`. Use the built-in `getattr` instead:

```python run
key_name = 'age'
print(data_dict[key_name])
try:
    person.key_name
except AttributeError as ex:
    print('AttributeError:', ex)
print(getattr(person, key_name))
```

**A default for missing keys.** `dict.get(key, default)` has a direct counterpart: `getattr(obj, name, default)`.

```python run
print(data_dict.get('age', None), data_dict.get('invalid_key', None))
print(getattr(person, 'age', None), getattr(person, 'invalid_field', None))
```

And if you need a real dictionary again, `person._asdict()` gives you one.

## A list of dictionaries with a common structure

Converting a *single* dictionary isn't worth much: you'd create a whole class for one object. The approach pays off when you have **many** dictionaries that share (mostly) the same keys, such as rows parsed from JSON. One class serves them all.

```python run
data_list = [
    {'key1': 1, 'key2': 2},
    {'key1': 3, 'key2': 4},
    {'key1': 5, 'key2': 6, 'key3': 7},
    {'key2': 100},
]
```

Not every dictionary has every key, so first collect **all** keys used anywhere. A set removes duplicates; a set comprehension does it in one line:

```python run
keys = {key for d in data_list for key in d.keys()}
print(sorted(keys))

# the same with set union: unpack every keys view as an argument
print(sorted(set().union(*(d.keys() for d in data_list))))
```

A set has no meaningful order (it can even differ between runs), so **sort** the keys before using them as field names; otherwise the field order of your class would be unpredictable.

Then give every field a default of `None`, so dictionaries that lack a key still convert:

```python run
Struct = namedtuple('Struct', sorted(keys), defaults=(None,) * len(keys))
tuple_list = [Struct(**d) for d in data_list]
for t in tuple_list:
    print(t)
```

Packaged as a function:

```python run
def tuplify_dicts(dicts):
    keys = sorted({key for d in dicts for key in d.keys()})
    Struct = namedtuple('Struct', keys, defaults=(None,) * len(keys))
    return [Struct(**d) for d in dicts]

records = tuplify_dicts(data_list)
print(records[2])
print(sum(r.key2 for r in records))
```

<div class="callout modern">
<span class="callout-title">Defaults: older vs newer code</span>

Older notebooks set the defaults after creating the class with `Struct.__new__.__defaults__ = (None,) * len(Struct._fields)`. That still works, but the `defaults=` argument (Python 3.7+) used above does the same in one step and keeps `Struct._field_defaults` correct. Older material also leaves the set of keys unsorted, which makes the field order depend on hashing; sorting it makes the result reproducible.

</div>

## Mutable or not? Choosing the right tool

A named tuple is a good replacement for a dict only when you're happy with an **immutable** record. Some alternatives, all in the standard library:

- `dict`: arbitrary or changing keys, non-string keys, lookups by computed key.
- `namedtuple` / `typing.NamedTuple`: fixed fields, immutable, tuple behavior, very light.
- `dataclasses.dataclass`: fixed fields, mutable by default, a normal class with methods. `dataclasses.make_dataclass(name, fields)` builds one dynamically, like `namedtuple` does.
- `types.SimpleNamespace`: attribute access over arbitrary, mutable attributes, with no fixed schema.

```python run
from types import SimpleNamespace
from dataclasses import make_dataclass

ns = SimpleNamespace(**data_dict)
ns.age += 1                           # mutable
print(ns)

Row = make_dataclass('Row', sorted(data_dict))
print(Row(**data_dict))
```

<div class="takeaways">

## Key takeaways

- A dictionary with a fixed set of valid string keys can become a named tuple: `Struct = namedtuple('Struct', d.keys())`.
- Fill it with `Struct(**d)` (keyword arguments), **not** `Struct(*d.values())`, which depends on insertion order.
- `getattr(obj, name)` and `getattr(obj, name, default)` replace `d[name]` and `d.get(name, default)`.
- For a list of dicts: collect all keys with a set, **sort** them, use `defaults=(None,) * n`, then convert each dict.
- Named tuples are immutable; use a dataclass or `SimpleNamespace` if you need to change values.

</div>
