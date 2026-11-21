---
title: Property Lookup Resolution
summary: "The exact order Python follows for `obj.attr`: data descriptors beat the instance `__dict__`, which beats non-data descriptors, which beat plain class attributes."
minutes: 18
---

## The puzzle

The last lesson ended with a surprise: a descriptor stored a value in `instance.__dict__` under its **own** name, and reading the attribute still went through the descriptor. Instance attributes normally shadow class attributes, so why not here?

The answer is that `obj.attr` isn't just "check the instance, then the class". Python follows a fixed precedence order, and where a descriptor lands in that order depends on whether it's a **data** or a **non-data** descriptor.

## Data descriptors win over the instance dictionary

Start with a data descriptor that just reports when it's used:

```python run
class IntegerValue:
    def __set__(self, instance, value):
        print('__set__ called...')

    def __get__(self, instance, owner_class):
        print('__get__ called...')

class Point:
    x = IntegerValue()

p = Point()
p.x = 100
p.x
```

Now sneak a value directly into the instance dictionary, bypassing the descriptor:

```python run
p.__dict__['x'] = 'hello'
print(p.__dict__)
p.x
p.x = 200
print(p.__dict__)
```

Both the read and the write still went to the descriptor, and the `'hello'` entry was ignored. A data descriptor **cannot be shadowed** by an instance attribute.

## Non-data descriptors lose to the instance dictionary

Now the same experiment with a non-data descriptor (only `__get__`):

```python run
from datetime import datetime, timezone

class TimeUTC:
    def __get__(self, instance, owner_class):
        print('__get__ called...')
        return datetime.now(timezone.utc).isoformat()

class Logger:
    current_time = TimeUTC()

log = Logger()
log.current_time
```

```python run
log.__dict__['current_time'] = 'this is not a timestamp'
print(log.current_time)
```

This time the instance dictionary won and `__get__` wasn't called. Delete the instance entry and the descriptor is back in charge:

```python run
del log.__dict__['current_time']
log.current_time
```

There's no `__set__`, so a plain assignment like `log.current_time = 'x'` would also just create an instance attribute that shadows the descriptor.

## The full lookup order

Reading `obj.attr` is handled by `object.__getattribute__`. Ignoring the details of the C implementation, it **first looks up `attr` on the class**: it searches `type(obj)` and its bases, in MRO order, for a class `__dict__` that contains `attr`. Call what it finds (if anything) `class_attr`. Then it takes the first rule that applies:

1. If `class_attr` is a **data descriptor**, return `class_attr.__get__(obj, type(obj))`.
2. Otherwise, if `attr` is in **`obj.__dict__`**, return that value.
3. Otherwise, if `class_attr` is a **non-data descriptor**, return `class_attr.__get__(obj, type(obj))`.
4. Otherwise, if `class_attr` was found at all, it's a **plain class attribute**: return it as is.

If none of these applies, Python calls `__getattr__` if the class defines one, or raises `AttributeError`.

