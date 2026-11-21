---
title: Testing using unittest
summary: Writing repeatable tests for the TimeZone and Account classes with unittest, including setUp/tearDown, subTest and assertRaises, and letting a test expose a real bug.
minutes: 20
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

## Why automated tests?

So far we've checked our classes by running a few lines and looking at the output. A quick integration check like this one is useful:

```python run
a = Account('A100', 'Eric', 'Idle', timezone=TimeZone('MST', -7, 0), initial_balance=100)
print(a.balance)
print(a.deposit(150.02), a.balance)
print(a.withdraw(0.02), a.balance)
Account.set_interest_rate(1.0)
print(a.pay_interest(), a.balance)
print(a.withdraw(1000), a.balance)
Account.set_interest_rate(0.5)   # put the shared rate back
```

But checking by eye has two big problems. It isn't **repeatable**: after every change to the class you'd need to rerun everything and re-read the output carefully. And it isn't **thorough**: we tried a few happy paths and almost no edge cases. Writing tests often takes longer than writing the code, and it's still worth it, because tests also expose gaps in the *design*, as we're about to see.

## unittest basics

Python's standard library includes the `unittest` framework (third-party tools like `pytest` build on the same ideas). The rules:

- Tests are methods of a class that inherits from `unittest.TestCase`.
- Every method whose name starts with `test` is a test.
- Inside a test, use the `assert...` methods (`assertEqual`, `assertTrue`, `assertIn`, `assertRaises`, ...). A failing assertion marks the test as failed, with a helpful message.

Normally you'd put tests in a file and run them from the command line with `python -m unittest`, or end the file with `unittest.main()`. In a notebook-style page we run them ourselves: load the tests from a class into a suite, then run the suite with a text runner. `stream=sys.stdout` sends the report to normal output (the default is stderr), and `verbosity=2` lists each test:

```python run
import sys
import unittest

def run_tests(test_class):
    suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
    runner = unittest.TextTestRunner(stream=sys.stdout, verbosity=2)
    runner.run(suite)
```

```python run
class TestAccount(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(1, 1)

run_tests(TestAccount)
```

Here's what a failure looks like. The runner catches it and reports it; nothing crashes:

```python run
class TestAccount(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(1, 0, 'one should equal zero?')

run_tests(TestAccount)
```

<div class="callout modern">
<span class="callout-title">Test names in Python 3.11+</span>

Since Python 3.11 the verbose report shows each test's full name, like `test_ok (__main__.TestAccount.test_ok)`. Older versions printed `test_ok (__main__.TestAccount)`.

</div>

<div class="callout note">
<span class="callout-title">Why not unittest.main() here?</span>

`unittest.main()` looks for tests in the `__main__` module. Code on this page runs in its own namespace rather than in that module, so `unittest.main()` would find nothing. Loading tests from the class explicitly works everywhere.

</div>

## setUp and tearDown

`setUp` runs **before each** test and `tearDown` **after each** test, even when the test fails. Each test also gets a **fresh instance** of the test class, so attributes set in `setUp` can't leak from one test into another:

```python run
class TestAccount(unittest.TestCase):
    def setUp(self):
        print('setting up...', end=' ')
        self.account_number = 'A100'

    def tearDown(self):
        print('tearing down...', end=' ')

    def test_1(self):
        self.account_number = 'A200'
        self.assertEqual('A200', self.account_number)

    def test_2(self):
        # test_1's change doesn't leak into this test
        self.assertEqual('A100', self.account_number)

    def test_3(self):
        self.assertTrue(False)

run_tests(TestAccount)
```

Tests should be **independent**: don't rely on the order they run in (`unittest` runs them in alphabetical order of their names, but your design shouldn't care).

## Testing TimeZone

Let's write real tests, starting with `TimeZone`. Testing "not equal" needs several cases. A loop would stop at the first failure and wouldn't tell us which case failed. `subTest` labels each iteration and reports every failing one separately:

```python run
class TestAccount(unittest.TestCase):
    def test_create_timezone(self):
        tz = TimeZone('ABC', -1, -30)
        self.assertEqual('ABC', tz.name)
        self.assertEqual(timedelta(hours=-1, minutes=-30), tz.offset)

    def test_timezones_equal(self):
        tz1 = TimeZone('ABC', -1, -30)
        tz2 = TimeZone('ABC', -1, -30)
        self.assertEqual(tz1, tz2)

    def test_timezones_not_equal(self):
        tz = TimeZone('ABC', -1, -30)
        test_timezones = (
            TimeZone('DEF', -1, -30),
            TimeZone('ABC', -1, 0),
            TimeZone('ABC', 1, -30),
            TimeZone('ABC', -1, -30),   # oops: this one IS equal
        )
        for i, test_tz in enumerate(test_timezones):
            with self.subTest(test_number=i):
                self.assertNotEqual(tz, test_tz)

run_tests(TestAccount)
```

The report pinpoints the bad case, `test_number=3`, while the other three sub-tests still ran. That last case was a deliberately wrong test; we drop it below.

## Testing Account

Now the account. Good unit tests each check **one** behavior, so that a failure points straight at the problem. When an exception is the *expected* outcome, `assertRaises` used as a context manager passes only if that exception type is raised inside the `with` block:

