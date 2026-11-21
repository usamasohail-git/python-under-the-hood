---
title: Defaultdict
summary: A defaultdict calls a factory function to create a value whenever you look up a missing key, which removes the "is this key here yet?" boilerplate from counting and grouping code.
minutes: 14
---

## The missing-key problem

Looking up a key that isn't in a plain dictionary raises a `KeyError`:

```python run
d = {}
try:
    d['a']
except KeyError as ex:
    print('KeyError:', ex)
```

`dict.get` avoids the exception and lets you choose a fallback value:

```python run
print(d.get('a'))       # None
print(d.get('a', 0))    # the default you asked for
```

That's fine for a one-off lookup. It gets tedious when the *same* default is needed over and over, for example when counting characters:

```python run
sentence = 'able was I ere I saw elba'

counts = {}
for c in sentence:
    if c in counts:
        counts[c] += 1
    else:
        counts[c] = 1
print(counts)

counts = {}
for c in sentence:
    counts[c] = counts.get(c, 0) + 1
print(counts)
```

The second version is shorter, but every place that touches `counts` has to remember that the default is `0`. A `defaultdict` moves that knowledge into the dictionary itself.

## defaultdict: a dict with a default factory

`defaultdict` lives in `collections`. Its first argument is a **default factory**: any callable that takes no arguments and returns the value to use for a missing key.

```python run
from collections import defaultdict

counts = defaultdict(lambda: 0)
for c in sentence:
    counts[c] += 1      # no check needed: a missing key starts at 0

counts['a'], counts['e'], counts[' ']
```

`counts[c] += 1` is really `counts[c] = counts[c] + 1`. The first time a character shows up, reading `counts[c]` finds no key, so the dictionary calls the factory, gets `0`, and then the assignment stores `1`.

A `defaultdict` **is** a `dict` (a subclass), so every dictionary method still works:

```python run
print(isinstance(counts, defaultdict), isinstance(counts, dict))
print(list(counts.items())[:4])
```

## Looking up a missing key inserts it

Here is the behavior that surprises people. When `[]` finds a missing key, the default value isn't just returned, it is **stored**:

```python run
print('python' in counts)
print(counts['python'])     # returns the default...
print('python' in counts)   # ...and the key now exists
```

That's quite different from `.get`, which never changes the dictionary. Only the subscript lookup `d[key]` triggers the factory. `in`, `.get()` and iteration leave a `defaultdict` alone:

```python run
print(counts.get('java'))   # None: .get ignores the factory
print('java' in counts)     # still not there
```

<div class="callout tip">
<span class="callout-title">Read with .get, write with []</span>

If you only want to *read* a value from a `defaultdict` without creating entries as a side effect (for example in a report), use `.get(key, default)` or test with `in` first. Accidental inserts are the most common `defaultdict` bug.

</div>

## Under the hood: `__missing__`

The mechanism is simple. When `dict.__getitem__` can't find a key, it checks whether the class defines a `__missing__` method and calls it instead of raising `KeyError`. `defaultdict.__missing__` calls the factory, stores the result and returns it. You can use the same hook in your own `dict` subclass:

```python run
class ZeroDict(dict):
    def __missing__(self, key):
        return 0            # return a default, but don't store it

z = ZeroDict(a=1)
print(z['a'], z['b'], z)
```

The factory is held in the `default_factory` attribute. Set it to `None` and the dictionary goes back to raising `KeyError`:

```python run
dd = defaultdict(int, a=1)
dd.default_factory = None
try:
    dd['missing']
except KeyError as ex:
    print('KeyError:', ex)
```

## Types as factories

Very often you'll see a **type** passed as the factory: `defaultdict(int)`, `defaultdict(list)`. That works because calling a type with no arguments returns its "empty" value:

```python run
int(), bool(), str(), list(), set(), dict()
```

So `defaultdict(int)` gives `0` for missing keys, `defaultdict(list)` a fresh empty list, and so on. Note that you pass the type itself, not an instance: `defaultdict(list)`, never `defaultdict([])`. `defaultdict(list)` is exactly the same as `defaultdict(lambda: list())`, just shorter.

Each missing key gets a **new** object from the factory, so lists are never shared between keys:

```python run
groups = defaultdict(list)
groups['x'].append(1)
groups['y'].append(2)
print(dict(groups))
print(groups['x'] is groups['y'])
```

## Grouping with defaultdict(list)

A classic use is grouping records. Say we want the names of people by eye color, with `'unknown'` for anyone who has no eye color on file:

```python run
persons = {
    'john': {'age': 20, 'eye_color': 'blue'},
    'jack': {'age': 25, 'eye_color': 'brown'},
    'jill': {'age': 22, 'eye_color': 'blue'},
    'eric': {'age': 35},
    'michael': {'age': 27},
}

eye_colors = {}
for person, details in persons.items():
    color = details.get('eye_color', 'unknown')
    if color not in eye_colors:
        eye_colors[color] = []
    eye_colors[color].append(person)
eye_colors
```

