---
summary: Generator functions and generator expressions let you write lazy iterators in a few lines, by pausing a function with yield instead of hand-writing __iter__ and __next__.
---

Writing an iterator class by hand works, but it's a lot of ceremony: an `__init__` to store state, an `__iter__` that returns `self`, and a `__next__` that remembers where it left off and raises `StopIteration` at the right moment. A **generator** gets you the same thing with an ordinary-looking function. The trick is the `yield` keyword, which hands a value back to the caller and *pauses* the function, keeping all its local variables, until the next value is requested.

In this section you'll learn:

- what `yield` does, what a generator object is, and why every generator is an iterator
- how a generator finishes, and how its `return` value travels inside `StopIteration`
- a worked Fibonacci example comparing recursion, iterator classes and a generator
- how to wrap a generator in a class so it becomes a re-usable **iterable**, including `__reversed__`
- a card-deck example rebuilt with generators
- generator expressions: the lazy cousin of list comprehensions, their scoping rules, and their speed and memory trade-offs
- `yield from` for delegating to another iterator, for example to chain several files into one stream
