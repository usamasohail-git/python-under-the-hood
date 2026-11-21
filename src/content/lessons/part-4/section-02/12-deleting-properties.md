---
title: Deleting Properties
summary: del obj.prop and delattr call the property's deleter, which typically removes the backing value; the property itself stays defined on the class.
minutes: 8
---

## `del` calls the deleter

Attributes can be deleted with `del obj.attr` or `delattr(obj, 'attr')`, and properties support the same operations. For a property, deleting means calling its **deleter** function (`fdel`). What that function does is up to you; usually it removes the backing value from the instance, or performs some other cleanup.

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def get_name(self):
        print('getting name property value...')
        return self._name

    def set_name(self, value):
        print(f'setting name property to {value}...')
        self._name = value

    def del_name(self):
        print('deleting name property value...')
        del self._name

    name = property(fget=get_name, fset=set_name, fdel=del_name, doc='Person name.')

p = Person('Guido')
print(p.name)
print(p.__dict__)
```

Now delete it:

```python run
del p.name
print(p.__dict__)
```

The deleter removed `_name` from the instance namespace. The **property** is untouched: it's defined on the class, and deleting through an instance never removes class attributes. So reading still calls the getter, which now fails because there's no backing value:

```python run
try:
    print(p.name)
except AttributeError as ex:
    print('AttributeError:', ex)

print(type(Person.__dict__['name']))
```

Assigning through the setter brings the value back. `delattr` works exactly like `del`:

```python run
p.name = 'Raymond'
delattr(p, 'name')
print(p.__dict__)
```

## The decorator form

With decorators, add the deleter with `@name.deleter`, which, like `@name.setter`, returns a new property that also has the deleter:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    @property
    def name(self):
        """Person name"""
        print('getting name property value...')
        return self._name

    @name.setter
    def name(self, value):
        print(f'setting name property to {value}...')
        self._name = value

    @name.deleter
    def name(self):
        print('deleting name property value...')
        del self._name

p = Person('Alex')
print(p.name)
del p.name
print(p.__dict__)
```

## No deleter, no deleting

If a property doesn't define a deleter, `del` raises `AttributeError`, even if the backing attribute exists. That makes a getter-only property protected against both assignment and deletion:

```python run
class Account:
    def __init__(self, number):
        self._number = number

    @property
    def number(self):
        return self._number

a = Account('A-100')
try:
    del a.number
except AttributeError as ex:
    print('AttributeError:', ex)
```

## When is a deleter useful?

Deleters are the least used part of properties, but there are good uses:

- **Resetting a cached value**, so the next read recomputes it: the deleter sets the cache back to `None`.
- **Releasing a resource** held by the attribute, such as closing a connection or file before forgetting it.
- **Keeping related state consistent**: deleting one attribute also clears attributes derived from it.

Here's the first one, using the cached-area circle from the previous lesson:

```python run
from math import pi

class Circle:
    def __init__(self, radius):
        self.radius = radius
        self._area = None

    @property
    def area(self):
        if self._area is None:
            print('calculating area...')
            self._area = pi * self.radius ** 2
        return self._area

    @area.deleter
    def area(self):
        self._area = None    # forget the cached value

c = Circle(1)
c.area
c.area
del c.area               # reset the cache
print(c.area)
```

<div class="takeaways">

## Key takeaways

- `del obj.prop` and `delattr(obj, 'prop')` call the property's deleter.
- The deleter usually removes or resets the **backing value**; the property stays on the class.
- Define it with `property(fget, fset, fdel)` or the `@name.deleter` decorator.
- A property without a deleter can't be deleted: `del` raises `AttributeError`.

</div>
