---
title: Solution - Goal 2
summary: Rebuilding the CSV parser as a generator function with contextlib.contextmanager, then simplifying it step by step down to a few lines.
minutes: 16
files: ['cars.csv', 'personal_info.csv']
---

## Splitting the two jobs

The Goal 1 class did two jobs at once: it managed the file (context manager protocol) and produced rows (iterator protocol). A `@contextmanager` generator has a fixed shape: setup, a **single** `yield`, cleanup. That one `yield` hands over the `as` object, so it can't *also* be the place that produces each row.

So we separate the jobs:

- the **context manager** generator opens the file, prepares the reader and the named tuple class, yields *an iterator*, and closes the file afterwards;
- the **iterator** it yields is a separate, lazy object that turns rows into named tuples.

## Step 1: the row iterator

A tiny generator function does the conversion, one row at a time:

```python run
import csv
from collections import namedtuple
from contextlib import contextmanager
from itertools import islice

def get_dialect(f_name):
    with open(f_name) as f:
        return csv.Sniffer().sniff(f.read(1000))

def parsed_data_iter(data_iter, nt):
    for row in data_iter:
        yield nt(*row)
```

## Step 2: the context manager

The setup is the same as in `__enter__` before; the cleanup is the same as in `__exit__`. The difference is that they now sit in one function, in the order they happen, with `try`/`finally` guaranteeing the cleanup:

```python run
@contextmanager
def parsed_data(f_name):
    f = open(f_name)
    try:
        reader = csv.reader(f, get_dialect(f_name))
        headers = map(str.lower, next(reader))
        nt = namedtuple('Data', headers)
        yield parsed_data_iter(reader, nt)
    finally:
        f.close()

with parsed_data('personal_info.csv') as data:
    for row in islice(data, 3):
        print(row)
```

Notice where `open()` is: **before** the `try`. If opening fails, there's nothing to close. Once it has succeeded, *everything* else, including the setup lines before the `yield`, is inside the `try`, so the file is closed whether the setup fails, the caller's block fails, or everything succeeds. The class version needed an explicit `try`/`except` in `__enter__` to get the same guarantee; here the structure gives it to us for free.

It works just as well with the other file:

```python run
with parsed_data('cars.csv') as data:
    for row in islice(data, 3):
        print(row)
```

## Step 3: making it self-contained

The two helpers exist only to serve `parsed_data`, so we can move them inside it:

```python run
@contextmanager
def parsed_data(f_name):
    def get_dialect(f_name):
        with open(f_name) as f:
            return csv.Sniffer().sniff(f.read(1000))

    def parsed_data_iter(data_iter, nt):
        for row in data_iter:
            yield nt(*row)

    f = open(f_name)
    try:
        reader = csv.reader(f, get_dialect(f_name))
        headers = map(str.lower, next(reader))
        nt = namedtuple('Data', headers)
        yield parsed_data_iter(reader, nt)
    finally:
        f.close()
```

Now we can simplify, one step at a time.

**A generator expression** replaces `parsed_data_iter` entirely: `(nt(*row) for row in reader)` is just as lazy as the generator function.

**A closure** makes `get_dialect`'s parameter unnecessary: an inner function can read `f_name` from the enclosing scope.

**No helper at all**: the dialect is only needed once, so a local variable is enough:

```python run
@contextmanager
def parsed_data(f_name):
    with open(f_name) as f:
        dialect = csv.Sniffer().sniff(f.read(1000))

    f = open(f_name)
    try:
        reader = csv.reader(f, dialect)
        headers = map(str.lower, next(reader))
        nt = namedtuple('Data', headers)
        yield (nt(*row) for row in reader)
    finally:
        f.close()

with parsed_data('cars.csv') as data:
    print(next(data))
```

## Step 4: one open, sample and rewind

Opening the file twice is still unnecessary. As in Goal 1, we sniff a sample from the file we already have, then `seek(0)`:

```python run
@contextmanager
def parsed_data(f_name):
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(1000))
        f.seek(0)
        reader = csv.reader(f, dialect)
        headers = map(str.lower, next(reader))
        nt = namedtuple('Data', headers)
        yield (nt(*row) for row in reader)
    finally:
        f.close()

for f_name in ('cars.csv', 'personal_info.csv'):
    with parsed_data(f_name) as data:
        for row in islice(data, 2):
            print(row)
    print('-' * 20)
```

And since the managed resource is itself a file, we can let a `with open(...)` statement *inside* the generator do the closing. The `yield` sits inside that `with`, so the file stays open exactly while the caller's block runs:

```python run
@contextmanager
def parsed_data(f_name):
    with open(f_name) as f:
        dialect = csv.Sniffer().sniff(f.read(1000))
        f.seek(0)
        reader = csv.reader(f, dialect)
        nt = namedtuple('Data', map(str.lower, next(reader)))
        yield (nt(*row) for row in reader)

with parsed_data('cars.csv') as data:
    usa = sum(1 for row in data if row.origin == 'US')
print(usa, 'US cars')
```

## Behavior after the block

One difference from the Goal 1 class: the yielded generator expression has no `closed` check, so using it after the block ends raises the usual closed-file error:

```python run
with parsed_data('cars.csv') as data:
    next(data)

try:
    next(data)
except ValueError as ex:
    print('ValueError:', ex)
```

If you prefer the silent "looks exhausted" behavior, check `f.closed` inside a small generator function instead of using a generator expression. Either way the important guarantee holds: the file is never left open.

## Comparing the two designs

| | Goal 1: class | Goal 2: `@contextmanager` |
|---|---|---|
| Setup / cleanup | split across `__enter__` and `__exit__` | one function, top to bottom |
| Cleanup if setup fails | needs an explicit `try`/`except` in `__enter__` | automatic, since setup is inside `try`/`with` |
| `as` object | the parser itself (also the iterator) | a separate lazy generator |
| Reusable | yes, enter the same object again | no, call `parsed_data()` again for a new manager |
| Extra state / methods | easy to add attributes and methods | possible, but less natural |

Both are lazy, both are generic, and both close the file however the block ends. For a small, self-contained tool like this, the generator version is shorter and harder to get wrong; the class version wins when the object needs more behavior than "set up, hand over, tear down".

<div class="takeaways">

## Key takeaways

- A `@contextmanager` generator yields exactly once, so the row iterator must be a separate object: a generator function or a generator expression.
- Put `open()` before `try` (or use `with open(...)` inside the generator) so the file is closed whether setup, the caller's block, or nothing fails.
- Inner functions, closures and generator expressions let the whole tool shrink to a handful of lines.
- `read()` + `seek(0)` lets you sniff the dialect without opening the file twice.

</div>
