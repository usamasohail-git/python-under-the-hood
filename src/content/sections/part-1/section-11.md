---
summary: A grab bag of practical tools and idioms, from repeatable random numbers and timing code to command line parsing, sentinel defaults and switch-like dispatch.
---

This section collects small but useful techniques that don't fit neatly anywhere else. Each one is something you will reach for in real programs: making randomness repeatable so bugs can be reproduced, measuring how fast a snippet runs, reading arguments from the command line, and writing functions whose parameters say exactly what they mean.

In this section you'll learn:

- why "random" numbers are really pseudo-random, and how a **seed** makes them repeatable
- picking random elements with `choice`, `choices` (with replacement and weights) and `sample` (without replacement)
- timing small pieces of code with `timeit`, and how its separate namespace works (`setup` and `globals`)
- choosing meaningful names instead of a blanket `*args` and `**kwargs`
- reading command line arguments with `sys.argv`, and building a real interface with `argparse`
- using a private **sentinel** object to tell "argument not given" apart from "argument was `None`"
- simulating a `switch` statement with `if`/`elif`, dictionaries and a decorator-based registry, plus the modern `match` statement (3.10+)
