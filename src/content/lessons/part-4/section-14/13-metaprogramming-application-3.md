---
title: Metaprogramming - Application 3
summary: Building configuration classes from .ini files with two metaclasses, so settings are reachable with dot notation and show up in help().
minutes: 14
---

## The goal

Applications often keep their settings in `.ini` files, one per environment. We'd like to load them into objects so the rest of the code can write `config.database.db_host` instead of digging through dictionaries. Let's create two such files (the in-browser file system is writable):

```python run
with open('prod.ini', 'w') as prod, open('dev.ini', 'w') as dev:
    prod.write('[Database]\ndb_host=prod.mynetwork.com\ndb_name=my_database\n\n[Server]\nport=8080\n')
    dev.write('[Database]\ndb_host=dev.mynetwork.com\ndb_name=my_database\n\n[Server]\nport=3000\n')

print(open('dev.ini').read())
```

The standard library's `configparser` reads this format. Each section behaves like a dictionary of strings:

```python run
import configparser

parser = configparser.ConfigParser()
parser.read('dev.ini')
print(parser.sections(), dict(parser['Database']))
```

## A plain class first

A straightforward `Config` class loads a file in `__init__` and sets one attribute per key, without hardcoding any names:

```python run
class Config:
    def __init__(self, env='dev'):
        print(f'Loading config from {env} file...')
        parser = configparser.ConfigParser()
        parser.read(f'{env}.ini')
        for section_name in parser.sections():
            for key, value in parser[section_name].items():
                setattr(self, key, value)

config = Config('prod')
print(vars(config))
```

This works, but it has three weaknesses:

- the file is re-parsed every time someone creates a `Config`;
- sections are flattened away (two sections with a `host` key would collide);
- the attributes only exist on **instances**, so `help(Config)` and simple editors can't show what settings exist.

Sections could be modelled with a nested `Section` object per section, which fixes the second point. But the other two come from doing the work at instance level. If the settings were **class attributes**, created once when the class is defined, every module could just import the class, and `help()` would describe it.

## A metaclass for sections

We'll write two metaclasses. The first builds a class for one section. It takes the section name and its items as metaclass parameters and puts them, plus a docstring, into the namespace:

```python run
class SectionType(type):
    def __new__(mcls, name, bases, cls_dict, section_name, items_dict):
        cls_dict['__doc__'] = f'Configs for {section_name} section'
        cls_dict['section_name'] = section_name
        for key, value in items_dict.items():
            cls_dict[key] = value
        return super().__new__(mcls, name, bases, cls_dict)

class DatabaseSection(metaclass=SectionType, section_name='database',
                      items_dict={'db_name': 'my_database', 'host': 'myhost.com'}):
    pass

print(DatabaseSection.db_name, DatabaseSection.host)
print(DatabaseSection.__doc__)
```

As with `type`, we don't need a `class` statement. Calling the metaclass creates a section class directly, with the parameters as keyword arguments. That's what we'll do in a loop, one class per section in the file:

```python run
MySection = SectionType('DBSection', (), {}, section_name='databases',
                        items_dict={'db_name': 'my_db', 'port': 8000})
print(MySection, MySection.port, MySection.__doc__)
```

## A metaclass for the whole config

The second metaclass takes an `env` parameter, parses the matching file **once, at class creation**, and adds one section class per section as a class attribute:

```python run
class ConfigType(type):
    def __new__(mcls, name, bases, cls_dict, env):
        cls_dict['__doc__'] = f'Configurations for {env}.'
        cls_dict['env'] = env
        parser = configparser.ConfigParser()
        parser.read(f'{env}.ini')
        for section_name in parser.sections():
            section_cls = SectionType(
                section_name.capitalize(), (), {},
                section_name=section_name, items_dict=parser[section_name],
            )
            cls_dict[section_name.casefold()] = section_cls
        return super().__new__(mcls, name, bases, cls_dict)

class DevConfig(metaclass=ConfigType, env='dev'):
    pass

class ProdConfig(metaclass=ConfigType, env='prod'):
    pass

print(DevConfig.database.db_host, ProdConfig.database.db_host)
print(DevConfig.server.port, ProdConfig.server.port)
print([k for k in vars(DevConfig) if not k.startswith('__')])
```

The settings are now plain class attributes, nested by section. Since they're real attributes of real classes, introspection tools can see them:

```python run
help(DevConfig.database)
```

`help()` shows the generated docstring and lists every setting under "Data and other attributes".

<div class="callout note">
<span class="callout-title">Values are strings</span>

`configparser` returns every value as a string (`'3000'`, not `3000`) and lowercases the keys, though not the section names. A production version might convert values with the parser's `getint()` / `getboolean()` helpers, or validate them with descriptors like the `IntegerField` from the first lesson.

</div>

<div class="callout tip">
<span class="callout-title">Is a metaclass really needed here?</span>

Not strictly. `__init_subclass__(cls, env)` on a base class could do the same loading, and calling `type(...)` (or `SectionType(...)`) in a plain function could build the section classes. The metaclass version shines when you want the whole family (`DevConfig`, `ProdConfig`, a `TestConfig` someone adds later) to follow the same rule just by declaring `env=...`. Weigh that against how familiar your teammates are with metaclasses.

</div>

<div class="takeaways">

## Key takeaways

- Metaclass parameters (`env='dev'`) let one metaclass produce a family of differently configured classes.
- Metaclasses can be called directly, like `type`, to build classes in a loop: `SectionType(name, (), {}, section_name=..., items_dict=...)`.
- Doing the work at class creation means it runs once, and the results are class attributes that `help()` and editors can see.
- Generating `__doc__` in the namespace gives dynamically created classes useful documentation.

</div>
