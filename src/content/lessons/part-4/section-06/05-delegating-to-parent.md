---
title: Delegating to Parent
summary: super() lets an overriding method call the version it replaced, searching the MRO from the class after the current one while keeping self bound to the original object.
minutes: 16
---

## Calling the method you overrode

When a subclass overrides a method, the parent's version is hidden: `self.work()` would find the override and recurse forever. Often, though, the child wants to *add to* the parent's behavior, not throw it away. `super()` gives access to the parent's version:

```python run
class Person:
    def work(self):
        return 'Person works...'

class Student(Person):
    def work(self):
        result = super().work()
        return f'Student studies... and {result}'

Student().work()
```

`super().work()` means "look up `work`, but start the search **above** the class I'm written in". You only need `super()` when there's an ambiguity like this, that is when the current class overrides the name. For a method the class doesn't override, plain `self.method()` already finds the inherited one:

```python run
class Person:
    def work(self):
        return 'Person works...'

class Student(Person):
    def study(self):
        return 'Student studies...'

class PythonStudent(Student):
    def code(self):
        return f'{self.work()} and {self.study()} and PythonStudent codes...'

PythonStudent().code()
```

## `super()` walks up the chain

The search that `super()` starts isn't limited to the direct parent. It continues up the hierarchy until something defines the name:

```python run
class Person:
    def work(self):
        return 'Person works...'

class Student(Person):
    pass                       # no work() here

class PythonStudent(Student):
    def work(self):
        return f'PythonStudent codes... and {super().work()}'

PythonStudent().work()
```

And every level can delegate in turn, so each override contributes its own part:

```python run
class Person:
    def work(self):
        return 'Person works...'

class Student(Person):
    def work(self):
        return f'Student studies... and {super().work()}'

class PythonStudent(Student):
    def work(self):
        return f'PythonStudent codes... and {super().work()}'

PythonStudent().work()
```

## What `super()` really searches: the MRO

Precisely, `super()` looks at the **MRO of the instance's class**, `type(self).__mro__`, finds the class in which the method containing the `super()` call is defined, and searches the classes *after* it:

```python run
ps = PythonStudent()
print([cls.__name__ for cls in type(ps).__mro__])
```

Inside `PythonStudent.work`, `super()` searches `Student, Person, object`. Inside `Student.work`, it searches `Person, object`. The zero-argument form is a shortcut for the explicit two-argument form `super(CurrentClass, self)`, and you can use the explicit form to start the search from a different point in the MRO (rarely a good idea, but it shows the mechanism):

```python run
print(super(PythonStudent, ps).work())   # same as super() inside PythonStudent
print(super(Student, ps).work())         # skips Student: starts after it
```

<div class="callout note">
<span class="callout-title">How the zero-argument form knows the class</span>

When the compiler sees `super` used inside a method, it gives that method a hidden closure variable called `__class__`, a cell referring to the class being defined (closures and cells were covered in Part 1). At call time `super()` reads that cell and the method's first argument. That's why zero-argument `super()` only works inside a method defined in a `class` body.

</div>

With single inheritance the MRO is just the chain of ancestors, so "the next class in the MRO" and "the parent" are the same thing. With multiple inheritance they can differ, which is why it pays to think of `super()` in terms of the MRO from the start.

## `self` is still the original object

Delegation changes **where** the method is found, not **which object** it's bound to. Every method in the chain receives the same `self`:

```python run
class Person:
    def work(self):
        return f'{hex(id(self))} works'

class Student(Person):
    def work(self):
        return f'{hex(id(self))} studies, {super().work()}'

class PythonStudent(Student):
    def work(self):
        return f'{hex(id(self))} codes, {super().work()}'

ps = PythonStudent()
print(hex(id(ps)))
print(ps.work())
```

So when a parent method run through `super()` sets an attribute, it's set on the original object:

```python run
class Person:
    def set_name(self, value):
        print('Person.set_name doing the work')
        self.name = value

class Student(Person):
    def set_name(self, value):
        print('Student.set_name delegating to parent')
        super().set_name(value)

s = Student()
print(s.__dict__)
s.set_name('Eric')
print(s.__dict__)
```

And any method the parent calls on `self` is again looked up from the child's class. Here `Person.method_1`, reached via `super()`, calls `self.method_2()`, which finds the override in `Student`:

```python run
class Person:
    def method_1(self):
        print('Person.method_1')
        self.method_2()

    def method_2(self):
        print('Person.method_2')

class Student(Person):
    def method_1(self):
        print('Student.method_1')
        super().method_1()

    def method_2(self):
        print('Student.method_2')

Student().method_1()
```

