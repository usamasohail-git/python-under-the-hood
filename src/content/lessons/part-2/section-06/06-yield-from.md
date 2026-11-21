---
title: Yield From
summary: "`yield from iterable` hands every value of another iterator straight through to the caller, replacing an inner for-yield loop and making it easy to chain or flatten lazy data sources."
minutes: 14
files: ['car-brands-1.txt', 'car-brands-2.txt', 'car-brands-3.txt']
---

## Flattening nested iterators

Last lesson we built a lazy "matrix": a generator whose items are themselves generators (one per row). Let's wrap that in a function:

```python run
def matrix(n):
    return ((i * j for j in range(1, n + 1))
            for i in range(1, n + 1))

list(matrix(3))
```

Suppose we want to iterate over the **elements** of the matrix one by one, row after row. A generator with a nested loop does it:

```python run
def matrix_iterator(n):
    for row in matrix(n):
        for item in row:
            yield item

list(matrix_iterator(3))
```

The inner loop does nothing except pass each item along. That pattern is so common that Python has dedicated syntax for it, `yield from`:

```python run
def matrix_iterator(n):
    for row in matrix(n):
        yield from row

list(matrix_iterator(3))
```

Same result. For plain iteration you can read

```python
yield from iterable
```

as shorthand for

```python
for item in iterable:
    yield item
```

`iterable` can be anything iterable: a list, a string, a file, a `range`, or another generator. And it stays lazy: `yield from` pulls one value from the inner iterator each time the outer generator is asked for one.

## Example: reading several files as one stream

We have three small text files of car brands, one brand per line:

```python run
from pathlib import Path

for name in ('car-brands-1.txt', 'car-brands-2.txt', 'car-brands-3.txt'):
    lines = Path(name).read_text(encoding='utf-8').splitlines()
    print(name, len(lines), 'lines, first:', lines[0])
```

We want a single sequence of brands from all three. The eager way reads everything into one list:

```python run
brands = []
for name in ('car-brands-1.txt', 'car-brands-2.txt', 'car-brands-3.txt'):
    with open(name, encoding='utf-8') as f:
        for brand in f:
            brands.append(brand.strip('\n'))

print(len(brands))
print(', '.join(brands[:8]))
```

<div class="callout modern">
<span class="callout-title">Always pass `encoding=`</span>

Brands like *Citroën* and *Škoda* contain non-ASCII characters. Without an explicit `encoding`, `open()` uses the platform's locale encoding: UTF-8 on Linux, macOS and in this browser runtime, but often `cp1252` on Windows, where the same files would decode into garbage or fail. The files used here are UTF-8, so we say so. (Python 3.15 is planned to make UTF-8 the default everywhere, per PEP 686.)

</div>

It works, but the whole data set ends up in memory, and the same three lines of code are repeated for each file if you write them out by hand. A generator streams the brands instead, one line at a time:

```python run
def brands(*files):
    for f_name in files:
        with open(f_name, encoding='utf-8') as f:
            for line in f:
                yield line.strip('\n')

files = 'car-brands-1.txt', 'car-brands-2.txt', 'car-brands-3.txt'
print(', '.join(brands(*files)))
```

A file object is itself a lazy iterator over its lines, so the inner loop looks like a job for `yield from`:

```python run
def brands(*files):
    for f_name in files:
        with open(f_name, encoding='utf-8') as f:
            yield from f

list(brands(*files))[:5]
```

Shorter, but now the line endings come through, because `yield from f` passes on the lines exactly as the file produces them, `'\n'` and all. (Only the last line of each file lacks one, since the files don't end with a newline.) We need a cleaning step in between.

The neat solution is to give the cleaning its own small generator, test it on one file, and then `yield from` it:

```python run
def gen_clean_read(file):
    with open(file, encoding='utf-8') as f:
        for line in f:
            yield line.strip('\n')

print(list(gen_clean_read('car-brands-1.txt'))[:5])
```

```python run
def brands(*files):
    for file in files:
        yield from gen_clean_read(file)

all_brands = list(brands(*files))
print(len(all_brands), all_brands[:3], all_brands[-3:])
```

Each piece now does one job: `gen_clean_read` knows how to read and clean one file, and `brands` knows how to chain several sources together. Because every stage is a generator, only one line is in memory at a time, no matter how big the files are.

<div class="callout note">
<span class="callout-title">Files and generators</span>

Notice that the `with` block lives *inside* the generator. The file is opened when iteration reaches it and closed when that file has been fully read, or when the generator is closed or garbage-collected before finishing. If you stop iterating early, you can call `.close()` on the generator to make sure the file is closed right away.

</div>

## When to use it (and what's still to come)

In the examples above, `yield from` is purely a replacement for a `for` loop, and writing the loop out would be equally correct:

```python run
def brands(*files):
    for file in files:
        for line in gen_clean_read(file):
            yield line

list(brands(*files)) == all_brands
```

So why have special syntax? Because `yield from` does more than loop. It sets up a two-way channel between the caller and the inner generator. Values sent into the outer generator with `.send()`, exceptions thrown in with `.throw()`, and `.close()` are all forwarded to the inner one. And the inner generator's **return value** becomes the value of the `yield from` expression:

```python run
def inner():
    yield 1
    yield 2
    return 'inner finished'

def outer():
    result = yield from inner()
    print('inner returned:', result)
    yield 3

list(outer())
```

A plain `for` loop can't capture that return value (it's hidden inside `StopIteration`). This plumbing is what generator-based coroutines are built on, and you'll explore it in depth later in Part 2.

<div class="callout tip">
<span class="callout-title">Try it: recursive flattening</span>

`yield from` combines nicely with recursion. This generator flattens arbitrarily nested lists and tuples:

```python run
def flatten(items):
    for item in items:
        if isinstance(item, (list, tuple)):
            yield from flatten(item)
        else:
            yield item

list(flatten([1, [2, [3, 4], (5,)], [[[6]]], 7]))
```

Each nested level becomes its own small generator, and `yield from` passes values up the chain.

</div>

<div class="takeaways">

## Key takeaways

- `yield from iterable` yields every value of `iterable` in turn; for simple iteration it replaces `for x in iterable: yield x`.
- It stays lazy: values are pulled from the inner iterator only as the outer generator is consumed.
- Small single-purpose generators (read and clean one file) chained with `yield from` (all files) give clean, memory-efficient pipelines.
- Put the `with` block inside the generator; the file is closed when its lines are exhausted or the generator is closed.
- `yield from` also forwards `send`, `throw` and `close`, and evaluates to the inner generator's return value, which is the basis of generator-based coroutines.

</div>
