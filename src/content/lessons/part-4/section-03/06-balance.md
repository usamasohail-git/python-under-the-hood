---
title: Balance
summary: A read-only balance property with an optional starting balance, and why "read-only" in Python is a strong hint rather than a lock.
minutes: 8
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

## A balance you can read but not set

The requirements say the balance must **not be settable directly**: it may only change through deposits, withdrawals and interest payments, each of which produces a confirmation code. That's the textbook case for a **read-only property**: a getter for `balance`, no setter, and the value kept in `_balance`.

The initializer gets an optional `initial_balance` (default `0`), and stores it as a `float` so every balance has the same type.

```python run
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

```python run
a = Account('A100', 'Eric', 'Idle', initial_balance=100)
print(a.balance, type(a.balance).__name__)

try:
    a.balance = 1_000_000
except AttributeError as ex:
    print('AttributeError:', ex)

print(a.balance)
```

<div class="callout modern">
<span class="callout-title">Python 3.11+ error message</span>

On older versions the error above reads `can't set attribute`. Python 3.11 and later say which property, and on which class, has no setter.

</div>

## Read-only is a convention

Nothing in Python is truly private. Anyone can still write to the underlying attribute:

```python run
a._balance = 1_000_000
a.balance
```

The leading underscore says "internal: don't touch", and the missing setter makes the intended interface explicit. Together they prevent *accidents*, not determined misuse, which is all a class can do in Python.

## Something is missing

We haven't validated `initial_balance` yet:

```python run
b = Account('A101', 'John', 'Cleese', initial_balance=-100)
b.balance
```

A negative starting balance breaks the rule that balances are never negative, and `float('abc')` would raise a confusing error for a non-number. We'll add a proper number-validation helper when we write the transaction methods, and the unit tests at the end will check that we got it right.

<div class="callout note">
<span class="callout-title">Floats and money</span>

Using `float` keeps this project simple, but floats can't represent most decimal fractions exactly (`0.1 + 0.2 != 0.3`). Real money calculations use `decimal.Decimal`, which stores decimal digits exactly and lets you control rounding.

</div>

<div class="takeaways">

## Key takeaways

- A getter-only `balance` property makes the balance readable but not assignable; only methods of the class change `_balance`.
- An optional `initial_balance` parameter sets the starting value.
- "Private" attributes and read-only properties are conventions that prevent accidents, not access control.
- Unvalidated input (like a negative starting balance) is a gap to remember; tests are a good way to catch it.

</div>