With a `defaultdict(list)` the bookkeeping disappears:

```python run
eye_colors = defaultdict(list)
for person, details in persons.items():
    eye_colors[details.get('eye_color', 'unknown')].append(person)
dict(eye_colors)
```

<div class="callout note">
<span class="callout-title">What about setdefault?</span>

Plain dicts have `d.setdefault(key, default)`, which inserts `default` if the key is missing and returns the stored value: `eye_colors.setdefault(color, []).append(person)`. It works, but the default object (`[]`) is built on every call, even when the key exists, and you still repeat the default at each call site. A `defaultdict` builds the value only when it's actually needed.

</div>

## Constructor arguments

After the factory, `defaultdict` accepts anything the `dict` constructor does: a mapping, an iterable of pairs, keyword arguments.

```python run
d = defaultdict(bool, k1=True, k2=False, k3='python')
print(d)
print(d['k4'])
```

That means the *records themselves* could be default dictionaries, so the grouping code doesn't need `.get` at all. Writing `defaultdict(lambda: 'unknown', ...)` for every person is repetitive, so pre-fill the factory argument with `functools.partial`:

```python run
from functools import partial

eyedict = partial(defaultdict, lambda: 'unknown')

persons = {
    'john': eyedict(age=20, eye_color='blue'),
    'jack': eyedict(age=25, eye_color='brown'),
    'jill': eyedict(age=22, eye_color='blue'),
    'eric': eyedict(age=35),
    'michael': eyedict(age=27),
}

eye_colors = defaultdict(list)
for person, details in persons.items():
    eye_colors[details['eye_color']].append(person)
dict(eye_colors)
```

Keep the side effect in mind, though: looking up `'eye_color'` for eric and michael just *added* that key to their records.

```python run
dict(persons['eric'])
```

## The factory can do real work

The factory is an ordinary function, so it can compute something each time it's called: read the clock, generate an ID, query a cache. Here's a decorator factory that counts calls per function and records when each function was **first** called. The timestamp is produced by the factory, so it's taken only once per function, at the moment its entry is created:

```python run
from collections import namedtuple
from datetime import datetime, timezone
from functools import wraps

def function_stats():
    d = defaultdict(lambda: {'count': 0, 'first_called': datetime.now(timezone.utc)})
    Stats = namedtuple('Stats', 'decorator data')

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            d[fn.__name__]['count'] += 1
            return fn(*args, **kwargs)
        return wrapper

    return Stats(decorator, d)

stats = function_stats()

@stats.decorator
def func_1():
    pass

@stats.decorator
def func_2(x, y):
    pass

print(dict(stats.data))       # nothing yet: decorating doesn't call anything
func_1(); func_1(); func_2(10, 20)
for name, info in stats.data.items():
    print(name, info['count'], info['first_called'].isoformat(timespec='seconds'))
```

<div class="callout modern">
<span class="callout-title">datetime.utcnow() is deprecated</span>

Older notebooks use `datetime.utcnow()`. Since Python 3.12 it emits a `DeprecationWarning`, because it returns a *naive* datetime that doesn't know it's UTC. Use the timezone-aware `datetime.now(timezone.utc)` instead, as above.

</div>

## Nesting default dictionaries

Factories compose. A `defaultdict` whose factory makes another `defaultdict` gives you two-level grouping with no setup:

```python run
sales = [('north', 'apples', 3), ('south', 'pears', 5),
         ('north', 'pears', 2), ('north', 'apples', 4)]

totals = defaultdict(lambda: defaultdict(int))
for region, product, qty in sales:
    totals[region][product] += qty

{region: dict(products) for region, products in totals.items()}
```

<div class="callout note">
<span class="callout-title">Printing a defaultdict</span>

The repr of a `defaultdict` starts with its factory, for example `defaultdict(<class 'int'>, {...})`. When the factory is a lambda, the repr includes a memory address that changes from run to run. Wrapping it in `dict(...)` before printing gives cleaner output, which is why many cells here do that.

</div>

<div class="takeaways">

## Key takeaways

- `defaultdict(factory)` calls `factory()` to create a value whenever `d[key]` finds a missing key.
- The default is **stored** as well as returned. `.get` and `in` don't trigger the factory, so use them for read-only checks.
- The factory is any zero-argument callable: `int`, `list`, `set`, a lambda, or a function that does real work.
- It's implemented with the `__missing__` hook, which any `dict` subclass can define.
- `defaultdict` is a `dict` subclass; everything after the factory argument goes to the `dict` constructor.

</div>
