---
summary: How Python decides which object a name refers to, how inner functions keep their environment alive as closures, and how decorators build on closures to add behavior to functions and classes.
---

Functions in Python are objects, and they can be created inside other functions. Put those two facts together with Python's rules for looking up names and you get **closures**: functions that remember variables from the place where they were defined. Closures, in turn, are the engine behind **decorators**, the `@something` lines you see above functions and classes in almost every real code base.

This section builds that chain one link at a time, and each idea depends on the previous one, so it pays to go in order.

In this section you'll learn:

- what scopes and namespaces are, the LEGB lookup order, and the `global` keyword
- why an assignment anywhere in a function makes a name local (and the `UnboundLocalError` that follows)
- enclosing scopes and the `nonlocal` keyword
- closures: free variables, cell objects, `__closure__`, and the classic late-binding loop bug
- using closures in place of small classes: averagers, timers and call counters
- decorators, the `@` syntax, and keeping metadata with `functools.wraps`
- practical decorators: timing, logging, stacking order, and memoization with `lru_cache` and `cache`
- decorator factories (decorators that take arguments) and classes used as decorators
- decorating classes: monkey patching, `functools.total_ordering`
- single dispatch generic functions, built by hand and with `functools.singledispatch`
