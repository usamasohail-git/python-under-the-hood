---
title: How Classes are Created
summary: A class statement runs its body in a fresh namespace dictionary and then calls type(name, bases, namespace). You can do both steps by hand.
minutes: 13
---

## Classes are instances of `type`

Start with an ordinary class:

```python run
import math

class Circle:
    def __init__(self, x, y, r):
        self.x = x
        self.y = y
        self.r = r

    def area(self):
        return math.pi * self.r ** 2

print(type(Circle))
print(isinstance(Circle, type))
```

`Circle` is an object, and its type is `type`. So `type` is a class whose instances are classes. A class that creates classes is called a **metaclass**, and `type` is the default one. If `type` is a class, calling it should produce a new instance, a new class. To see how, let's take apart what the `class` statement does.

## What the `class` statement does

Roughly, when Python executes `class Circle: <body>`, it:

1. collects the **name** (`'Circle'`) and the **bases** (here none, which means `(object,)`);
2. creates an empty **namespace** dictionary for the class;
3. **executes the body** as code, using that dictionary as its local namespace, so every `def` and assignment in the body becomes a key in the dictionary;
4. calls the metaclass, **`type(name, bases, namespace)`**, which builds the class object;
5. binds the resulting class to the name `Circle` in the enclosing scope.

The class body really is just code that runs once, top to bottom. You can put `print` calls in it and see them run when the class is defined:

```python run
class Demo:
    print('running the class body')
    a = 1 + 1
    print('a is', a)

print(Demo.a)
```

## Step 3 by hand: `exec` with a namespace

The built-in `exec(code, globals, locals)` runs a string of code. Any names it creates go into the `locals` dictionary you pass:

```python run
namespace = {}

exec('''
a = 10
b = 20

def add(a, b):
    return a + b
''', globals(), namespace)

print(namespace.keys())
print(namespace['add'](namespace['a'], namespace['b']))
```

That dictionary is exactly what a class body produces. It also explains a rule from the classes section: **methods can't see other class-level names directly**. A function defined in the body is created independently of the dictionary it's stored in. When it runs later, it looks up names in its own locals, then in enclosing *function* scopes and the globals, and the class namespace is none of those. That's why a method must write `self.a` or `type(self).a`, not just `a`.

## Step 4 by hand: calling `type`

`type` has two very different call forms. With one argument it returns the type of an object. With three arguments, `type(name, bases, dict)`, it creates a new class:

```python run
class_name = 'Circle'
class_bases = ()                 # empty means (object,)
class_body = """
def __init__(self, x, y, r):
    self.x = x
    self.y = y
    self.r = r

def area(self):
    return math.pi * self.r ** 2
"""

class_dict = {}
exec(class_body, globals(), class_dict)
print(class_dict.keys())

Circle = type(class_name, class_bases, class_dict)
print(Circle, type(Circle), Circle.__bases__)
```

The result is a fully working class, indistinguishable in use from one written with `class`:

```python run
c = Circle(0, 0, 1)
print(c.x, c.y, c.r)
print(c.area())
print(list(vars(Circle).keys()))
```

`type.__new__` added a few entries on its own: `__dict__` and `__weakref__` (descriptors that give instances their attribute dictionary and weak reference support) and `__doc__`. `__module__` is there too: `type` fills it in from the calling code when the namespace doesn't supply it.

You don't need `exec` if you already have the functions. The three-argument form is a handy way to create simple classes programmatically:

```python run
def greet(self):
    return f'Hello from {type(self).__name__}'

Base = type('Base', (), {'greet': greet, 'kind': 'base'})
Child = type('Child', (Base,), {'kind': 'child'})

print(Child().greet(), Child.kind, Child.__mro__)
```

<div class="callout modern">
<span class="callout-title">Extra keys in the class namespace (3.13)</span>

A real `class` statement puts a few entries into the namespace before and after your body runs: `__module__` and `__qualname__` (all versions), and since Python 3.13 also `__firstlineno__` (the line where the class starts) and `__static_attributes__` (the names assigned as `self.<name>` in the methods). Older notebooks only show the first two. Classes built by calling `type()` directly don't get the 3.13 entries, because no class body was compiled.

</div>

```python run
class Circle:
    def __init__(self, r):
        self.r = r

print(Circle.__qualname__, Circle.__static_attributes__)
```

## Why this matters

Once you see that `class` is "run the body into a dict, then call `type`", every hook in this section has an obvious place:

- you can supply a **different callable** than `type` (a metaclass);
- you can control the **dictionary** the body runs in (`__prepare__`);
- you can modify the class **after** it's built (class decorators, `__init_subclass__`).

<div class="takeaways">

## Key takeaways

- Classes are objects whose type is `type`. A class that creates classes is a **metaclass**; `type` is the default.
- A `class` statement runs its body once, in a fresh namespace dictionary, then calls `type(name, bases, namespace)`.
- `exec(code, globals, ns)` reproduces the body step. Functions in the body don't see the class namespace when they run, hence `self.attr`.
- `type(obj)` returns a type; `type(name, bases, dict)` creates one.
- On 3.13, class namespaces also contain `__firstlineno__` and `__static_attributes__`.

</div>
