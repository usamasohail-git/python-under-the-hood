---
title: Extending
summary: A subclass can add new methods and attributes to what it inherits, parent methods can rely on hooks the children provide, and type(self) makes class attributes respect the subclass.
minutes: 13
---

## Adding new behavior

Overriding *replaces* inherited behavior. **Extending** *adds* behavior that the parent doesn't have. There's no special syntax: you just define new methods or attributes in the subclass. (Every class you've ever written has extended `object` this way.)

```python run
class Person:
    pass

class Student(Person):
    def study(self):
        return 'study... study... study...'

s = Student()
print(isinstance(s, Person), s.study())

try:
    Person().study()
except AttributeError as ex:
    print('AttributeError:', ex)
```

The extension only goes **down** the hierarchy. A `Student` has everything a `Person` has plus `study`; a plain `Person` knows nothing about `study`.

## A parent that calls a method only children have

Since lookups start at the instance's own class, a parent method can call a method that the parent itself never defines. It works as long as the object bound to `self` provides it:

```python run
class Person:
    def routine(self):
        return self.eat() + self.study() + self.sleep()

    def eat(self):
        return 'Person eats... '

    def sleep(self):
        return 'Person sleeps...'

class Student(Person):
    def study(self):
        return 'Student studies... '

print(Student().routine())

try:
    Person().routine()
except AttributeError as ex:
    print('AttributeError:', ex)
```

For a `Student`, `self.study()` finds `Student.study`. For a plain `Person`, the lookup fails. If the step is optional, the parent can check for it first with `hasattr`:

```python run
class Person:
    def routine(self):
        result = self.eat()
        if hasattr(self, 'study'):
            result += self.study()
        return result + self.sleep()

    def eat(self):
        return 'Person eats... '

    def sleep(self):
        return 'Person sleeps...'

class Student(Person):
    def study(self):
        return 'Student studies... '

print(Person().routine())
print(Student().routine())
```

## Base classes that require an override

Sometimes the step is not optional: the base class is a template, and every subclass **must** supply a method. The usual way to express that without extra tools is to define the method in the base class and have it raise `NotImplementedError`:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def routine(self):
        raise NotImplementedError(f'{type(self).__name__} must implement routine()')

class Student(Person):
    def routine(self):
        return 'Eat... Study... Sleep'

class Teacher(Person):
    def routine(self):
        return 'Eat... Teach... Sleep'

print(Student('Alex').routine())
print(Teacher('Fred').routine())

try:
    Person('Eric').routine()
except NotImplementedError as ex:
    print('NotImplementedError:', ex)
```

<div class="callout note">
<span class="callout-title">`NotImplementedError` vs `NotImplemented`</span>

You may see a base method that does `return NotImplemented` instead. That works, but it's not what the value is for: `NotImplemented` is a special value returned by binary operator methods such as `__eq__` or `__add__` to tell Python "try the other operand". Returned from an ordinary method, it's just a strange value the caller may not notice. Raising `NotImplementedError` fails loudly at the point of the mistake.

</div>

Either way, nothing stops you from creating a `Person` directly; you only find out when `routine` is called. The standard library's `abc` module goes further: methods decorated with `@abstractmethod` make the base class impossible to instantiate until a subclass overrides them all:

```python run
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2

print(Square(3).area())
try:
    Shape()
except TypeError as ex:
    print('TypeError:', ex)
```

Abstract base classes deserve a section of their own; for now it's enough to know they exist.

## Class attributes follow the same rules

Everything said about methods also applies to **class attributes**, because they're found by the same lookup. Here a parent method reads a class attribute that the child overrides:

```python run
class Account:
    apr = 3.0

    def __init__(self, account_number, balance):
        self.account_number = account_number
        self.balance = balance
        self.account_type = 'Generic Account'

    def calc_interest(self):
        return f'Calc interest on {self.account_type} with APR = {self.apr}'

class Savings(Account):
    apr = 5.0

    def __init__(self, account_number, balance):
        self.account_number = account_number   # duplicated; super() fixes this next lesson
        self.balance = balance
        self.account_type = 'Savings Account'

print(Account(123, 100).calc_interest())
print(Savings(234, 200).calc_interest())
```

`self.apr` found `Savings.apr` for the savings account. Compare that with hard-coding the class name inside the method:

```python run
class Account:
    apr = 3.0

    def __init__(self, account_number, balance):
        self.account_number = account_number
        self.balance = balance
        self.account_type = 'Generic Account'

    def calc_interest(self):
        return f'Calc interest on {self.account_type} with APR = {Account.apr}'

class Savings(Account):
    apr = 5.0

    def __init__(self, account_number, balance):
        self.account_number = account_number
        self.balance = balance
        self.account_type = 'Savings Account'

Savings(234, 200).calc_interest()
```

`Account.apr` always means the attribute on `Account`, so the subclass's override is ignored. Writing the class name inside its own methods quietly breaks inheritance.

## `self.apr` or `type(self).apr`?

`self.apr` has one weakness: it checks the **instance** dictionary first, so an instance attribute with the same name shadows the class attribute:

```python run
class Account:
    apr = 3.0

    def __init__(self, account_number, balance):
        self.account_number = account_number
        self.balance = balance
        self.account_type = 'Generic Account'

    def calc_interest(self):
        return f'self.apr = {self.apr}, type(self).apr = {type(self).apr}'

class Savings(Account):
    apr = 5.0

    def __init__(self, account_number, balance):
        self.account_number = account_number
        self.balance = balance
        self.account_type = 'Savings Account'

s1 = Savings(123, 100)
s2 = Savings(234, 200)
s2.apr = 10              # creates an instance attribute on s2 only

print(s2.__dict__)
print(s1.calc_interest())
print(s2.calc_interest())
```

`type(self)` (equivalently `self.__class__`) is the instance's actual class, `Savings` here, so `type(self).apr` respects subclass overrides but skips the instance dictionary. Which one you want is a design decision:

- `self.apr` if a per-instance override is a feature (a special rate for one account),
- `type(self).apr` if the value must come from the class, whatever someone sets on an instance.

Both are correct in the presence of subclasses. Only the hard-coded `Account.apr` isn't.

<div class="takeaways">

## Key takeaways

- **Extending** means adding methods or attributes in a subclass. The additions are available on the subclass and its descendants, never on the parent.
- A parent method can call `self.hook()` where only subclasses define `hook`. Use `hasattr` for optional hooks.
- For required hooks, raise `NotImplementedError` in the base method (not `return NotImplemented`), or use `abc.ABC` and `@abstractmethod` to block instantiation.
- Class attributes are looked up like methods. Never hard-code the class name (`Account.apr`) inside its methods.
- `self.attr` lets instance attributes shadow class attributes; `type(self).attr` reads from the instance's class and its parents only.

</div>
