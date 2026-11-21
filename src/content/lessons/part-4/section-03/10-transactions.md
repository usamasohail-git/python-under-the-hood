---
title: Transactions
summary: Deposits, withdrawals (declined when funds are insufficient) and interest payments that update the balance and return confirmation codes, plus a shared number validator.
minutes: 15
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


Confirmation = namedtuple(
    'Confirmation',
    'account_number transaction_code transaction_id time_utc time'
)


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

## The three transactions

Every transaction follows the same recipe:

1. Validate the amount.
2. Decide the transaction code (from the lookup table).
3. Generate the confirmation code.
4. Update the balance, if the transaction is accepted.
5. Return the confirmation code.

**The order of 3 and 4 matters.** If generating the confirmation code failed for some reason, we'd rather have no balance change than a balance change with no record of it. So the balance is updated only after the code exists.

### Validating amounts

Deposits and withdrawals both need "a real number, at least some minimum". Rather than repeat the checks, we write one helper. Like `validate_name`, it uses neither the instance nor the class, so it's a static method:

```python
    @staticmethod
    def validate_real_number(value, min_value=None):
        if not isinstance(value, numbers.Real):
            raise ValueError('Value must be a real number.')
        if min_value is not None and value < min_value:
            raise ValueError(f'Value must be at least {min_value}.')
        return value
```

Transaction amounts must be at least `0.01`: depositing zero or a negative amount makes no sense (and a negative deposit would be a withdrawal that skips the funds check).

We also use the helper in `__init__` for `initial_balance`, so a starting balance of `'abc'` is rejected with a clear message.

### Deposit and interest

A deposit always succeeds once the amount is valid. Paying interest computes `balance * rate / 100` with the **class-level** rate (the rate is a percentage) and deposits it with code `I`.

### Withdrawal

A withdrawal that would make the balance negative isn't an error: it's a **declined transaction**. It gets an `X` confirmation code, which is returned like any other, and the balance stays the same. The method keeps an `accepted` flag so the balance update can still happen after the code is generated.

Here's the class with all of it:

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

        self._balance = float(Account.validate_real_number(initial_balance))

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

    @staticmethod
    def validate_real_number(value, min_value=None):
        if not isinstance(value, numbers.Real):
            raise ValueError('Value must be a real number.')
        if min_value is not None and value < min_value:
            raise ValueError(f'Value must be at least {min_value}.')
        return value

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

    def deposit(self, value):
        value = Account.validate_real_number(value, min_value=0.01)
        transaction_code = Account._transaction_codes['deposit']
        conf_code = self.generate_confirmation_code(transaction_code)
        self._balance += value
        return conf_code

    def withdraw(self, value):
        value = Account.validate_real_number(value, min_value=0.01)
        accepted = False
        if self.balance - value < 0:
            # insufficient funds: decline the transaction
            transaction_code = Account._transaction_codes['rejected']
        else:
            transaction_code = Account._transaction_codes['withdraw']
            accepted = True

        conf_code = self.generate_confirmation_code(transaction_code)
        # only touch the balance once the confirmation code exists
        if accepted:
            self._balance -= value
        return conf_code

    def pay_interest(self):
        interest = self.balance * Account.get_interest_rate() / 100
        transaction_code = Account._transaction_codes['interest']
        conf_code = self.generate_confirmation_code(transaction_code)
        self._balance += interest
        return conf_code
```

## Trying it out

```python run
a = Account('A100', 'Eric', 'Idle', timezone=TimeZone('MST', -7, 0), initial_balance=100)
print(a.balance)

print(a.deposit(150.02))
print(a.balance)

print(a.withdraw(0.02))
print(a.balance)
```

With the default rate of 0.5%, interest on `250.0` is `1.25`:

```python run
print(Account.get_interest_rate())
print(a.pay_interest())
print(a.balance)
```

Now an overdraft. The withdrawal is declined with an `X` code and the balance doesn't move:

```python run
code = a.withdraw(1000)
print(code)
print(a.balance)
print(Account.parse_confirmation_code(code, a.timezone))
```

The transaction IDs keep increasing across accounts, including declined transactions, since every attempt is recorded:

```python run
b = Account('B200', 'John', 'Cleese')
print(b.deposit(10))
print(a.deposit(10))
```

## Validation errors

Invalid amounts raise `ValueError` **before** any confirmation code is generated, so they don't use up a transaction ID:

```python run
for action, value in [(a.deposit, -100), (a.deposit, 0), (a.withdraw, '100'), (a.withdraw, None)]:
    try:
        action(value)
    except ValueError as ex:
        print(f'{action.__name__}({value!r}) -> {ex}')
```

Should a non-number be a `TypeError` rather than a `ValueError`? Arguably yes: Python's built-ins usually raise `TypeError` for the wrong type. We use `ValueError` throughout so callers only need to catch one exception type for "bad input". Either choice is defensible as long as it's consistent and documented.

## Not done yet

We've tried a handful of cases by hand. There are surely gaps, and every future change could break something we checked earlier. Two kinds of automated tests address that:

- **Unit tests** check each piece in isolation: every branch and edge case of each method.
- **Integration tests** check that the pieces work together: creating accounts, making a series of transactions, decoding their codes.

Before reading on, here's something to try: create an account with `initial_balance=-100`. Does the class enforce the "never negative" rule? The next lesson writes tests with `unittest`, and they'll catch this.

<div class="takeaways">

## Key takeaways

- Each transaction: validate, choose the code, generate the confirmation code, update the balance, return the code.
- Update the balance only after the confirmation code exists, so every change is recorded.
- A shared `@staticmethod` validator keeps the amount checks in one place, including for the starting balance.
- An overdraft is a declined transaction (`X`), not an exception; the balance is unchanged.
- Interest uses the class-level rate, so every account earns the same percentage.

</div>
