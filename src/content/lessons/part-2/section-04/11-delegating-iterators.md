---
title: Delegating Iterators
summary: When your class keeps its data in an existing iterable, make it iterable in one line by returning that iterable's iterator from __iter__.
minutes: 7
---

## The situation

Very often a class stores its data in a list, dict or other built-in collection, and adds behavior around it. Such a class isn't iterable by default. You could write a whole iterator class for it, as we did for `Cities`, but there's a shortcut.

Let's build a small class that holds a cleaned-up list of people's names:

```python run
from collections import namedtuple

Person = namedtuple('Person', 'first last')

class PersonNames:
    def __init__(self, persons):
        try:
            self._persons = [person.first.capitalize() + ' ' + person.last.capitalize()
                             for person in persons]
        except (TypeError, AttributeError):
            self._persons = []

persons = [Person('michaeL', 'paLin'), Person('eric', 'idLe'), Person('john', 'cLeese')]
person_names = PersonNames(persons)
print(person_names._persons)
try:
    for name in person_names:
        print(name)
except TypeError as ex:
    print('TypeError:', ex)
```

The data is in there, but users of the class would have to reach into the private `_persons` attribute to get at it.

## Delegation

To be iterable, `PersonNames.__iter__` must return an iterator over the names. The list already knows how to make one, so we simply **delegate** to it:

```python run
class PersonNames:
    def __init__(self, persons):
        try:
            self._persons = [person.first.capitalize() + ' ' + person.last.capitalize()
                             for person in persons]
        except (TypeError, AttributeError):
            self._persons = []

    def __iter__(self):
        return iter(self._persons)

person_names = PersonNames(persons)
for p in person_names:
    print(p)
print(type(iter(person_names)))
```

That one line gives us a complete, correct iterable: every call to `iter(person_names)` returns a brand-new `list_iterator`, so the object can be looped over any number of times, and it works with every tool that accepts an iterable:

```python run
print(list(person_names) == list(person_names))
print([tuple(name.split()) for name in sorted(person_names)])
print(sorted(person_names, key=lambda name: name.split()[1]))   # by last name
print('Eric Idle' in person_names)
```

Notice that `in` works too: without `__contains__`, Python falls back to iterating and comparing each item.

## Delegate to an *iterable*, not an iterator

The delegation is safe because `self._persons` is a list, an iterable, so `iter()` returns a fresh iterator each time. If your class stored an **iterator** (say, a file object or a `map(...)` result) and returned `iter(self._data)`, you'd get the same exhausted object back on the second loop:

```python run
class Broken:
    def __init__(self, items):
        self._data = map(str.upper, items)    # an iterator!

    def __iter__(self):
        return iter(self._data)

b = Broken(['a', 'b'])
print(list(b), list(b))
```

If you need re-iteration, store a list (or other iterable), or rebuild the iterator inside `__iter__`:

```python run
class Fixed:
    def __init__(self, items):
        self._items = list(items)

    def __iter__(self):
        return map(str.upper, self._items)    # a fresh lazy iterator per loop

f = Fixed(['a', 'b'])
print(list(f), list(f))
```

<div class="callout tip">
<span class="callout-title">Delegation in general</span>

Returning another object's iterator is the simplest form of **delegation**: forwarding a request to an object that already knows how to handle it. You can delegate `__len__`, `__contains__` and `__getitem__` the same way. Generators, covered soon, make it just as easy to *transform* the delegated items on the way out.

</div>

<div class="takeaways">

## Key takeaways

- If your data lives in an existing iterable, make your class iterable with `def __iter__(self): return iter(self._data)`.
- Each call returns a new iterator from the underlying collection, so your class is re-iterable for free.
- The underlying object must be a re-iterable **iterable**, not an iterator, or the second loop will be empty.
- Once iterable, your class works with `for`, `sorted`, `in`, comprehensions and every other consumer.

</div>
