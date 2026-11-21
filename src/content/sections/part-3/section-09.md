---
summary: The dictionary variants in the collections module (defaultdict, OrderedDict, Counter, ChainMap and UserDict), what each one adds to a plain dict, and when it's worth reaching for.
---

A plain `dict` covers most needs, but a few patterns come up so often that the standard library ships ready-made dictionaries for them: a dictionary that fills in missing keys for you, one that counts things, one that layers several mappings on top of each other, and a base class for writing your own dictionary types safely. All of them live in the `collections` module.

In this section you'll learn:

- `defaultdict`: default values produced by a factory function, and how that differs from `dict.get`
- `OrderedDict`: its extra methods (`move_to_end`, `popitem(last=False)`) and order-sensitive equality
- `OrderedDict` vs plain `dict` now that every dict keeps insertion order: what you can do without it, and what it still does better
- `Counter`: a multiset with `most_common`, `elements`, `update`/`subtract`, arithmetic, comparison operators and `total()`
- `ChainMap`: a live, layered view over several mappings, and why writes only touch the first one
- `UserDict`: why subclassing `dict` directly is fragile, and how `UserDict` fixes it
