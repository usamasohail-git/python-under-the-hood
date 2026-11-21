---
title: Transaction Numbers
summary: A transaction ID counter shared by every account, built three ways (a class, a generator, itertools.count), and why the simplest one wins.
minutes: 10
---

## What we need

Every transaction gets an ID, and the IDs increase across **all** accounts: if account A gets 101 and then account B makes a transaction, B gets 102. So the counter can't live in an account instance. It is **shared state**, which in a class means a **class attribute**: one object stored on `Account`, reached by every instance.

All the counter must do is hand out the next number each time it's asked. Let's look at three ways to build that.

## Option 1: a counter class

In an object-oriented mood, a class is the first thing that comes to mind:

```python run
class TransactionID:
    def __init__(self, start_id):
        self._start_id = start_id

    def next(self):
        self._start_id += 1
        return self._start_id


class Account:
    transaction_counter = TransactionID(100)

    def make_transaction(self):
        return Account.transaction_counter.next()


a1 = Account()
a2 = Account()
print(a1.make_transaction(), a2.make_transaction(), a1.make_transaction())
```

It works: `transaction_counter` is created **once**, when the class body runs, and both accounts reach the same object through the class. Note that `make_transaction` refers to it as `Account.transaction_counter`. A method body can't see class-level names directly (the class body scope isn't an enclosing scope for functions), so it has to go through the class, or through `self`.

## Option 2: a generator

A class with one method that keeps one piece of state is often a sign you don't need a class. An infinite generator is a counter all by itself: its local variable *is* the state, and `next()` resumes it.

```python run
def transaction_ids(start_id):
    while True:
        start_id += 1
        yield start_id


class Account:
    transaction_counter = transaction_ids(100)

    def make_transaction(self):
        return next(Account.transaction_counter)


a1 = Account()
a2 = Account()
print(a1.make_transaction(), a2.make_transaction(), a1.make_transaction())
```

## Option 3: itertools.count

And it turns out the standard library already ships exactly this generator. `itertools.count(start)` yields `start`, `start + 1`, `start + 2`, ... forever:

```python run
import itertools


class Account:
    transaction_counter = itertools.count(100)

    def make_transaction(self):
        return next(Account.transaction_counter)


a1 = Account()
a2 = Account()
print(a1.make_transaction(), a2.make_transaction(), a1.make_transaction())
```

Note that `count(100)` starts *at* 100 (our hand-written versions incremented before yielding, so they started at 101). The requirement only says "start from any number", so either is fine. We'll use `itertools.count` from now on: there's nothing to write, test or maintain.

The moral: Python isn't Java. Use a class when you need one; a function, a generator or a standard-library tool is often enough.

## Why a class attribute, not a module global?

A module-level `counter = itertools.count(100)` would work too. Keeping it on `Account` has two advantages: it's clearly part of the account machinery, and it's easy to reach or replace (for example in a test) as `Account.transaction_counter`.

There's one trap with shared class attributes: always **mutate or call** the shared object, never **assign** to it through an instance. Calling `next()` on it advances the one shared iterator. But `self.transaction_counter = ...` would create an *instance* attribute that shadows the class attribute for that one account:

```python run
a1.transaction_counter = itertools.count(0)   # shadows the class attribute
print(next(a1.transaction_counter), next(a2.transaction_counter))
print('transaction_counter' in a1.__dict__, 'transaction_counter' in a2.__dict__)
```

That's why the method writes `next(Account.transaction_counter)`: naming the class explicitly reads the shared counter no matter what an individual instance has done.

<div class="callout note">
<span class="callout-title">Not thread-safe, not persistent</span>

The counter starts over each time the program starts, and two threads calling `next()` at the same moment could in principle interleave. Both are fine for this exercise; a real bank would get transaction IDs from a database.

</div>

<div class="takeaways">

## Key takeaways

- A counter shared by all accounts belongs in a **class attribute**, created once when the class body runs.
- Methods reach class attributes through the class (`Account.x`) or `self`, not as bare names.
- A generator is a natural counter, and `itertools.count(start)` is that generator, ready-made.
- Don't reach for a class when a simpler tool does the job.
- Calling `next()` on the shared counter mutates shared state; assigning through an instance creates a shadowing instance attribute instead.

</div>