<figure class="diagram">
<svg viewBox="0 0 600 470" role="img" aria-label="Flowchart of attribute lookup: class attribute lookup through the MRO, then data descriptor, instance dict, non-data descriptor, plain class attribute, and finally __getattr__ or AttributeError">
<defs>
<marker id="lk1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="lk2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="20" y="10" width="330" height="50" rx="8" class="d-name"/><text x="35" y="31" class="d-text">obj.attr</text><text x="35" y="50" class="d-sub">class_attr = first 'attr' in type(obj).__mro__ dicts</text>
<path d="M185 60 L185 78" class="d-arrow" marker-end="url(#lk1)"/>
<rect x="20" y="82" width="330" height="54" rx="8" class="d-obj-hl"/><text x="35" y="104" class="d-text">1 · class_attr is a data descriptor?</text><text x="35" y="124" class="d-sub">type(class_attr) has __get__ and __set__/__delete__</text>
<path d="M350 109 L396 109" class="d-arrow-hl" marker-end="url(#lk2)"/><text x="358" y="100" class="d-sub">yes</text>
<rect x="400" y="86" width="180" height="46" rx="8" class="d-obj"/><text x="412" y="106" class="d-sub">return</text><text x="412" y="124" class="d-text">class_attr.__get__(…)</text>
<path d="M185 136 L185 160" class="d-arrow" marker-end="url(#lk1)"/><text x="192" y="153" class="d-sub">no</text>
<rect x="20" y="164" width="330" height="54" rx="8" class="d-obj"/><text x="35" y="186" class="d-text">2 · 'attr' in obj.__dict__?</text><text x="35" y="206" class="d-sub">the instance's own attributes</text>
<path d="M350 191 L396 191" class="d-arrow-hl" marker-end="url(#lk2)"/><text x="358" y="182" class="d-sub">yes</text>
<rect x="400" y="168" width="180" height="46" rx="8" class="d-obj"/><text x="412" y="188" class="d-sub">return</text><text x="412" y="206" class="d-text">obj.__dict__['attr']</text>
<path d="M185 218 L185 242" class="d-arrow" marker-end="url(#lk1)"/><text x="192" y="235" class="d-sub">no</text>
<rect x="20" y="246" width="330" height="54" rx="8" class="d-obj"/><text x="35" y="268" class="d-text">3 · class_attr is a non-data descriptor?</text><text x="35" y="288" class="d-sub">type(class_attr) has __get__ only</text>
<path d="M350 273 L396 273" class="d-arrow-hl" marker-end="url(#lk2)"/><text x="358" y="264" class="d-sub">yes</text>
<rect x="400" y="250" width="180" height="46" rx="8" class="d-obj"/><text x="412" y="270" class="d-sub">return</text><text x="412" y="288" class="d-text">class_attr.__get__(…)</text>
<path d="M185 300 L185 324" class="d-arrow" marker-end="url(#lk1)"/><text x="192" y="317" class="d-sub">no</text>
<rect x="20" y="328" width="330" height="54" rx="8" class="d-obj"/><text x="35" y="350" class="d-text">4 · class_attr found at all?</text><text x="35" y="370" class="d-sub">a plain class attribute</text>
<path d="M350 355 L396 355" class="d-arrow-hl" marker-end="url(#lk2)"/><text x="358" y="346" class="d-sub">yes</text>
<rect x="400" y="332" width="180" height="46" rx="8" class="d-obj"/><text x="412" y="352" class="d-sub">return</text><text x="412" y="370" class="d-text">class_attr</text>
<path d="M185 382 L185 406" class="d-arrow" marker-end="url(#lk1)"/><text x="192" y="399" class="d-sub">no</text>
<rect x="20" y="410" width="330" height="50" rx="8" class="d-name"/><text x="35" y="431" class="d-text">__getattr__(obj, 'attr') if defined</text><text x="35" y="450" class="d-sub">otherwise raise AttributeError</text>
</svg>
<figcaption>How <code>obj.attr</code> is resolved. The class is searched <em>first</em>, but whatever it finds is used before the instance dictionary only if it's a data descriptor.</figcaption>
</figure>

Short version: **data descriptor → instance `__dict__` → non-data descriptor → class attribute.**

A few details that this order implies:

- **"Data descriptor" is decided by the descriptor's type**: it has `__get__` plus `__set__` or `__delete__`. A descriptor with `__delete__` but no `__set__` still counts as a data descriptor (and assigning to it raises `AttributeError`).
- **Only class attributes act as descriptors.** A descriptor object stored in the *instance* dictionary is returned as an ordinary value; its `__get__` is never called.
- **The class is searched before the instance**, even though the instance dictionary often wins. That's how Python knows whether a data descriptor must take priority.
- Assignment follows a simpler rule. `obj.attr = value` looks for `attr` on the class; if it's a descriptor with `__set__`, that's called. Otherwise the value goes into `obj.__dict__`. Deletion works the same way with `__delete__`.

Let's confirm the second point:

```python run
class Point:
    pass

p = Point()
p.__dict__['now'] = TimeUTC()   # a descriptor... in the instance
print(p.now)                     # no "__get__ called...": just the object
```

## Writing the lookup in Python

To make the rules concrete, here is a simplified pure-Python version of `object.__getattribute__` (it skips `__getattr__` and some corner cases), tested against the real thing:

