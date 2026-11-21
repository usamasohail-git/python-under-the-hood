---
summary: Build a generic, lazy CSV reader that turns any file with a header row into named tuples, first as a class-based context manager and then with the contextmanager decorator.
---

This project brings the section on context managers together with iterators, generators and named tuples. Given nothing but a file name, you'll build a context manager that opens a CSV file, works out its format on its own, and hands you a **lazy** stream of named tuples whose fields come from the header row. Then you'll rebuild the same tool as a generator function with `contextlib.contextmanager`, and compare the two designs.

In this project you'll:

- inspect two CSV files that use different delimiters and header styles
- use `csv.Sniffer` to detect a file's dialect, and `seek()` to rewind after sampling it
- build named tuple classes dynamically from a header row
- write a class that is both a context manager and an iterator (Goal 1)
- rewrite it as a generator-based context manager that yields a lazy generator (Goal 2)
- make sure the file is always closed, even when setup fails half-way
