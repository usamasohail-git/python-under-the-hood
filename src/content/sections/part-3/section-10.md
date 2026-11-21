---
summary: Three short problems that put the specialized dictionaries to work, merging word counts, counting with guaranteed zero entries, and layering JSON settings files with ChainMap.
---

Time to use the tools from the previous section on realistic problems. Each one is small, but each has a twist that makes the choice of dictionary type matter: results that must be sorted, entries that must exist even with a count of zero, and nested settings that a flat merge gets wrong.

The first page states all three problems. Try them on the practice page before reading the solution walkthroughs.

- **Exercise 1:** merge word-frequency dictionaries from several servers, sorted by frequency, once with `defaultdict` and once with `Counter`
- **Exercise 2:** count people by eye color so that *every* possible color appears, including those with a count of zero
- **Exercise 3:** combine common and environment-specific JSON settings with `ChainMap`, without copying data, including nested sections
