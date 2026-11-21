---
title: Pipelines - Broadcasting
summary: A broadcasting coroutine sends each item to several targets, so one stream of data can be split into many filtered outputs in a single pass.
minutes: 16
files: ['car_data.csv']
---

## The task

`car_data.csv` holds 1,000 cars: make, model, model year, VIN and color. We want to split it into several output files in **one pass** over the data:

- `pink_cars.csv`: all pink cars;
- `ford_green.csv`: green Fords;
- `older.csv`: cars from model year 2010 or earlier.

A pull pipeline would need one pass per output (or a lot of manual bookkeeping). A push pipeline handles it naturally: read each row once and **broadcast** it to three branches, each with its own filter and its own file.

## Reading and parsing the data

The source is a pull-style generator, as before:

```python run
import csv

def data_reader(f_name):
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(2000))
        f.seek(0)
        yield from csv.reader(f, dialect=dialect)
    finally:
        f.close()

for row in list(data_reader('car_data.csv'))[:3]:
    print(row)
```

A few configuration values describe this file: column positions, the headers for the output files, and a converter for each column (only the year needs to become an `int`):

```python run
input_file = 'car_data.csv'

idx_make, idx_model, idx_year, idx_vin, idx_color = range(5)
headers = ('make', 'model', 'year', 'vin', 'color')
converters = (str, str, int, str, str)

def data_parser():
    data = data_reader(input_file)
    next(data)                     # skip the header row
    for row in data:
        yield [converter(item) for converter, item in zip(converters, row)]

data = data_parser()
for _ in range(3):
    print(next(data))
data.close()
```

## The coroutines

The priming decorator, then a **sink** that writes rows to a CSV file. Opening the file with `with` means the file is flushed and closed when the coroutine is closed:

```python run
from functools import wraps

def coroutine(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        g = fn(*args, **kwargs)
        next(g)
        return g
    return inner

@coroutine
def save_data(f_name, headers):
    with open(f_name, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        while True:
            data_row = yield
            writer.writerow(data_row)
```

A generic **filter** that takes a predicate, a function returning `True` for rows that should pass, and forwards matching rows to its target:

```python run
@coroutine
def filter_data(filter_predicate, target):
    try:
        while True:
            data_row = yield
            if filter_predicate(data_row):
                target.send(data_row)
    finally:
        target.close()
```

And the **broadcaster**, which sends every row it receives to *all* of its targets:

```python run
@coroutine
def broadcast(targets):
    try:
        while True:
            data_row = yield
            for target in targets:
                target.send(data_row)
    finally:
        for target in targets:
            target.close()
```

As in the previous lesson, the non-sink stages close their targets in `finally`, so closing the head of the pipeline shuts the whole tree down.

## Assembling the pipeline

