---
title: Not Just a Context Manager
summary: The context manager protocol is just two methods, so an object can be a context manager and an iterator (or anything else) at the same time.
minutes: 12
files: ['nyc_parking_tickets_extract.csv']
---

## Files: usable with or without `with`

The file object is the classic example of a class that does more than manage a context. You can use it entirely by hand:

```python run
f = open('test.txt', 'w')
f.writelines(['this is a test\n', 'and so is this\n'])
f.close()
```

Or you can let `with` handle the closing:

```python run
with open('test.txt') as f:
    print(f.readlines())
```

`open()` simply returns a file object. That object *happens* to implement `__enter__`/`__exit__` (and also `__iter__`/`__next__`, `read`, `write`, ...). The `with` statement isn't what creates the file; it just calls two extra methods around your block. In fact a file's `__enter__` returns the file itself, and the file is also its own iterator:

```python run
f = open('test.txt')
print(f.__enter__() is f)    # what `as` would bind
print(iter(f) is f)          # files are iterators
f.close()
```

Nothing stops your own classes from mixing protocols the same way.

## An iterator that is also a context manager

Here's a class that iterates over the rows of a CSV file, and manages the file it reads from. `__enter__` opens the file and returns `self`, so the object bound by `as` is the iterator:

```python run
class DataIterator:
    def __init__(self, fname):
        self._fname = fname
        self._f = None

    # iterator protocol
    def __iter__(self):
        return self

    def __next__(self):
        row = next(self._f)
        return row.strip('\n').split(',')

    # context manager protocol
    def __enter__(self):
        self._f = open(self._fname)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        if not self._f.closed:
            self._f.close()
        return False

with DataIterator('nyc_parking_tickets_extract.csv') as data:
    for row in data:
        print(row[:5])
```

Each protocol does one job: the context manager decides **when the file is open**, the iterator decides **how to turn lines into rows**. (The naive `split(',')` would break on quoted fields that contain commas; the `csv` module handles that, and we'll use it in the project.)

## The two halves depend on each other

Because the file is opened in `__enter__`, this particular iterator is useless outside a `with` block:

```python run
data = DataIterator('nyc_parking_tickets_extract.csv')
try:
    for row in data:
        print(row)
except TypeError as ex:
    print('TypeError:', ex)
```

`self._f` is still `None`, and `next(None)` fails. That's a design choice, not a law: you could open the file in `__init__` instead, and let the context manager only handle closing, which is exactly how `open()` behaves. Opening in `__enter__` has the advantage that creating the object costs nothing and can't leak a file handle if you never use it.

A better error message is cheap to add, and makes the requirement explicit:

```python run
class DataIterator(DataIterator):
    def __next__(self):
        if self._f is None or self._f.closed:
            raise ValueError('use DataIterator inside a with block')
        return super().__next__()

try:
    next(DataIterator('nyc_parking_tickets_extract.csv'))
except ValueError as ex:
    print('ValueError:', ex)
```

## Creating and entering are separate steps

`with` doesn't care how the manager was created. The expression after `with` is evaluated first, then `__enter__` is called on the result. So you can create the object in one place and enter it later:

```python run
data_iter = DataIterator('nyc_parking_tickets_extract.csv')
print('created, file opened yet?', data_iter._f is not None)

with data_iter as data:
    print('entered, file opened?', not data._f.closed)
    print(next(data)[:3])
print('exited, file closed?', data_iter._f.closed)
```

This separation is what makes the later lessons possible: passing managers around as ordinary objects, entering them conditionally, or entering a variable number of them with `ExitStack`.

## More "context manager and something else" in the standard library

| Object | Main job | What `with` adds |
|---|---|---|
| file objects | read/write data | close the file |
| `threading.Lock` | mutual exclusion | acquire on entry, release on exit |
| `decimal.localcontext()` | arithmetic settings | restore the previous settings |
| `tempfile.TemporaryDirectory()` | a scratch directory | delete it on exit |
| `zipfile.ZipFile` | read/write archives | close the archive |
| `sqlite3.Connection` | run SQL | **commit** on success, **roll back** on error |

The last one is a good reminder to check what a manager's `__exit__` actually does: a `sqlite3` connection used in `with` manages a *transaction*, but it does **not** close the connection.

```python
import sqlite3

conn = sqlite3.connect('app.db')
with conn:                      # a transaction, not open/close
    conn.execute('INSERT INTO users VALUES (?)', ('ada',))
# committed here (or rolled back if the block raised)
conn.close()                    # closing is still your job
```

<div class="takeaways">

## Key takeaways

- Implementing `__enter__`/`__exit__` doesn't stop a class from implementing other protocols too; files are context managers, iterators and more.
- `__enter__` can return `self`, so the `as` target is the full-featured object.
- Decide which method acquires the resource: in `__enter__`, the object can only be used inside `with`; in `__init__`, it can be used either way.
- Creating a manager and entering it are separate steps: `with` evaluates its expression, then calls `__enter__` on the result.
- Always check what a particular manager's exit actually does (close? release? commit?).

</div>
