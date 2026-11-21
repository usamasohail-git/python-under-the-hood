---
title: Dynamic vs Static Typing
summary: In Python, types belong to objects, not to variable names. A name can refer to an object of any type at any time.
minutes: 6
---

## Static typing

In statically typed languages such as Java, C or C++, you declare a variable's type up front, and it stays that type:

```java
String myVar = "hello";
myVar = 10;        // compile error: incompatible types
myVar = "abc";     // fine: still a String
```

The *variable* carries a type, and the compiler enforces it.

## Dynamic typing

Python is **dynamically typed**. A variable name has **no type of its own**. It's just a reference, and the *object* it refers to has the type. `type(name)` reports the type of whatever object the name points to *right now*:

```python run
a = 'hello'
type(a)
```

```python run
a = 10
type(a)
```

```python run
a = lambda x: x ** 2
print(a(2))
type(a)
```

The name `a` referred to a `str`, then an `int`, then a `function`. No type was ever attached to `a` itself. Each assignment simply pointed the name at a different object.

<div class="callout note">
<span class="callout-title">What about type hints?</span>

You'll often see code like `count: int = 0` or `def greet(name: str) -> str:`. These **annotations** are documentation for humans and for tools like mypy, pyright and IDEs. Python itself does not enforce them when your code runs:

```python run
count: int = 0
count = 'not a number'   # no error at run time
type(count)
```

So Python stays dynamically typed even when you use type hints. You'll meet annotations properly in the section on functions.

</div>

<div class="takeaways">

## Key takeaways

- In Python, *objects* have types; *names* don't.
- `type(x)` tells you the type of the object `x` currently refers to.
- Type hints are not enforced at run time. They help readers and static checkers.

</div>
