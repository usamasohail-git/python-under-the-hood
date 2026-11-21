---
summary: How Python matches the arguments you pass to the parameters a function declares, from simple positions to *args, keyword-only parameters and **kwargs.
---

Calling a function looks simple, but Python has a surprisingly rich set of rules for deciding which value ends up in which parameter. Once you understand those rules, signatures like `print(*args, sep=' ', end='\n')` or `def wrapper(*args, **kwargs)` stop looking like magic, and you can design functions that are both flexible and hard to misuse.

The key insight of this section is that **passing arguments is a lot like unpacking an iterable**: values are matched to names by position, and a starred name can collect "the rest". Keyword arguments, keyword-only parameters and `**kwargs` build on top of that.

In this section you'll learn:

- the difference between parameters and arguments, and how positional and keyword arguments are matched
- default values, and the rules about where they may appear
- unpacking iterables (including swapping variables) and extended unpacking with `*` and `**`
- collecting extra positional arguments with `*args` and extra keyword arguments with `**kwargs`
- keyword-only parameters (after `*args` or a bare `*`) and positional-only parameters (`/`, Python 3.8+)
- how all of these combine in one signature, using `print` and a reusable function timer as examples
- the two classic traps of default values: they are evaluated **once**, when the function is defined, which bites with "current time" defaults and with mutable defaults like `[]` or `{}`
