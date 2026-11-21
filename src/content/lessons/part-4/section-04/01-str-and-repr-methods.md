---
title: __str__ and __repr__ Methods
summary: "`__repr__` gives developers an unambiguous view of an object, `__str__` gives users a readable one, and Python falls back from `str` to `repr`, never the other way round."
minutes: 12
---

## Two string representations

Every object in Python can be turned into a string in two ways:

| Built-in | Special method | Audience | Goal |
|---|---|---|---|
| `repr(obj)` | `__repr__` | developers | unambiguous; ideally looks like code that would recreate the object |
| `str(obj)` | `__str__` | end users | readable and friendly |

Built-in types already show the difference. A string's `repr` includes the quotes (so you can tell `'42'` from `42`), while its `str` is just the text:

```python run
from datetime import date

d = date(2024, 3, 1)
print(repr('42'), str('42'))
print(repr(d))
print(str(d))
```

`repr(d)` is literally the code you would type to build that date; `str(d)` is what you'd show in a report.

## The default: class name and address

If your class defines neither method, it inherits both from `object`, and you get something correct but not very helpful:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

p = Person('Python', 30)
print(repr(p))
print(str(p))
```

The default shows the module, the class name and the memory address. That tells you *what* it is, but nothing about *which* person.

## Implementing `__repr__`

Let's add a `__repr__` with a `print` inside it, so we can see exactly who calls it:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        print('  (__repr__ called)')
        return f'Person(name={self.name!r}, age={self.age!r})'

p = Person('Python', 30)
print(repr(p))
print(str(p))
print(p)
p
```

Every route ended up in `__repr__`: `repr()`, `str()`, `print()`, and the interactive echo of a bare expression (the last line, which is what a REPL or notebook does). `str()` and `print()` used it because the class has no `__str__`: **`object.__str__` simply calls `repr`**. So if you only implement one of the two, implement `__repr__`.

Notice the `!r` in the f-string. It inserts `repr(self.name)` rather than `str(self.name)`, so strings come out quoted: `Person(name='Python', age=30)` is valid Python, while `Person(name=Python, age=30)` is not, and would be ambiguous if a name contained a comma or a space.

## Adding `__str__`

Now give the class a friendly user-facing form as well:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __repr__(self):
        print('  (__repr__ called)')
        return f'Person(name={self.name!r}, age={self.age!r})'

    def __str__(self):
        print('  (__str__ called)')
        return self.name

p = Person('Python', 30)
print(p)
print(str(p))
print(repr(p))
p
```

Now `print()` and `str()` prefer `__str__`, while `repr()` and the interactive echo still use `__repr__`.

## The fallback only goes one way

What if a class defines `__str__` but **not** `__repr__`?

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return self.name

p = Person('Python')
print(str(p))
print(repr(p))
```

`str()` uses your method, but `repr()` falls back to the default from `object`. It never looks at `__str__`. That's deliberate: a missing `__repr__` should not silently be replaced by a "pretty" string that may hide what the object really is.

## Containers use `repr` for their items

This one surprises people. Printing a **list** of persons calls `str()` on the list, but the list builds its own string from the `repr` of each element:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Person({self.name!r})'

    def __str__(self):
        return self.name

people = [Person('Alice'), Person('Bob')]
print(people)            # list -> repr of each item
print(people[0])         # a single item -> str
print(', '.join(str(p) for p in people))
```

Tuples, dicts and sets behave the same way. It's another reason `__repr__` matters more: it's what you see while debugging, in tracebacks, logs of containers and the REPL.

## Formatting functions prefer `__str__`

f-strings, `str.format()` and `%s` formatting all produce the `str` form by default. You can ask for the `repr` form explicitly with `!r` (or `%r`):

```python run
p = Person('Alice')
print(f'The person is {p}')
print('The person is {}'.format(p))
print('The person is %s' % p)
print(f'Debug view: {p!r}')
print(f'{p = }')         # Python 3.8+: "self-documenting" f-string uses repr
```

The `{p = }` form, added in Python 3.8, prints the expression text followed by the `repr` of its value, which is handy for quick debugging prints. (Strictly speaking, f-strings call `format(p, '')`, which ends up at `__str__` when the class doesn't define `__format__`; you'll see the full story in the `__format__` lesson.)

## Writing a good `__repr__`

A few habits make a `repr` really useful:

- Make it look like a constructor call: `ClassName(arg=value, ...)`. If that's impractical (an open file, a big data structure), use the angle-bracket style `<ClassName ...>` so nobody mistakes it for code.
- Use `!r` for the field values, so strings are quoted and nested objects show their own `repr`.
- Use `type(self).__name__` instead of hard-coding the class name. Then a subclass automatically shows its own name.

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'{type(self).__name__}(x={self.x!r}, y={self.y!r})'

class Point3D(Point):
    pass

print(Point(1, 2), Point3D(1, 2))
print(eval(repr(Point(1.5, -2))))   # the repr really is code that rebuilds the object
```

<div class="callout modern">
<span class="callout-title">Dataclasses write it for you</span>

A class decorated with `@dataclass` (Python 3.7+) gets a generated `__repr__` in exactly this `ClassName(field=value, ...)` style, using `repr` for each field. If you write a plain data-holding class, that's often the easiest way to get a good representation.

</div>

<div class="takeaways">

## Key takeaways

- `__repr__` is for developers (unambiguous, ideally rebuildable code); `__str__` is for users (readable).
- `repr()`, the interactive echo and `!r` use `__repr__`; `str()`, `print()`, f-strings, `format()` and `%s` use `__str__`.
- Without `__str__`, Python falls back to `__repr__`. Without `__repr__`, it uses `object`'s default and never looks at `__str__`.
- Containers display their items with `repr`, even when you `print` the container.
- If you implement only one, implement `__repr__`, and use `!r` and `type(self).__name__` inside it.

</div>
