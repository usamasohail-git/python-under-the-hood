---
title: Interest Rate
summary: A monthly interest rate shared by all accounts, first as a bare class attribute (and its shadowing trap), then behind validating class methods.
minutes: 12
---

## The code so far

```python run
import itertools
import numbers
from collections import namedtuple
from datetime import datetime, timedelta, timezone


class TimeZone:
    def __init__(self, name, offset_hours, offset_minutes):
        if name is None or len(str(name).strip()) == 0:
            raise ValueError('Timezone name cannot be empty.')
        self._name = str(name).strip()

        if not isinstance(offset_hours, numbers.Integral):
            raise ValueError('Hour offset must be an integer.')
        if not isinstance(offset_minutes, numbers.Integral):
            raise ValueError('Minutes offset must be an integer.')
        if offset_minutes < -59 or offset_minutes > 59:
            raise ValueError('Minutes offset must be between -59 and 59 (inclusive).')

        offset = timedelta(hours=offset_hours, minutes=offset_minutes)
        # real-world UTC offsets range from -12:00 to +14:00
        if offset < timedelta(hours=-12) or offset > timedelta(hours=14):
            raise ValueError('Offset must be between -12:00 and +14:00.')

        self._offset_hours = offset_hours
        self._offset_minutes = offset_minutes
        self._offset = offset

    @property
    def offset(self):
        return self._offset

    @property
    def name(self):
        return self._name

    def __eq__(self, other):
        return (isinstance(other, TimeZone) and
                self.name == other.name and
                self._offset_hours == other._offset_hours and
                self._offset_minutes == other._offset_minutes)

    def __repr__(self):
        return (f"TimeZone(name='{self.name}', "
                f"offset_hours={self._offset_hours}, "
                f"offset_minutes={self._offset_minutes})")


class Account:
    transaction_counter = itertools.count(100)

    def __init__(self, account_number, first_name, last_name,
                 timezone=None, initial_balance=0):
        self._account_number = account_number
        self.first_name = first_name
        self.last_name = last_name

        if timezone is None:
            timezone = TimeZone('UTC', 0, 0)
        self.timezone = timezone

        self._balance = float(initial_balance)

    @property
    def account_number(self):
        return self._account_number

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        self._first_name = Account.validate_name(value, 'First name')

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        self._last_name = Account.validate_name(value, 'Last name')

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @staticmethod
    def validate_name(value, field_title):
        if value is None or len(str(value).strip()) == 0:
            raise ValueError(f'{field_title} cannot be empty.')
        return str(value).strip()

    @property
    def timezone(self):
        return self._timezone

    @timezone.setter
    def timezone(self, value):
        if not isinstance(value, TimeZone):
            raise ValueError('Time zone must be a valid TimeZone object.')
        self._timezone = value

    @property
    def balance(self):
        return self._balance
```

## Shared state again

The monthly interest rate applies to **all accounts uniformly**. Like the transaction counter, it belongs to the class, not to any one account. The natural first attempt is a plain **class attribute**:

```python run
class Account:
    interest_rate = 0.5   # percent per month

a1 = Account()
a2 = Account()
print(a1.interest_rate, a2.interest_rate)

Account.interest_rate = 2.5
print(a1.interest_rate, a2.interest_rate)
```

Reading through an instance works because attribute lookup falls back from the instance's `__dict__` to the class. Changing it **on the class** changes it for everyone. So far so good.

## Two problems with a bare attribute

**No validation.** Anyone can set a negative rate, or a string:

```python run
Account.interest_rate = 'lots'
print(a1.interest_rate)
```

**Setting it through an instance quietly does the wrong thing.** Assignment through an instance never touches the class attribute; it creates an instance attribute that *shadows* it:

```python run
Account.interest_rate = 0.5
a1.interest_rate = 10        # meant to change the rate for everybody?

print(a1.interest_rate, a2.interest_rate, Account.interest_rate)
print(a1.__dict__)
```

