---
summary: Refactor the Polygon and Polygons classes from Project 1 so that every computed value is lazy and the polygon collection becomes a true, lazily evaluated iterable.
---

This project revisits the regular polygons from Project 1 with the tools from the previous section. The `Polygon` class is immutable, so there's no reason to recompute its area or perimeter every time someone asks; and the `Polygons` collection stores a list of polygons it may never need. You'll fix both, turning eager code into lazy code without changing what the classes compute.

- **Goal 1:** turn every calculated property of `Polygon` into a *lazy* property, computed at most once and only on demand
- **Goal 2:** replace the list-backed `Polygons` sequence with an **iterable** plus a separate **iterator** that creates each polygon only when it's requested
- verifying laziness by counting how often work actually happens, not just by checking results
- the auto-graded exercises on the Practice page check correctness *and* laziness
