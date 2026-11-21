---
title: Description
summary: The project brief - a generic context manager that reads any CSV file with a header row and lazily produces named tuples, built once as a class and once with contextmanager.
minutes: 12
files: ['cars.csv', 'personal_info.csv']
---

## The task

You're given CSV files whose **first row holds the field names**. You want a single, reusable tool that you can point at any such file and get back its data rows as **named tuples**, with fields named after the header:

```python
with <your context manager>('cars.csv') as data:
    for row in data:
        print(row.car, row.mpg)
```

The requirements:

- **Generic**: the only input is the file name. No hard-coded field names, delimiters or per-file configuration.
- **Named tuples**: each data row becomes an instance of a named tuple class created from the header row. Field values can stay strings; no type conversion is needed.
- **Lazy**: rows are read from the file one at a time as you iterate, never all at once.
- **Use the `csv` module**: parse lines with `csv.reader`, so quoting and delimiters are handled properly.
- **A context manager**: the file is opened when the `with` block starts and closed when it ends.

There are two goals:

1. **Goal 1**: implement it as a **class** that implements the context manager protocol (`__enter__` / `__exit__`).
2. **Goal 2**: implement the same thing as a **generator function** decorated with `contextlib.contextmanager`.

## The data

There are two files. A peek at the first few lines of each shows why "generic" takes a little thought:

```python run
for f_name in ('cars.csv', 'personal_info.csv'):
    with open(f_name) as f:
        for _ in range(3):
            print(next(f), end='')
    print('-' * 30)
```

Two differences jump out:

- `cars.csv` separates fields with **semicolons**, `personal_info.csv` with **commas**. A reader that assumes commas would see each car row as one giant field.
- The car headers are **capitalized** (`Car`, `MPG`, ...), the personal-info headers are lowercase. It's nicer if every named tuple ends up with consistent lowercase field names.

Here's how big they are:

```python run
for f_name in ('cars.csv', 'personal_info.csv'):
    with open(f_name) as f:
        print(f'{f_name}: {sum(1 for _ in f) - 1} data rows')
```

## Useful tool 1: reading a sample and rewinding

Besides iterating line by line, a text file object can `read(n)` up to *n* characters, which advances its position, and `seek(0)` moves the position back to the start:

```python run
with open('cars.csv') as f:
    print(repr(f.read(40)))
    print(repr(f.read(40)))     # continues where the last read stopped
    f.seek(0)                   # rewind
    print(repr(f.read(40)))     # the same 40 characters as the first read
```

After a `seek(0)` you can iterate over the file normally again, starting from the first line:

```python run
from itertools import islice

with open('cars.csv') as f:
    f.read(100)
    f.seek(0)
    for line in islice(f, 3):
        print(line, end='')
```

## Useful tool 2: sniffing the dialect

A CSV file's *dialect* is the set of formatting choices it uses: the delimiter, the quote character, whether quotes are doubled, and so on. `csv.Sniffer().sniff(sample)` looks at a chunk of text and makes an educated guess:

```python run
import csv

for f_name in ('cars.csv', 'personal_info.csv'):
    with open(f_name) as f:
        dialect = csv.Sniffer().sniff(f.read(1000))
    print(f'{f_name}: delimiter={dialect.delimiter!r}, quotechar={dialect.quotechar!r}')
```

The result can be passed straight to `csv.reader` as its dialect:

```python run
with open('personal_info.csv') as f:
    dialect = csv.Sniffer().sniff(f.read(1000))
    f.seek(0)
    reader = csv.reader(f, dialect)
    for row in islice(reader, 3):
        print(row)
```

<div class="callout note">
<span class="callout-title">Sniffing is a guess</span>

The sniffer works from a sample, so give it enough text to contain several complete lines (1000 characters is plenty here). On unusual files it can guess wrong or raise `csv.Error`. For this project the two sample files sniff correctly.

</div>

## Useful tool 3: named tuples from a header

`collections.namedtuple` accepts the field names as any iterable of strings, so a header row read at run time is all you need:

```python run
from collections import namedtuple

header = ['Car', 'MPG', 'Origin']
Data = namedtuple('Data', [name.lower() for name in header])
row = Data(*['Ford Pinto', '25.0', 'US'])
print(row)
print(row.mpg)
```

## Try it yourself

Before reading the solutions, have a go at both goals. The **Quiz & exercises** page for this section has an auto-graded exercise for each goal, with `cars.csv` and `personal_info.csv` available, plus a warm-up exercise for the dialect-detection helper. Things to think about as you design:

- Where do you open the file: `__init__` or `__enter__`? What do you return from `__enter__`?
- How do you get the header row out of the reader before handing over the data rows?
- What should happen if someone keeps iterating after the `with` block has closed the file?
- If something fails during setup (say, the file is empty), is the file still closed?

The next two lessons walk through one solution for each goal.

<div class="takeaways">

## Key takeaways

- Goal: given only a file name, lazily produce named tuples whose fields come from the CSV header.
- The two files differ in delimiter (`;` vs `,`) and header capitalization, so the tool must detect the format and normalize the names.
- `f.read(n)` + `f.seek(0)` lets you sample a file and rewind; `csv.Sniffer().sniff(sample)` guesses the dialect.
- `namedtuple('Data', header_names)` builds the row type at run time.

</div>