Now `a1` earns a private 10% while everyone else gets 0.5%, and there's no error to tell you. For a value that must be uniform across all accounts, that's a nasty bug.

## A validated, class-level accessor

A `property` won't help here: properties manage **instance** attribute access. Assigning through the *class* (`Account.interest_rate = 3`) would simply replace the property object itself. (Class-level properties are possible with descriptors and metaclasses, covered much later.)

What we can do is make the attribute "private" (`_interest_rate`) and expose it through a getter and a setter. Both work on class state and need no instance, so they're **class methods**: Python passes in the class as `cls`, whether we call them on the class or on an instance.

```python run
class Account:
    transaction_counter = itertools.count(100)
    _interest_rate = 0.5  # percent, shared by all accounts

    def __init__(self, account_number, first_name, last_name,
                 timezone=None, initial_balance=0):
        self._account_number = account_number
        self.first_name = first_name
        self.last_name = last_name

        if timezone is None:
            timezone = TimeZone('UTC', 0, 0)
        self.timezone = timezone

        self._balance = float(initial_balance)

    @property
    def account_number(self):
        return self._account_number

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        self._first_name = Account.validate_name(value, 'First name')

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        self._last_name = Account.validate_name(value, 'Last name')

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @staticmethod
    def validate_name(value, field_title):
        if value is None or len(str(value).strip()) == 0:
            raise ValueError(f'{field_title} cannot be empty.')
        return str(value).strip()

    @property
    def timezone(self):
        return self._timezone

    @timezone.setter
    def timezone(self, value):
        if not isinstance(value, TimeZone):
            raise ValueError('Time zone must be a valid TimeZone object.')
        self._timezone = value

    @property
    def balance(self):
        return self._balance

    @classmethod
    def get_interest_rate(cls):
        return cls._interest_rate

    @classmethod
    def set_interest_rate(cls, value):
        if not isinstance(value, numbers.Real):
            raise ValueError('Interest rate must be a real number.')
        if value < 0:
            raise ValueError('Interest rate cannot be negative.')
        cls._interest_rate = value
```

```python run
a1 = Account('A100', 'Eric', 'Idle')
a2 = Account('A101', 'John', 'Cleese')

print(Account.get_interest_rate(), a1.get_interest_rate())

a1.set_interest_rate(1.25)      # called through an instance...
print(a2.get_interest_rate(), Account.get_interest_rate())   # ...but changes the class
print(a1.__dict__.keys())
```

Even called as `a1.set_interest_rate(...)`, the method receives `Account` as `cls`, so `cls._interest_rate = value` updates the shared class attribute. No shadowing is possible through this interface. And invalid values are rejected:

```python run
for value in (-1, '10'):
    try:
        Account.set_interest_rate(value)
    except ValueError as ex:
        print(repr(value), '->', ex)

Account.get_interest_rate()
```

`numbers.Real` accepts `int`, `float` and `fractions.Fraction`, and even `bool` (it's a subclass of `int`). It rejects `complex`, strings, and `None`.

<div class="callout note">
<span class="callout-title">Why cls and not Account?</span>

`cls._interest_rate = value` and `Account._interest_rate = value` do the same thing here. Using `cls` matters with inheritance: if a subclass calls the inherited method, `cls` is the subclass, so the subclass gets its own rate. That's usually what you want, and it costs nothing to write it this way.

</div>

The getter/setter pair is a bit Java-like, and that's fine: it's the clearest tool available until descriptors. The interest payment itself (balance times rate) will be added with the other transactions.

<div class="takeaways">

## Key takeaways

- A value shared by all accounts is a class attribute; reading it through an instance falls back to the class.
- Assigning through an instance creates a shadowing instance attribute, a silent bug for state that must be uniform.
- Ordinary properties work on instances, so they can't guard a class attribute.
- `@classmethod` getters and setters receive the class (`cls`) however they're called, so they always read and update the shared value, with validation.

</div>
