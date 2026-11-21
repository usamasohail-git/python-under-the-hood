---
title: Custom Classes and Hashing
summary: Make your own objects work as dictionary keys by implementing __eq__ and __hash__ together, and see why collisions are slow and mutable keys get lost.
minutes: 20
---

## The contract

Recall how a dict finds a key: it hashes the key to pick a slot, follows the probe sequence, and at each candidate checks whether the stored key is the same object, or has the same hash and compares `==`. For that to work, every hashable object must keep two promises:

1. **If `a == b`, then `hash(a) == hash(b)`.** Otherwise an equal key would be searched for in the wrong place.
2. **The hash never changes** while the object is in use as a key. Otherwise the object would be filed under its old hash and searched for under its new one.

Note what is *not* required: unequal objects may share a hash. That's a collision. It's legal, just slower.

The second rule is the real reason mutable built-ins aren't hashable. Strictly speaking, a key doesn't have to be immutable; what matters is that its hash and its equality never change. For a list, equality depends on contents that can change, so no stable hash is possible.

Equality, not identity, is what lookups care about. Two distinct but equal tuples find the same entry, because they have the same hash and compare equal:

```python run
t1 = (1, 2, 3)
t2 = tuple([1, 2, 3])
print(t1 is t2, t1 == t2, hash(t1) == hash(t2))

d = {t1: 100}
print(d[t2])
```

Equal values of *different types* are the same key too, since `1 == 1.0 == True` and they all hash to `1`:

```python run
d = {1: 'int'}
d[1.0] = 'float'
d[True] = 'bool'
print(d)
```

The first key object (`1`) is kept; later assignments with equal keys only replace the value.

## Custom objects: hashable by identity

Instances of your own classes are hashable out of the box. By default, `==` compares identity (an object is only equal to itself), and the hash is derived from the object's `id()`. Both rules agree, so the contract holds:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name!r}, age={self.age})'

p1 = Person('John', 78)
p2 = Person('John', 78)
print(p1 == p2, hash(p1) == hash(p2))

persons = {p1: 'John object'}
print(persons[p1])
print(persons.get(p2, 'not found'))
```

That works, but often isn't what you want: the *only* way to find John is with the exact object you inserted. An identical-looking `Person` is a different key.

## Define `__eq__`, and the hash disappears

So we define equality by value:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name!r}, age={self.age})'

    def __eq__(self, other):
        if isinstance(other, Person):
            return (self.name, self.age) == (other.name, other.age)
        return NotImplemented

p1 = Person('John', 78)
p2 = Person('John', 78)
print(p1 == p2)

try:
    persons = {p1: 'John p1'}
except TypeError as ex:
    print('TypeError:', ex)

print(Person.__hash__)
```

Instances are suddenly unhashable. Python is protecting the contract: `p1 == p2` is now `True`, but the inherited identity-based hash would give them different hashes. So when a class defines `__eq__` without defining `__hash__`, Python sets `__hash__` to `None`, and a `__hash__` that **is** `None` (not a method returning `None`) marks the type as unhashable. You can do the same deliberately in any class with `__hash__ = None`.

(Returning `NotImplemented` for unknown types, rather than `False`, lets Python ask the other operand and then fall back to identity. The result for `p1 == 'John'` is still `False`.)

## Implementing `__hash__`

The hash must be built from exactly the data that `__eq__` compares. The simplest correct recipe: put those attributes in a tuple and hash the tuple.

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name!r}, age={self.age})'

    def __eq__(self, other):
        if isinstance(other, Person):
            return (self.name, self.age) == (other.name, other.age)
        return NotImplemented

    def __hash__(self):
        return hash((self.name, self.age))

p1 = Person('John', 78)
p2 = Person('John', 78)
p3 = Person('Eric', 75)
print(p1 == p2, hash(p1) == hash(p2))
print(p1 == p3, hash(p1) == hash(p3))

persons = {p1: 'first John object'}
print(persons[p2])          # found via an equal object

persons[p2] = 'other (equal) John object'
print(persons)              # same key: the value was replaced
```

Since `p1` and `p2` are equal, they are one key: `{p1: 'p1', p2: 'p2'}` would have a single entry.

### What `hash()` does with your result

`__hash__` must return an integer; anything else is a `TypeError`. And `hash()` doesn't return your integer unchanged: it reduces it to a fixed width, by taking it modulo `sys.hash_info.modulus`.

```python run
import sys

