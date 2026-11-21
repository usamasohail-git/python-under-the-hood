---
summary: How Python signals errors with exception objects, how to catch, re-raise and chain them, and how to design your own exception hierarchies, including the modern exception groups and notes.
---

Every program meets situations it can't handle in the normal flow of code: a missing key, a file that isn't there, a value of the wrong type. Python reports these with **exceptions**. An exception is an ordinary object, an instance of a class, but raising one switches Python into a special mode: normal execution stops and the exception travels up the call stack until some piece of code says "I know how to deal with this". Used well, exceptions keep error handling out of the way of your main logic. Used badly (a `try` that catches everything, say), they hide bugs.

In this section you'll learn:

- that exceptions are objects, how the built-in exception classes form a hierarchy, and why that hierarchy decides what an `except` clause catches
- how exceptions propagate through the call stack, and how to read a traceback, including the precise error locations of Python 3.11+
- the full `try` statement: several `except` clauses, `else`, `finally`, nesting, and the EAFP vs LBYL styles
- why entering a `try` block costs nothing in Python 3.11+, while raising an exception does cost something
- exception groups and `except*` for reporting and handling several errors at once (3.11+)
- `raise` in all its forms: re-raising, translating one exception into another, and chaining with `from` and `from None`
- adding context to an exception with `add_note()` (3.11+)
- writing custom exceptions, organizing them into a hierarchy for a library or app, and giving them attributes, methods and more than one base class
