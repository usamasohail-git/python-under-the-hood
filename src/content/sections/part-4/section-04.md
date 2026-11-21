---
summary: How special ("dunder") methods let your own classes plug into Python's built-in syntax, from printing and arithmetic to comparisons, hashing, truth values, calling and formatting.
---

Why does `len(x)` work on a list, a string *and* a dictionary? Why can you write `a + b` for numbers, strings and lists alike? The answer is **polymorphism** through **special methods**: Python's syntax and built-in functions don't care what type an object is, they just call a method with a reserved double-underscore name. Define that method in your class and your objects join in, so they print nicely, add, compare, work as dictionary keys, behave in `if` statements and can even be called like functions.

In this section you'll learn:

- `__repr__` and `__str__`: the developer view and the user view of an object, and which built-ins use which
- arithmetic operators (`__add__`, `__mul__`, `__matmul__`, unary and in-place operators), the reflected versions like `__radd__`, and the difference between returning `NotImplemented` and raising `NotImplementedError`
- rich comparisons, how Python reflects them, and how `functools.total_ordering` fills in the missing ones
- the contract between `__eq__` and `__hash__`, and why defining one affects the other
- how Python decides the truth value of an object (`__bool__`, then `__len__`)
- making instances callable with `__call__`, including decorator classes
- the `__del__` finalizer, and why it's rarely the right tool
- `__format__` and the format specification that follows the `:` in an f-string
