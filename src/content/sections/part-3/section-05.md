---
summary: Sets are hash tables without values, giving you fast membership tests, automatic de-duplication and the algebra of unions, intersections and differences.
---

A set is what you get if you take a dictionary and throw away the values: an unordered collection of **distinct, hashable** objects, stored in a hash table. That one design decision gives sets their two superpowers. Membership tests take roughly constant time no matter how big the set is, and duplicates simply can't exist. On top of that, Python gives sets the full vocabulary of mathematical set theory, with both operators and methods.

In this section you'll learn:

- the ways to create sets: literals, `set()`, comprehensions and unpacking, and the `{}` trap
- size, membership, adding and removing elements, and what sets cost in memory
- intersection, union, difference, symmetric difference, and the subset/superset comparisons
- the in-place update operators and methods, and when mutating a set is what you want
- shallow and deep copies of sets
- `frozenset`, the immutable and hashable set, and how it helps with dictionary keys and caching
- how dictionary `keys()` and `items()` views behave like sets, and the rules for changing a dictionary while you iterate over it
