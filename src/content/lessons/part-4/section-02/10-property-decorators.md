---
title: Property Decorators
summary: Because property() returns a property object and its setter/getter/deleter methods return new ones, the whole thing can be written with decorator syntax.
minutes: 14
---

## A quick refresher on decorators

Recall what the `@` syntax means. These two forms are identical:

```python
@my_decorator
def func(a, b):
    ...

# is exactly
def func(a, b):
    ...
func = my_decorator(func)
```

A decorator is any callable that takes a function and returns something, and that something is bound to the original name. Here's one in action:

```python run
def my_decorator(fn):
    print('decorating function')
    def inner(*args, **kwargs):
        print('running decorated function')
        return fn(*args, **kwargs)
    return inner

@my_decorator
def my_func(a, b):
    print('running original function')
    return a + b

my_func(10, 20)
```

## `property` as a decorator

`property` is a callable that takes a function (the getter) as its first argument and returns a `property` object. That's the signature of a decorator. So this:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    def name(self):
        return self._name

    name = property(name)

Person('Alex').name
```

is exactly what `@property` does for you:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

p = Person('Guido')
print(p.name)
print(type(Person.__dict__['name']))
```

After the decorator runs, the name `name` in the class body refers to the property object, not to the function. The function lives on inside the property, as its `fget`:

```python run
print(Person.name.fget)
print(Person.name.fset)
```

(Accessing a property through the **class** returns the property object itself, which is handy for inspecting it.)

## Adding a setter

A property object has methods `setter`, `getter` and `deleter`. Each one takes a function and returns a **new** property: a copy of the original with that one accessor replaced.

```python run
p1 = property(lambda self: 'getter')
p2 = p1.setter(lambda self, value: None)

print(p1 is p2)
print(p1.fset, p2.fset is not None)
print(p1.fget is p2.fget)
```

So `p2` has the same getter as `p1` plus a setter. Here's how you could use that by hand in a class body. It's clunky, because defining the setter function with `def name` would overwrite our property, so we keep a temporary reference to it:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    def name(self):
        return self._name
    name = property(name)        # property with a getter

    name_prop = name             # keep a reference, about to re-bind `name`

    def name(self, value):
        self._name = value
    name = name_prop.setter(name)  # new property: same getter + this setter

    del name_prop                # clean up the class namespace

p = Person('Alex')
p.name = 'Raymond'
print(p.name)
print([k for k in Person.__dict__ if not k.startswith('__')])
```

Now look at the line `name = name_prop.setter(name)`. Take a function, call something with it, bind the result to the function's own name: that's decorator syntax again. And at the moment the setter is being defined, `name` still refers to the property, so we don't even need the temporary reference:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value):
        self._name = value

p = Person('Alex')
p.name = 'Guido'
p.name
```

This is the standard way to write properties. Read `@name.setter` as "take the existing `name` property, and make a new one that also has this setter".

## Why the setter must have the same name

Since the decorated result is bound to the **function's** name, the setter function must be called `name` too. If it isn't, you end up with two properties:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

    @name.setter
    def full_name(self, value):
        self._name = value

print([k for k in Person.__dict__ if not k.startswith('__')])

p = Person('Alex')
p.full_name = 'Raymond'       # works: full_name has getter + setter
print(p.name, p.full_name)

try:
    p.name = 'Guido'          # name still has only a getter
except AttributeError as ex:
    print('AttributeError:', ex)
```

`name` is the original, getter-only property; `full_name` is the copy with both accessors.

<div class="callout modern">
<span class="callout-title">Clearer property error messages</span>

Older Python versions reported a missing setter as just `can't set attribute`, and a missing getter as `unreadable attribute`. Since Python 3.11 the messages name the property and the class, as you see here: `property 'name' of 'Person' object has no setter`.

</div>

## Other orders, and write-only properties

Nothing forces you to start with the getter. `property()` with no arguments creates an empty property, and you can add accessors in any order:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    name = property()        # no getter, no setter yet

    @name.setter
    def name(self, value):
        self._name = value

p = Person('Alex')
p.name = 'Raymond'
print(p.__dict__)

try:
    p.name
except AttributeError as ex:
    print('AttributeError:', ex)
```

That's a **write-only** property: you can set it but not read it back. It's rarely useful (the value is still sitting in `p._name` for anyone who looks), but now you know it's possible. Adding a getter afterwards with `@name.getter` makes it read/write:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    name = property()

    @name.setter
    def name(self, value):
        self._name = value

    @name.getter
    def name(self):
        return self._name

p = Person('Alex')
p.name = 'Raymond'
p.name
```

## Docstrings

With the decorator style, the property's docstring comes from the **getter's** docstring:

```python run
class Person:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        """The person's name."""
        return self._name

    @name.setter
    def name(self, value):
        self._name = value

print(Person.name.__doc__)
```

A docstring on the setter is ignored. For a property without a getter, pass the docstring explicitly: `name = property(doc='Write-only name.')`.

```python run
class Person:
    name = property(doc='Write-only name property.')

    @name.setter
    def name(self, value):
        self._name = value

print(Person.name.__doc__)
```

<div class="takeaways">

## Key takeaways

- `@property` is just `name = property(name)`: the getter becomes a property object bound to the same name.
- `prop.setter(f)`, `prop.getter(f)` and `prop.deleter(f)` each return a **new** property with that accessor added or replaced.
- `@name.setter` must decorate a function also called `name`; otherwise you create a second property.
- `property()` with no arguments starts an empty property; accessors can be added in any order.
- The getter's docstring becomes the property's docstring; otherwise use `property(doc=...)`.

</div>
