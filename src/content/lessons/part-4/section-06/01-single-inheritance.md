---
title: Single Inheritance
summary: A class can inherit from one parent class, forming an is-a hierarchy that issubclass() checks between classes and isinstance() checks for instances.
minutes: 12
---

## The idea: "is a"

Inheritance models a relationship between **classes**: a child class is a more specialized version of its parent. A circle *is an* ellipse (one whose two radii happen to be equal), an ellipse *is a* shape, a square *is a* rectangle, and so on. The child class (also called a **subclass** or derived class) automatically gets everything the parent (the **superclass** or base class) defines, and can then add to it or change parts of it.

This lesson doesn't add any behavior yet. We only build a hierarchy and look at how Python records and checks the relationships, because that's what the rest of the section builds on.

## Building a hierarchy

To inherit from a class, put its name in parentheses after the new class name. With **single inheritance**, each class names exactly one parent:

```python run
class Shape:
    pass

class Ellipse(Shape):
    pass

class Circle(Ellipse):
    pass

class Polygon(Shape):
    pass

class Rectangle(Polygon):
    pass

class Square(Rectangle):
    pass

class Triangle(Polygon):
    pass
```

That gives us this tree. Each arrow points from a child to its parent:

<figure class="diagram">
<svg viewBox="0 0 620 280" role="img" aria-label="Class hierarchy: Shape at the top; Ellipse and Polygon inherit from Shape; Circle inherits from Ellipse; Rectangle and Triangle inherit from Polygon; Square inherits from Rectangle">
<defs>
<marker id="si1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<rect x="250" y="20" width="100" height="36" rx="8" class="d-obj-hl"/><text x="300" y="43" text-anchor="middle" class="d-text">Shape</text>
<rect x="90" y="90" width="100" height="36" rx="8" class="d-obj"/><text x="140" y="113" text-anchor="middle" class="d-text">Ellipse</text>
<rect x="410" y="90" width="100" height="36" rx="8" class="d-obj"/><text x="460" y="113" text-anchor="middle" class="d-text">Polygon</text>
<rect x="90" y="160" width="100" height="36" rx="8" class="d-obj"/><text x="140" y="183" text-anchor="middle" class="d-text">Circle</text>
<rect x="330" y="160" width="100" height="36" rx="8" class="d-obj"/><text x="380" y="183" text-anchor="middle" class="d-text">Rectangle</text>
<rect x="490" y="160" width="100" height="36" rx="8" class="d-obj"/><text x="540" y="183" text-anchor="middle" class="d-text">Triangle</text>
<rect x="330" y="230" width="100" height="36" rx="8" class="d-obj"/><text x="380" y="253" text-anchor="middle" class="d-text">Square</text>
<path d="M140 90 L285 58" class="d-arrow" marker-end="url(#si1)"/>
<path d="M460 90 L315 58" class="d-arrow" marker-end="url(#si1)"/>
<path d="M140 160 L140 128" class="d-arrow" marker-end="url(#si1)"/>
<path d="M380 160 L445 128" class="d-arrow" marker-end="url(#si1)"/>
<path d="M540 160 L475 128" class="d-arrow" marker-end="url(#si1)"/>
<path d="M380 230 L380 198" class="d-arrow" marker-end="url(#si1)"/>
</svg>
<figcaption>A single-inheritance tree. Every class has one parent, but a parent can have many children. Follow the arrows up from any class to find all of its ancestors.</figcaption>
</figure>

## `issubclass()`: a relationship between classes

`issubclass(A, B)` asks whether class `A` is `B` or inherits from it, directly or through any number of intermediate classes:

```python run
print(issubclass(Ellipse, Shape))     # direct parent
print(issubclass(Square, Shape))      # Square -> Rectangle -> Polygon -> Shape
print(issubclass(Square, Ellipse))    # different branch
print(issubclass(Shape, Shape))       # a class counts as a subclass of itself
```

The word "sub*class*" is a good reminder that this is about classes, not instances. Passing an instance is an error:

```python run
s = Shape()
e = Ellipse()

try:
    issubclass(e, s)
except TypeError as ex:
    print('TypeError:', ex)
```

## `isinstance()`: is this object one of those?

For objects, use `isinstance(obj, cls)`. It's `True` when the object's class is `cls` **or any subclass of it**. Since every `Square` is also a `Rectangle`, a `Polygon` and a `Shape`, a square object is an instance of all four:

```python run
sq = Square()

for cls in (Square, Rectangle, Polygon, Shape, Ellipse):
    print(f'{cls.__name__:<10}', isinstance(sq, cls))
```

The second argument can also be a tuple of classes, meaning "any of these". Since Python 3.10 a union written with `|` works too:

```python run
c = Circle()
print(isinstance(c, (Polygon, Ellipse)))
print(isinstance(c, Polygon | Ellipse))    # Python 3.10+
```

## `isinstance()` versus `type()`

`type(obj)` gives the **exact** class an object was created from, nothing more. That makes a `type(...) is ...` check stricter than `isinstance`:

```python run
print(type(sq))
print(type(sq) is Rectangle)       # False: its class is exactly Square
print(isinstance(sq, Rectangle))   # True: a Square is a Rectangle
```

The whole point of inheritance is that a child can be used anywhere the parent is expected. Code that receives "a rectangle" should accept squares too, so prefer `isinstance()` for checks like this. Reach for `type(obj) is X` only when you really need to exclude subclasses.

## Looking at the hierarchy

Python keeps the links in plain attributes you can inspect. `__bases__` holds a class's direct parents, `__subclasses__()` lists its direct children, and `__mro__` lists the class followed by all of its ancestors, nearest first:

```python run
print(Square.__bases__)
print(Polygon.__subclasses__())
print(Square.__mro__)
```

`__mro__` stands for **method resolution order**: the order in which Python searches classes when it looks up an attribute or method. With single inheritance it's simply the chain from the class up to the root, as the output shows. It comes back in the lessons on overriding and `super()`, because it decides which method runs. (With multiple inheritance, where a class can have several parents, the order is computed by an algorithm called C3, but that isn't needed here.)

## Every class has a parent

Notice the last entry in that MRO: `object`. Even though `Shape` didn't name a parent, it has one:

```python run
class Person:
    pass

print(Person.__bases__)
print(issubclass(Person, object), issubclass(Square, object))
print(isinstance(Person(), object), isinstance(sq, object))
```

In Python 3, a class that doesn't list a parent implicitly inherits from the built-in class `object`. (Yes, `object` is a class, despite its name.) So every class, and therefore every object, is ultimately an `object`. The next lesson looks at what that root class provides.

<div class="callout note">
<span class="callout-title">Writing `class Person(object):`</span>

You'll still see `class Person(object):` in older code. In Python 2 that was needed to get a "new-style" class. In Python 3 it means exactly the same as `class Person:`, so you can leave it out.

</div>

<div class="takeaways">

## Key takeaways

- Inheritance expresses an **is-a** relationship between classes. With single inheritance each class has exactly one parent.
- `issubclass(A, B)` compares **classes**; it's `True` for direct and indirect parents, and for `A is B`.
- `isinstance(obj, B)` checks an **object**; it's `True` if the object's class is `B` or any subclass of `B`. It also accepts a tuple, or (3.10+) a `|` union.
- `type(obj)` is the exact class only. Prefer `isinstance` so that subclasses are accepted.
- `__bases__`, `__subclasses__()` and `__mro__` let you inspect the hierarchy. `__mro__` is the lookup order for attributes.
- Every class implicitly inherits from `object`.

</div>
