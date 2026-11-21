---
summary: Validate nested dictionaries (think JSON documents) against a template of keys and types, using keys-view set operations, recursion and a small exception hierarchy.
---

APIs, configuration files and message queues all hand you nested dictionaries, usually decoded from JSON, and before you use one you want to know it has the shape you expect. In this project you'll write a small validator that checks a nested dictionary against a **template**: the same keys at every level, and values of the right types.

The code is short, but it brings together several ideas from this part: set operations on dictionary keys views, recursion over nested dictionaries, deterministic error messages from unordered sets, and custom exceptions.

In this project you'll practice:

- finding missing and extra keys with keys-view differences
- type-checking values with `isinstance`, including nested dictionaries
- walking arbitrarily deep structures recursively while tracking a dotted path like `bio.dob.month`
- producing stable error messages even though sets are unordered
- replacing status-code returns with a hierarchy of custom exceptions
