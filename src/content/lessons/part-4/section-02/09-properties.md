---
title: Properties
summary: A property lets plain attribute syntax run getter, setter and deleter methods, so you can add validation later without changing a class's interface.
minutes: 15
---

## Start with a plain attribute

In Python, the simplest design is usually the right first step: a bare instance attribute.

```python run
class Person:
    def __init__(self, name):
        self.name = name

p = Person('Alex')
print(p.name, getattr(p, 'name'))
p.name = 'John'
setattr(p, 'name', 'Eric')
print(p.name)
```

Now suppose a new requirement arrives: the name must be a non-empty string, and surrounding whitespace should be stripped. A bare attribute can't enforce anything; anyone can assign `None` or `''`.

## Getter and setter methods

The classic fix is to store the value in a "private" attribute and route all access through methods:

```python run
class Person:
    def __init__(self, name):
        self.set_name(name)

    def get_name(self):
        return self._name

    def set_name(self, value):
        if isinstance(value, str) and len(value.strip()) > 0:
            self._name = value.strip()
        else:
            raise ValueError('name must be a non-empty string')

p = Person('Alex')
p.set_name('  Eric ')
print(repr(p.get_name()))

for bad in (100, '', None):
    try:
        p.set_name(bad)
    except ValueError as ex:
        print(f'{bad!r}: {ex}')
```

Note that `__init__` calls `set_name` too, so even the initial value is validated:

```python run
try:
    Person('')
except ValueError as ex:
    print('ValueError:', ex)
```

The leading underscore in `_name` is a **convention** meaning "internal, don't touch". Python doesn't enforce it: `p._name = None` works. But it tells other programmers they're on their own if they do it.

This works, but it has a cost: every piece of code that used `p.name` must now be rewritten to call `p.get_name()` and `p.set_name(...)`. We changed the class's **interface**.

## Enter `property`

A **property** gives you the best of both: the code still reads and writes `p.name`, but those operations call your methods. You build one with the built-in `property` class, passing the getter and setter functions:

```python run
class Person:
    def __init__(self, name):
        self.name = name          # goes through the property setter!

    def get_name(self):
        return self._name

    def set_name(self, value):
        if isinstance(value, str) and len(value.strip()) > 0:
            self._name = value.strip()
        else:
            raise ValueError('name must be a non-empty string')

    name = property(fget=get_name, fset=set_name)

p = Person('Alex')
print(p.name)
p.name = 'Eric'
print(p.name)

try:
    p.name = None
except ValueError as ex:
    print('ValueError:', ex)
```

`getattr` and `setattr` go through the property too, since they're just the function form of dotted notation:

```python run
setattr(p, 'name', 'John')
getattr(p, 'name')
```

This is why Python code doesn't need to start out with getters and setters "just in case", as is often recommended in Java. Start with a plain attribute; if you later need control, swap in a property with the same name, and no caller has to change.

## Where does a property live?

Look at the two namespaces:

```python run
print(p.__dict__)
print(Person.__dict__['name'])
print(type(Person.__dict__['name']))
```

The instance namespace holds the backing value `_name`. The property itself is a **class attribute**, an object of type `property`. When you write `p.name`, Python finds that property in the class and, because it's a property, calls its getter with `p` instead of returning the property object.

Properties take priority over the instance namespace. Even if you force a `name` entry into `p.__dict__`, dotted access ignores it:

```python run
p = Person('Alex')
p.__dict__['name'] = 'John'
print(p.__dict__)
print(p.name)          # still the getter

p.name = 'Raymond'     # still the setter
print(p.__dict__)
```

That's different from ordinary class attributes, which an instance attribute would shadow. The reason is that `property` is a **data descriptor**, a kind of object that Python's lookup checks *before* the instance dictionary. You'll see exactly how in the descriptors section. (And as always: just because you can poke at `__dict__` doesn't mean you should.)

## Adding a deleter

`property` takes a third function, `fdel`, which runs on `del obj.attr`:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    def get_name(self):
        print('getting name')
        return self._name

    def set_name(self, value):
        print('setting name')
        self._name = value

    def del_name(self):
        print('deleting name')
        del self._name

    name = property(get_name, set_name, del_name)

p = Person('Alex')
p.name = 'Eric'
print(p.__dict__)
del p.name
print(p.__dict__)
```

Deleting removed the **backing value**, not the property: it's defined on the class, so it's still there. Reading now fails inside the getter, but assigning works and brings the value back:

```python run
try:
    p.name
except AttributeError as ex:
    print('AttributeError:', ex)

p.name = 'Alex'
p.name
```

## Documenting a property

The fourth argument, `doc`, is the property's docstring, shown by `help()`:

```python run
class Person:
    """A person with a name."""
    def __init__(self, name):
        self._name = name

    def get_name(self):
        return self._name

    def set_name(self, value):
        self._name = value

    name = property(get_name, set_name, doc="The person's name.")

help(Person.name)
```

If you don't pass `doc`, the property uses the getter's docstring, if it has one.

<div class="takeaways">

## Key takeaways

- A **property** makes `obj.attr`, `obj.attr = v` and `del obj.attr` call getter, setter and deleter methods.
- `property(fget, fset, fdel, doc)` creates one; store it as a class attribute and keep the real value in a backing attribute like `_name`.
- Because the syntax doesn't change, you can turn a bare attribute into a property later without breaking callers. Don't write getters and setters up front.
- Properties live in the class and take priority over the instance `__dict__`.
- Deleting a property runs the deleter; the property itself stays on the class.

</div>
