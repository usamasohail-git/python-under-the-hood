---
summary: Model a computer-parts inventory as a small class hierarchy (Resource, CPU, Storage, HDD and SSD) with validated, read-only state, then package it with a validator module and unit tests.
---

This project turns the single-inheritance tools from the previous section into a small but realistic package. You'll model the parts inventory of someone who builds computers: pools of identical CPUs, hard drives and SSDs that get claimed for builds, freed up again, occasionally burnt out, and restocked. A general `Resource` base class holds everything all parts have in common, and specialized subclasses add only what's different, delegating the rest with `super()`.

The solution is organized like a real project, with an `app` package (split into `models` and `utils`) and a `tests` folder, and it's checked by a suite of unit tests that you'll run right in the browser.

In this project you'll:

- design a base class whose state is validated on creation and exposed through read-only properties
- change that state only through methods (`claim`, `freeup`, `died`, `purchased`) that enforce the inventory rules
- write a reusable `validate_integer` helper with optional bounds and custom error messages
- derive `CPU`, `Storage`, `HDD` and `SSD` classes that extend the base initializer with `super().__init__()`
- override and extend `__repr__` along the hierarchy, and compute a `category` from the instance's class
- lay the code out as a package with implicit namespace packages, and test it with `unittest`
