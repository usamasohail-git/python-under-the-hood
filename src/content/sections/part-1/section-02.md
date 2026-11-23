---
summary: A fast pass over the Python building blocks the rest of the material relies on, from line continuation and conditionals to loops, exceptions, functions and classes.
---

Before going deep, it helps to make sure everyone shares the same foundation. This section is a brisk review of everyday Python. If you already write Python regularly, most of it will feel familiar, but keep an eye out for the details that are easy to get wrong: where a comment may break a statement, why `finally` still runs after a `break`, what the `else` clause on a loop really means, and how Python decides what `str(obj)`, `obj == other` or `obj < other` should do for your own classes.

Every example runs in your browser, so change the values and re-run the cells to test your understanding.

In this section you'll learn:

- the map of Python's built-in types (numbers, collections, callables and singletons) that the rest of the material explores
- how physical lines are joined into logical lines, implicitly inside brackets and explicitly with `\`, and how triple-quoted strings keep every character you type
- the rules for valid identifiers, what leading and trailing underscores mean, and the PEP 8 naming conventions
- `if` / `elif` / `else`, the conditional expression `X if cond else Y`, and (Python 3.10+) `match`
- how `def` and `lambda` create function objects, why annotations aren't enforced, and why every function returns something
- the `while` loop, emulating a do-while loop with `while True` and `break`, and the loop `else` clause
- how `break` and `continue` interact with `try` / `except` / `finally`
- what Python's `for` loop really does (iterate over an iterable), plus unpacking and `enumerate`
- writing a class with `__init__`, methods, `__str__` / `__repr__`, `__eq__` / `__lt__`, and properties with validation
- the core built-in collections (strings, lists, tuples, sets and dictionaries): creating them, indexing and slicing, their key methods, comprehensions, and the mutability pitfalls that catch everyone
