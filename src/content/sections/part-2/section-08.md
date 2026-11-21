---
summary: A tour of the itertools module and the built-ins that work with it, for slicing, filtering, chaining, zipping, grouping and combining any iterable lazily.
---

Once you know how iterators and generators work, you start writing the same small loops again and again: take the first *n* items, skip a header, stop when a condition fails, glue two streams together, walk two sequences in parallel, group consecutive rows, try every pair. The standard library already ships fast, well-tested, **lazy** versions of all of these, mostly in the `itertools` module. Learning them lets you replace a page of loop bookkeeping with one readable expression that works on any iterable, including infinite ones.

The recurring theme of the section: these tools consume iterators as they go. Knowing exactly *when* values are pulled, and what is left behind afterwards, is what separates correct pipelines from subtle bugs.

In this section you'll learn:

- the aggregators `min`, `max`, `sum`, `any` and `all`, and how to combine them with `map` or generator expressions
- slicing any iterable with `islice`, and splitting it into chunks with `batched` (Python 3.12)
- selecting values with `filter`, `filterfalse`, `takewhile`, `dropwhile` and `compress`
- the infinite iterators `count`, `cycle` and `repeat`
- joining iterables with `chain` / `chain.from_iterable`, and "copying" an iterator with `tee`
- `map`, `starmap`, `functools.reduce` and running totals with `accumulate`
- `zip`, `zip_longest`, `zip(strict=True)` and `pairwise` (Python 3.10)
- grouping consecutive items with `groupby`, and its sharp edges
- Cartesian products, permutations and combinations, with a couple of probability examples
