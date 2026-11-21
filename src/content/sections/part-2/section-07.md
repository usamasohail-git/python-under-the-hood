---
summary: Build a lazy pipeline over a file of New York City parking tickets, turning raw CSV lines into typed named tuples and then counting violations by car make.
---

This project puts the iteration tools from the last few sections to work on real (and slightly messy) data: an extract of 1,000 New York City parking tickets. You'll read the file lazily, clean and convert every field to a proper Python type, package each row as a named tuple, and then aggregate the results, all while keeping no more than one row in memory at a time until the final count.

In this project you'll:

- inspect an unfamiliar CSV file and decide on a data type for every column
- write small, reusable parser functions that fall back to a default when a value is missing or malformed
- combine those parsers with `zip`, `functools.partial` and a comprehension to parse a whole row
- build a chain of generators (`yield from` included) that yields clean `Ticket` named tuples
- count violations per car make with a plain `dict`, `defaultdict` and `Counter`, and sort the result
