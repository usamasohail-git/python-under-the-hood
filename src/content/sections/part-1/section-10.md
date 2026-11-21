---
summary: A tour of the language features added between Python 3.6 and 3.10 that change how you write everyday code, with notes on what came later.
---

Python evolves every year, and a lot of what now feels like "just Python" is surprisingly recent. f-strings arrived in 3.6, ordered dictionaries became a language guarantee in 3.7, the walrus operator landed in 3.8, `|` for dictionaries in 3.9, and `match` in 3.10. If you read older code (or older tutorials), knowing *when* each feature arrived helps you recognise the workarounds people used before it existed, and when you can safely drop them.

Everything on these pages runs on Python 3.13, so you'll also see short **Modern Python** notes wherever a later release refined a feature.

In this section you'll learn:

- structural pattern matching (`match`/`case`) and `zip(..., strict=True)` from Python 3.10
- the `zoneinfo` module, the dictionary union operators `|` and `|=`, `removeprefix`/`removesuffix` and new `math` helpers from Python 3.9
- assignment expressions (the `:=` "walrus" operator) from Python 3.8
- positional-only parameters, the `=` specifier in f-strings, `as_integer_ratio()`, `@lru_cache` without parentheses and named tuple defaults (Python 3.8 and 3.7)
- the Python 3.6 highlights: insertion-ordered dictionaries, ordered `**kwargs`, underscores in numeric literals, f-strings and variable annotations
