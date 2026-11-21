---
summary: A hands-on project that turns four CSV files into one lazy pipeline of typed named tuples, then filters and groups it with itertools.
---

Time to put the iteration tools to work on real data. Four CSV files describe the same 1,000 people from different angles: personal details, employers, vehicles, and when each record was last updated. You'll read them lazily, convert every field to the right type, stitch the four files into a single stream of records, drop stale records, and answer a question by grouping.

Nothing in the pipeline loads a whole file into a list until the very end, when grouping requires sorting. Each step is a small generator that consumes the one before it.

In this project you'll:

- read CSV files correctly with the `csv` module (and see why `str.split(',')` isn't enough)
- generate named tuple classes from a file's header row, and parse each column into its proper type
- combine parallel iterators with `zip`, flatten them with `chain.from_iterable` and select columns with `compress`
- filter the combined stream by date with `filter` and a key function
- find the largest groups per category with `sorted` and `groupby`, including ties
