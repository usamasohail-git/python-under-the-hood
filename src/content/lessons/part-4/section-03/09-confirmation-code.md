---
title: Confirmation Code
summary: Generating confirmation codes from the transaction code, account number, UTC time and shared counter, and parsing them back into a namedtuple with a static method.
minutes: 16
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

## The format

A confirmation code has four dash-separated parts:

```text
D-140568-20190315145900-124
│ │      │              └─ transaction ID (shared counter)
│ │      └─ UTC date and time, YYYYMMDDHHMMSS
│ └─ account number
└─ transaction code
```

## Building it in isolation

The only fiddly part is the timestamp. It must be the current time in **UTC**, formatted without separators. `strftime` does the formatting:

```python run
def generate_confirmation_code(account_number, transaction_id, transaction_code):
    dt_str = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    return f'{transaction_code}-{account_number}-{dt_str}-{transaction_id}'

generate_confirmation_code(123, 1000, 'X')
```

It's often easier to get a small function right on its own and only then move it into a class.

<div class="callout modern">
<span class="callout-title">utcnow() is deprecated</span>

Older code writes `datetime.utcnow().strftime(...)`. It gives the same digits, but `utcnow()` returns a naive datetime and has been deprecated since Python 3.12 (it emits a `DeprecationWarning`). `datetime.now(timezone.utc)` returns an aware datetime instead.

</div>

## As an instance method

Inside the class, the method doesn't need the account number or the transaction ID as arguments: it can take the account number from `self`, and draw the next ID from the shared counter itself. Only the transaction code varies, so that's the one parameter. This also guarantees a fresh ID for every code generated; no caller can forget to advance the counter.

```python
    def generate_confirmation_code(self, transaction_code):
        # UTC timestamp formatted as YYYYMMDDHHMMSS
        dt_str = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        transaction_id = next(Account.transaction_counter)
        return f'{transaction_code}-{self.account_number}-{dt_str}-{transaction_id}'
```

The bare name `timezone` inside this method refers to `datetime.timezone`, not to the `timezone` property: as we saw, methods can't see class-level names unqualified.

## Parsing a code

Now the reverse: take a code and return an object with `account_number`, `transaction_code`, `transaction_id`, `time_utc` and `time` (in a time zone passed as an argument).

**What kind of method?** Everything needed is in the code string and the time zone argument. The parser doesn't need any account, and it doesn't need class state either. That's exactly why the time zone is an argument: the method works without an instance. It's a **static method**. (Making it an instance method would raise awkward questions, such as what to do if the code belongs to a *different* account.)

**What kind of result?** We want dotted attribute access to a few fixed fields. A full class would be overkill; a **`namedtuple`** is exactly a lightweight, immutable record with named fields.

```python run
Confirmation = namedtuple(
    'Confirmation',
    'account_number transaction_code transaction_id time_utc time'
)
```

The parsing steps:

1. Split on `'-'` and make sure there are four parts.
2. Turn the timestamp into a `datetime` with `strptime`, using the same format string as `strftime`. A malformed timestamp raises `ValueError`, which we re-raise with a clearer message (`raise ... from ex` keeps the original as the cause).
3. Default the time zone to UTC, and check it's a `TimeZone`.
4. Shift the UTC time by the offset and format both versions.

Here is the whole class with both methods:

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

    def generate_confirmation_code(self, transaction_code):
        # UTC timestamp formatted as YYYYMMDDHHMMSS
        dt_str = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        transaction_id = next(Account.transaction_counter)
        return f'{transaction_code}-{self.account_number}-{dt_str}-{transaction_id}'

    @staticmethod
    def parse_confirmation_code(confirmation_code, preferred_time_zone=None):
        # e.g. 'D-140568-20190315145900-124'
        parts = confirmation_code.split('-')
        if len(parts) != 4:
            raise ValueError('Invalid confirmation code.')
        transaction_code, account_number, raw_dt_utc, transaction_id = parts

        try:
            dt_utc = datetime.strptime(raw_dt_utc, '%Y%m%d%H%M%S')
        except ValueError as ex:
            raise ValueError('Invalid transaction datetime.') from ex

        if preferred_time_zone is None:
            preferred_time_zone = TimeZone('UTC', 0, 0)
        if not isinstance(preferred_time_zone, TimeZone):
            raise ValueError('Invalid TimeZone specified.')

        dt_preferred = dt_utc + preferred_time_zone.offset
        dt_preferred_str = (f"{dt_preferred.strftime('%Y-%m-%d %H:%M:%S')} "
                            f"({preferred_time_zone.name})")

        return Confirmation(account_number, transaction_code, transaction_id,
                            dt_utc.isoformat(), dt_preferred_str)
```

## Trying it out

First, the example from the project description. The parser doesn't care when it runs, so the output is always the same:

```python run
code = 'D-140568-20190315145900-124'

Account.parse_confirmation_code(code)
```

```python run
result = Account.parse_confirmation_code(code, TimeZone('MST', -7, 0))
print(result.account_number, result.transaction_code, result.transaction_id)
print(result.time_utc)
print(result.time)
```

`strptime` returns a **naive** `datetime` (no `tzinfo`), which is why `isoformat()` prints no `+00:00` suffix, exactly the format the requirements ask for. We know it's UTC because confirmation codes always are, and we convert by adding our own `TimeZone.offset`.

Now a round trip with a freshly generated code. The timestamp and ID depend on when and how often you run the cell:

```python run
a = Account('A100', 'John', 'Cleese', initial_balance=100)
code1 = a.generate_confirmation_code('D')
code2 = a.generate_confirmation_code('W')
print(code1)
print(code2)
print(Account.parse_confirmation_code(code2, TimeZone('MST', -7, 0)))
```

The two IDs are consecutive, because both codes drew from the same shared counter.

A static method can also be called through an instance; it still gets no automatic first argument:

```python run
a.parse_confirmation_code(code1).transaction_code
```

And bad input is reported clearly:

```python run
for bad in ('X-A100-asdasd-123', 'not-a-code', 'D-A100-20191345000000-1'):
    try:
        Account.parse_confirmation_code(bad)
    except ValueError as ex:
        print(repr(bad), '->', ex, '| cause:', repr(ex.__cause__))
```

This validation is deliberately simple. An account number containing a `-` would break the split, for example; a production system would validate account numbers on creation, or use a stricter format such as a regular expression.

<div class="takeaways">

## Key takeaways

- Build tricky pieces as standalone functions first, then move them into the class.
- `generate_confirmation_code` is an instance method: it needs `self.account_number`, and it advances the shared counter itself.
- `strftime('%Y%m%d%H%M%S')` formats the timestamp and `strptime` with the same format parses it back (into a naive datetime).
- The parser needs no account and no class state, so it's a `@staticmethod`, which is why the time zone is an argument.
- A `namedtuple` is the simplest structured result with dotted access.
- `raise NewError(...) from ex` gives a clear message while keeping the original exception as `__cause__`.

</div>
