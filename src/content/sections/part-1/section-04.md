---
summary: How Python represents and computes with numbers, from unlimited-size integers to binary floats, exact fractions and decimals, complex numbers and booleans.
---

Numbers look simple until you ask how a computer actually stores them. Python offers several numeric types, and each one makes a different trade-off between **exactness**, **range**, **speed** and **memory**. Knowing those trade-offs explains why `0.1 + 0.1 + 0.1 == 0.3` is `False`, why `round(2.5)` is `2`, why `-7 // 2` is `-4`, and when you should reach for `Decimal` or `Fraction` instead of `float`.

The section ends with booleans, which turn out to be integers in disguise, and with the rules for truthiness, short-circuiting and comparisons that every `if` statement relies on.

In this section you'll learn:

- how integers are stored, why Python's `int` never overflows, and what big integers cost
- integer arithmetic: true division, floor division, modulo and the identity that links them
- building integers from strings in any base, and converting integers to other bases yourself
- exact rational arithmetic with `fractions.Fraction`
- how a `float` is laid out in 64 bits, and why most decimal fractions can't be stored exactly
- comparing floats safely with `math.isclose`, and turning floats into integers (`trunc`, `floor`, `ceil`, `round`)
- `round()` and banker's rounding, and how to round "the school way" when you need to
- `decimal.Decimal`: exact decimal arithmetic, precision and rounding contexts, math functions and performance costs
- complex numbers and the `cmath` module
- `bool` as a subclass of `int`, truth values of every object, operator precedence, short-circuit evaluation and what `and` / `or` really return
- identity, membership, equality and ordering comparisons, including chained comparisons
