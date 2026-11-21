---
title: Classes
summary: Writing a class with __init__ and methods, giving it a readable str and repr, making == and < work, and validating attributes with properties.
minutes: 16
---

## Defining a class

A class is a blueprint for objects. You create one with the `class` keyword, and you usually set up each new object's data in the special method `__init__`:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
```

Calling the class creates an **instance**. The arguments you pass go to `__init__`, after the first parameter: Python fills in `self` automatically with the brand-new object being initialized.

```python run
r1 = Rectangle(10, 20)
r2 = Rectangle(3, 5)
print(r1.width, r1.height)
print(r2.width, r2.height)
```

`self.width = width` creates an **attribute** on that particular instance, which you then read with dot notation: `object.attribute`. Each instance has its own values.

<div class="callout note">
<span class="callout-title">Is `self` a keyword?</span>

No. It's just the conventional name for the first parameter. Python passes the instance as the first argument whatever you call it. You could name it anything, but don't: every Python programmer expects `self`.

</div>

## Methods

Attributes that are plain values (like `width`) are often called *data attributes*; attributes that are functions are **methods**. Methods are defined inside the class, and their first parameter receives the instance:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(the_referenced_object):          # works, but please don't
        return 2 * (the_referenced_object.width + the_referenced_object.height)

r1 = Rectangle(10, 20)
print(r1.area())
print(r1.perimeter())
```

When you write `r1.area()`, Python finds `area` in the `Rectangle` class and calls it with `r1` as the first argument. In other words, it's equivalent to:

```python run
Rectangle.area(r1)
```

That's also why the oddly named parameter in `perimeter` works: the name doesn't matter, only the position. From here on we'll use `self` everywhere.

## Special methods: making `str()` work

