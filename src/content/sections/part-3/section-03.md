---
summary: How Python dictionaries are built, used, merged and copied, and how hashing makes key lookup fast (and what your own classes need to join in).
---

The dictionary is the most important data structure in Python. Your modules, classes and instances keep their attributes in dicts, keyword arguments arrive as a dict, and most real programs use them everywhere for lookups, counting, grouping and configuration. A dict maps **keys** to **values**, and it can find the value for a key in roughly constant time no matter how many items it holds. That speed comes from a **hash table**, and understanding how it works explains every rule dictionaries impose: why keys must be hashable, why lists can't be keys, and why `__eq__` and `__hash__` must agree.

In this section you'll learn:

- every way to create a dict: literals, `dict()`, comprehensions and `dict.fromkeys`
- how a dict works inside: hashes, the index table, collisions, and why insertion order is kept (guaranteed since 3.7)
- the everyday operations: `get`, `in`, `del`, `pop`, `popitem`, `setdefault` and `clear`
- the `keys()`, `values()` and `items()` views, which are live and (partly) behave like sets
- updating and merging with `update`, `**` unpacking and the 3.9+ `|` and `|=` operators
- shallow vs deep copies of dictionaries
- making your own classes usable as keys: the `__eq__`/`__hash__` contract, collisions, and the danger of mutable keys
