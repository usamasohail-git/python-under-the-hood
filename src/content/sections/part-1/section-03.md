---
summary: What a variable really is in Python, how memory is managed for you, and the optimizations CPython applies behind the scenes.
---

In many languages a variable is a named box that *holds* a value. Python works differently: a variable is a **name that refers to an object** living somewhere in memory. That one idea explains a lot of behavior that otherwise looks surprising, like why changing one list can change "another", why `is` and `==` can disagree, and why `a is b` is sometimes `True` for numbers you never linked together.

In this section you'll learn:

- how names reference objects, and how to look at memory addresses with `id()`
- how CPython decides when to free memory (reference counting and the garbage collector)
- dynamic typing and what really happens when you re-assign a variable
- mutable vs immutable objects, and why that matters for function arguments and shared references
- identity (`is`) vs equality (`==`), and the special `None` object
- why "everything is an object" in Python, including functions
- the optimizations CPython applies: integer and string interning, and peephole/constant folding