Python defines many **special methods** (often called *dunder* methods, for the double underscores, or "magic" methods, though they're thoroughly documented). By implementing them, your class can plug into built-in functions and operators, just like `int` or `list`.

`str(10)` gives `'10'`. What about our rectangle?

```python run
str(r1)
```

The default just names the class and shows a memory address. Python has no way to guess what a readable rectangle looks like. You *could* add a method like `to_str()`, but then `str(r1)` and `print(r1)` still wouldn't use it, and every class author would invent a different name.

Instead, implement `__str__`. `str(obj)` (and therefore `print(obj)`) looks for it on the object's class and calls it:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def __str__(self):
        return f'Rectangle (width={self.width}, height={self.height})'

r1 = Rectangle(10, 20)
str(r1)
```

### `__str__` vs `__repr__`

But look at what you get when the object is displayed as the value of an expression (as the last line of a cell, in the interactive shell, or inside a list):

```python run
r1
```

That's still the default! Displaying a value uses a different method: `__repr__`, the **representation**, which is meant for developers, ideally looking like code that would recreate the object. `__str__` is meant for end users.

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def __str__(self):
        return f'Rectangle (width={self.width}, height={self.height})'

    def __repr__(self):
        return f'Rectangle({self.width}, {self.height})'

r1 = Rectangle(10, 20)
print(r1)          # uses __str__
print(repr(r1))    # uses __repr__
print([r1])        # containers show their items' repr
r1
```

If a class defines only `__repr__`, `str()` falls back to it, so `__repr__` is the one to write first.

## Comparing objects: `==`

```python run
r1 = Rectangle(10, 20)
r2 = Rectangle(10, 20)
r1 == r2
```

Two rectangles with identical sides aren't equal? By default, `==` on your own objects falls back to **identity**: it's `True` only if both names refer to the same object. Python can't know which attributes should count. You tell it with `__eq__`:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def __repr__(self):
        return f'Rectangle({self.width}, {self.height})'

    def __eq__(self, other):
        print(f'__eq__ called: self={self}, other={other!r}')
        if isinstance(other, Rectangle):
            return (self.width, self.height) == (other.width, other.height)
        return NotImplemented

r1 = Rectangle(10, 20)
r2 = Rectangle(10, 20)
r3 = Rectangle(2, 3)
print(r1 is r2)
print(r1 == r2)
print(r1 == r3)
```

`r1 == r2` calls `r1.__eq__(r2)`: `self` is the left operand, `other` the right. The two objects are still different objects (`is` is `False`), but now they compare equal by value. (The `print` inside `__eq__` is there only so you can watch the calls; real comparison methods shouldn't have side effects.)

What about comparing with something that isn't a rectangle?

```python run
r1 == 100
```

Our method returns the special value **`NotImplemented`** for foreign types. That means "I don't know how to compare with this", and lets Python try the other operand's `__eq__` (here `int`'s, which also gives up). When both sides give up, `==` falls back to identity and the result is `False`.

<div class="callout note">
<span class="callout-title">`return False` vs `return NotImplemented`</span>

Older code often ends `__eq__` with `return False` for unknown types. That works for `==`, but returning `NotImplemented` is the better habit: it gives the *other* object a chance to handle the comparison. `NotImplemented` is a value you **return**; it's unrelated to the `NotImplementedError` exception.

</div>

## Ordering: `<`, `>` and friends

The ordering operators map to `__lt__` (`<`), `__gt__` (`>`), `__le__` (`<=`) and `__ge__` (`>=`). Let's order rectangles by area, without the print this time:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def __repr__(self):
        return f'Rectangle({self.width}, {self.height})'

    def __eq__(self, other):
        if isinstance(other, Rectangle):
            return (self.width, self.height) == (other.width, other.height)
        return NotImplemented

    def __lt__(self, other):
        if isinstance(other, Rectangle):
            return self.area() < other.area()
        return NotImplemented

r1 = Rectangle(100, 200)
r2 = Rectangle(10, 20)
print(r1 < r2)
print(r2 < r1)
print(r1 > r2)
```

We never wrote `__gt__`, yet `r1 > r2` worked. When the left operand can't handle `>`, Python tries the **reflected** operation on the right operand: `r1 > r2` is the same question as `r2 < r1`, so Python calls `r2.__lt__(r1)`.

There's no such shortcut for `<=`, though: knowing `<` and `==` separately doesn't make Python combine them.

```python run
try:
    r1 <= r2
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Less boilerplate: `total_ordering` and dataclasses</span>

`functools.total_ordering` fills in the missing comparison methods from `__eq__` and one of `__lt__`, `__le__`, `__gt__` or `__ge__`. And since Python 3.7, `@dataclass` can write `__init__`, `__repr__` and `__eq__` for you:

```python run fresh
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(1, 2)
print(p, p == Point(1, 2))
```

You'll write these methods by hand first, though, so you know what such tools generate.

</div>

## Properties: controlling attribute access

So far, users of the class read and write `width` and `height` directly:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def __repr__(self):
        return f'Rectangle({self.width}, {self.height})'

r1 = Rectangle(10, 20)
r1.width = 100
r1
```

Coming from Java, that may look like poor design: shouldn't fields be private, with `getWidth()` and `setWidth()` methods? In Java, yes, because switching later from a public field to getter/setter methods changes the interface and breaks every caller that wrote `obj.width`. So Java code writes getters and setters up front, just in case.

Python doesn't have that problem. You can start with a plain attribute and later, if you need validation, turn it into a **property**: getter and setter methods that are still used with plain `obj.width` syntax. Code that uses the class doesn't change at all.

Suppose we must now reject non-positive widths and heights:

```python run
class Rectangle:
    def __init__(self, width, height):
        self.width = width      # goes through the setter below
        self.height = height

    def __repr__(self):
        return f'Rectangle({self.width}, {self.height})'

    @property
    def width(self):
        return self._width

    @width.setter
    def width(self, width):
        if width <= 0:
            raise ValueError('Width must be positive.')
        self._width = width

    @property
    def height(self):
        return self._height

    @height.setter
    def height(self, height):
        if height <= 0:
            raise ValueError('Height must be positive.')
        self._height = height
```

`@property` turns the first `width` method into the getter; `@width.setter` registers the second as the setter. The actual value lives in `_width` (a leading underscore is Python's convention for "internal, please don't touch"). The calling code is exactly the same as before:

```python run
r1 = Rectangle(10, 20)
print(r1.width)
r1.width = 100
print(r1)
try:
    r1.width = -10
except ValueError as ex:
    print('ValueError:', ex)
```

Notice that `__init__` assigns `self.width = width` rather than `self._width = width`. That routes the initial values through the setters too, so invalid rectangles are rejected **when they're created**, right at the line that made the mistake, instead of failing mysteriously later:

```python run
try:
    Rectangle(0, 10)
except ValueError as ex:
    print('ValueError:', ex)
```

A production version would also check that the values are numbers. You'll study properties, decorators and many more special methods in depth later; for now the point is that Python lets a class evolve without breaking the code that uses it.

<div class="takeaways">

## Key takeaways

- `class` defines a class; calling it creates an instance and runs `__init__`, with the new object passed as `self`.
- `obj.method()` is `Class.method(obj)`: the instance is passed as the first argument.
- `__str__` serves `str()`/`print()`, `__repr__` serves the developer-facing display; write `__repr__` first.
- Without `__eq__`, `==` compares identity. Return `NotImplemented` for types you don't support.
- Python tries reflected comparisons (`a > b` → `b < a`), but won't build `<=` from `<` and `==`.
- Properties let you add validation to an attribute later without changing how callers use it.

</div>