<figure class="diagram">
<svg viewBox="0 0 640 210" role="img" aria-label="Broadcast pipeline: data rows go into broadcast, which sends each row to three filters (pink, Ford and green, year 2010 or earlier); each filter sends matching rows to its own save_data sink">
<defs>
<marker id="bc1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="80" width="100" height="50" rx="8" class="d-name"/><text x="60" y="102" text-anchor="middle" class="d-text">rows</text><text x="60" y="120" text-anchor="middle" class="d-sub">data_parser</text>
<rect x="150" y="80" width="110" height="50" rx="8" class="d-obj-hl"/><text x="205" y="110" text-anchor="middle" class="d-text">broadcast</text>
<rect x="320" y="15" width="140" height="44" rx="8" class="d-obj"/><text x="390" y="34" text-anchor="middle" class="d-text">filter</text><text x="390" y="50" text-anchor="middle" class="d-sub">color is pink</text>
<rect x="320" y="83" width="140" height="44" rx="8" class="d-obj"/><text x="390" y="102" text-anchor="middle" class="d-text">filter</text><text x="390" y="118" text-anchor="middle" class="d-sub">green Ford</text>
<rect x="320" y="151" width="140" height="44" rx="8" class="d-obj"/><text x="390" y="170" text-anchor="middle" class="d-text">filter</text><text x="390" y="186" text-anchor="middle" class="d-sub">year ≤ 2010</text>
<rect x="500" y="15" width="130" height="44" rx="8" class="d-obj"/><text x="565" y="42" text-anchor="middle" class="d-text">pink_cars.csv</text>
<rect x="500" y="83" width="130" height="44" rx="8" class="d-obj"/><text x="565" y="110" text-anchor="middle" class="d-text">ford_green.csv</text>
<rect x="500" y="151" width="130" height="44" rx="8" class="d-obj"/><text x="565" y="178" text-anchor="middle" class="d-text">older.csv</text>
<path d="M110 105 L146 105" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M260 100 L316 40" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M260 105 L316 105" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M260 110 L316 170" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M460 37 L496 37" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M460 105 L496 105" class="d-arrow-hl" marker-end="url(#bc1)"/>
<path d="M460 173 L496 173" class="d-arrow-hl" marker-end="url(#bc1)"/>
</svg>
<figcaption>Each row is read once and pushed to every branch. Each branch decides independently whether to keep it.</figcaption>
</figure>

Build it back to front, sinks first:

```python run
def process_data():
    out_pink_cars = save_data('pink_cars.csv', headers)
    out_ford_green = save_data('ford_green.csv', headers)
    out_older = save_data('older.csv', headers)

    def pred_ford_green(row):
        return row[idx_make].lower() == 'ford' and row[idx_color].lower() == 'green'

    filters = (
        filter_data(lambda row: row[idx_color].lower() == 'pink', out_pink_cars),
        filter_data(pred_ford_green, out_ford_green),
        filter_data(lambda row: row[idx_year] <= 2010, out_older),
    )
    broadcaster = broadcast(filters)

    for row in data_parser():
        broadcaster.send(row)
    broadcaster.close()               # closes the filters, which close the files
    print('Finished processing.')

process_data()
```

Let's check what landed in each file (the row count, and the first few rows):

```python run
def print_file_data(n=3):
    for file_name in ('pink_cars.csv', 'ford_green.csv', 'older.csv'):
        rows = list(data_reader(file_name))
        print(f'***** {file_name}: {len(rows) - 1} data rows *****')
        for row in rows[:n + 1]:
            print(row)

print_file_data()
```

## Making the pipeline a stage

`process_data` both **defines** the pipeline and **feeds** it. It's cleaner to separate the two: let the pipeline be a coroutine like any other stage, and let any producer send data into it.

```python run
@coroutine
def pipeline_coro():
    out_pink_cars = save_data('pink_cars.csv', headers)
    out_ford_green = save_data('ford_green.csv', headers)
    out_older = save_data('older.csv', headers)

    def pred_ford_green(row):
        return row[idx_make].lower() == 'ford' and row[idx_color].lower() == 'green'

    broadcaster = broadcast((
        filter_data(lambda row: row[idx_color].lower() == 'pink', out_pink_cars),
        filter_data(pred_ford_green, out_ford_green),
        filter_data(lambda row: row[idx_year] <= 2010, out_older),
    ))
    try:
        while True:
            data_row = yield
            broadcaster.send(data_row)
    finally:
        broadcaster.close()

pipe = pipeline_coro()
for row in data_parser():
    pipe.send(row)

with open('pink_cars.csv') as f:
    print(repr(f.read()))
```

The file looks **empty** (or at best partly written). We sent every row, but the pipeline is still open: the sinks are suspended inside their `with` blocks, and their buffered output hasn't been flushed to disk. A push pipeline only finishes when you tell it to:

```python run
pipe.close()
print_file_data(n=1)
```

## A context manager for the pipeline

"Create it, use it, and always close it" is the classic job of a context manager. Wrap the pipeline in one so it's impossible to forget the `close()`, even if the producer raises an exception halfway:

```python run
from contextlib import contextmanager

@contextmanager
def pipeline():
    p = pipeline_coro()
    try:
        yield p
    finally:
        p.close()

with pipeline() as pipe:
    for row in data_parser():
        pipe.send(row)

print_file_data(n=1)
```

There are two kinds of generator at work here. `pipeline()` is a generator used as a **context manager** (a single `yield` that hands out the resource), while `pipe` is a generator used as a **coroutine** (a `yield` in a loop that receives data). Same keyword, very different roles.

<div class="callout note">
<span class="callout-title">Why the explicit close chain?</span>

Without the `finally: target.close()` blocks, closing `pipe` would still *usually* close the files in CPython: once `pipeline_coro`'s frame is cleared, nothing references the broadcaster, filters and sinks any more, so reference counting destroys them, and destroying a suspended generator closes it. But that relies on an implementation detail and on there being no other references. Closing each target explicitly makes the shutdown order deterministic on any Python.

</div>

<div class="takeaways">

## Key takeaways

- A **broadcaster** coroutine sends every item it receives to several targets, so one input stream can feed many branches in a single pass.
- Generic stages (a filter taking a predicate, a sink taking a file name) are reused by plugging in different arguments.
- Sinks that hold resources only finish their work when they're closed. A push pipeline must be closed explicitly, and each stage should close its targets.
- Wrapping a pipeline coroutine in a context manager guarantees it's closed, even on errors.

</div>
