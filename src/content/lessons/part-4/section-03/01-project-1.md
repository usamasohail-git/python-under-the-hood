---
title: Project 1
summary: "Your task: design a bank Account class with validated names, a read-only balance, a shared interest rate, and confirmation codes for every transaction."
minutes: 10
---

## The goal

Design and implement a class that represents a **bank account**. Nothing here needs any tool you haven't seen yet. It's a chance to choose between the ideas from the classes section: plain attributes or properties, read-only or read/write values, instance or class attributes, and instance, class or static methods. The requirements are deliberately a bit loose, so part of the job is filling in the gaps with sensible design decisions.

## Requirements

An account has:

- an **account number** that identifies it. Assume it's simply passed to the initializer.
- the account holder's **first name** and **last name**.
- a **preferred time zone** offset (for example -7 hours for Mountain Standard Time).
- a **balance** that must never be negative and can't be set directly. It only changes through transactions.

Transactions:

- **Deposits** and **withdrawals** can be made. A withdrawal that would make the balance negative is **declined**: the balance stays the same, but the attempt is still recorded with a confirmation code.
- A **monthly interest rate** applies to *all* accounts uniformly. A method calculates the interest on the current balance with the current rate and **adds** it to the balance as a transaction.
- Every transaction method (deposit, withdraw, pay interest) **returns a confirmation code**.

The confirmation code is a string made of four parts separated by dashes:

1. a **transaction code**: `D` for deposit, `W` for withdrawal, `I` for an interest deposit, `X` for a declined transaction
2. the **account number**
3. the **date and time** of the transaction in **UTC**, as `YYYYMMDDHHMMSS`
4. a **transaction ID** that increments across *all* accounts and transactions. For simplicity it can start from any number you choose each time the program starts.

Finally, a method takes a confirmation code and returns a structured object with these attributes (so you can use dotted notation):

- `account_number`, `transaction_code`, `transaction_id`
- `time_utc`: the UTC time in ISO format
- `time`: the time in a time zone *passed as an argument*, in a more readable form

Notice that the time zone is an argument rather than taken from an account. Think about why: does decoding a confirmation code need anything from a particular account instance?

## An example

Account `140568` has a preferred offset of -7 (MST) and a balance of `100.00`. The last transaction ID handed out was `123`. At `2019-03-15 14:59:00` UTC (07:59 in MST), a deposit of `50.00` is made. The balance becomes `150.00` and the deposit returns:

```text
D-140568-20190315145900-124
```

Decoding that code with the MST time zone gives:

| attribute | value |
|---|---|
| `account_number` | `'140568'` |
| `transaction_code` | `'D'` |
| `transaction_id` | `'124'` |
| `time_utc` | `'2019-03-15T14:59:00'` |
| `time` | `'2019-03-15 07:59:00 (MST)'` |

The two time formats are one call each with the standard library:

```python run
from datetime import datetime, timedelta

dt = datetime(2019, 3, 15, 14, 59, 0)
print(dt.strftime('%Y%m%d%H%M%S'))       # the code's timestamp
print(dt.isoformat())                    # time_utc
mst = dt + timedelta(hours=-7)
print(mst.strftime('%Y-%m-%d %H:%M:%S'), '(MST)')
```

And interest: with a monthly rate of `0.5` percent, an account holding `1000.00` earns `5.00`, so after the interest transaction the balance is `1005.00`:

```python run
balance = 1000.00
rate = 0.5   # percent
balance + balance * rate / 100
```

Use plain floats for money here to keep things simple. Real financial code would use `decimal.Decimal` to avoid binary rounding errors (Part 1 covers why).

## Suggested design

There are many valid designs. The walkthrough in the following lessons ends up with two classes:

- a small **`TimeZone`** class holding a name and an offset (hours and minutes), with read-only properties
- an **`Account`** class whose public interface is:
  - an initializer taking the account number, first name, last name, an optional preferred time zone and a starting balance (default 0)
  - `first_name` and `last_name` properties (read/write, validated)
  - a computed, read-only `full_name` property
  - read-only `account_number` and `balance` properties
  - a class-level interest rate with validated access
  - `deposit`, `withdraw` and `pay_interest` methods
  - a way to parse a confirmation code

## Hints

- Ask of every piece of state: does it belong to **one account** or to **all accounts**? The interest rate and the transaction counter are shared; names and balances aren't.
- Ask of every function: does it need the **instance**, the **class**, or **neither**? That decides between an instance method, `@classmethod` and `@staticmethod`.
- You don't need a class for everything. An incrementing counter can be a generator or `itertools.count`, and a "structured object" can be a `namedtuple`.
- Get the current UTC time with `datetime.now(timezone.utc)`.
- Test as you go, and write a few `unittest` tests at the end (the last lesson shows how).

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the walkthrough, open the **Practice** page for this section. The project is split into auto-graded milestones: the `TimeZone` class, the account holder's details, the balance and interest rate, the transactions with their confirmation codes, and the confirmation-code parser. Then compare your design with the step-by-step solution in the following lessons.

</div>

<div class="takeaways">

## Key takeaways

- The project is an `Account` class with validated names, a read-only balance, a shared interest rate and three transaction methods.
- Every transaction returns a confirmation code like `D-140568-20190315145900-124`: type, account, UTC timestamp, global transaction ID.
- A declined withdrawal leaves the balance alone but still gets an `X` code.
- The design questions are about *where* things live: instance or class state, and instance, class or static methods.

</div>