class Bad:
    def __hash__(self):
        return 'a string'

try:
    hash(Bad())
except TypeError as ex:
    print('TypeError:', ex)

class Big:
    def __hash__(self):
        return 10_000_000_000_000_000_000

print(sys.hash_info.width, sys.hash_info.modulus)
print(hash(Big()), hash(Big()) == 10_000_000_000_000_000_000 % sys.hash_info.modulus)
```

<div class="callout modern">
<span class="callout-title">Hash width depends on the platform</span>

On a typical 64-bit desktop Python, `sys.hash_info.width` is `64` and the modulus is `2**61 - 1`. This site runs Python in WebAssembly, a 32-bit platform, so you'll see a width of `32` and a modulus of `2**31 - 1`, and every hash value will differ from what you'd get on your computer. Never store hash values or rely on their exact numbers; only on the contract.

</div>

## Collisions are legal but slow

A constant hash satisfies both rules: equal objects certainly get equal hashes. Lookups still work:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        return f'Person(name={self.name!r}, age={self.age})'

    def __eq__(self, other):
        if isinstance(other, Person):
            return (self.name, self.age) == (other.name, other.age)
        return NotImplemented

    def __hash__(self):
        return 100              # every person collides!

persons = {Person('John', 78): 'p1', Person('Eric', 75): 'p2'}
print(persons[Person('John', 78)], persons[Person('Eric', 75)])
```

But every key now starts at the same slot and follows the same probe sequence, so a lookup degenerates into a linear search calling `__eq__` on key after key. Compare a well-spread hash with a constant one:

```python run
from timeit import timeit

class Number:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        return isinstance(other, Number) and self.x == other.x
    def __hash__(self):
        return hash(self.x)

class SameHash:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        return isinstance(other, SameHash) and self.x == other.x
    def __hash__(self):
        return 100

numbers = {Number(i): 'value' for i in range(1_000)}
same_hashes = {SameHash(i): 'value' for i in range(1_000)}

print('good hash: ', timeit(lambda: numbers[Number(500)], number=500))
print('same hash: ', timeit(lambda: same_hashes[SameHash(500)], number=500))
```

The colliding version is dozens of times slower, and it gets worse as the dict grows: lookups go from constant time to time proportional to the number of keys. (Even *building* `same_hashes` was slow, since every insertion had to compare against all previous keys.)

<div class="callout note">
<span class="callout-title">Why string hashes change every run</span>

If an attacker could predict hashes, they could send a web server thousands of keys that all collide (say, as form fields) and make each request crawl: a denial-of-service attack. To prevent that, Python randomizes the hashes of `str` and `bytes` with a secret seed chosen at startup. Run `hash('python')` twice in different sessions and you'll get different numbers. Within one session it's stable, which is all a dict needs. (Setting the `PYTHONHASHSEED` environment variable fixes the seed, for reproducible tests.)

</div>

## Example: points as keys

Suppose we want 2D points as dictionary keys, found by their coordinates. And, for convenience, we'd like a plain `(x, y)` tuple to find the same entry. That needs two things: `Point(x, y) == (x, y)`, and equal hashes, which we get for free by hashing the very same tuple:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

    def __eq__(self, other):
        if isinstance(other, tuple) and len(other) == 2:
            other = Point(*other)
        if isinstance(other, Point):
            return (self.x, self.y) == (other.x, other.y)
        return NotImplemented

    def __hash__(self):
        return hash((self.x, self.y))

pt1 = Point(0, 0)
points = {pt1: 'origin', Point(1, 1): 'pt at (1,1)'}

print(points[pt1], points[Point(0, 0)], points[(0, 0)])
print((0, 0) == Point(0, 0))
```

`(0, 0) == Point(0, 0)` works even though the tuple is on the left: `tuple.__eq__` doesn't know about `Point` and returns `NotImplemented`, so Python tries the reflected `Point.__eq__`.

### What happens if a key is mutated

This `Point` lets anyone change `x`. Watch what that does to the dictionary:

```python run
pt1.x = 5
print(points)

for key in (pt1, Point(5, 0), Point(0, 0), (0, 0)):
    try:
        points[key]
    except KeyError:
        print('KeyError for', key)
