---
title: Pickling
summary: The pickle module turns almost any Python object into bytes and back, preserving shared references, but loading a pickle can run arbitrary code.
minutes: 15
---

## What serialization means

Objects in memory are connected by references: a dictionary refers to its keys and values, a list refers to its elements, and those may refer to more objects. Memory addresses mean nothing outside the running process, so to store or transmit that structure we have to **serialize** it into a flat sequence of bytes (or characters). **Deserializing** reads the sequence and builds a new, equivalent set of objects.

Python's built-in, Python-specific way of doing this is the `pickle` module. "Pickling" an object serializes it to bytes; "unpickling" rebuilds it.

<div class="callout note">
<span class="callout-title">Security first</span>

Unpickling can execute **arbitrary code**. A pickle is not just data: it's a small program for a stack-based virtual machine, and that program can call any importable function. **Never unpickle data you did not create yourself**, or that could have been tampered with on the way. We'll see exactly why at the end of this lesson.

</div>

## dumps and loads

`pickle.dumps` returns a `bytes` object, and `pickle.loads` turns those bytes back into an object. (`pickle.dump` and `pickle.load` do the same with a binary file.)

```python run
import pickle

ser = pickle.dumps('Python Pickled Peppers')
print(ser)
print(pickle.loads(ser))
```

The bytes are a binary format: a protocol marker (`\x80\x04`), some opcodes and the raw UTF-8 text. Numbers work the same way:

```python run
ser = pickle.dumps(3.14)
print(ser)
print(pickle.loads(ser))
```

Containers are picklable as long as everything they contain is picklable:

```python run
data = [10, 20, ('a', 'b', 30), {'x', 'y'}, {'key': None}]
ser = pickle.dumps(data)
deser = pickle.loads(ser)

print(deser)
print(deser == data, deser is data)
```

The unpickled list is **equal** to the original but it is a **new object**. Unlike JSON, pickle keeps the exact types: the tuple comes back as a tuple, the set as a set, and dictionary keys keep their type.

<div class="callout modern">
<span class="callout-title">Pickle protocols</span>

The bytes you see depend on the **protocol** version. Older notebooks show output starting with `\x80\x03` (protocol 3, the default in Python 3.0–3.7). Since Python 3.8 the default is protocol 4 (`\x80\x04`), which adds framing and supports very large objects; protocol 5, also new in 3.8, adds efficient out-of-band buffers and is the highest available (Python 3.14 makes it the default). You can choose with `pickle.dumps(obj, protocol=...)`; `pickle.HIGHEST_PROTOCOL` and `pickle.DEFAULT_PROTOCOL` tell you what your Python supports. A pickle written with a newer protocol can't be read by an older Python that doesn't know it.

</div>

```python run
print(pickle.DEFAULT_PROTOCOL, pickle.HIGHEST_PROTOCOL)
print(pickle.dumps(3.14, protocol=3))
```

## Writing to a file

To pickle into a file, open it in **binary** mode:

```python run
with open('data.pkl', 'wb') as f:
    pickle.dump({'a': 1, 'b': [1, 2, 3]}, f)

with open('data.pkl', 'rb') as f:
    print(pickle.load(f))
```

## Shared references are preserved, within one pickle

Pickle remembers every object it has already written (its *memo*). If the same object appears twice, the second occurrence is written as a back-reference instead of a second copy. So the **relationships** between objects inside one pickled structure survive:

```python run
d1 = {'a': 10, 'b': 20}
d2 = {'x': 100, 'y': d1, 'z': d1}     # y and z share one dict

d3 = pickle.loads(pickle.dumps(d2))
print(d3)
print('original: y is z ->', d2['y'] is d2['z'])
print('copy:     y is z ->', d3['y'] is d3['z'])
print('copy shares with original ->', d3['y'] is d1)
```

Inside `d3`, `'y'` and `'z'` still point to **one** dictionary, just like in `d2`. But that dictionary is a brand-new object, unrelated to `d1`. In this respect unpickling behaves a lot like `copy.deepcopy`.

The same holds for instances of your own classes. Pickle stores an instance as "the class's **module and name**, plus the instance's `__dict__`", and when loading it **imports the class by name** and restores the attributes (without calling `__init__`). So the class has to be importable, under the same module and name, by whoever loads the pickle:

```python run
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __eq__(self, other):
        return (self.name, self.age) == (other.name, other.age)

    def __repr__(self):
        return f'Person(name={self.name!r}, age={self.age})'

print(Person.__module__, Person.__qualname__)
```

Now build a structure where the same objects appear in several places:

```python run
john = Person('John Cleese', 79)
michael = Person('Michael Palin', 75)

parrot = {'title': 'Parrot Sketch', 'actors': [john, michael]}
walks = {'title': 'Ministry of Silly Walks', 'actors': [john, michael]}
fan_favorites = {'user_1': [parrot], 'user_2': [parrot, walks]}

ser = pickle.dumps(fan_favorites)
print(b'__main__' in ser, b'Person' in ser)     # the class is referenced by name

copy = pickle.loads(ser)
print(copy == fan_favorites)
print(copy['user_1'][0] is copy['user_2'][0])        # still one parrot dict
print(copy['user_2'][0]['actors'][0] is copy['user_2'][1]['actors'][0])  # still one john
```

Because only the class's *name* is stored, the program that unpickles must be able to import that class under the same module and name. Rename or move the class and old pickles stop loading.

## ...but not across separate pickles

The memo only lives for one `dumps` call. If you pickle related objects **separately**, the link between them is lost:

```python run
d1 = {'a': 1, 'b': 2}
d2 = {'x': 10, 'y': d1}

d1_ser = pickle.dumps(d1)
d2_ser = pickle.dumps(d2)

# later, maybe in another run of the program
d1 = pickle.loads(d1_ser)
d2 = pickle.loads(d2_ser)

d1['c'] = 3
print(d1)
print(d2)          # d2['y'] did not change
```

Before pickling, adding `'c'` to `d1` would have shown up in `d2` too. After the round trip, `d2['y']` is an independent copy. If the relationship matters, pickle the objects **together**, for example as a tuple `pickle.dumps((d1, d2))`.

## Why unpickling is dangerous

A class can control how it is pickled by defining `__reduce__`. It returns a callable and the arguments to call it with; when the pickle is loaded, pickle **calls** that callable. Nothing stops the callable from being `os.system`, `subprocess.run` or `eval`. Here is a harmless version that calls `print`, but imagine it deleting files or sending your SSH keys somewhere:

```python run
class Exploit:
    def __reduce__(self):
        return (print, ('This ran while the data was being loaded!',))

payload = pickle.dumps(Exploit())
print(payload)

result = pickle.loads(payload)     # just *loading* runs the call
print('loads returned:', result)
```

The person loading the data doesn't need the `Exploit` class, or any knowledge of it: the payload only names `builtins.print`. Swap in `os.system` with a shell command and that command runs with the victim's permissions. This is why the Python docs say plainly that pickle is **not secure**.

If you really must load pickles from a less trusted source, you can at least restrict which globals may be loaded by overriding `Unpickler.find_class`:

```python run
import io
import importlib
from datetime import date
from decimal import Decimal

class RestrictedUnpickler(pickle.Unpickler):
    allowed = {('datetime', 'date'), ('decimal', 'Decimal')}

    def find_class(self, module, name):
        if (module, name) in self.allowed:
            return getattr(importlib.import_module(module), name)
        raise pickle.UnpicklingError(f'global {module}.{name} is forbidden')

def restricted_loads(data):
    return RestrictedUnpickler(io.BytesIO(data)).load()

print(restricted_loads(pickle.dumps([1, {2, 3}, date(2024, 1, 31), Decimal('9.99')])))

try:
    restricted_loads(payload)
except pickle.UnpicklingError as ex:
    print('UnpicklingError:', ex)
```

Built-in data such as lists, dicts, sets, strings and numbers have their own opcodes and never go through `find_class`, so they still load. Anything else (a `date`, a `Decimal`, your own classes, and of course `print` or `os.system`) is looked up by `find_class`, and only the allow-listed names get through. This reduces the risk but doesn't make pickle a safe exchange format. For data that crosses a trust boundary, use a format that can only describe data, like JSON, and if you need to detect tampering, sign the bytes with `hmac`.

## When to use pickle

Pickle is great for **Python-to-Python** storage you control: caching expensive results, saving a program's state, or sending objects between processes (`multiprocessing` uses it under the hood). It is a poor choice when other languages must read the data, when people need to read or edit it, or when the data comes from outside. For those cases, the rest of this section is about JSON and friends.

<div class="takeaways">

## Key takeaways

- `pickle.dumps`/`loads` (and `dump`/`load` with binary files) serialize almost any Python object to bytes and back, keeping exact types.
- The result is **equal but not identical** to the original, similar to a deep copy.
- Within one pickle, shared references are preserved; objects pickled in **separate** calls lose their links to each other.
- Custom instances are stored by class name plus `__dict__`; the class must be importable when loading.
- Since Python 3.8 the default protocol is 4 (and 5 is available); the bytes differ from older versions.
- **Never unpickle untrusted data**: `__reduce__` lets a pickle call any function while it loads.

</div>
