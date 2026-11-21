---
title: Pipelines - Pulling Data
summary: Chaining generators builds a lazy pull pipeline, where the consumer at the end requests one item at a time and each stage pulls from the one before it.
minutes: 12
files: ['cars.csv']
---

## A pipeline of generators

A **pipeline** is a chain of stages where each stage takes data from the previous one, does one small job, and passes the result on. Generators are a natural fit: each stage is a generator that iterates over the previous stage.

In a **pull** pipeline, the consumer at the end drives everything. When it asks for the next item, the last stage asks the stage before it, and so on back to the source. Nothing happens until somebody asks, and only one item at a time is in flight.

## The source: parsing a CSV file

The data is `cars.csv`, a semicolon-separated file with a header row. The source stage opens the file, detects the dialect, skips the header, and delegates to `csv.reader`:

```python run
import csv
import itertools

def parse_data(f_name):
    f = open(f_name)
    try:
        dialect = csv.Sniffer().sniff(f.read(2000))
        f.seek(0)
        next(f)                                   # skip the header row
        yield from csv.reader(f, dialect=dialect)
    finally:
        f.close()

for row in itertools.islice(parse_data('cars.csv'), 3):
    print(row)
```

`yield from csv.reader(...)` is already a tiny pipeline: our generator pulls rows from the reader, which pulls lines from the file. The `try/finally` guarantees the file is closed whether the generator is exhausted or closed early.

## A filter stage

A filter keeps only the rows whose car name contains some text:

```python run
def filter_data(rows, contains):
    for row in rows:
        if contains in row[0]:
            yield row

data = parse_data('cars.csv')
chevys = filter_data(data, 'Chevrolet')
for row in itertools.islice(chevys, 3):
    print(row)
```

The filter doesn't know or care where its rows come from: a file, a list, another filter. That's what makes stages composable. Stack a second filter on top of the first:

```python run
data = parse_data('cars.csv')
filter_1 = filter_data(data, 'Chevrolet')
filter_2 = filter_data(filter_1, 'Carlo')

for row in filter_2:
    print(row)
```

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-label="Pull pipeline: the caller requests items from filter_2, which requests from filter_1, which requests from parse_data, which reads cars.csv; rows flow back from the file to the caller">
<defs>
<marker id="pl1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
<marker id="pl2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="50" width="90" height="50" rx="8" class="d-name"/><text x="55" y="80" text-anchor="middle" class="d-text">cars.csv</text>
<rect x="140" y="50" width="110" height="50" rx="8" class="d-obj"/><text x="195" y="80" text-anchor="middle" class="d-text">parse_data</text>
<rect x="290" y="50" width="100" height="50" rx="8" class="d-obj"/><text x="340" y="72" text-anchor="middle" class="d-text">filter_1</text><text x="340" y="90" text-anchor="middle" class="d-sub">'Chevrolet'</text>
<rect x="430" y="50" width="100" height="50" rx="8" class="d-obj"/><text x="480" y="72" text-anchor="middle" class="d-text">filter_2</text><text x="480" y="90" text-anchor="middle" class="d-sub">'Carlo'</text>
<rect x="570" y="50" width="60" height="50" rx="8" class="d-obj-hl"/><text x="600" y="80" text-anchor="middle" class="d-text">for</text>
<path d="M566 60 L534 60" class="d-arrow" marker-end="url(#pl1)"/>
<path d="M426 60 L394 60" class="d-arrow" marker-end="url(#pl1)"/>
<path d="M286 60 L254 60" class="d-arrow" marker-end="url(#pl1)"/>
<path d="M136 60 L104 60" class="d-arrow" marker-end="url(#pl1)"/>
<path d="M104 90 L136 90" class="d-arrow-hl" marker-end="url(#pl2)"/>
<path d="M254 90 L286 90" class="d-arrow-hl" marker-end="url(#pl2)"/>
<path d="M394 90 L426 90" class="d-arrow-hl" marker-end="url(#pl2)"/>
<path d="M534 90 L566 90" class="d-arrow-hl" marker-end="url(#pl2)"/>
<text x="250" y="32" class="d-sub">← next() requests travel toward the source</text>
<text x="250" y="130" class="d-sub">rows flow toward the consumer →</text>
</svg>
<figcaption>In a pull pipeline the consumer drives: each <code>next()</code> ripples back to the file, and one row at a time flows forward.</figcaption>
</figure>

Each time the `for` loop asks `filter_2` for a row, `filter_2` keeps asking `filter_1` until it gets a row containing `'Carlo'`. `filter_1` in turn keeps asking `parse_data` until it gets a Chevrolet. Only one row is in memory at a time, no matter how large the file is.

## Seeing the laziness

To prove nothing runs ahead of demand, give the source a counter and stop after the first match:

```python run
def parse_data_counting(f_name, counter):
    for row in parse_data(f_name):
        counter[0] += 1
        yield row

counter = [0]
pipeline = filter_data(filter_data(parse_data_counting('cars.csv', counter), 'Chevrolet'), 'Carlo')
print(next(pipeline))
print('rows read from the file so far:', counter[0])
pipeline.close()
```

The first Monte Carlo is the 19th data row of the file, and those 19 rows are all that was read. Closing `pipeline` closes the generators below it as they're garbage-collected, and the source's `finally` closes the file.

## Packaging the pipeline

The caller shouldn't need to know how the stages are wired. A delegator can build the pipeline and simply `yield from` its last stage:

```python run
def output(f_name, *filter_words):
    data = parse_data(f_name)
    for word in filter_words:
        data = filter_data(data, word)    # each filter wraps the previous stage
    yield from data

for row in output('cars.csv', 'Chevrolet', 'Carlo', 'Landau'):
    print(row)
```

The loop wraps one filter around another, so any number of filter words build a pipeline of any length. The result: just the two Chevrolet Monte Carlo Landau rows.

<div class="callout tip">
<span class="callout-title">Try it</span>

Add a stage `select(rows, *indices)` that yields only some columns of each row (say the name and the model year, indices `0` and `7`), and plug it in at the end of `output`. Because every stage takes an iterable and returns one, it slots in anywhere.

</div>

<div class="takeaways">

## Key takeaways

- A pull pipeline is a chain of generators, each iterating over the previous stage. The consumer at the end drives it.
- Stages are lazy: only as much data is read as the consumer asks for, one item at a time.
- Each stage takes any iterable, so stages compose freely. A loop like `data = stage(data, ...)` builds pipelines of any length.
- A source generator with `try/finally` (or `with`) releases its resources when the pipeline is exhausted or closed.
- A delegator with `yield from` can hide the wiring of a pipeline behind a single generator.

</div>
