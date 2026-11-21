---
title: Accessors - Application
summary: Using __getattr__ and __setattr__ to expose database-like records as objects whose attributes come from the data, without writing a class per table.
minutes: 13
---

## Attributes you don't know in advance

`__getattr__` and `__setattr__` shine when an object's attributes are defined by **data** rather than by code: rows from a database, JSON from an API, configuration loaded at run time. Writing a class with a property per column for every table would be repetitive, and it would break whenever the schema changed.

We'll simulate a small database with dictionaries: tables map record ids to records, and each record maps field names to values.

```python run
DB = {
    'Person': {
        1: {'first_name': 'Isaac', 'last_name': 'Newton', 'born': 1642, 'country_id': 1},
        2: {'first_name': 'Gottfried', 'last_name': 'von Leibniz', 'born': 1646, 'country_id': 5},
        3: {'first_name': 'Joseph', 'last_name': 'Fourier', 'born': 1768, 'country_id': 3},
        4: {'first_name': 'Bernhard', 'last_name': 'Riemann', 'born': 1826, 'country_id': 5},
        5: {'first_name': 'David', 'last_name': 'Hilbert', 'born': 1862, 'country_id': 5},
        6: {'first_name': 'Srinivasa', 'last_name': 'Ramanujan', 'born': 1887, 'country_id': 4},
        7: {'first_name': 'John', 'last_name': 'von Neumann', 'born': 1903, 'country_id': 2},
        8: {'first_name': 'Andrew', 'last_name': 'Wiles', 'born': 1953, 'country_id': 1},
    },
    'Country': {
        1: {'name': 'United Kingdom', 'capital': 'London', 'continent': 'Europe'},
        2: {'name': 'Hungary', 'capital': 'Budapest', 'continent': 'Europe'},
        3: {'name': 'France', 'capital': 'Paris', 'continent': 'Europe'},
        4: {'name': 'India', 'capital': 'New Delhi', 'continent': 'Asia'},
        5: {'name': 'Germany', 'capital': 'Berlin', 'continent': 'Europe'},
    },
}
```

The hand-written alternative would be a `Country` class with `name`, `capital` and `continent` properties, a `Person` class with four more, and so on for every table. Instead, we'll write two generic classes:

- `DBRecord` wraps one record dictionary and exposes its fields as attributes;
- `DBTable` represents a table and is **callable**: `table(record_id)` returns a `DBRecord`.

## `DBRecord`: fields as attributes

The record dictionary is stored in an instance attribute, `_record`. Fields are served by `__getattr__` (only called for names that aren't real attributes), and writes are routed into the dictionary by `__setattr__`, which rejects unknown fields.

Every access to `_record` *inside* the hooks goes through `super()`. In `__init__`, a plain `self._record = ...` would call our own `__setattr__`, which needs `_record`, which doesn't exist yet, so it would call `__getattr__`, which needs `_record`... an infinite loop.

```python run
class DBRecord:
    def __init__(self, db_record_dict):
        super().__setattr__('_record', db_record_dict)      # bypass our __setattr__

    def __getattr__(self, name):
        record = super().__getattribute__('_record')
        if name in record:
            return record[name]
        raise AttributeError(f'Field name {name!r} does not exist.')

    def __setattr__(self, name, value):
        record = super().__getattribute__('_record')
        if name in record:
            record[name] = value
        else:
            raise AttributeError(f'Field name {name!r} does not exist.')

    @property
    def fields(self):
        return tuple(self._record)

    def __dir__(self):                   # lets dir() and autocompletion see the fields
        return sorted(set(super().__dir__()) | set(self._record))

    def __repr__(self):
        return f'DBRecord({self._record!r})'
```

Two small additions make the object friendlier. `fields` is a normal property; since it exists on the class, `__getattr__` is never involved in reading it. And `__dir__` merges the dynamic fields into `dir(record)`, which is what interactive shells and many editors use for completion.

## `DBTable`: a callable table

```python run
class DBTable:
    def __init__(self, db, table_name):
        if table_name not in db:
            raise ValueError(f'The table {table_name} does not exist in the database.')
        self._table_name = table_name
        self._table = db[table_name]

    @property
    def table_name(self):
        return self._table_name

    def __call__(self, record_id):
        if record_id not in self._table:
            raise ValueError(f'Specified id ({record_id}) does not exist '
                             f'in table {self._table_name}')
        return DBRecord(self._table[record_id])
```

## Using it

```python run
tbl_person = DBTable(DB, 'Person')
tbl_country = DBTable(DB, 'Country')

person = tbl_person(1)
print(person.first_name, person.last_name, person.born)

country = tbl_country(person.country_id)    # follow the "foreign key"
print(country.name, country.capital)

print(person.fields)
print([name for name in dir(person) if not name.startswith('_')])
```

Writes go back into the underlying record, and unknown fields are rejected in both directions:

```python run
leibniz = tbl_person(2)
leibniz.last_name = 'Leibniz'
print(leibniz.last_name, DB['Person'][2]['last_name'])

for action in (lambda: leibniz.middle_name, lambda: setattr(leibniz, 'nickname', 'G')):
    try:
        action()
    except AttributeError as ex:
        print('AttributeError:', ex)

print(vars(leibniz).keys())       # only _record lives on the instance
```

## Why `super()` inside the hooks matters

Objects are sometimes created **without** running `__init__`: `copy.copy`, `pickle` and some frameworks call `__new__` and then probe the object for hooks such as `__setstate__`. At that moment `_record` doesn't exist. Had `__getattr__` used `self._record`, that probe would recurse forever. Because ours uses `super().__getattribute__('_record')`, it raises a clean `AttributeError`, and copying just works:

```python run
import copy

clone = copy.copy(tbl_country(3))
print(clone.name, clone.capital, clone)
```

<div class="callout tip">
<span class="callout-title">Read-only records with no code at all</span>

If you only need attribute-style *reading* of a dictionary, the standard library has `types.SimpleNamespace(**record)`, which copies the keys into instance attributes. The `DBRecord` approach is worth it when you need validation, write-through to the underlying data, or lazy loading.

</div>

<div class="takeaways">

## Key takeaways

- `__getattr__` + `__setattr__` let an object expose attributes defined by data (records, JSON, configs) without a class per shape.
- Store the backing data with `super().__setattr__` and read it inside the hooks with `super().__getattribute__`. This prevents infinite recursion, including for objects created without `__init__` (copy, pickle).
- Real attributes and properties (like `fields`) are found normally; `__getattr__` only handles the rest.
- Implement `__dir__` (and `__repr__`) so dynamic attributes are discoverable.

</div>
