---
summary: A read-only, live view of a dictionary with types.MappingProxyType, the same mechanism Python uses to protect class namespaces.
---

Sometimes you want to hand a dictionary to other code so it can *read* it, but not change it, and you'd rather not make a copy that goes stale. The `types` module has a small tool for exactly that.

- `MappingProxyType`: a read-only view of a mapping that reflects later changes to the original
- why a class's `__dict__` is a `mappingproxy`
- what "read-only" does and doesn't protect (nested mutable values), and getting a mutable copy back
- a practical pattern: exposing internal state through a read-only property
