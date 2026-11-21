---
title: Overriding
summary: A subclass overrides an inherited method by defining one with the same name, and because lookup always starts at the instance's own class, even the parent's code calls the override.
minutes: 13
---

## Replacing an inherited method

A class with no `__str__` still works with `str()`, because it inherits `object.__str__`:

```python run
class Person:
    pass

str(Person())
```

To change that behavior, define a method with the same name in the subclass. This is **overriding**: the child's definition takes the place of the inherited one for instances of the child.

```python run
class Person:
    def __str__(self):
        return 'Person class'

str(Person())
```

## `str()` falls back to your `__repr__`

What if we override only `__repr__` and then call `str()`?

```python run
class Person:
    def __repr__(self):
        return 'Person()'

p = Person()
print(str(p), repr(p))
```

`Person` has no `__str__`, so `str(p)` uses the one inherited from `object`. That default implementation doesn't format anything itself: it calls `repr()` **on the same object**, and that lookup finds `Person.__repr__`. This is why the usual advice is "always write a `__repr__`; add a `__str__` only if you want a different, friendlier string".

## How Python finds a method

When you write `obj.method`, Python searches for `method` in the classes of `type(obj).__mro__`, **in order**, and uses the first one it finds. The search always starts at the object's **own** class, no matter where the calling code lives. A small helper makes this visible:

```python run
def defined_in(obj, name):
    """Return the first class in obj's MRO whose namespace defines `name`."""
    for cls in type(obj).__mro__:
        if name in cls.__dict__:
            return cls.__name__

print(defined_in(p, '__repr__'))
print(defined_in(p, '__str__'))
print(defined_in(p, '__eq__'))
```

That one rule explains everything that follows.

## A parent's method calls the child's override

Here's a parent that defines two methods, and a child that overrides only one of them:

```python run
class Shape:
    def __init__(self, name):
        self.name = name

    def info(self):
        return f'Shape.info called for {self.name}'

    def extended_info(self):
        return f'Shape.extended_info called for {self.name}', self.info()

class Polygon(Shape):
    def __init__(self, name):
        self.name = name       # duplicated for now; super() will fix this later

    def info(self):
        return f'Polygon.info called for {self.name}'

p = Polygon('square')
print(p.info())
```

`p.info()` finds `Polygon.info` first, as expected. Now call `extended_info`, which only `Shape` defines and which calls `self.info()` internally:

```python run
for line in p.extended_info():
    print(line)
```

The code of `extended_info` lives in `Shape`, but `self` is `p`, a `Polygon`. So `self.info()` starts its search at `Polygon` and finds the override. The parent's code automatically uses the child's version.

<figure class="diagram">
<svg viewBox="0 0 620 200" role="img" aria-label="Lookup of self.info for a Polygon instance: search starts at Polygon, which defines info, before Shape and object are considered">
<defs>
<marker id="ov1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="ov2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<text x="20" y="22" class="d-sub">INSTANCE</text>
<text x="200" y="22" class="d-sub">type(self).__mro__, searched left to right</text>
<rect x="20" y="40" width="130" height="60" rx="8" class="d-name"/><text x="32" y="62" class="d-sub">self (p)</text><text x="32" y="86" class="d-text">Polygon obj</text>
<rect x="200" y="40" width="120" height="80" rx="8" class="d-obj-hl"/><text x="212" y="62" class="d-sub">Polygon</text><text x="212" y="86" class="d-text">info ✓</text><text x="212" y="108" class="d-text">__init__</text>
<rect x="360" y="40" width="120" height="80" rx="8" class="d-obj"/><text x="372" y="62" class="d-sub">Shape</text><text x="372" y="86" class="d-text">info</text><text x="372" y="108" class="d-text">extended_info</text>
<rect x="520" y="40" width="80" height="80" rx="8" class="d-obj"/><text x="532" y="62" class="d-sub">object</text><text x="532" y="86" class="d-text">__str__</text><text x="532" y="108" class="d-text">…</text>
<path d="M150 70 L196 70" class="d-arrow-hl" marker-end="url(#ov2)"/>
<path d="M320 80 L356 80" class="d-arrow" marker-end="url(#ov1)"/>
<path d="M480 80 L516 80" class="d-arrow" marker-end="url(#ov1)"/>
<text x="20" y="160" class="d-text">Shape.extended_info runs self.info() → the search starts at Polygon</text>
<text x="20" y="184" class="d-sub">so Polygon.info is found first, and Shape.info is never reached</text>
</svg>
<figcaption>Where a method is <em>defined</em> doesn't matter for the lookups inside it. What matters is the class of the object bound to <code>self</code>.</figcaption>
</figure>

This is the core of polymorphism with inheritance: a parent class can define the overall algorithm, and children customize individual steps by overriding them.

## The same mechanism with `__str__` and `__repr__`

Let's put the two special methods on different levels of a hierarchy:

```python run
class Person:
    def __str__(self):
        return 'Person.__str__ called'

class Student(Person):
    def __repr__(self):
        return 'Student.__repr__ called'

s = Student()
print(str(s))
print(repr(s))
```

`str(s)` finds `Person.__str__` (Student has none), and `repr(s)` finds `Student.__repr__`. Now let `Person.__str__` delegate to `__repr__`:

```python run
class Person:
    def __str__(self):
        print('Person.__str__ called')
        return self.__repr__()

class Student(Person):
    def __repr__(self):
        return 'Student.__repr__ called'

s = Student()
print(str(s))
```

Same story as `extended_info`: the method runs in `Person`, but `self.__repr__` is looked up starting from `Student`. And that's exactly what `object.__str__` does when a class only defines `__repr__`.

<div class="callout tip">
<span class="callout-title">Keep track of `self`</span>

When you read inherited code and wonder "which version runs here?", ask two questions: *what is the class of the object bound to `self`?* and *what is the first class in its MRO that defines this name?* You never need to consider the class where the calling code happens to be written.

</div>

## Overriding `__eq__` removes the inherited hash

One override comes with a side effect worth knowing. If a class defines `__eq__` but not `__hash__`, Python sets `__hash__` to `None` in that class, so its instances become unhashable:

```python run
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

print(Point(1, 2) == Point(1, 2))
print(Point.__hash__)
try:
    {Point(1, 2)}
except TypeError as ex:
    print('TypeError:', ex)
```

This is deliberate. The inherited, id-based hash would make two *equal* points hash differently, which breaks dictionaries and sets. If equal objects should be usable as keys, override `__hash__` as well, for example with `return hash((self.x, self.y))`.

<div class="takeaways">

## Key takeaways

- **Overriding** means defining a method with the same name as an inherited one. Instances of the subclass then use the subclass version.
- Attribute lookup walks `type(obj).__mro__` and stops at the first class that defines the name. It always starts at the instance's own class.
- So when a parent's method calls `self.something()`, it gets the child's override if there is one. This lets a parent define the algorithm and children customize its steps.
- `object.__str__` calls `repr()`, so a class that only defines `__repr__` gets a matching `str()`.
- Defining `__eq__` without `__hash__` sets `__hash__ = None`, making instances unhashable.

</div>
