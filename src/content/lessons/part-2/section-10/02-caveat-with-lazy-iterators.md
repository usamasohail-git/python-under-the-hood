---
title: Caveat with Lazy Iterators
summary: Returning a lazy iterator from inside a with block hands the caller an iterator over a resource that is already closed. Here's why, and the two ways to fix it.
minutes: 12
files: ['nyc_parking_tickets_extract.csv']
---

## A function that looks right

Context managers and lazy iterators are both great tools, but they have opposite instincts. A context manager wants to clean up **as soon as the block ends**; a lazy iterator wants to do its work **later**, when someone asks for the next item. Combine them carelessly and the cleanup happens before the work.

We'll use a small extract of a parking-tickets CSV file:

```python run
with open('nyc_parking_tickets_extract.csv') as f:
    for _ in range(3):
        print(next(f), end='')
```

Here's a tempting way to package "give me a CSV reader for this file":

```python run
import csv

def read_data():
    with open('nyc_parking_tickets_extract.csv') as f:
        return csv.reader(f, delimiter=',', quotechar='"')

reader = read_data()
print(type(reader))
```

No error so far: we got a `csv.reader` object back. The problem only shows up when we try to use it:

```python run
try:
    for row in reader:
        print(row)
except ValueError as ex:
    print('ValueError:', ex)
```

## What went wrong

`csv.reader` doesn't read anything when it's created. It's a lazy iterator that pulls one line from the file each time you call `next()` on it. Trace the order of events:

1. `read_data()` opens the file and enters the `with` block.
2. It creates the reader (no data read yet) and executes `return`.
3. Leaving the `with` block, by `return` like any other way, calls the file's `__exit__`, which **closes the file**.
4. The caller finally asks the reader for its first row; the reader asks the closed file for a line, and the file raises `ValueError`.

The `return` didn't escape the context manager, which is exactly the guarantee we wanted in the last lesson. It just fired earlier than we needed it to. The same trap applies to anything lazy built on top of an open resource: `map(...)`, `filter(...)`, a generator expression, `zip(...)`, a database cursor, and so on.

```python run
def upper_lines():
    with open('nyc_parking_tickets_extract.csv') as f:
        return (line.upper() for line in f)    # a lazy generator expression

try:
    next(upper_lines())
except ValueError as ex:
    print('ValueError:', ex)
```

## Fix 1: consume everything before leaving

The bluntest fix is to force the iterator to do all its work while the file is still open, for example by building a list:

```python run
def read_data():
    with open('nyc_parking_tickets_extract.csv') as f:
        return list(csv.reader(f, delimiter=',', quotechar='"'))

rows = read_data()
print(len(rows), 'rows')
for row in rows[:3]:
    print(row)
```

It works, but it reads the **whole file into memory**. For a 20-row extract that's fine; for a multi-gigabyte log it defeats the whole point of iterating lazily.

## Fix 2: make the function itself lazy

The better fix is to turn the function into a **generator** that yields rows from inside the `with` block:

```python run
def read_data():
    with open('nyc_parking_tickets_extract.csv') as f:
        yield from csv.reader(f, delimiter=',', quotechar='"')

for row in read_data():
    print(row[:4])
```

Why does this work? A generator function's body doesn't run when you call it, and it **pauses** at every `yield`. While it's paused at a `yield` inside the `with` block, it hasn't left the block, so the file stays open. Only when the reader is exhausted does the body continue past the `yield from`, leave the `with`, and close the file. The lifetime of the file now matches the lifetime of the iteration.

We can watch it happen with a manager that announces its exit:

```python run
class Noisy:
    def __init__(self, name):
        self.name = name
    def __enter__(self):
        print(f'open {self.name}')
        self.f = open(self.name)
        return self.f
    def __exit__(self, *exc):
        print(f'close {self.name}')
        self.f.close()

def read_data():
    with Noisy('nyc_parking_tickets_extract.csv') as f:
        yield from csv.reader(f)

gen = read_data()
print('generator created')        # nothing opened yet!
header = next(gen)                # the body starts running now
print('got header with', len(header), 'fields')
count = sum(1 for _ in gen)       # exhaust it
print(count, 'data rows')
```

Notice that the file isn't even opened until the first `next()`.

## What if you stop early?

A generator that's abandoned half-way is still paused inside the `with` block, so its file is still open. Python does clean it up eventually: closing a generator, explicitly with `.close()` or implicitly when it's garbage-collected, raises `GeneratorExit` at the paused `yield`, which unwinds the `with` and closes the file.

```python run
gen = read_data()
print(next(gen)[:3])
print('paused, file still open...')
gen.close()                       # unwinds the with block inside the generator
```

In CPython, a generator that loses its last reference is closed immediately, so you rarely notice. If you need cleanup at a precise moment, call `.close()` yourself, or wrap the generator in `contextlib.closing`:

```python run
from contextlib import closing
from itertools import islice

with closing(read_data()) as rows:
    for row in islice(rows, 2):
        print(row[:3])
print('after the with: generator closed, file closed')
```

`closing(obj)` is a tiny context manager whose `__exit__` simply calls `obj.close()`.

<div class="callout note">
<span class="callout-title">The general rule</span>

A context manager protects a resource for the duration of a **block**. A lazy iterator does its work **after** you return it. If a lazy object depends on a resource, either finish using it inside the block, or make the block itself live inside a generator so the two lifetimes line up.

</div>

<div class="takeaways">

## Key takeaways

- Returning a lazy iterator (`csv.reader`, `map`, a generator expression, ...) from inside `with` closes the resource **before** the iterator is used, leading to `ValueError: I/O operation on closed file.`
- Converting to a `list` inside the block works but loads everything into memory.
- Writing the function as a generator (`yield` / `yield from` inside the `with`) keeps the resource open exactly as long as iteration continues.
- An abandoned generator keeps its resource open until it's closed; `gen.close()` or `contextlib.closing` makes that cleanup explicit.

</div>
