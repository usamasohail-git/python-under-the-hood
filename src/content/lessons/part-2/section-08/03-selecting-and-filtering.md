---
title: Selecting and Filtering
summary: filter and filterfalse keep items by a predicate, takewhile and dropwhile cut a stream at the first change, and compress selects items with a parallel mask.
minutes: 13
---

## Predicates

All the tools in this lesson decide, item by item, whether to keep something. Most of them take a **predicate**: a function that receives one value and returns something truthy or falsy. Keep that word in mind, because the `itertools` docs use it everywhere.

We'll use a generator that announces each value it produces, so we can see exactly when the work happens:

```python run
def gen_cubes(n):
    for i in range(n):
        print(f'yielding {i}')
        yield i ** 3

def is_odd(x):
    return x % 2 == 1

print(is_odd(4), is_odd(81))
```

## filter and filterfalse

The built-in `filter(predicate, iterable)` yields the items for which the predicate is truthy. It is lazy: creating the filter object runs nothing.

```python run
filtered = filter(is_odd, gen_cubes(6))
print('filter created, nothing yielded yet')
print(list(filtered))
```

`itertools.filterfalse` is the mirror image: it keeps the items for which the predicate is **falsy**. That saves you from writing a second, negated function (or a `lambda x: not is_odd(x)`):

```python run
from itertools import filterfalse

evens = filterfalse(is_odd, gen_cubes(6))
print(list(evens))
```

Both functions accept `None` as the predicate, which means "use the item's own truth value". That is a quick way to drop (or keep only) the empty and zero values:

```python run
values = [0, 1, '', 'a', None, [], [0], 2]
print(list(filter(None, values)))
print(list(filterfalse(None, values)))
```

A generator expression with an `if` (`(x for x in data if is_odd(x))`) does exactly what `filter` does. Use `filter` when you already have a named predicate, and the generator expression when the condition is an inline expression.

## takewhile: stop at the first failure

A filter looks at **every** element. `takewhile(predicate, iterable)` is different: it yields items as long as the predicate holds, and stops for good at the first item that fails, even if later items would pass.

A sampled sine wave shows the difference nicely, because its values rise, fall, and rise again:

```python run
from math import sin, pi

def sine_wave(n):
    start = 0
    step = 2 * pi / (n - 1)
    for _ in range(n):
        yield round(sin(start), 2)
        start += step

print(list(sine_wave(15)))
```

```python run
from itertools import takewhile

print(list(takewhile(lambda x: 0 <= x <= 0.9, sine_wave(15))))
print(list(filter(lambda x: 0 <= x <= 0.9, sine_wave(15))))
```

`takewhile` stopped at `0.97`; `filter` kept going and also picked up the values on the way down. Because `takewhile` stops, it is safe on infinite iterators, which makes it the natural partner for the infinite iterators in the next lesson:

```python run
from itertools import count

list(takewhile(lambda x: x < 50, (n * n for n in count())))
```

One subtle point: to know it must stop, `takewhile` has to pull the first failing item out of the source, and that item is then gone. If you keep using the underlying iterator afterwards, it resumes *after* the item that ended the run.

```python run
it = iter([1, 2, 30, 4, 5])
print(list(takewhile(lambda x: x < 10, it)))
print(list(it))   # 30 was consumed by takewhile and discarded
```

## dropwhile: start at the first failure

`dropwhile(predicate, iterable)` does the opposite. It discards items while the predicate holds, and as soon as one fails, it yields that item **and everything after it**, without ever calling the predicate again:

```python run
from itertools import dropwhile

l = [1, 3, 5, 2, 1]
list(dropwhile(lambda x: x < 5, l))
```

The `2` and `1` at the end come through even though they are less than 5: once dropping stops, it never resumes. A typical use is skipping a preamble, such as comment lines at the top of a file:

```python run
lines = ['# generated file', '# do not edit', 'name,age', 'Alice,30', '# not a header comment']
list(dropwhile(lambda line: line.startswith('#'), lines))
```

## compress: select with a mask

`compress(data, selectors)` takes **two** iterables and yields each item of `data` whose matching selector is truthy. It stops when either iterable runs out. You can picture it as zipping the two together and keeping the pairs with a truthy second element:

```python run
data = ['a', 'b', 'c', 'd', 'e']
selectors = [True, False, 1, 0]          # shorter than data

print(list(zip(data, selectors)))
print([item for item, keep in zip(data, selectors) if keep])
```

`compress` does that lazily, in C:

```python run
from itertools import compress

list(compress(data, selectors))
```

Masks are handy when the decision about *which positions* to keep is made once and applied to many rows, for example picking columns from every row of a table:

```python run
header = ['ssn', 'name', 'internal_id', 'city']
keep = [name != 'internal_id' for name in header]
rows = [['111', 'Ana', 'x9', 'Lisbon'], ['222', 'Bo', 'k2', 'Oslo']]

print(list(compress(header, keep)))
for row in rows:
    print(list(compress(row, keep)))
```

You'll use exactly this trick in the next project.

<div class="takeaways">

## Key takeaways

- `filter` keeps items whose predicate is truthy, `filterfalse` keeps those whose predicate is falsy; `None` as the predicate tests the items themselves.
- `takewhile` yields until the first failure and then stops for good; it's safe on infinite iterators but swallows the failing item.
- `dropwhile` skips until the first failure, then yields everything that follows without testing again.
- `compress(data, selectors)` keeps the items whose positional selector is truthy, which makes it ideal for applying a column mask.

</div>
