---
summary: How classes and instances really work in Python, from namespaces and attribute lookup to bound methods, properties, class and static methods, and the class body scope.
---

A class in Python is not a blueprint that exists only at compile time. It's an ordinary object, created when the `class` statement runs, with its own namespace that you can inspect and change while the program is running. Instances are objects too, each with a namespace of its own. Once you see how Python searches these two namespaces, and what it does when the thing it finds is a function, most of the "magic" of object-oriented Python turns into a few simple rules.

In this section you'll learn:

- what a class object is, how it relates to `type`, and how calling a class creates an instance
- class attributes, `getattr`/`setattr`/`delattr`, and the class `__dict__` (a read-only `mappingproxy`)
- instance namespaces, and how an instance attribute can shadow a class attribute
- why a function becomes a **bound method** when you reach it through an instance, and what `self` really is
- initializing instances with `__init__`, and adding attributes and even methods at run time with `types.MethodType`
- properties: the `property` class, the decorator syntax, and read-only, computed, cached and deletable properties
- class methods and static methods, and when to use each
- the class body scope, and why methods and comprehensions can't see names defined in it
