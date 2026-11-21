---
title: Class Body Scope
summary: The class body has its own namespace, but functions and comprehensions defined in it skip that scope, so they must reach class attributes through self, cls or the class name.
minutes: 13
---

## The class body is a scope

Code in a class body runs once, top to bottom, when the `class` statement executes, in a namespace of its own. That namespace becomes the class's `__dict__`. While the body is running, names defined earlier in it can be used directly by later statements:

```python run
class Language:
    MAJOR = 3
    MINOR = 13
    REVISION = 2
    FULL = f'{MAJOR}.{MINOR}.{REVISION}'

Language.FULL
```

`FULL` was computed from `MAJOR`, `MINOR` and `REVISION` while the class was being built, so this works exactly like ordinary code in a function or module.

## Functions don't see the class scope

Here's the surprise. Functions defined inside the class body are **not** nested in the class scope for name lookup purposes. When a method runs and looks up a bare name, Python searches the method's local scope, then any enclosing *function* scopes, then the module (global) scope, then built-ins. The class body is skipped.

So inside methods we always reach class attributes through something else: `self` in instance methods (and properties), `cls` in class methods, or the class's name in static methods:

```python run
class Language:
    MAJOR = 3
    MINOR = 13
    REVISION = 2

    @property
    def version(self):
        return f'{self.MAJOR}.{self.MINOR}.{self.REVISION}'

    @classmethod
    def cls_version(cls):
        return f'{cls.MAJOR}.{cls.MINOR}.{cls.REVISION}'

    @staticmethod
    def static_version():
        return f'{Language.MAJOR}.{Language.MINOR}.{Language.REVISION}'

print(Language().version)
print(Language.cls_version())
print(Language.static_version())
```

A helpful mental model: the method's **name** lives in the class namespace, but the function itself behaves as if it had been defined *outside* the class, at the level where the `class` statement is. It sees the same names a module-level function would:

```python run
def full_version():
    return f'{Language.MAJOR}.{Language.MINOR}.{Language.REVISION}'

full_version()
```

Try referring to the class attributes by bare name, and the lookup fails, because no scope on the search path defines them:

```python run
class Language:
    MAJOR = 3
    MINOR = 13
    REVISION = 2

    @classmethod
    def cls_version(cls):
        return f'{MAJOR}.{MINOR}.{REVISION}'

try:
    Language.cls_version()
except NameError as ex:
    print('NameError:', ex)
```

<div class="callout note">
<span class="callout-title">Why is it designed this way?</span>

If methods could see the class body's names, a bare `MAJOR` inside a method would silently bypass `self` and `cls`. Then a subclass or an instance that overrides `MAJOR` would be ignored, and the class namespace (which can be modified after the class is created) would behave like a frozen snapshot. Requiring `self.` or `cls.` keeps attribute access explicit and polymorphic.

</div>

## A subtle bug: the global wins

The `NameError` above is the friendly outcome. The dangerous one is when the enclosing scope **does** define the same names:

```python run
MAJOR = 0
MINOR = 0
REVISION = 1

Language.cls_version()
```

No error at all, just the wrong answer: the method found the **global** variables, because the class body was never on its search path. Bugs like this are hard to spot, which is a good reason to always use `self.`/`cls.` for class attributes.

## Methods can be closures

The "as if defined outside the class" model also tells us what happens when the class is created inside a function. Then the method's enclosing scope is that function, and normal closure rules apply:

```python run
MAJOR = 0
MINOR = 0
REVISION = 1

def gen_class():
    MAJOR = 0
    MINOR = 4
    REVISION = 2

    class Language:
        MAJOR = 3
        MINOR = 13
        REVISION = 2

        @classmethod
        def version(cls):
            return f'{MAJOR}.{MINOR}.{REVISION}'

    return Language

cls = gen_class()
cls.version()
```

Three sets of `MAJOR`/`MINOR`/`REVISION` exist: global, in `gen_class`, and in the class body. The method skipped the class body and found the nearest enclosing *function* scope, `gen_class`. So `version` is not only a method but a **closure**, with free variables captured from `gen_class`:

```python run
import inspect

print(cls.version.__func__.__code__.co_freevars)
print(inspect.getclosurevars(cls.version).nonlocals)
```

## Comprehensions in a class body

One last puzzle. All three expressions below appear in the class body, and they use the name `name`, which is defined both globally and in the class:

```python run
name = 'Guido'

class MyClass:
    name = 'Raymond'
    list_1 = [name] * 3
    list_2 = [name.upper() for i in range(3)]

    @classmethod
    def hello(cls):
        return f'{name} says hello'

print(MyClass.list_1)
print(MyClass.hello())
print(MyClass.list_2)
```

- `list_1` is a plain expression in the class body, so it sees the class's `name`: `'Raymond'`.
- `hello` is a function, so it skips the class scope and finds the global `name`: `'Guido'`.
- `list_2` is the surprising one: `'GUIDO'`, from the global scope. A comprehension has its own scope and behaves like a small nested function, so it skips the class scope too.

There's one exception: the **first** iterable of a comprehension (`range(3)` above) is evaluated in the enclosing scope, so it *can* use class-level names:

```python run
class Grid:
    SIZE = 3
    cells = [(r, c) for r in range(SIZE) for c in range(2)]

print(Grid.cells[:4])

try:
    class Broken:
        SIZE = 3
        cells = [(r, c) for r in range(2) for c in range(SIZE)]
except NameError as ex:
    print('NameError:', ex)
```

<div class="callout modern">
<span class="callout-title">Inlined comprehensions (Python 3.12+)</span>

Since Python 3.12 (PEP 709), list, set and dict comprehensions are compiled inline instead of as hidden nested functions, which makes them faster. The scoping rules were deliberately kept the same, so class bodies behave exactly as described here. Generator expressions are still real nested functions.

</div>

<div class="takeaways">

## Key takeaways

- The class body runs once in its own namespace; statements in it can use names defined earlier in the body.
- Functions defined in the class **skip** the class scope when looking up names: use `self.`, `cls.` or the class name to reach class attributes.
- A bare name in a method may silently pick up a global (or enclosing-function) variable with the same name.
- A method inside a class created in a function can be a closure over that function's variables.
- Comprehensions in a class body skip the class scope too, except for their first iterable.

</div>