```python run
def lookup(obj, name):
    cls = type(obj)
    class_attr, found = None, False
    for klass in cls.__mro__:                       # step 0: search the class first
        if name in klass.__dict__:
            class_attr, found = klass.__dict__[name], True
            break

    attr_type = type(class_attr)
    has_get = hasattr(attr_type, '__get__')
    is_data = has_get and (hasattr(attr_type, '__set__') or hasattr(attr_type, '__delete__'))

    if found and is_data:                            # 1. data descriptor
        return class_attr.__get__(obj, cls)
    if name in getattr(obj, '__dict__', {}):         # 2. instance dictionary
        return obj.__dict__[name]
    if found and has_get:                            # 3. non-data descriptor
        return class_attr.__get__(obj, cls)
    if found:                                        # 4. plain class attribute
        return class_attr
    raise AttributeError(name)

class Demo:
    kind = 'class attribute'

    @property
    def prop(self):
        return 'from the property'

    def method(self):
        return 'from the method'

d = Demo()
d.__dict__.update(prop='shadow?', method='shadow!', extra='instance only')

for name in ('kind', 'prop', 'method', 'extra'):
    print(f'{name:7} {lookup(d, name)!r:22} {getattr(d, name)!r}')
```

The property (a data descriptor) ignores its shadow, the method (a function, so a non-data descriptor) is shadowed, and `kind` and `extra` behave as plain attributes.

## Same-name storage in the instance

This precedence is exactly what a data descriptor needs. It can store each instance's value in `instance.__dict__` **under its own attribute name**:

- there's no clash with other attributes, because the key *is* the descriptor's name
- the stored value never shadows the descriptor, because data descriptors take priority

```python run
class ValidString:
    def __init__(self, min_length):
        self.min_length = min_length

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, str):
            raise ValueError(f'{self.prop_name} must be a string.')
        if len(value) < self.min_length:
            raise ValueError(f'{self.prop_name} must be at least {self.min_length} characters.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

class Person:
    first_name = ValidString(1)
    last_name = ValidString(2)

p = Person()
p.first_name = 'Alex'
p.last_name = 'Martelli'
print(p.__dict__)
print(p.first_name, p.last_name)
try:
    p.last_name = 'M'
except ValueError as ex:
    print('ValueError:', ex)
```

This is the pattern you'll see most often in real code. Its one requirement is that instances have a `__dict__` (no `__slots__`, or `'__dict__'` listed in the slots). If they don't, fall back to the weak-reference storage from the previous lessons.

## The infinite recursion trap

Notice that the descriptor reads and writes `instance.__dict__` **directly**. It's tempting to write `setattr(instance, self.prop_name, value)` instead, but `setattr` on a name that's a data descriptor goes straight back to... the descriptor's `__set__`, which calls `setattr` again, and so on forever.

```python run
import sys

class BadString:
    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        self.calls += 1
        setattr(instance, self.prop_name, value)    # calls __set__ again!

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name)

class Person:
    name = BadString()

Person.name.calls = 0
old_limit = sys.getrecursionlimit()
sys.setrecursionlimit(100)      # keep the runaway recursion short in the browser
try:
    Person().name = 'Alex'
except RecursionError as ex:
    print('RecursionError:', ex)
finally:
    sys.setrecursionlimit(old_limit)
print('__set__ ran', Person.name.calls, 'times')
```

The same goes for `getattr(instance, self.prop_name)` or `instance.<name>` inside `__get__`. When the storage key is the descriptor's own name, always go through `instance.__dict__`.

<div class="takeaways">

## Key takeaways

- `obj.attr` resolves in this order: **data descriptor → instance `__dict__` → non-data descriptor → plain class attribute**, then `__getattr__`/`AttributeError`.
- The class (and its MRO) is searched first; the result is used before the instance dictionary only if it's a data descriptor (`__get__` plus `__set__` or `__delete__`).
- Descriptors work only as **class** attributes. One stored in an instance dictionary is just a value.
- `obj.attr = value` calls the class's descriptor `__set__` if there is one; otherwise it writes to `obj.__dict__`.
- A data descriptor can safely store values in `instance.__dict__` under its own name, as long as it accesses `__dict__` directly. Using `setattr`/`getattr` with that name recurses forever.

</div>
