---
summary: Rebuild the pull pipeline over cars.csv as a push pipeline of coroutines that filters cars by name and saves the matches to a CSV file.
---

Time to put the coroutine tools together. In this project you'll take the car-data pipeline from the "pulling data" lesson, which chained generators to filter rows by car name, and turn it inside out: a source pushes rows into a chain of filter coroutines that ends in a coroutine writing a CSV file. The pipeline should accept any number of name filters, and it should be impossible to forget to close it.

This project practices:

- reusing a generator as the data source (`csv.Sniffer`, skipping the header, `yield from`)
- writing primed coroutines: a sink that saves rows with `csv.writer`, and a generic filter that takes a predicate
- chaining an arbitrary number of filters in a loop, and avoiding the closure-in-a-loop trap with lambdas
- wrapping the whole pipeline in a coroutine, and that coroutine in a context manager, so closing it flushes the output file
