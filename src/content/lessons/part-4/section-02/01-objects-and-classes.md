---
title: Objects and Classes
summary: A class is itself an object (an instance of type), and calling it produces new instances whose type is that class.
minutes: 10
---

## A class is a type

Every object in Python has a **type**, and the type decides what the object can do: an `int` can be added, a `str` can be upper-cased, a `list` can be appended to. A **class** is how you define a new type of your own. You create one with the `class` statement:

```python run
class Person:
    pass
```

That's a complete (if useless) class. When Python executes this statement, it builds a new object and binds the name `Person` to it, exactly as `def` builds a function object and binds a name to it. So the class is something you can look at:

```python run
print(type(Person))
print(Person.__name__)
```

The class object `Person` has type `type`. That's not a typo: `type` is the class that all ordinary classes are instances of. And `type` is an object too, so it has a type as well, which turns out to be itself:

```python run
type(type)
```

`type` is the end of the chain: it's an instance of itself. That's a special arrangement built into the interpreter; you can't make your own classes behave that way.

<div class="callout note">
<span class="callout-title">Two meanings of "type"</span>

`type(obj)` with one argument returns an object's type. But `type` is also the name of the class that builds classes (the default **metaclass**). The two uses are related: asking for the type of a class gives you back the class that built it. Metaclasses get a full treatment later in Part 4.

</div>

## Calling a class creates an instance

Python gives every class some behavior for free. The most important is that classes are **callable**: calling one creates and returns a new **instance** of it.

```python run
p = Person()
print(type(p))
print(p)
```

The type of `p` is `Person`, the class used to build it. `__main__` is the name of the module where the class was defined; in a script or notebook that's the top-level module. The hex number in `<__main__.Person object at 0x...>` is the object's memory address (its `id()`), so it will differ every time you run the cell.

Instances also carry a reference back to their class in the `__class__` attribute:

```python run
print(p.__class__)
print(type(p) is p.__class__)
```

Both routes lead to the same class object. As you'll see in lesson 4, `type()` is the more trustworthy of the two.

## Checking types with `isinstance`

`isinstance(obj, cls)` asks "is `obj` an instance of `cls`?" Without inheritance in the picture (that comes in a later section), it simply compares the object's type with `cls`:

```python run
print(isinstance(p, Person))
print(isinstance(p, str))
```

Since `Person` is an instance of `type`, `isinstance` works on the class itself too:

```python run
print(isinstance(Person, type))   # Person is a type object
print(isinstance(type, type))     # type is an instance of itself
print(isinstance(Person, Person)) # but Person is not a Person
```

Prefer `isinstance(x, SomeClass)` over `type(x) is SomeClass` in everyday code: once you use inheritance, `isinstance` also accepts instances of subclasses, which is almost always what you want.

## Where does the free behavior come from?

How does `Person` know how to be called, or what its `__name__` is? Those abilities come from `type`. Because `Person` is an instance of `type`, it can use everything `type` defines, just as a list can use everything `list` defines. Among other things, `type` defines a `__call__` method, and that's what runs when you write `Person()`:

```python run
print('__call__' in dir(type))
print(callable(Person), callable(p))
```

The class is callable; a plain instance of it isn't (unless you give the class a `__call__` method of its own, which is a topic for the special methods section).

<div class="callout tip">
<span class="callout-title">Try it</span>

Run `help(type)` in a cell to see everything `type` provides. Many of those names (`__name__`, `__qualname__`, `__dict__`, `__mro__`, `__call__`…) will become familiar over the next lessons.

</div>

## Classes are objects, so treat them like objects

Because a class is an ordinary object, you can do anything with it that you can do with other objects: bind it to another name, put it in a list, pass it to a function, return it from a function.

```python run
def make(cls):
    return cls()

Alias = Person
obj = make(Alias)
print(type(obj) is Person, Alias is Person)
```

This "classes are just objects" idea runs through the rest of Part 4. Class decorators, metaclasses and descriptors all build on it.

<div class="takeaways">

## Key takeaways

- The `class` statement creates a **class object** at run time and binds a name to it.
- Ordinary classes are instances of `type`; `type` is an instance of itself.
- Calling a class creates a new **instance**; `type(instance)` (and `instance.__class__`) is the class.
- `isinstance(obj, cls)` checks whether `obj` is an instance of `cls` (and, later, of its subclasses).
- Classes get behavior like being callable and having a `__name__` from `type`.

</div>
