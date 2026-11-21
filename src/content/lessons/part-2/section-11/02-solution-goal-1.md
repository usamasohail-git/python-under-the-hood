---
title: Solution - Goal 1
summary: A walkthrough of a FileParser class that is both a context manager and an iterator, sniffing the CSV dialect and producing named tuples lazily.
minutes: 16
files: ['cars.csv', 'personal_info.csv']
---

## The plan

Given just a file name, the context manager has to:

1. open the file,
2. work out its dialect,
3. read the header row and build a named tuple class from it,
4. hand back something that lazily turns each remaining row into a named tuple,
5. close the file when the `with` block ends.

Steps 1–3 are setup, step 5 is cleanup, and step 4 is iteration. A natural design is a single class that implements **both** protocols: `__enter__`/`__exit__` for the file's lifetime, and `__iter__`/`__next__` for the rows. `__enter__` returns `self`, so the object bound by `as` is the iterator. This is exactly the "not just a context manager" pattern from the previous section.

## Step 1: detecting the dialect

We saw that the two files use different delimiters. A small helper samples the beginning of a file and lets `csv.Sniffer` guess:

```python run
import csv

def get_dialect(f_name):
    with open(f_name) as f:
        return csv.Sniffer().sniff(f.read(1000))

print(get_dialect('cars.csv').delimiter, get_dialect('personal_info.csv').delimiter)
```

Returning from inside the `with` is fine here: the dialect is an ordinary object, not a lazy view of the file, so it doesn't care that the file is closed.

## Step 2: the class

```python run
from collections import namedtuple

class FileParser:
    def __init__(self, f_name):
        self.f_name = f_name

    def __enter__(self):
        self._f = open(self.f_name)
        self._reader = csv.reader(self._f, get_dialect(self.f_name))
        headers = map(str.lower, next(self._reader))
        self._nt = namedtuple('Data', headers)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self._f.close()
        return False

    def __iter__(self):
        return self

    def __next__(self):
        if self._f.closed:
            # the with block has ended: stop iterating rather than crash
            raise StopIteration
        return self._nt(*next(self._reader))
```

A few design decisions worth spelling out:

- **`__init__` only stores the name.** Creating a `FileParser` costs nothing and can't leak a file; the file is opened in `__enter__`, when the caller has committed to a `with` block that will close it.
- **The header is consumed in `__enter__`.** `next(self._reader)` reads the first row, so by the time the caller starts iterating, only data rows are left.
- **`__next__` is lazy.** Each call reads exactly one more row from the reader, which reads one more line from the file. When the reader runs out it raises `StopIteration`, which simply propagates out of our `__next__` and ends the caller's loop.
- **Iterating after the block** would normally raise `ValueError: I/O operation on closed file.` Checking `self._f.closed` turns that into a clean `StopIteration`, so the iterator simply looks exhausted. (Raising a clear error would be an equally valid design choice.)

## Step 3: trying it out

```python run
from itertools import islice

with FileParser('cars.csv') as data:
    for row in islice(data, 3):
        print(row)
```

The same class, with no configuration, handles the other file:

```python run
with FileParser('personal_info.csv') as data:
    for row in islice(data, 3):
        print(row)
```

The rows are real named tuples, so fields are available by name and by position:

```python run
with FileParser('cars.csv') as data:
    first = next(data)
    print(type(first).__name__, first._fields[:4])
    print(first.car, '|', first.mpg, '|', first[-1])
    remaining = sum(1 for _ in data)
print(1 + remaining, 'car rows in total')
```

And after the `with` block, the iterator behaves as if exhausted:

```python run
print(data._f.closed)
print(list(data))
```

Because rows are produced on demand, an aggregate over the whole file never holds more than one row in memory. Counting cars per origin, for example:

```python run
from collections import Counter

with FileParser('cars.csv') as data:
    by_origin = Counter(row.origin for row in data)
print(by_origin)
```

## Step 4: opening the file once

`get_dialect` opens the file a second time just to read a sample. With `read()` and `seek()` we can sample and rewind the file we already have open:

```python run
class FileParser(FileParser):
    def __enter__(self):
        self._f = open(self.f_name)
        dialect = csv.Sniffer().sniff(self._f.read(1000))
        self._f.seek(0)                     # rewind before parsing
        self._reader = csv.reader(self._f, dialect)
        headers = map(str.lower, next(self._reader))
        self._nt = namedtuple('Data', headers)
        return self

with FileParser('cars.csv') as data:
    print(next(data))
```

## Step 5: what if setup fails?

Remember that `__exit__` only runs if `__enter__` **completes**. Everything after `open()` in `__enter__` can fail: the sniffer can't make sense of the sample, the file is empty, a header isn't a valid field name. In each case the exception escapes `__enter__`, `__exit__` never runs, and the file we just opened stays open:

```python run
with open('empty.csv', 'w'):
    pass                                   # create an empty file

parser = FileParser('empty.csv')
try:
    with parser as data:
        print('never reached')
except csv.Error as ex:
    print('csv.Error:', ex)
print('file left open?', not parser._f.closed)
```

The fix is to protect the setup that follows `open()`: if anything goes wrong, close the file and re-raise. While we're at it, we also guard the header read: if the reader has no first row, we raise a clear `ValueError` instead of letting a stray `StopIteration` escape from `__enter__` (on a truly empty file the sniffer fails first, as we just saw, but it costs nothing to be safe):

```python run
class FileParser:
    def __init__(self, f_name):
        self.f_name = f_name
        self._f = None

    def __enter__(self):
        self._f = open(self.f_name)
        try:
            dialect = csv.Sniffer().sniff(self._f.read(1000))
            self._f.seek(0)
            self._reader = csv.reader(self._f, dialect)
            try:
                headers = next(self._reader)
            except StopIteration:
                raise ValueError(f'{self.f_name} has no header row') from None
            self._nt = namedtuple('Data', (h.strip().lower() for h in headers))
        except BaseException:
            self._f.close()                # setup failed: don't leak the file
            raise
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self._f.close()
        return False

    def __iter__(self):
        return self

    def __next__(self):
        if self._f is None or self._f.closed:
            raise StopIteration
        return self._nt(*next(self._reader))

parser = FileParser('empty.csv')
try:
    with parser as data:
        pass
except csv.Error as ex:
    print('csv.Error:', ex)
print('file left open?', not parser._f.closed)

for f_name in ('cars.csv', 'personal_info.csv'):
    with FileParser(f_name) as data:
        print(next(data))
```

<div class="callout tip">
<span class="callout-title">Messy headers</span>

`namedtuple` rejects field names that aren't valid identifiers (`'first name'`, `'2nd'`) or that are keywords (`'class'`). Passing `rename=True` replaces each invalid name with a positional one (`_0`, `_1`, ...) instead of raising. For real-world files you might also replace spaces with underscores before building the class.

</div>

<div class="takeaways">

## Key takeaways

- One class can be both the context manager (file lifetime) and the iterator (row parsing); `__enter__` returns `self`.
- Open the resource in `__enter__`, consume the header there too, and produce data rows lazily in `__next__`.
- `csv.Sniffer` makes the parser generic; `read()` + `seek(0)` lets you sniff without reopening the file.
- `__exit__` doesn't run if `__enter__` fails, so close the file yourself when setup raises.

</div>
