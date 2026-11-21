---
title: Closing Generators
summary: close() raises GeneratorExit inside a suspended generator so it can clean up, and the generator must then actually stop.
minutes: 15
files: ['cars.csv']
---

## A generator holding a resource

Here's a generator that reads rows from a CSV file. It lets `csv.Sniffer` detect the delimiter (this file uses `;`), and it closes the file in a `finally` block:

```python run
import csv
import itertools
from inspect import getgeneratorstate

def parse_file(f_name):
    print('opening file...')
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(2000))
        f.seek(0)
        reader = csv.reader(f, dialect=dialect)
        for row in reader:
            yield row
    finally:
        print('closing file...')
        f.close()

parser = parse_file('cars.csv')
for row in itertools.islice(parser, 3):
    print(row)
print(getgeneratorstate(parser))
```

We only wanted three rows. The generator is **suspended** in the middle of its loop, and the `finally` hasn't run, so **the file is still open**. It would stay open until the generator is exhausted or garbage-collected. How do we tell it "I'm done, clean up now"?

## close()

Call the generator's `close()` method:

```python run
parser.close()
print(getgeneratorstate(parser))
```

`close()` raises a **`GeneratorExit`** exception *inside* the generator, at the `yield` where it's paused. We don't catch it, so it unwinds the body: the `finally` block runs (closing the file), and the exception propagates out of the generator. Python is expecting exactly that, so `close()` swallows it and simply returns. You never see `GeneratorExit` as the caller, much like a `for` loop never shows you `StopIteration`.

After that the generator is closed, and resuming it raises `StopIteration` straight away. Calling `close()` again is harmless:

```python run
try:
    next(parser)
except StopIteration:
    print('StopIteration')
parser.close()            # no effect, no error
```

`close()` also works on a generator that was never started: it simply moves from created to closed without running any of the body.

## Catching GeneratorExit

You may catch `GeneratorExit` if you want to react specifically to being closed (as opposed to finishing normally or failing):

```python run
def parse_file(f_name):
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(2000))
        f.seek(0)
        next(f)                    # skip the header row
        for row in csv.reader(f, dialect=dialect):
            yield row
    except GeneratorExit:
        print('generator was closed!')
    finally:
        print('cleaning up...')
        f.close()

parser = parse_file('cars.csv')
print(next(parser)[0])
parser.close()
```

Here we caught `GeneratorExit` and then **let the function end**. That's allowed. What Python requires after `close()` is that the generator **stops**. It's satisfied by any of these:

- `GeneratorExit` propagates out (you didn't catch it, or you re-raised it);
- the generator returns (exits cleanly);
- some *other* exception is raised, which `close()` then passes on to the caller.

What it does **not** accept is a generator that catches `GeneratorExit` and then yields again:

```python run
def stubborn(f_name):
    f = open(f_name)
    try:
        next(f)
        for row in f:
            try:
                yield row
            except GeneratorExit:
                print('ignoring call to close...')   # and the loop goes on
    finally:
        print('cleaning up...')
        f.close()

s = stubborn('cars.csv')
next(s)
try:
    s.close()
except RuntimeError as ex:
    print('RuntimeError:', ex)
print(getgeneratorstate(s))
```

The generator swallowed the exception and reached another `yield`, so `close()` raised `RuntimeError`. Worse, the generator is still suspended with the file open. The only way out now is to run it to the end:

```python run
for _ in s:
    pass
print(getgeneratorstate(s))
```

If you catch `GeneratorExit` inside a loop, finish with `raise` or `return`:

```python run
def parse_file(f_name):
    f = open(f_name)
    try:
        next(f)
        for row in f:
            try:
                yield row
            except GeneratorExit:
                print('got a close...')
                raise              # or: return
    finally:
        print('cleaning up...')
        f.close()

parser = parse_file('cars.csv')
next(parser)
parser.close()
```

<div class="callout note">
<span class="callout-title">GeneratorExit is not an Exception</span>

`GeneratorExit` inherits from `BaseException`, not `Exception` (like `KeyboardInterrupt` and `SystemExit`). So a broad `except Exception:` inside a generator will **not** accidentally catch it, and `close()` keeps working even in code that handles errors generously.

</div>

```python run
print(issubclass(GeneratorExit, Exception), issubclass(GeneratorExit, BaseException))
```

## Closing a coroutine: commit on close

`close()` is just as useful for generators used as coroutines. Picture a coroutine that receives records to write in a database transaction: it should **commit** when the caller is finished, and **abort** if writing fails. Here "writing" is simulated by converting the data to a number, so sending text that isn't numeric makes it fail:

```python run
def save_to_db():
    print('starting new transaction')
    is_abort = False
    try:
        while True:
            data = yield
            print('sending data to database:', float(data))
    except Exception:
        is_abort = True
        raise
    finally:
        if is_abort:
            print('aborting transaction')
        else:
            print('committing transaction')

trans = save_to_db()
next(trans)
trans.send('1.5')
trans.send('2')
trans.close()
```

On `close()`, `GeneratorExit` is raised at the `yield`. It's not an `Exception`, so the `except` clause ignores it, the `finally` block commits, and the exception propagates so `close()` is satisfied. We never had to mention `GeneratorExit` at all.

Now a failing write:

```python run
trans = save_to_db()
next(trans)
trans.send('10')
try:
    trans.send('not a number')
except ValueError as ex:
    print('caller sees ValueError:', ex)
print(getgeneratorstate(trans))
```

The error is recorded, the transaction is aborted, the coroutine is closed, and the caller learns about the failure because the exception is re-raised. That's much better than a version that catches the error, prints something and keeps accepting data as if nothing happened.

<div class="callout modern">
<span class="callout-title">close() returns a value (Python 3.13)</span>

Since Python 3.13, if a generator handles `GeneratorExit` by **returning a value**, `close()` returns that value (on older versions it always returned `None`, and the value was lost). That gives a coroutine a clean way to report a final result when you shut it down:

</div>

```python run
def tally():
    count = 0
    try:
        while True:
            yield
            count += 1
    except GeneratorExit:
        return count

t = tally()
next(t)
for _ in range(3):
    next(t)
t.close()
```

<div class="takeaways">

## Key takeaways

- `g.close()` raises `GeneratorExit` at the paused `yield`, so `finally` blocks and context managers inside the generator run. Use it to release resources early.
- After `close()` the generator is closed; `next()` raises `StopIteration` and further `close()` calls do nothing.
- You may catch `GeneratorExit`, but the generator must then stop: re-raise, return, or raise another exception. Yielding again makes `close()` raise `RuntimeError`.
- `GeneratorExit` derives from `BaseException`, so `except Exception` doesn't catch it.
- Coroutines can use `close()` as a "finished" signal, for example to commit a transaction in `finally`. In Python 3.13+ a value returned on `GeneratorExit` becomes the result of `close()`.

</div>
