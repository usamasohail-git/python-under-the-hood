---
summary: Functions are objects you can document, inspect, store, pass around and build from other functions, and that idea powers sorting keys, map/filter, reduce, partials and the operator module.
---

In Python a function is not a special, frozen piece of syntax: it is an **object**, just like an integer or a list. It has a type and attributes, you can bind it to any name, put it in a container, pass it to another function and return it from one. Languages that allow this are said to have **first-class functions**, and much of idiomatic Python is built on top of that idea.

This section explores what you can do once you treat functions as values. You'll attach documentation and metadata to them, write tiny anonymous functions with `lambda`, hand functions to `sorted`, `map`, `filter` and `reduce`, examine a function's parameters with the `inspect` module, and build new functions out of existing ones with `functools.partial` and the `operator` module.

In this section you'll learn:

- how docstrings and annotations attach documentation and metadata to a function, and where they are stored
- what lambda expressions are, what they can and cannot contain, and when to use them
- how the `key` argument of `sorted` works, and a fun trick that "sorts" an iterable into random order
- function introspection: `__name__`, `__defaults__`, `__code__` and the `inspect` module (signatures, parameter kinds, source code, comments)
- what a *callable* is: functions, methods, classes and instances with `__call__`
- the higher-order functions `map`, `filter` and `zip`, and the comprehensions that usually replace them
- reducing functions: writing your own `reduce`, `functools.reduce`, and built-ins like `sum`, `min`, `max`, `any` and `all`
- partial functions with `functools.partial`, and the functional versions of Python's operators in the `operator` module
