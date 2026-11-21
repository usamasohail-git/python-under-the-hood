---
title: Transaction Codes
summary: Keeping the D, W, I and X transaction codes in one class-level lookup table instead of scattering string literals through the methods.
minutes: 7
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

## Avoiding magic strings

Each confirmation code starts with a one-letter transaction code: `D` (deposit), `W` (withdrawal), `I` (interest) or `X` (declined). We *could* write `'D'` directly inside `deposit`, `'W'` inside `withdraw`, and so on. But literal values scattered through the code are hard to find and easy to mistype, and if the bank ever changes a code, every occurrence has to be hunted down.

Instead, we keep one **lookup table** as a "private" class attribute. The **keys** are descriptive names that the code uses and that never change; the **values** are the codes, which could be changed in one place:

```python run
class Account:
    transaction_counter = itertools.count(100)
    _interest_rate = 0.5  # percent, shared by all accounts

    _transaction_codes = {
        'deposit': 'D',
        'withdraw': 'W',
        'interest': 'I',
        'rejected': 'X',
    }

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

The table is the same for every account, so it belongs to the class. Methods will look codes up as `Account._transaction_codes['deposit']`:

```python run
a = Account('A100', 'Eric', 'Idle')
print(Account._transaction_codes['deposit'], a._transaction_codes['rejected'])
```

A misspelled key fails loudly, which is better than silently producing a wrong code:

```python run
try:
    Account._transaction_codes['deposti']
except KeyError as ex:
    print('KeyError:', ex)
```

## A preview: enumerations

A dictionary works, but Python has a type made for "a fixed set of named constants": the **enumeration** (`enum.Enum`, covered in its own section later). For comparison:

```python run
from enum import Enum

class TransactionType(Enum):
    DEPOSIT = 'D'
    WITHDRAW = 'W'
    INTEREST = 'I'
    REJECTED = 'X'

print(TransactionType.DEPOSIT.value)
print(TransactionType('X'))            # look up a member by its value
print([t.value for t in TransactionType])
```

Enumeration members can't be reassigned, a typo like `TransactionType.DEPOSTI` raises `AttributeError`, and editors can autocomplete the names. We'll stick with the dictionary in this project since it needs nothing new.

<div class="takeaways">

## Key takeaways

- Avoid repeating "magic" literal values; keep them in one named place.
- A class-level dictionary maps stable, descriptive keys to codes that can be changed in one spot.
- A mistyped key raises `KeyError` instead of silently producing a wrong code.
- `enum.Enum` is the purpose-built tool for a fixed set of named constants.

</div>
