---
title: Hashing and Equality
summary: Objects that compare equal must have equal hashes, so defining `__eq__` switches off the inherited `__hash__`, and a custom `__hash__` must be built from the same, unchanging data as `__eq__`.
minutes: 14
---

## Why hashing and equality belong together

Dictionaries and sets are hash tables. To find a key, Python first computes `hash(key)` to jump to the right slot, and only then uses `==` to confirm it found the right object among the (few) candidates stored there. For this to work, one rule must hold:

> If `a == b`, then `hash(a) == hash(b)`.

The reverse isn't required: different objects may share a hash (a *collision*), and the `==` check sorts them out. But if two **equal** objects had different hashes, a lookup with one of them would go to the wrong slot and never find the other.

## The defaults are consistent

A plain class inherits both methods from `object`, and they agree with each other because both are based on identity: each object is equal only to itself, and its hash is derived from its `id()`:

```python run
class Person:
    pass

p1 = Person()
p2 = Person()
print(p1 == p2, p1 == p1)
print(hash(p1) == hash(p2), hash(p1) == hash(p1))
d = {p1: 'first', p2: 'second'}
print(len(d))
```

So instances of your classes can be dictionary keys and set members out of the box. They're just compared by identity.

## Defining `__eq__` turns off hashing

Usually we want equality based on the object's *data*. As soon as a class defines `__eq__`, though, something else changes:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        if isinstance(other, Person):
            return self.name == other.name
        return NotImplemented

p1, p2, p3 = Person('John'), Person('John'), Person('Eric')
print(p1 == p2, p1 == p3)
print(Person.__hash__)
try:
    {p1: 'person 1'}
except TypeError as ex:
    print('TypeError:', ex)
```

Python set `Person.__hash__` to `None`, which makes instances **unhashable**. That's a safety measure, not a nuisance: the inherited identity-based hash would give `p1` and `p2` different hashes even though they're now equal, breaking the rule above. Rather than let you put such objects in a set and get wrong answers later, Python refuses.

(The same applies through inheritance: a subclass that defines `__eq__` without `__hash__` becomes unhashable, even if its parent was hashable. You can also opt out explicitly by writing `__hash__ = None` in a class body.)

## Writing `__hash__`

To get hashing back, implement `__hash__` using **the same data** that `__eq__` compares. The simplest correct recipe is to hash a tuple of those fields, which delegates the hard work to Python's well-tested hashing of built-in types:

```python run
class Person:
    def __init__(self, name, age):
        self._name = name
        self._age = age

    @property
    def name(self):
        return self._name

    @property
    def age(self):
        return self._age

    def __repr__(self):
        return f'Person({self.name!r}, {self.age!r})'

    def __eq__(self, other):
        if isinstance(other, Person):
            return (self.name, self.age) == (other.name, other.age)
        return NotImplemented

    def __hash__(self):
        return hash((self.name, self.age))

p1 = Person('Eric', 30)
p2 = Person('Eric', 30)          # a different object with equal data
print(p1 is p2, p1 == p2, hash(p1) == hash(p2))

ages = {p1: 'thirty'}
print(ages[p2])                  # found via an equal object
print(len({p1, p2, Person('Eric', 31)}))
```

Because equality is now based on the data, a *different* object with the same name and age finds the dictionary entry, and the set keeps only one of the two equal persons.

The properties without setters matter too. Read on to see why.

## A hash must never change

A dictionary stores each key in the slot chosen by its hash **at insertion time**. If the data behind the hash changes later, the object sits in the wrong slot and lookups fail. Here's a class whose hashed field is a plain, writable attribute:

```python run
class Tag:
    def __init__(self, label):
        self.label = label
    def __eq__(self, other):
        return isinstance(other, Tag) and self.label == other.label
    def __hash__(self):
        return hash(self.label)
    def __repr__(self):
        return f'Tag({self.label!r})'

t = Tag('python')
tags = {t}
t.label = 'rust'                 # mutate a member of the set
print(tags)
print(t in tags)                 # same object, but now the hash points elsewhere
print(Tag('python') in tags)     # right slot, but the stored object is no longer equal
```

The set still holds the object, yet neither the object itself nor its old value can be found. This is exactly why built-in mutable types like `list` and `dict` aren't hashable. For your own classes: **only make a class hashable if the data used by `__hash__` and `__eq__` can't change**. Read-only properties (as in `Person` above), tuples for storage, or `@dataclass(frozen=True)` are the usual ways to ensure that.

## Collisions are allowed, just slow

The rule only goes one way. A hash function that returns the same value for everything is *correct*, because `==` still tells objects apart; it just turns every lookup into a linear scan of the candidates:

```python run
class Lazy:
    def __init__(self, n):
        self.n = n
    def __eq__(self, other):
        return isinstance(other, Lazy) and self.n == other.n
    def __hash__(self):
        return 42                # every instance collides

s = {Lazy(i) for i in range(100)}
print(len(s), Lazy(7) in s, Lazy(1000) in s)
```

All 100 objects are stored and found correctly. Tuple hashing gives you a good spread of values, so prefer `hash((field1, field2, ...))` to anything hand-rolled.

<div class="callout note">
<span class="callout-title">Don't rely on specific hash values</span>

Hashes of `str` and `bytes` are randomized per process (see `PYTHONHASHSEED`), as a defence against attacks that deliberately cause collisions. The *rule* holds within one run, but the same string can hash differently tomorrow, so never store hash values or depend on their order.

</div>

<div class="callout modern">
<span class="callout-title">Dataclasses</span>

`@dataclass` generates `__eq__` from the fields and, following the same safety rule, sets `__hash__` to `None`. With `@dataclass(frozen=True)` the instances are immutable, and a matching `__hash__` is generated from the fields as well. That's the quickest way to get a correct, hashable value class.

</div>

<div class="takeaways">

## Key takeaways

- Rule: `a == b` must imply `hash(a) == hash(b)`. Equal hashes for unequal objects are allowed (collisions).
- `object`'s defaults (identity equality, id-based hash) are consistent, so plain instances are hashable.
- Defining `__eq__` without `__hash__` sets `__hash__ = None`: instances become unhashable.
- Implement `__hash__` from the same fields as `__eq__`, typically `hash((self.a, self.b))`.
- Only hash immutable data. A hash that changes while the object is in a set or dict breaks lookups.

</div>
