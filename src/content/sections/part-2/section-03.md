---
summary: Build an immutable Polygon class and a sequence type of regular polygons, testing every property along the way.
---

Time to put the sequence protocol to work. In this project you'll model **regular convex polygons** (all sides equal, all angles equal) as an immutable class with computed geometric properties, and then build a custom, read-only sequence of such polygons that supports full indexing and slicing.

The math is light (a little trigonometry, all formulas are given), and the emphasis is on design: computed properties, immutability, rich comparisons, delegation, and writing tests as you go.

In this project you'll practice:

- read-only computed attributes with `@property`
- validating constructor arguments and raising the right exception
- `__eq__` and `__gt__`, `NotImplemented`, and how Python reflects comparisons
- comparing floats safely with `math.isclose`
- a custom sequence with `__len__` and `__getitem__` that delegates to a built-in container
- choosing the "best" element with `max(..., key=...)`
