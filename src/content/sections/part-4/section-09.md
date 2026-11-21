---
summary: Build two reusable validating data descriptors, an integer field and a string field, test them thoroughly with unittest, then refactor their shared logic into a base class.
---

Time to put descriptors to work. In this project you'll write the kind of field types that ORMs and validation libraries are built on: an `IntegerField` that only accepts integers within optional bounds, and a `CharField` that only accepts strings within optional length limits. Any class can then declare validated attributes in one line each.

Along the way you'll write a proper `unittest` suite, discover a trap with `__set_name__` when testing descriptors, create throwaway test classes with `type()`, use test-driven development to add a feature, and finally refactor the duplicated code into a base class, with the tests proving that nothing broke.

In this project you'll:

- implement `IntegerField` and `CharField` as data descriptors that store values in the instance `__dict__` under their own name
- make the minimum and maximum optional, and normalize a missing or negative minimum length to `0`
- test descriptors with `unittest`, `subTest` and classes built on the fly with `type(name, bases, namespace)`
- see why assigning a descriptor to an existing class skips `__set_name__`
- refactor both fields onto a shared `BaseValidator` with a `validate()` hook
