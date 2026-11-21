---
summary: Build a `Mod` class for modular arithmetic that validates its input, compares and hashes by congruence, and supports arithmetic, reflected, in-place and ordering operators.
---

Time to put the special methods to work on a single, realistic class. In modular arithmetic, numbers "wrap around" a modulus, the way clock hours wrap around 12: `14 ≡ 2 (mod 12)`. In this project you'll write a `Mod` class whose instances behave like numbers in that world: `Mod(8, 3)` is the same as `Mod(2, 3)`, it equals the plain integer `5`, and `Mod(2, 3) + 2` is `Mod(1, 3)`.

This project practices:

- validating constructor arguments and exposing read-only properties
- `__repr__` and `__int__`
- `__eq__` and `__hash__` based on congruence, and the limits of the hash contract when a class equals integers
- arithmetic operators with `NotImplemented`, reflected operators so that `3 + Mod(1, 5)` works, and three-argument `pow()`
- in-place operators that mutate the object, and why that conflicts with hashing
- ordering with `functools.total_ordering`, and removing repetition with the `operator` module
