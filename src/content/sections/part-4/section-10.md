---
summary: Enumerations give a fixed set of related constants real names, a type of their own and useful behavior, and the enum module lets you customize nearly every part of them.
---

Plenty of values in a program come from a small, fixed set: the status of a job, the days of the week, the HTTP status codes a server can send back. You *could* represent them with bare strings or integers, but then nothing stops a typo like `'pnding'` from slipping through, and nothing tells a reader which values are allowed. An **enumeration** turns such a set into a class whose instances are exactly the allowed values. Each one has a name, a value and an identity, and it can be looked up, iterated over and compared safely.

Enumerations look like ordinary classes but follow special rules, because a metaclass (`EnumType`) builds them. Those rules are the subject of this section. The `enum` module also changed a lot between Python 3.11 and 3.13, so the modern behavior is pointed out as we go.

In this section you'll learn:

- how to define an enumeration, and what its members, names and values are
- looking up members by value (`Color(1)`) and by name (`Color['RED']`), membership tests and iteration
- why members are hashable and immutable, and why an enumeration with members can't be subclassed
- **aliases**: several names for one member, and how to forbid them with `@unique` or `@verify`
- adding methods, properties and special methods such as `__str__`, `__lt__`, `__eq__` and `__bool__`
- building reusable base enumerations, and using `__new__` to store several attributes per member
- the built-in variants `IntEnum`, `StrEnum` and `Flag`, plus modern tools like `_missing_`, `member`/`nonmember` and `global_enum`
- automatic values with `auto()`, and controlling them with `_generate_next_value_`
