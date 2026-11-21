---
summary: Design and build a bank Account class step by step, using properties, class attributes, and class and static methods, then test it with unittest.
---

Time to use the tools from the classes section on something realistic. In this project you'll design a class that represents a bank account: the holder's validated names, a balance that can only change through transactions, an interest rate shared by every account, and a confirmation code for every deposit, withdrawal and interest payment. Along the way you'll keep asking where each piece belongs: in the instance or the class, and in an instance, class or static method.

This project practices:

- a small `TimeZone` class with validation, read-only properties, `__eq__` and `__repr__`
- a transaction counter shared by all accounts, using a class attribute and `itertools.count`
- read-only, read/write and computed properties, with validation in setters and static helper methods
- a class-level interest rate behind validating `@classmethod`s, and the instance-shadowing trap it avoids
- generating confirmation codes with `datetime.now(timezone.utc)` and parsing them into a `namedtuple`
- deposits, withdrawals (declined on insufficient funds) and interest payments
- testing the classes with `unittest`: `setUp`/`tearDown`, `subTest` and `assertRaises`
