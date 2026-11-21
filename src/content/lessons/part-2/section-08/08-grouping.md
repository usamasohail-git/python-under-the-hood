---
title: Grouping
summary: itertools.groupby splits an iterable into runs of consecutive items that share a key; sort first to get one group per key, and consume each group before moving on.
minutes: 15
files: ['cars_2014.csv']
---

## The problem: counting per category

The file `cars_2014.csv` lists vehicle makes and models, already sorted by make:

```python run
import itertools

with open('cars_2014.csv') as f:
    for row in itertools.islice(f, 0, 10):
        print(row, end='')
```

How many models does each make have? This is a "group by" question, the same thing SQL's `GROUP BY make` answers. A dictionary of counters gets there:

```python run
from collections import defaultdict

makes = defaultdict(int)
with open('cars_2014.csv') as f:
    next(f)                      # skip the header row
    for row in f:
        make, _ = row.strip('\n').split(',')
        makes[make] += 1

print(len(makes), 'makes')
print(list(makes.items())[:6])
```

That works, and it doesn't care about order. But it needs a dictionary entry per key in memory. When the data is already grouped, `itertools.groupby` can do the job in a single lazy pass.

## How groupby works

`groupby(iterable, key=None)` walks the iterable and yields one `(key, group)` pair for each **run of consecutive items** with the same key. `group` is itself an iterator over the items in that run. Without a `key` function, the items themselves are compared:

```python run
data = (1, 1, 2, 2, 3)
print(list(itertools.groupby(data)))

for key, group in itertools.groupby(data):
    print(key, list(group))
```

With a `key` function (the same idea as `sorted(key=...)`), the key is computed from each item, and the group contains the original items:

```python run
data = (
    (1, 'abc'),
    (1, 'bcd'),
    (2, 'pyt'),
    (2, 'yth'),
    (2, 'tho'),
    (3, 'hon'),
)

for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(key, list(group))
```

## Consecutive, not global

Here is the crucial difference from SQL: `groupby` only looks at **neighbors**. A key that reappears later starts a new group:

```python run
words = ['apple', 'avocado', 'banana', 'apricot', 'blueberry', 'cherry']
for letter, group in itertools.groupby(words, key=lambda w: w[0]):
    print(letter, list(group))
```

`'a'` appears twice. If you want exactly one group per key, **sort by the same key first**:

```python run
first_letter = lambda w: w[0]
for letter, group in itertools.groupby(sorted(words, key=first_letter), key=first_letter):
    print(letter, list(group))
```

This is a feature, not a bug. It lets `groupby` handle streams that are far too large to hold in memory (sorted log files, database results with `ORDER BY`), and it lets you find runs, like streaks in a sequence:

```python run
flips = 'HHTTTHTTTTH'
print([(k, len(list(g))) for k, g in itertools.groupby(flips)])
print(max(len(list(g)) for k, g in itertools.groupby(flips) if k == 'T'))
```

## Counting models per make

Back to the cars. Each row is a line like `'ACURA,ILX\n'`, so the key is everything before the comma. All the work must happen **inside** the `with` block, because `groupby` is lazy and reads the file only when we iterate:

```python run
with open('cars_2014.csv') as f:
    make_groups = itertools.groupby(f, key=lambda row: row.split(',')[0])

try:
    list(make_groups)
except ValueError as ex:
    print('ValueError:', ex)
```

Next obstacle: a group is an iterator, and iterators generally have no length:

```python run
with open('cars_2014.csv') as f:
    next(f)
    make_groups = itertools.groupby(f, key=lambda row: row.split(',')[0])
    key, models = next(make_groups)
    try:
        len(models)
    except TypeError as ex:
        print('TypeError:', ex)
```

Counting the items of an iterator is a `sum` of ones (or `len(list(...))`, which builds a throwaway list):

```python run
with open('cars_2014.csv') as f:
    next(f)
    make_groups = itertools.groupby(f, key=lambda row: row.split(',')[0])
    make_counts = [(make, sum(1 for _ in models)) for make, models in make_groups]

print(len(make_counts), 'makes')
print(make_counts[:6])
print(max(make_counts, key=lambda pair: pair[1]))
```

The counts match the dictionary approach, because the file is sorted by make.

## The caveat: groups share one iterator

What if we save the groups to look at them later?

```python run
groups = list(itertools.groupby(data, key=lambda x: x[0]))
for key, group in groups:
    print(key, list(group))
```

Every group is **empty**! The docs explain why: every group iterator shares the single underlying iterator with the `groupby` object. To move to the next key, `groupby` has to read past all the items of the current group, and once it has, the previous group can't produce them any more. `list(groups)` advanced through every key and then on to the end of the data, so no group was left with anything to give.

<div class="callout modern">
<span class="callout-title">Even the last group is gone</span>

Older notebooks show the *last* group surviving `list(groupby(...))` with its items intact, while only the earlier ones came back empty. Current CPython (including the 3.13 runtime used here) also invalidates the last group once the `groupby` object has been run to exhaustion. Code that relied on the old behavior was depending on an accident; the rule below works on every version.

</div>

Stepping through by hand shows the same thing:

```python run
groups = itertools.groupby(data, key=lambda x: x[0])
key1, group1 = next(groups)
print(next(group1))            # fine: we're still on group 1

key2, group2 = next(groups)    # move on to group 2
print(list(group1))            # group 1 is now finished
print(next(group2))
```

So the rule is: **consume each group before advancing** to the next one. If you need to keep the items, materialize them inside the loop:

```python run
groups_list = [(key, list(items)) for key, items in itertools.groupby(data, key=lambda x: x[0])]
groups_list
```

<div class="callout note">
<span class="callout-title">When you only need counts</span>

If the data isn't sorted and you just want counts per key, `collections.Counter` is usually simpler than sorting plus `groupby`. Reach for `groupby` when the data is already ordered (or too big for a dictionary), when you want the grouped items themselves, or when you care about consecutive runs.

```python run
from collections import Counter

with open('cars_2014.csv') as f:
    next(f)
    counts = Counter(row.split(',')[0] for row in f)
print(counts.most_common(3))
```

</div>

<div class="takeaways">

## Key takeaways

- `groupby(iterable, key)` yields `(key, group_iterator)` for each run of **consecutive** items with the same key.
- To get one group per key, sort by the same key first.
- Groups have no `len`; count with `sum(1 for _ in group)` or `len(list(group))`.
- All groups share one underlying iterator: consume (or `list()`) each group before moving to the next, and do it before closing any file you're reading from.

</div>
