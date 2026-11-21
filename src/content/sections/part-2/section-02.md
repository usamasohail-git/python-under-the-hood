---
summary: How Python's sequence types work, from indexing, slicing and copying to building your own list-like classes, sorting and comprehensions.
---

Lists, tuples, strings and ranges look different, but they share one idea: their items have **positions**, numbered from `0`. Because of that shared shape, they all support the same core operations (indexing, slicing, `len`, `in`, concatenation), and once you know the protocol behind those operations you can make your own classes behave exactly like built-in sequences.

This section also digs into the details that trip people up in real code: shallow vs deep copies, why `+=` on a list is not the same as `+`, what happens when you assign to a slice, and why a list of lambdas built in a loop all return the same thing.

In this section you'll learn:

- what makes something a sequence, and which operations every sequence supports
- how mutable sequences change in place, and why that matters for aliases
- when to prefer tuples over lists, and why tuples are cheaper
- shallow vs deep copies, and the `copy` module
- slicing in depth: `slice` objects, negative steps and `slice.indices()`
- building custom sequences with `__getitem__`, `__len__`, `__setitem__`, `__delitem__` and the arithmetic operators
- in-place concatenation and repetition (`+=`, `*=`) and slice assignment
- sorting with `sorted()` and `list.sort()`, sort keys and stability
- list comprehensions: syntax, nesting, scope and the classic closure trap
