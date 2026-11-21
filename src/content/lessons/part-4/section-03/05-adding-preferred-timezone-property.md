---
title: Adding Preferred TimeZone Property
summary: An optional, validated, read/write timezone property that defaults to UTC, and a note on the name it shares with datetime.timezone.
minutes: 9
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

    def __init__(self, account_number, first_name, last_name):
        self._account_number = account_number
        self.first_name = first_name
        self.last_name = last_name

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
```

## The requirement

Each account has a **preferred time zone**. It's per account, so it's instance state. Account holders can move, so it's **read/write**. And many people won't care, so it should be **optional** and default to UTC.

The setter has one job: make sure the value really is a `TimeZone`. Without that check, someone could store `-7` or `'MST'`, and the mistake would only surface much later, far from where it was made.

## Implementation

Two changes: a `timezone` parameter with a default of `None`, and a `timezone` property with a validating setter.

```python run
class Account:
    transaction_counter = itertools.count(100)

    def __init__(self, account_number, first_name, last_name, timezone=None):
        self._account_number = account_number
        self.first_name = first_name
        self.last_name = last_name

        if timezone is None:
            timezone = TimeZone('UTC', 0, 0)
        self.timezone = timezone

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
```

Why `timezone=None` and not `timezone=TimeZone('UTC', 0, 0)` in the signature? A default value is evaluated **once**, when the `def` statement runs, and then shared by every call. Since `TimeZone` is immutable that would actually be harmless here, but `None` plus "create it inside the function" is the habit that's always safe (Part 1 shows the mutable-default bug it avoids). It also means the `TimeZone` class is only needed when an account is created, not when the class is defined.

As with the names, `__init__` assigns `self.timezone = timezone`, so the default and any value passed in both go through the setter's validation.

```python run
a = Account('A100', 'Eric', 'Idle')
print(a.timezone)

a.timezone = TimeZone('MST', -7, 0)
print(a.timezone)

try:
    a.timezone = -7
except ValueError as ex:
    print('ValueError:', ex)

try:
    Account('A101', 'John', 'Cleese', timezone='MST')
except ValueError as ex:
    print('ValueError:', ex)
```

## Two things called timezone

Our module imports `timezone` from `datetime` (we'll need `timezone.utc` for confirmation codes), and the account now has a `timezone` parameter and a `timezone` property. Is that a clash?

- Inside `__init__`, the **parameter** `timezone` is a local variable, so it hides the imported `datetime.timezone` *within that function only*. `__init__` never needs the datetime one, so nothing breaks.
- The **property** lives in the class namespace and is always reached as `self.timezone` or `a.timezone`. Code inside other methods can't see class-level names as bare names (functions defined in a class body don't get the class body as an enclosing scope), so a bare `timezone` in any other method still means `datetime.timezone`.

```python run
print(timezone.utc)                  # the datetime one, at module level
print(Account.timezone)              # the property object on the class
print(a.timezone.name)               # the property's value for one account
```

It works, but it's worth knowing *why* it works. If you find it confusing, rename one side: for example `from datetime import timezone as dt_timezone`, or call the parameter `preferred_tz`.

<div class="takeaways">

## Key takeaways

- Per-account, changeable state that needs checking is a read/write property with a validating setter.
- Default optional objects to `None` and create the real default inside `__init__`.
- Assign through the property in `__init__` so defaults and passed-in values are validated the same way.
- A parameter named like a global only hides the global inside that function; class-level names are never visible as bare names inside methods.

</div>
