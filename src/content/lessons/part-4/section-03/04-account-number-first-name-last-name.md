---
title: Account Number, First Name, Last Name
summary: A read-only account number, validated first and last name properties, a computed full name, and moving shared validation into a static method.
minutes: 14
---

## The code so far

Each lesson page runs in its own namespace, so we start by re-running the `TimeZone` class from the earlier lesson:

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
```

## Deciding on the interface

The account holder's details:

- The **account number** identifies the account. It's passed to the initializer and should never change afterwards, so it's a **read-only property**.
- **First name** and **last name** can change (people do change their names), so they're **read/write properties** whose setters validate the value.
- A **full name** is handy but shouldn't be stored separately: it would go stale whenever one of the parts changed. It's a **computed property**.

Why properties rather than plain attributes? Because each of them needs control over reads or writes. And since property access looks exactly like attribute access, we could have started with plain attributes and switched later without breaking any caller.

## A first version

```python run
class Account:
    transaction_counter = itertools.count(100)

    def __init__(self, account_number, first_name, last_name):
        self._account_number = account_number
        self.first_name = first_name      # goes through the property setter
        self.last_name = last_name

    @property
    def account_number(self):
        return self._account_number

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        if value is None or len(str(value).strip()) == 0:
            raise ValueError('First name cannot be empty.')
        self._first_name = value

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        if value is None or len(str(value).strip()) == 0:
            raise ValueError('Last name cannot be empty.')
        self._last_name = value

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'
```

The important detail is in `__init__`: it assigns `self.first_name`, not `self._first_name`. That assignment runs the **setter**, so the initializer gets the same validation as any later change for free. The account number, which has no setter, is the one place we write the private attribute directly.

```python run
a = Account('A100', 'Eric', 'Idle')
print(a.account_number, a.full_name)

a.first_name = 'John'
print(a.full_name)

try:
    Account('A101', 'John', '   ')
except ValueError as ex:
    print('ValueError:', ex)

try:
    a.account_number = 'B200'
except AttributeError as ex:
    print('AttributeError:', ex)
```

## Removing the duplication

The two setters contain the same check. If we ever tighten the rule (say, a maximum length), we'd have to remember to change both. Let's pull the check into one helper.

Does that helper need the instance? No: it takes a value and either rejects it or returns a cleaned version. Does it need the class? No. A function that lives in the class only because it belongs with it is a **static method**. While we're at it, the helper also strips surrounding whitespace, so `'  Eric '` is stored as `'Eric'`.

```python run
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

```python run
a = Account('A100', '  Eric ', 'Idle')
print(repr(a.first_name), a.full_name)

for first, last in [('John', ''), (None, 'Cleese'), ('', '')]:
    try:
        Account('A101', first, last)
    except ValueError as ex:
        print(repr(first), repr(last), '->', ex)
```

Note the last case: the first name is checked first, so that's the error reported.

The setters call `Account.validate_name(...)`. Calling it through `self.validate_name(...)` would work too, because a static method is never bound, whichever way it's looked up.

## An alternative: setattr

Another way to share the code is an instance method that validates **and** stores, given the name of the attribute to set:

```python run
class AccountAlt:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        self.validate_and_set_name('_first_name', value, 'First name')

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        self.validate_and_set_name('_last_name', value, 'Last name')

    def validate_and_set_name(self, attr_name, value, field_title):
        if value is None or len(str(value).strip()) == 0:
            raise ValueError(f'{field_title} cannot be empty.')
        setattr(self, attr_name, str(value).strip())


alt = AccountAlt('Alex', 'Martelli')
alt.first_name, alt.last_name
```

`setattr(self, '_first_name', value)` is exactly `self._first_name = value`, with the attribute name chosen at run time. Both designs are fine. We'll keep the static method: a function that just checks and returns a value is easier to test on its own, and the setter still reads clearly as "store the validated value".

<div class="takeaways">

## Key takeaways

- Make an attribute read-only with a getter-only property backed by a "private" attribute (`_account_number`).
- In `__init__`, assign through the property (`self.first_name = ...`) so construction runs the same validation as later updates.
- A computed property (`full_name`) is always up to date because it's calculated on every access.
- A helper that needs neither the instance nor the class is a good `@staticmethod`; it removes duplicated validation.
- `setattr(obj, name, value)` sets an attribute whose name is only known at run time.

</div>
