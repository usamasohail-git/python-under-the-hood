---
title: Slots and Single Inheritance
summary: Slots are inherited, but a subclass gets an instance __dict__ unless it declares __slots__ too; properties, __dict__ and __weakref__ can be combined with slots deliberately.
minutes: 15
---

## Slots are inherited, the "no dict" part isn't

Start with a slotted parent and a child that doesn't mention slots at all:

```python run
class Person:
    __slots__ = 'name',

    def __init__(self, name):
        self.name = name

class Student(Person):
    pass

p = Person('Eric')
print(hasattr(p, '__dict__'))

s = Student('Alex')
print(s.name, s.__dict__)
```

The `Person` instance has no dictionary, as expected. The `Student` instance **does** have one, but it's empty: `name` is still stored in the slot inherited from `Person`, because the `name` descriptor is found on `Person` during lookup. What the subclass lost is the restriction. Since `Student` didn't declare `__slots__`, Python gave its instances a `__dict__` (and a `__weakref__`), so arbitrary attributes are allowed again:

```python run
s.age = 19
print(s.__dict__)
print(s.name, s.age)
```

The rule: an instance has no `__dict__` only if **every** class in its MRO (apart from `object`) declares `__slots__`. One slot-less class anywhere in the chain brings the dictionary back.

## Keeping a subclass slot-only

To keep the subclass dictionary-free, declare `__slots__` in it as well. If it needs no new attributes, an empty tuple will do:

```python run
class Student(Person):
    __slots__ = ()

s = Student('Alex')
print(s.name)
try:
    s.age = 19
except AttributeError as ex:
    print('AttributeError:', ex)
```

If the subclass needs more attributes, list **only the new ones**. The inherited slots are already there:

```python run
class Student(Person):
    __slots__ = 'school', 'student_number'

    def __init__(self, name, school, student_number):
        super().__init__(name)
        self.school = school
        self.student_number = student_number

s = Student('James', 'MI6 Prep', '007')
print(s.name, s.school, s.student_number)
print(hasattr(s, '__dict__'))
```

## Don't repeat a parent's slot

Python allows a subclass to list a slot that a parent already has, but it's a mistake. The instance then reserves **two** places for the same name, and the parent's one becomes unreachable through normal attribute access:

```python run
import sys

class Base:
    __slots__ = 'x',

class Good(Base):
    __slots__ = 'y',        # one new slot

class Repeated(Base):
    __slots__ = 'x',        # repeats Base's slot

print(sys.getsizeof(Base()), sys.getsizeof(Good()), sys.getsizeof(Repeated()))
print(Repeated.x is Base.x)
```

`Repeated` instances are as big as `Good` instances, yet they store only one usable attribute. Worse, code in `Base` that uses the parent's descriptor directly would see a different value from `obj.x`. The documentation warns that this may be checked in the future; just don't do it.

## A slotted child of a slot-less parent

The opposite combination also works, with the opposite result. If the parent has no `__slots__`, its instances (and its subclasses' instances) have a `__dict__`. A slotted child only moves *its own* attributes into slots:

```python run
class Person:
    def __init__(self, name):
        self.name = name

class Student(Person):
    __slots__ = 'age',

    def __init__(self, name, age):
        super().__init__(name)
        self.age = age

s = Student('Python', 30)
print(s.name, s.age, s.__dict__)
```

`age` lives in a slot, `name` (set by the slot-less parent) lives in the dictionary. This hybrid saves almost nothing, since the dictionary exists anyway. To get the benefits of slots, the whole chain has to cooperate.

## Slots and properties

A property is a class attribute, not instance data, so it **doesn't** go in `__slots__`. What goes in the slots is the attribute the property stores its value in:

```python run
class Person:
    __slots__ = '_name', 'age'

    def __init__(self, name, age):
        self.name = name
        self.age = age

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value):
        self._name = value

p = Person('Eric', 78)
print(p.name, p.age, hasattr(p, '__dict__'))
```

Listing `name` in the slots as well would clash, for the same reason a class attribute clashes with a slot: both want to be the class attribute `name`.

```python run
try:
    class Broken:
        __slots__ = 'name',

        @property
        def name(self):
            return 'x'
except ValueError as ex:
    print('ValueError:', ex)
```

Properties and slots have more in common than it seems. Neither keeps anything in an instance dictionary, and both work because the **class** holds an object with `__get__` and `__set__` methods that the attribute lookup calls. Those objects are called *descriptors*:

```python run
print(type(Person.name).__name__, hasattr(Person.name, '__get__'), hasattr(Person.name, '__set__'))
print(type(Person.age).__name__, hasattr(Person.age, '__get__'), hasattr(Person.age, '__set__'))
```

A `property` is a descriptor built from your getter and setter functions; a member descriptor is one that reads and writes a fixed slot in the instance. Descriptors get a full section later on.

## Opting back in: `__dict__` and `__weakref__` as slots

Without `__slots__`, an instance has a dictionary and no slots; with it, slots and no dictionary. You can also have **both** on purpose, by listing `'__dict__'` as one of the slots:

```python run
class Person:
    __slots__ = 'name', '__dict__'

    def __init__(self, name, age):
        self.name = name
        self.age = age

p = Person('Alex', 19)
print(p.name, p.age, p.__dict__)
p.school = 'Berkeley'
print(p.__dict__)
```

The declared slot `name` stays out of the dictionary, while undeclared attributes like `age` and `school` go into it. That's useful when a few attributes are accessed constantly and there are many instances, but you still want the freedom to attach extras.

`'__weakref__'` works the same way, as you saw in the previous lesson. Both special slots follow the inheritance rules above: a class only needs them if no ancestor already provides them, and repeating `__weakref__` when it's already there is an error:

```python run
class Node:
    __slots__ = 'value', '__weakref__'

class Leaf(Node):
    __slots__ = ()                  # inherits weak-reference support

import weakref
leaf = Leaf()
print(weakref.ref(leaf)() is leaf)

try:
    class BadLeaf(Node):
        __slots__ = '__weakref__',
except TypeError as ex:
    print('TypeError:', ex)
```

## Summary of the combinations

| Parent | Child | Child instance has |
| --- | --- | --- |
| `__slots__` | no `__slots__` | inherited slots **and** a `__dict__` |
| `__slots__` | `__slots__ = ()` or new names | slots only |
| no `__slots__` | `__slots__` | a `__dict__` and the child's slots |
| any | `'__dict__'` / `'__weakref__'` in slots | those features, if no ancestor already has them |

<div class="takeaways">

## Key takeaways

- Slots are inherited, but a subclass that doesn't declare `__slots__` gets a `__dict__` and `__weakref__` back. Only a chain where every class declares `__slots__` is dictionary-free.
- In a subclass, list only the **new** slot names, or `()` for none. Repeating a parent's slot wastes space and hides the parent's slot.
- A slotted class below a slot-less one still has a dictionary, so the savings mostly disappear.
- Put a property's *backing* attribute (e.g. `_name`) in `__slots__`, not the property name. Properties and slots are both descriptors stored on the class.
- Add `'__dict__'` or `'__weakref__'` to `__slots__` to opt back in to dynamic attributes or weak references.

</div>
