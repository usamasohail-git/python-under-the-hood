---
title: The __prepare__ Method
summary: __prepare__ creates the mapping that the class body runs in. With it you can pre-fill or police the namespace, and it completes the picture of how a class is built.
minutes: 16
---

## Where does the namespace come from?

A metaclass's `__new__` receives the class namespace as `cls_dict`. Let's look at it for an empty class:

```python run
class MyMeta(type):
    def __new__(mcls, name, bases, cls_dict, **kwargs):
        print('cls_dict:', cls_dict)
        print('type:', type(cls_dict).__name__)
        return super().__new__(mcls, name, bases, cls_dict)

class MyClass(metaclass=MyMeta):
    pass
```

It isn't empty: the class statement added a few entries before and after running the (empty) body.

<div class="callout modern">
<span class="callout-title">What's in a fresh class namespace on 3.13</span>

Every version adds `__module__` and `__qualname__` at the start of the body. Python 3.13 also adds `__firstlineno__` (the class's first line number, so it varies) and, at the end, `__static_attributes__`, a tuple of the names assigned through `self.` in the methods. If a method uses `super()` or `__class__`, there's also a `__classcell__` entry, which must reach `type.__new__` for `super()` to work. Older notebooks show only the first two keys.

</div>

Before running the body, Python needs a mapping to run it *in*. It gets one by calling the metaclass's **`__prepare__`** method. `type` provides a default implementation that returns an empty dictionary:

```python run
print(type.__prepare__('Anything', ()))
```

## Overriding `__prepare__`

`__prepare__` is called on the metaclass with the class name, the bases and any class keyword arguments, before the body runs. Define it as a `@classmethod`, so that it receives the metaclass as its first argument:

```python run
class MyMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kwargs):
        print(f'__prepare__ for {name}, kwargs={kwargs}')
        return {'a': 100, 'b': 200}

    def __new__(mcls, name, bases, cls_dict, **kwargs):
        print('__new__ got keys:', [k for k in cls_dict if not k.startswith('__')])
        return super().__new__(mcls, name, bases, cls_dict)

class MyClass(metaclass=MyMeta, kw1=10, kw2=20):
    c = a + b          # the body can already see a and b!
```

`__prepare__` ran first and received the class keywords. The body then ran in the mapping it returned, so the pre-filled `a` and `b` were visible as ordinary names in the body. That's a simpler way to inject class attributes than overriding `__new__`:

```python run
class WithDefaults(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kwargs):
        return dict(kwargs, bonus='Python rocks!')

    def __new__(mcls, name, bases, cls_dict, **kwargs):
        return super().__new__(mcls, name, bases, cls_dict)

class Settings(metaclass=WithDefaults, debug=True, retries=3):
    pass

print(Settings.debug, Settings.retries, Settings.bonus)
```

Notice that `__new__` still has to accept (and drop) the keywords: they're passed to every step.

## The mapping can be your own type

The return value must be a mapping, since the body assigns names with `ns[key] = value` and reads them with `ns[key]`. Returning something else fails as soon as Python tries to store `__module__`:

```python run
class BadMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases):
        return 'some string'

try:
    class Broken(metaclass=BadMeta):
        pass
except TypeError as ex:
    print('TypeError:', ex)
```

Any mapping works for running the body, but `type.__new__` insists on a real `dict`. A `dict` subclass satisfies both. And whatever you return, `type.__new__` **copies** the contents into a fresh dict for the class, so your custom mapping only matters while the body executes.

That's enough for a genuinely useful trick: a namespace that **refuses duplicate definitions**. Accidentally defining two methods with the same name is a silent bug in Python (the second one wins). With `__prepare__` we can catch it:

```python run
class NoDuplicatesDict(dict):
    def __setitem__(self, key, value):
        if key in self and not key.startswith('__'):
            raise TypeError(f'{key!r} is already defined')
        super().__setitem__(key, value)

class NoDuplicates(type):
    @classmethod
    def __prepare__(mcls, name, bases):
        return NoDuplicatesDict()

    def __new__(mcls, name, bases, ns):
        print('namespace type:', type(ns).__name__)
        return super().__new__(mcls, name, bases, dict(ns))

class Fine(metaclass=NoDuplicates):
    def area(self): ...
    def perimeter(self): ...

try:
    class Oops(metaclass=NoDuplicates):
        def area(self): ...
        def area(self): ...      # copy-paste mistake
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">Definition order</span>

The classic use of `__prepare__` used to be returning an `OrderedDict`, so a metaclass could know the order in which attributes were defined. Since Python 3.6 (PEP 520) the class namespace preserves definition order by default, and `cls.__dict__` keeps it, so that use is no longer needed.

</div>

## The complete class creation pipeline

We now have every piece. Here is everything that happens, in order, when Python executes a `class` statement such as `class Child(Base, metaclass=Meta, flag=1): ...` followed by any decorators:

<figure class="diagram">
<svg viewBox="0 0 600 456" role="img" aria-label="The class creation pipeline: pick the metaclass, call __prepare__, run the body in the namespace, call the metaclass which runs __new__ (where type.__new__ calls __set_name__ and __init_subclass__) and then __init__, then apply decorators and bind the name">
<defs><marker id="pp1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker></defs>
<rect x="20" y="10" width="560" height="46" rx="8" class="d-name"/><text x="36" y="30" class="d-text">1 · pick the metaclass</text><text x="36" y="48" class="d-sub">metaclass= keyword, else the most derived metaclass of the bases (type by default)</text>
<path d="M300 56 L300 72" class="d-arrow" marker-end="url(#pp1)"/>
<rect x="20" y="76" width="560" height="46" rx="8" class="d-name"/><text x="36" y="96" class="d-text">2 · ns = Meta.__prepare__(name, bases, **kw)</text><text x="36" y="114" class="d-sub">type's version returns an empty dict</text>
<path d="M300 122 L300 138" class="d-arrow" marker-end="url(#pp1)"/>
<rect x="20" y="142" width="560" height="46" rx="8" class="d-name"/><text x="36" y="162" class="d-text">3 · run the class body with ns as its local namespace</text><text x="36" y="180" class="d-sub">__module__, __qualname__ first; every def and assignment becomes a key</text>
<path d="M300 188 L300 204" class="d-arrow" marker-end="url(#pp1)"/>
<rect x="20" y="208" width="560" height="176" rx="8" class="d-obj-hl"/><text x="36" y="228" class="d-text">4 · cls = Meta(name, bases, ns, **kw)</text><text x="36" y="246" class="d-sub">type.__call__ runs __new__, then __init__</text>
<rect x="44" y="258" width="512" height="74" rx="8" class="d-obj"/><text x="58" y="277" class="d-text">Meta.__new__(mcls, name, bases, ns, **kw) → type.__new__</text><text x="58" y="296" class="d-sub">builds the class object from a copy of ns</text><text x="58" y="312" class="d-sub">calls __set_name__(cls, attr_name) on every attribute that defines it</text><text x="58" y="328" class="d-sub">calls the parent's __init_subclass__(**kw)</text>
<path d="M300 332 L300 342" class="d-arrow" marker-end="url(#pp1)"/>
<rect x="44" y="346" width="512" height="30" rx="8" class="d-obj"/><text x="58" y="366" class="d-text">Meta.__init__(cls, name, bases, ns, **kw)</text>
<path d="M300 384 L300 400" class="d-arrow" marker-end="url(#pp1)"/>
<rect x="20" y="404" width="560" height="46" rx="8" class="d-name"/><text x="36" y="424" class="d-text">5 · apply class decorators (bottom-up), then bind the name</text><text x="36" y="442" class="d-sub">Child = deco(cls)</text>
</svg>
<figcaption>Every hook in this section has a fixed place in the pipeline. Note that <code>__set_name__</code> and <code>__init_subclass__</code> run <em>inside</em> <code>type.__new__</code>, before the metaclass's <code>__init__</code> and before any decorator.</figcaption>
</figure>

Let's prove it by instrumenting every step:

```python run
class Meta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        print(f'2. Meta.__prepare__  {name} {kw}')
        return {}

    def __new__(mcls, name, bases, ns, **kw):
        print(f'4. Meta.__new__ start {name}')
        cls = super().__new__(mcls, name, bases, ns, **kw)   # forward kw to __init_subclass__
        print(f'   Meta.__new__ end   {name}')
        return cls

    def __init__(cls, name, bases, ns, **kw):
        print(f'   Meta.__init__      {name}')
        super().__init__(name, bases, ns)

class Field:
    def __set_name__(self, owner, name):
        print(f'   Field.__set_name__ {owner.__name__}.{name}')

class Base(metaclass=Meta):
    def __init_subclass__(cls, **kw):
        print(f'   Base.__init_subclass__ {cls.__name__} {kw}')
        super().__init_subclass__()

def deco(cls):
    print(f'5. decorator          {cls.__name__}')
    return cls
```

Defining `Base` already went through the pipeline: `__prepare__`, the body, `__new__` and `__init__`. There was no field, no parent `__init_subclass__` to call (`Base` defines one for its *subclasses*) and no decorator. Now the full version:

```python run
@deco
class Child(Base, flag=1):
    print('3. class body runs')
    x = Field()
```

`Child` goes through every stage in exactly the order of the diagram. In particular, the descriptor's `__set_name__` and the parent's `__init_subclass__` both see a finished class object, but they run before `Meta.__init__` and before any decorator gets its turn.

<div class="takeaways">

## Key takeaways

- `__prepare__(name, bases, **kw)` is called on the metaclass **before** the body runs and returns the mapping the body executes in. Define it as a `@classmethod`. `type.__prepare__` returns `{}`.
- Pre-filled entries are visible as names inside the class body; class keywords are passed to `__prepare__` too.
- The mapping can be a custom type (a `dict` subclass, or convert it with `dict(ns)` before `type.__new__`). It's copied into the class, so it only acts while the body runs.
- The full pipeline: metaclass chosen → `__prepare__` → body → `Meta.__new__` (`type.__new__` builds the class, then calls `__set_name__`, then `__init_subclass__`) → `Meta.__init__` → decorators → name bound.

</div>
