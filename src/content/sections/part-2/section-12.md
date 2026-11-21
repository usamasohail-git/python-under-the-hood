---
summary: Generators that receive data as well as produce it, how to drive them with send, close and throw, how yield from connects them, and how to chain them into data pipelines.
---

So far generators have been a way to *produce* values lazily. But a generator is really a function that can **pause and resume** while keeping its local state, and that idea goes much further than iteration. If the caller can also hand data *back in* each time it resumes the generator, the generator becomes a **coroutine**: a routine that cooperates with others by voluntarily giving up control.

This is the machinery that Python's `async`/`await` grew out of. Modern code writes native coroutines with `async def`, but the mechanics (suspension, resumption, sending values in, throwing exceptions in, delegating with `yield from`) are exactly what you'll learn here, using plain generators you can poke at line by line.

In this section you'll learn:

- what cooperative multitasking means, and how `yield` lets a function hand control back to its caller
- the four states of a generator (created, running, suspended, closed) and how to inspect them
- sending data into a generator with `send()`, and why a coroutine must be **primed** first
- closing generators with `close()` and handling `GeneratorExit` correctly
- throwing exceptions into a generator with `throw()`, and using exceptions as control signals
- writing a decorator that primes coroutines automatically
- how `yield from` creates a two-way channel between a caller and a subgenerator, forwarding `next`, `send`, `close` and `throw`, and how it captures a subgenerator's return value
- building **pull** pipelines with generators, **push** pipelines with coroutines, and **broadcasting** data to several branches
