---
summary: Code that writes, inspects and reshapes other code, from __new__ and metaclasses to __prepare__, __init_subclass__ and attribute access hooks.
---

Metaprogramming means writing code whose job is to create or modify *other* code: functions, classes, even the rules for how attributes are looked up. You've been doing a light form of it for a while. Every decorator rewraps a function, and every descriptor changes what the dot operator does. This section goes all the way down. You'll see that a `class` statement is just a call to `type`, that you can replace `type` with your own **metaclass**, and that Python gives you a hook at nearly every stage of building a class and reading or writing its attributes.

This is powerful, and it's easy to overdo. So alongside each technique, you'll learn which lighter tool (a class decorator, `__init_subclass__`, a descriptor, `@dataclass`) does the same job more simply.

In this section you'll learn:

- how `__new__` creates an instance before `__init__` initializes it, and when to override it
- how a `class` statement works: running the body in a namespace and calling `type(name, bases, namespace)`
- how to subclass `type` and plug the result in as a metaclass, with extra keyword parameters
- how class decorators and decorator classes work, and how they compare with metaclasses
- `__init_subclass__` and `__set_name__`, the modern hooks that make many metaclasses unnecessary
- `__prepare__`, and the complete class creation pipeline from start to finish
- three applications: generated "struct" classes, singletons, and config classes built from `.ini` files
- the exact rules for `__getattribute__`, `__getattr__`, `__setattr__` and `__delattr__`, and how to use them without infinite recursion
