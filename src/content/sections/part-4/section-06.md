---
summary: How a class can inherit state and behavior from a single parent, how to override, extend and delegate that behavior with super(), and how __slots__ trades flexibility for smaller, faster instances.
---

Inheritance lets you say that one class **is a** more specialized kind of another: a `Square` is a `Rectangle`, a `Savings` account is an `Account`. The child class gets everything the parent defines for free, and then changes or adds only what's different. Single inheritance, where every class has exactly one parent, is the simplest and most common form, and understanding it well (especially *which* method runs and *which* object `self` is) is the foundation for everything else in object-oriented Python.

The section ends with `__slots__`, a way to give up the per-instance `__dict__` in exchange for less memory and slightly faster attribute access, and with the rules for combining slots with inheritance.

In this section you'll learn:

- how to build an inheritance chain, and the difference between `issubclass()` and `isinstance()`
- the `object` class at the root of every hierarchy, and the default behavior it gives every class
- overriding inherited methods, and why a parent's method ends up calling the child's override
- extending a parent with new methods and attributes, and accessing class attributes through `type(self)`
- delegating to the parent with `super()`, including in `__init__` and in properties, plus a first look at the MRO
- `__slots__`: how it works, what it saves, and what you give up (dynamic attributes, `__weakref__`)
- how slots behave across a class hierarchy, and how to add `__dict__` or `__weakref__` back as slots
