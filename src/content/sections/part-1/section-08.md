---
summary: Tuples as lightweight data records where position has meaning, and named tuples, which add field names on top while staying real tuples.
---

A tuple is usually introduced as an "immutable list", but that misses its most useful role. Because a tuple can never be resized or reordered, the **position** of each element can carry meaning, the way the position of each character gives a word its meaning. That makes tuples natural data records: a point is `(x, y)`, a city is `(name, country, population)`. Named tuples take the idea one step further by giving every position a name, so you get readable, immutable records with almost no code and no overhead.

In this section you'll learn:

- how tuples compare with lists and strings, and why commas (not parentheses) create them
- using tuples as data records, with unpacking, extended unpacking and `_` for ignored fields
- `collections.namedtuple` as a class factory: field names, `rename`, `_fields`, `_asdict()`
- "modifying" immutable records with `_replace` (and `copy.replace` in 3.13), and extending them via `_fields`
- adding docstrings and default values (`defaults=`, prototypes, `__new__.__defaults__`)
- using named tuples as an alternative to dictionaries and for returning multiple values
- the modern alternatives `typing.NamedTuple` and `dataclasses`, and when to choose each