```python run
class TestAccount(unittest.TestCase):
    def setUp(self):
        self.account_number = 'A100'
        self.first_name = 'FIRST'
        self.last_name = 'LAST'
        self.tz = TimeZone('TZ', 1, 30)
        self.balance = 100.00

    def create_account(self, **overrides):
        args = dict(account_number=self.account_number, first_name=self.first_name,
                    last_name=self.last_name, timezone=self.tz,
                    initial_balance=self.balance)
        args.update(overrides)
        return Account(**args)

    # --- TimeZone ---
    def test_create_timezone(self):
        tz = TimeZone('ABC', -1, -30)
        self.assertEqual('ABC', tz.name)
        self.assertEqual(timedelta(hours=-1, minutes=-30), tz.offset)

    def test_timezones_equal(self):
        self.assertEqual(TimeZone('ABC', -1, -30), TimeZone('ABC', -1, -30))

    def test_timezones_not_equal(self):
        tz = TimeZone('ABC', -1, -30)
        test_timezones = (
            TimeZone('DEF', -1, -30),
            TimeZone('ABC', -1, 0),
            TimeZone('ABC', 1, -30),
        )
        for i, test_tz in enumerate(test_timezones):
            with self.subTest(test_number=i):
                self.assertNotEqual(tz, test_tz)

    # --- Account ---
    def test_create_account(self):
        a = self.create_account()
        self.assertEqual(self.account_number, a.account_number)
        self.assertEqual(self.first_name, a.first_name)
        self.assertEqual(self.last_name, a.last_name)
        self.assertEqual(self.first_name + ' ' + self.last_name, a.full_name)
        self.assertEqual(self.tz, a.timezone)
        self.assertEqual(self.balance, a.balance)

    def test_create_account_blank_first_name(self):
        with self.assertRaises(ValueError):
            self.create_account(first_name='')

    def test_create_account_negative_balance(self):
        with self.assertRaises(ValueError):
            self.create_account(initial_balance=-100.00)

    def test_account_deposit_ok(self):
        a = self.create_account()
        conf_code = a.deposit(100)
        self.assertEqual(200, a.balance)
        self.assertIn('D-', conf_code)

    def test_account_deposit_negative_amount(self):
        a = self.create_account()
        with self.assertRaises(ValueError):
            a.deposit(-100)

    def test_account_withdraw_ok(self):
        a = self.create_account()
        conf_code = a.withdraw(20)
        self.assertEqual(80, a.balance)
        self.assertIn('W-', conf_code)

    def test_account_withdraw_overdraw(self):
        a = self.create_account()
        conf_code = a.withdraw(200)
        self.assertIn('X-', conf_code)
        self.assertEqual(self.balance, a.balance)

run_tests(TestAccount)
```

`setUp` holds the standard test data, and the small `create_account` helper lets each test override just the argument it cares about. (It doesn't start with `test`, so it isn't run as a test.)

One test fails: `test_create_account_negative_balance`. The requirements say a balance must never be negative, yet `Account(..., initial_balance=-100)` is accepted, because `__init__` checks that the starting balance is a number but not that it's at least zero. We suspected this gap two lessons ago; now a test proves it, and will keep proving it until it's fixed.

<div class="callout tip">
<span class="callout-title">Check the failure is the right one</span>

If you change `assertRaises(ValueError)` in `test_create_account_blank_first_name` to `assertRaises(TypeError)`, that test is reported as an **ERROR** rather than a FAIL: the `ValueError` that was actually raised escapes `assertRaises`, which only catches the type you name. FAIL means an assertion didn't hold; ERROR means the test raised an unexpected exception.

</div>

## Fixing the bug

The fix is one argument: validate the starting balance with `min_value=0`.

```python
        self._balance = float(Account.validate_real_number(initial_balance, min_value=0))
```

Here's the corrected class. Note that we re-define only `Account`; `TestAccount` looks the name up when each test runs, so it picks up the new class:

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

        self._balance = float(Account.validate_real_number(initial_balance, min_value=0))

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

```python run
run_tests(TestAccount)
```

All tests pass now. From here on, any change that breaks one of these behaviors gets caught the moment you rerun the tests.

## Ideas for more tests

These tests are a start, not full coverage. Some to add yourself:

- confirmation codes: four parts, the right account number, a 14-digit timestamp, consecutive IDs
- `parse_confirmation_code` with a known code and a time zone, and with malformed codes
- `pay_interest` with a known rate (restore the shared rate in `tearDown`!)
- the interest-rate setter rejecting negative and non-numeric values
- the read-only properties (`balance`, `account_number`) raising `AttributeError` on assignment

<div class="takeaways">

## Key takeaways

- Automated tests are repeatable and can be thorough; manual checks are neither.
- A `unittest.TestCase` subclass holds tests (methods starting with `test`) that use `assert...` methods.
- `setUp`/`tearDown` run around **each** test, and each test gets a fresh `TestCase` instance, so tests stay independent.
- `subTest` reports each case of a loop separately; `assertRaises` checks an expected exception.
- FAIL means an assertion failed; ERROR means an unexpected exception.
- Tests find design gaps too: the negative starting balance was fixed with `validate_real_number(initial_balance, min_value=0)`.

</div>