This combination is the one that trips people up. `super()` only affects the *one* lookup it's used for; every `self.something` after that starts from the instance's class again.

## Delegating `__init__`

The most common use of `super()` is in initializers. A child usually needs everything the parent sets up, plus a few attributes of its own:

```python run
class Person:
    def __init__(self, name):
        self.name = name

class Student(Person):
    def __init__(self, name, student_number):
        super().__init__(name)
        self.student_number = student_number

s = Student('Python', 30)
s.__dict__
```

This removes the duplicated assignments you saw in the `Polygon` and `Savings` examples of earlier lessons. If the parent's validation or setup changes, the children pick it up automatically.

There are three cases to keep straight:

```python run
class Person:
    def __init__(self, name):
        print('Person.__init__ called')
        self.name = name

class Student(Person):
    pass                                  # 1. no __init__: inherits Person's

s = Student('Alex')
print(s.__dict__)

try:
    Student()                             # ...including its required arguments
except TypeError as ex:
    print('TypeError:', ex)
```

```python run
class Student(Person):
    def __init__(self, name):             # 2. own __init__ without super():
        print('Student.__init__ called')  #    Person.__init__ is NOT called

s = Student('Alex')
print(s.__dict__)
```

```python run
class Student(Person):
    def __init__(self, name):             # 3. own __init__ that delegates
        super().__init__(name)
        print('Student.__init__ called')

s = Student('Alex')
print(s.__dict__)
```

1. If the child has no `__init__`, it simply inherits the parent's, so it must be called with the parent's arguments.
2. If the child defines `__init__`, Python does **not** call the parent's automatically. In case 2 the instance never gets a `name`.
3. To run both, call `super().__init__(...)` explicitly. Calling it first is the usual choice, so the child can rely on the parent's attributes, but it's an ordinary call and can go anywhere.

<div class="callout modern">
<span class="callout-title">Clearer error messages</span>

Since Python 3.10, errors about arguments show the qualified name of the function, e.g. `Person.__init__() missing 1 required positional argument: 'name'`. Older versions just said `__init__() missing ...`, which made it harder to tell which class's initializer complained.

</div>

## A practical example: a unit circle

Here's a `Circle` with a validated `radius` property and lazily cached `area` and `perimeter`:

```python run
from math import pi
from numbers import Real

class Circle:
    def __init__(self, r):
        self._r = r
        self._area = None
        self._perimeter = None

    @property
    def radius(self):
        return self._r

    @radius.setter
    def radius(self, r):
        if isinstance(r, Real) and r > 0:
            self._r = r
            self._area = None          # invalidate the caches
            self._perimeter = None
        else:
            raise ValueError('Radius must be a positive real number.')

    @property
    def area(self):
        if self._area is None:
            self._area = pi * self.radius ** 2
        return self._area

    @property
    def perimeter(self):
        if self._perimeter is None:
            self._perimeter = 2 * pi * self.radius
        return self._perimeter
```

A unit circle is a circle whose radius is always 1. Delegating `__init__` is all it takes to create one:

```python run
class UnitCircle(Circle):
    def __init__(self):
        super().__init__(1)

u = UnitCircle()
print(u.radius, u.area, u.perimeter)
u.radius = 10
print(u.radius)     # oops: no longer a unit circle
```

It inherited the setter too. To make `radius` read-only, override the property with a getter-only one. The new getter must delegate with `super().radius`. Writing `self.radius` would call the very property being defined and recurse forever:

```python run
class UnitCircle(Circle):
    def __init__(self):
        super().__init__(1)

    @property
    def radius(self):
        return super().radius

u = UnitCircle()
print(u.radius, u.area)
try:
    u.radius = 10
except AttributeError as ex:
    print('AttributeError:', ex)
```

`super()` works for properties and other attributes, not just methods. And the inherited `area` property, which reads `self.radius`, now goes through `UnitCircle.radius`: the same "lookup starts at the instance's class" rule as always.

<div class="takeaways">

## Key takeaways

- `super().name` looks up `name` starting **after** the class the code is written in, in the MRO of `type(self)`. Use it when the current class overrides `name` and you need the inherited version.
- The search continues up the chain, and each level can delegate in turn.
- Methods reached through `super()` are still bound to the original object, so attributes they set land on it, and their own `self.x` lookups start from the instance's class again.
- A child without `__init__` inherits the parent's. A child with `__init__` must call `super().__init__(...)` itself if it wants the parent's setup.
- `super()` also works with properties, e.g. overriding a property as read-only with `return super().radius`.

</div>
