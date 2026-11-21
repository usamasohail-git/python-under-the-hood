---
summary: How Python's for loop really works, built from the ground up out of two small protocols, the iterable and the iterator.
---

Sequences can be iterated because you can ask them for item 0, item 1, item 2 and so on. But many collections, like sets, dictionaries, files and infinite streams of values, have no meaningful index. Python solves this with a more general idea: an object you can repeatedly ask for **the next item**. Every `for` loop, comprehension, `sum()`, `sorted()`, `zip()` and unpacking assignment is built on it.

The most important idea of this section, and of Part 2, is the difference between an **iterable** (something you *can* loop over, again and again) and an **iterator** (the single-use object that does the looping and remembers where it is). Once that distinction clicks, a whole family of puzzling bugs, like "why is my second loop empty?", become obvious.

In this section you'll learn:

- why indexing isn't enough, and how `__next__` and `StopIteration` give a more general iteration model
- the **iterator protocol** (`__iter__` returning `self` plus `__next__`) and what "exhausted" means
- the **iterable protocol**: `__iter__` returning a *fresh* iterator, and why separating the two fixes re-iteration
- consuming iterators by hand with `next()`, for example to read a file's header rows
- infinite and **lazy** iterables that compute their values only when asked
- which built-ins (`range`, `zip`, `enumerate`, files, dict views, `map`…) are iterables and which are iterators
- the two forms of `iter()`, including `iter(callable, sentinel)`, and the sequence-protocol fallback
- delegating iteration to a contained collection, and supporting `reversed()` with `__reversed__`
- the classic trap of passing an iterator to a function that needs to loop twice
