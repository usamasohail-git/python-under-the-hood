---
title: Project Description
summary: "Your task: turn the pull pipeline over cars.csv into a push pipeline of coroutines that filters cars by name and writes the matches to a CSV file."
minutes: 8
files: ['cars.csv']
---

## The goal

In the pipelines lessons we built a **pull** pipeline over `cars.csv`: a generator parsed the file, a chain of filter generators kept only cars whose name contained certain words, and the caller iterated over the result. We also built a **push** pipeline that broadcast car data to several filters, each ending in a coroutine that saved its rows to a file.

Your job is to combine the two: rewrite the car-name pipeline in the **push** style. Rows from `cars.csv` should be pushed through any number of name filters and into a coroutine that saves the surviving rows to a CSV file.

<figure class="diagram">
<svg viewBox="0 0 640 120" role="img" aria-label="Project pipeline: rows from parse_data are sent into the pipeline, through a chain of name filters, into a save_csv sink that writes out.csv">
<defs>
<marker id="pd1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="35" width="105" height="50" rx="8" class="d-name"/><text x="62" y="57" text-anchor="middle" class="d-text">parse_data</text><text x="62" y="75" text-anchor="middle" class="d-sub">cars.csv</text>
<rect x="150" y="35" width="100" height="50" rx="8" class="d-obj"/><text x="200" y="57" text-anchor="middle" class="d-text">filter</text><text x="200" y="75" text-anchor="middle" class="d-sub">'Chevrolet'</text>
<rect x="285" y="35" width="100" height="50" rx="8" class="d-obj"/><text x="335" y="57" text-anchor="middle" class="d-text">filter</text><text x="335" y="75" text-anchor="middle" class="d-sub">'Carlo'</text>
<rect x="420" y="35" width="100" height="50" rx="8" class="d-obj"/><text x="470" y="57" text-anchor="middle" class="d-text">filter</text><text x="470" y="75" text-anchor="middle" class="d-sub">'Landau'</text>
<rect x="555" y="35" width="75" height="50" rx="8" class="d-obj-hl"/><text x="592" y="57" text-anchor="middle" class="d-text">save</text><text x="592" y="75" text-anchor="middle" class="d-sub">out.csv</text>
<path d="M115 60 L146 60" class="d-arrow-hl" marker-end="url(#pd1)"/>
<path d="M250 60 L281 60" class="d-arrow-hl" marker-end="url(#pd1)"/>
<path d="M385 60 L416 60" class="d-arrow-hl" marker-end="url(#pd1)"/>
<path d="M520 60 L551 60" class="d-arrow-hl" marker-end="url(#pd1)"/>
<text x="160" y="110" class="d-sub">every row is send()-ed into the first filter</text>
</svg>
<figcaption>The target design: a source pushes rows through any number of name filters into a CSV-writing sink.</figcaption>
</figure>

## The data

`cars.csv` has a header row and 406 data rows, separated by **semicolons**. The first column is the car's name:

```python run
with open('cars.csv') as f:
    for _ in range(4):
        print(f.readline(), end='')
```

Reading it with `csv` and a sniffed dialect gives lists of strings:

```python run
import csv

with open('cars.csv') as f:
    dialect = csv.Sniffer().sniff(f.read(2000))
    f.seek(0)
    reader = csv.reader(f, dialect=dialect)
    header = next(reader)
    first = next(reader)

print('delimiter:', repr(dialect.delimiter))
print(header)
print(first)
```

## Requirements

1. **A data source.** A generator that opens `cars.csv`, detects the dialect, skips the header row and yields each data row (as a list of strings). It must close the file when it's done or closed.
2. **A sink.** A coroutine that opens an output file and writes every row it receives with `csv.writer`. You don't need a header row in the output (add one if you like). The file must be complete once the coroutine is closed.
3. **A filter.** A generic coroutine that takes a predicate and a target, and forwards only the rows for which the predicate is true.
4. **A pipeline.** A coroutine that, given an output file name and **any number** of name filters, builds the chain of filters ending in the sink, then forwards every row it receives into that chain.
5. **Automatic cleanup.** A context manager that creates the pipeline and guarantees it is closed when the `with` block ends, even on errors.

Make the code as generic as you can: nothing in the filter or sink should know about cars.

## Expected result

With the three filters `'Chevrolet'`, `'Carlo'` and `'Landau'`, the output file must contain exactly two lines:

```text
Chevrolet Monte Carlo Landau,15.5,8,350.0,170.0,4165.,11.4,77,US
Chevrolet Monte Carlo Landau,19.2,8,305.0,145.0,3425.,13.2,78,US
```

Note that `csv.writer` uses commas by default, so the output is comma-separated even though the input wasn't.

## Hints

- Use a priming decorator so every coroutine is ready for `send()` as soon as it's created.
- Build the chain **back to front**: create the sink first, then wrap it in filters one at a time, each new filter targeting the previous one.
- If you create the filter predicates with `lambda` inside a loop, remember how closures capture loop variables (Part 1, closures). All your lambdas could end up testing the *last* filter word.
- A push pipeline only finishes when it's closed. Make sure closing the pipeline coroutine reaches the sink, so its file gets flushed and closed.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution, open the **Practice** page for this section. Each requirement above is an auto-graded exercise with starter code and tests, from the data source all the way to the context-managed pipeline. Then compare your approach with the walkthrough in the next lesson.

</div>

<div class="takeaways">

## Key takeaways

- The project turns a pull pipeline (generators iterating over each other) into a push pipeline (coroutines sending to targets).
- Pieces: a source generator, a CSV sink coroutine, a generic filter coroutine, a pipeline coroutine that chains any number of filters, and a context manager that closes it.
- Success check: filters `'Chevrolet'`, `'Carlo'`, `'Landau'` produce exactly two output lines.

</div>
