---
summary: Four short problems that put dictionary comprehensions, views, set operations, sorting and merging to work.
---

Time to practice. These four problems are small, but each one rewards knowing the dictionary toolkit well: building dicts from iterables of pairs, using keys views as sets, merging counts from several sources, and keeping (or deliberately choosing) the order of the result. Try to write each solution the Pythonic way, with comprehensions, views and built-ins rather than an empty dict filled in one key at a time.

You'll practice:

- sorting a dict's items with `sorted(..., key=...)` and rebuilding a dict from them
- finding common keys with the `&` operator on keys views
- combining counts from any number of dicts with `get` and `*args`
- using union, intersection and difference of keys views to isolate exactly the keys you want
- `get` with a default for keys that may be missing
