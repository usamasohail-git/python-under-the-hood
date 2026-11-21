---
title: Project Solution
summary: A step-by-step build of the push pipeline - source generator, CSV sink, generic filter, a pipeline coroutine that chains any number of filters, and a context manager that closes it.
minutes: 16
files: ['cars.csv']
---

## Step 1: the data source

The source doesn't need to change from the pull pipeline: it's a plain generator, and the push pipeline simply consumes it with a `for` loop. It sniffs the dialect (this file uses `;`), skips the header and delegates to `csv.reader`. The `try/finally` closes the file whether the generator is exhausted or closed early:

```python run
import csv
import itertools

def parse_data(f_name):
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(2000))
        f.seek(0)
        next(f)                                    # skip the header row
        yield from csv.reader(f, dialect=dialect)
    finally:
        f.close()

for row in itertools.islice(parse_data('cars.csv'), 2):
    print(row)
```

## Step 2: priming decorator and sink

Every stage after the source is a coroutine, so first the priming decorator:

```python run
from functools import wraps

def coroutine(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        coro = fn(*args, **kwargs)
        next(coro)
        return coro
    return inner
```

The sink opens the output file in a `with` block and then loops, writing each row it receives. Why a coroutine rather than a function that takes a list of rows? Because a coroutine can keep the file open *between* rows: it receives one row at a time, never needs the full result in memory, and closes the file exactly when the coroutine is closed (the `GeneratorExit` raised at the `yield` unwinds the `with` block):

```python run
@coroutine
def save_csv(f_name):
    with open(f_name, 'w', newline='') as f:
        writer = csv.writer(f)
        while True:
            row = yield
            writer.writerow(row)

sink = save_csv('test.csv')
sink.send(['a', 1])
sink.send(['b', 2])
sink.close()
print(open('test.csv').read())
```

`newline=''` is what the `csv` module asks for when writing files, so that it controls line endings itself.

## Step 3: a generic filter

The filter knows nothing about cars. It takes a **predicate** (any function returning true or false for a row) and a target. It also closes its target when it's closed itself, so that a shutdown travels all the way down to the sink:

```python run
@coroutine
def filter_data(filter_pred, target):
    try:
        while True:
            row = yield
            if filter_pred(row):
                target.send(row)
    finally:
        target.close()
```

A quick test with a single filter, sending every car through it:

```python run
chevys = filter_data(lambda row: 'Chevrolet' in row[0], save_csv('chevys.csv'))
for row in parse_data('cars.csv'):
    chevys.send(row)
chevys.close()

with open('chevys.csv') as f:
    lines = f.readlines()
print(len(lines), 'Chevrolets; first one:', lines[0].strip())
```

## Step 4: chaining any number of filters

To support any number of name filters, build the chain in a loop, **back to front**: start with the sink as the current target, and wrap it in one filter per word. The last filter created is the head of the chain.

Here's the obvious version, and it has a bug:

```python run
def build_chain_buggy(out_file, name_filters):
    target = save_csv(out_file)
    for name_filter in name_filters:
        target = filter_data(lambda row: name_filter in row[0], target)
    return target

head = build_chain_buggy('out.csv', ('Chevrolet', 'Carlo', 'Landau'))
for row in parse_data('cars.csv'):
    head.send(row)
head.close()
print(open('out.csv').read())
```

Three rows, and one of them is a **Ford** LTD Landau, which is neither a Chevrolet nor a Carlo. Each `lambda` is a **closure** over the loop variable `name_filter`, and all three share the same variable. By the time any row is tested, the loop has finished and `name_filter` is `'Landau'`, so all three filters test for `'Landau'` and every Landau, of any make, gets through. With this data the bug almost hides: the two correct rows are there, plus one that shouldn't be. We met exactly this trap with closures created in a loop.

The fix is to capture the *current* value when each lambda is created, with a default argument:

```python run
def build_chain(out_file, name_filters):
    target = save_csv(out_file)
    for name_filter in name_filters:
        target = filter_data(lambda row, word=name_filter: word in row[0], target)
    return target

head = build_chain('out.csv', ('Chevrolet', 'Carlo', 'Landau'))
for row in parse_data('cars.csv'):
    head.send(row)
head.close()
print(open('out.csv').read())
```

Now the output is right. A small factory function (`def contains(word): return lambda row: word in row[0]`) would work just as well, since each call gets its own `word`.

## Step 5: the pipeline coroutine

The caller shouldn't have to know how the chain is wired, or which stage is the head. So the pipeline itself becomes a coroutine: it builds the chain when it's primed, forwards every row it receives to the head, and closes the chain when it's closed:

```python run
@coroutine
def pipeline_coro(out_file, name_filters):
    head = build_chain(out_file, name_filters)
    try:
        while True:
            received = yield
            head.send(received)
    finally:
        head.close()
```

From the outside, `pipeline_coro(...)` looks like a single coroutine that accepts rows. The `finally` is what makes `close()` reach the sink: closing the pipeline closes the head filter, which closes the next filter, and so on, until `save_csv` leaves its `with` block and the file is flushed.

## Step 6: a context manager

Create, use, close: a context manager makes the `close()` automatic, and the `finally` in it guarantees the pipeline (and therefore the output file) is closed even if something fails while feeding it:

```python run
from contextlib import contextmanager

@contextmanager
def pipeline(out_file, name_filters):
    p = pipeline_coro(out_file, name_filters)
    try:
        yield p
    finally:
        p.close()
```

## Putting it all together

```python run
with pipeline('out.csv', ('Chevrolet', 'Carlo', 'Landau')) as p:
    for row in parse_data('cars.csv'):
        p.send(row)

with open('out.csv') as f:
    for line in f:
        print(line, end='')
```

Exactly the two expected lines. The order of the filter words doesn't matter (each filter has to pass a row for it to reach the sink), and any number of words works:

```python run
with pipeline('out.csv', ('Ford', 'Torino')) as p:
    for row in parse_data('cars.csv'):
        p.send(row)
print(open('out.csv').read())
```

And because the context manager closes the pipeline in a `finally`, rows sent before an error are still safely written:

```python run
try:
    with pipeline('out.csv', ('Chevrolet',)) as p:
        for i, row in enumerate(parse_data('cars.csv')):
            if i == 50:
                raise RuntimeError('source failed')
            p.send(row)
except RuntimeError as ex:
    print('error:', ex)

with open('out.csv') as f:
    print(len(f.readlines()), 'rows were saved before the failure')
```

<div class="callout note">
<span class="callout-title">Without the close chain</span>

If the filters didn't close their targets, `p.close()` would close only the pipeline coroutine. In CPython the rest of the chain would normally still be cleaned up, because once the pipeline's frame is cleared nothing references the filters and sink, and a suspended generator that is garbage-collected gets closed. That works, but it relies on reference counting. Closing each target explicitly makes the shutdown immediate and predictable.

</div>

<div class="takeaways">

## Key takeaways

- The source stays a pull-style generator; the push part starts where the `for` loop `send()`s each row into the pipeline.
- A sink coroutine with a `with` block keeps its file open across many `send()`s and closes it when the coroutine is closed.
- Build a chain of filters back to front in a loop. Lambdas created in a loop must capture the loop variable with a default argument (or a factory function).
- A pipeline coroutine hides the wiring, and a context manager guarantees it gets closed, flushing the output even on errors.

</div>
