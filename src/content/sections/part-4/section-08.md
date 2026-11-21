---
summary: Descriptors are the machinery behind properties, methods and reusable validated attributes. Learn the protocol, where to store per-instance data, and the exact order Python uses to look attributes up.
---

A property is great for one attribute, but what if ten attributes across five classes all need the same validation? Writing ten nearly identical getter/setter pairs is exactly the kind of repetition Python lets you avoid. The tool for this is the **descriptor**: an object, stored as a class attribute, that takes over what happens when you read, write or delete that attribute on an instance.

Descriptors are not an exotic add-on. `property`, `classmethod`, `staticmethod`, `__slots__` members, and even plain functions turning into bound methods all work through the same descriptor protocol. Once you understand it, a lot of "magic" in Python becomes ordinary code you could write yourself.

In this section you'll learn:

- the descriptor protocol (`__get__`, `__set__`, `__delete__`, `__set_name__`) and the difference between **data** and **non-data** descriptors
- how `__get__` tells class access apart from instance access, and why a descriptor's own state is shared by every instance
- where to keep per-instance values: in the instance `__dict__`, or in the descriptor, keyed by instance
- strong vs **weak references**, `weakref.ref`, `WeakKeyDictionary`, weakref callbacks and `__weakref__` with `__slots__`
- `__set_name__`, which lets a descriptor learn the name it was assigned to
- the precise **attribute lookup order**: data descriptor, then instance `__dict__`, then non-data descriptor, then plain class attribute
- how `property` is built on descriptors, by writing your own version of it
- two practical applications: reusable type validators and a validated `Polygon` of points
- how functions use `__get__` to become bound methods