```

The entry is still in the dict (you can see it when printing), but it's unreachable:

<figure class="diagram">
<svg viewBox="0 0 600 200" role="img" aria-label="An entry filed under hash of (0, 0) holds a key that now equals (5, 0); lookups for (5, 0) go to a different slot, and lookups for (0, 0) find the slot but the key no longer compares equal">
<defs>
<marker id="mk1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="mk2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<text x="20" y="22" class="d-sub">LOOKUP</text>
<text x="330" y="22" class="d-sub">TABLE</text>
<rect x="20" y="40" width="200" height="50" rx="8" class="d-name"/><text x="32" y="60" class="d-sub">points[(0, 0)]</text><text x="32" y="80" class="d-text">hash((0, 0))</text>
<rect x="20" y="120" width="200" height="50" rx="8" class="d-name"/><text x="32" y="140" class="d-sub">points[Point(5, 0)]</text><text x="32" y="160" class="d-text">hash((5, 0))</text>
<rect x="330" y="35" width="250" height="60" rx="8" class="d-obj-hl"/><text x="342" y="55" class="d-sub">slot for hash((0, 0))</text><text x="342" y="78" class="d-text">key: Point(5, 0) · 'origin'</text>
<rect x="330" y="115" width="250" height="60" rx="8" class="d-obj"/><text x="342" y="135" class="d-sub">slot for hash((5, 0))</text><text x="342" y="158" class="d-text">empty</text>
<path d="M220 65 L326 65" class="d-arrow-hl" marker-end="url(#mk2)"/>
<path d="M220 145 L326 145" class="d-arrow" marker-end="url(#mk1)"/>
</svg>
<figcaption>Looking up <code>(0, 0)</code> reaches the right slot, but the stored key now equals <code>(5, 0)</code>, so <code>==</code> fails. Looking up <code>Point(5, 0)</code> hashes to a different slot, which is empty. Either way: <code>KeyError</code>.</figcaption>
</figure>

Looking up `pt1` itself fails too: its hash has changed, so the search starts from a different slot. The identity check only helps if the probe happens to pass through the entry's old slot, which can occasionally happen by luck (try other values for `pt1.x`), so you can't rely on it either way. **Never mutate an object while it's used as a key**, in a dict or a set.

### Making the point read-only

Python can't enforce true immutability for a normal class, but you can make it hard to break by storing the data in "private" attributes and exposing read-only properties:

```python run
class Point:
    def __init__(self, x, y):
        self._x = x
        self._y = y

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

    def __eq__(self, other):
        if isinstance(other, tuple) and len(other) == 2:
            other = Point(*other)
        if isinstance(other, Point):
            return (self.x, self.y) == (other.x, other.y)
        return NotImplemented

    def __hash__(self):
        return hash((self.x, self.y))

pt = Point(0, 0)
try:
    pt.x = 10
except AttributeError as ex:
    print('AttributeError:', ex)
```

<div class="callout modern">
<span class="callout-title">Let a dataclass write it for you</span>

`@dataclass(frozen=True)` (Python 3.7+) generates `__init__`, `__repr__`, a value-based `__eq__` and a matching `__hash__`, and blocks attribute assignment. It's the quickest way to get a correct hashable value type. `typing.NamedTuple` is another option.

```python run
from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True)
class Pt:
    x: int
    y: int

grid = {Pt(0, 0): 'origin'}
print(grid[Pt(0, 0)])
try:
    Pt(0, 0).x = 1
except FrozenInstanceError as ex:
    print('FrozenInstanceError:', ex)
```

</div>

## A quirk: identity first

Because the dict checks `is` before `==`, an object that isn't even equal to itself can still be found, but only as that exact object. `float('nan')` is the famous example: `nan == nan` is `False`.

```python run
nan = float('nan')
d = {nan: 'found'}
print(nan == nan)
print(d[nan])                      # same object: the identity check matches
print(d.get(float('nan'), 'missing'))   # a different NaN: never equal
```

<div class="takeaways">

## Key takeaways

- The hashing contract: equal objects must have equal hashes, and a key's hash (and equality) must never change. Unequal objects *may* collide.
- By default, instances compare and hash by identity. Defining `__eq__` sets `__hash__` to `None`, making instances unhashable until you define `__hash__` too.
- Build `__hash__` from the same fields `__eq__` compares, typically `hash((self.a, self.b))`.
- Collisions don't break dicts, but many of them turn fast lookups into linear searches. String hashes are randomized per process to stop attackers from forcing collisions.
- Mutating a key after insertion makes its entry unreachable. Make key classes read-only, or use `@dataclass(frozen=True)`.

</div>
