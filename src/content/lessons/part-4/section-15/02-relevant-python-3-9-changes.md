---
title: Relevant Python 3.9 Changes
summary: Python 3.9 brought proper time zones with zoneinfo, the | and |= operators for dictionaries, removeprefix/removesuffix and a few handy math functions.
minutes: 14
---

## What 3.9 added

Python 3.9 (October 2020) is a release of many small conveniences. Here are the ones that matter most for everyday code:

- the `zoneinfo` module for real time zones
- new `math` helpers: multi-argument `gcd`, and `lcm`
- dictionary union with `|` and `|=`
- `str.removeprefix()` and `str.removesuffix()`
- built-in collection types usable in type hints: `list[int]` instead of `typing.List[int]`

## Time zones with `zoneinfo`

Dates and times are hard mostly because of time zones and daylight saving time. Before 3.9 the standard library only had `datetime.timezone`, which represents a **fixed** offset from UTC. Real zones like "Australia/Melbourne" change their offset twice a year, so people relied on the third-party `pytz` or `python-dateutil` packages.

First, the distinction that everything depends on: a **naive** datetime has no time zone attached, an **aware** one does.

```python run
from datetime import datetime, timezone, timedelta

naive = datetime(2022, 3, 20, 6, 1)
aware = naive.replace(tzinfo=timezone.utc)   # "I know this time is in UTC"

print(repr(naive))
print(repr(aware))
```

With only fixed offsets you can convert, but *you* have to know the right offset for that date:

```python run
plus_11 = timezone(timedelta(hours=11))
aware.astimezone(plus_11)
```

`zoneinfo.ZoneInfo` instead uses the IANA time zone database, so it knows each zone's full history of offsets and DST rules:

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

march = datetime(2022, 3, 20, 6, 1, tzinfo=timezone.utc)
july  = datetime(2022, 7, 20, 6, 1, tzinfo=timezone.utc)

print(march.astimezone(ZoneInfo("Australia/Melbourne")))  # 2022-03-20 17:01:00+11:00
print(july.astimezone(ZoneInfo("Australia/Melbourne")))   # 2022-07-20 16:01:00+10:00
print(march.astimezone(ZoneInfo("Europe/Dublin")))        # 2022-03-20 06:01:00+00:00
print(july.astimezone(ZoneInfo("Europe/Dublin")))         # 2022-07-20 07:01:00+01:00
```

Same UTC time of day, different local offsets: Melbourne is on summer time in March and Dublin in July. `zoneinfo.available_timezones()` returns the set of all zone names (several hundred of them).

<div class="callout note">
<span class="callout-title">Why that block doesn't run here</span>

`zoneinfo` reads the time zone database from the operating system, or from the `tzdata` package if the system has none (Windows, and this in-browser Python). The browser runtime doesn't ship that data, so the example above is static; its output was checked on a regular CPython install. On Windows, `pip install tzdata` makes `zoneinfo` work.

</div>

<div class="callout modern">
<span class="callout-title">Modern Python: stop using utcnow()</span>

Older code often wrote `datetime.utcnow()`, which returns a **naive** datetime that merely happens to hold UTC. Python 3.12 deprecated it (and `utcfromtimestamp()`). Ask for an aware value instead: `datetime.now(timezone.utc)`, or `datetime.now(UTC)` using the `datetime.UTC` alias added in 3.11.

</div>

## `math`: `gcd` with many arguments, and `lcm`

```python run
import math

print(math.gcd(27, 45))           # always worked with two arguments
print(math.gcd(27, 45, 18, 15))   # 3.9: any number of arguments
print(math.lcm(2, 3, 4))          # 3.9: least common multiple
```

## Dictionary union: `|` and `|=`

Before 3.9 there were two common ways to combine dictionaries: unpacking into a new dict, or a `ChainMap` view.

```python run
d1 = {'a': 1, 'b': 2, 'c': 3}
d2 = {'c': 30, 'd': 40}

print({**d1, **d2})

from collections import ChainMap
merged = ChainMap(d1, d2)
print(merged['a'], merged['c'], merged['d'])
```

Watch the common key `c`. With unpacking, the **later** dictionary wins (`30`). A `ChainMap` searches its maps in order and returns the **first** hit (`3`). Both work, but neither reads naturally.

Dictionaries are close relatives of sets (their keys behave like a set), and sets combine with the union operator `|`. Python 3.9 gave dictionaries the same operator:

```python run
print(d1 | d2)
print(d2 | d1)
```

As with unpacking, the **right-hand** operand wins for shared keys, so swapping the operands changes which value survives. The in-place version `|=` updates the left dictionary, like `update()`:

```python run
settings = {'debug': False, 'level': 1}
settings |= {'debug': True, 'user': 'ann'}
settings
```

What about key order? Keys keep the position in which they **first** appeared, even when the value comes from the right-hand side:

```python run
d1 = {'c': 3, 'a': 1, 'b': 2}
d2 = {'d': 40, 'c': 30}
d1 | d2
```

`c` stays first (with the new value `30`), and the new key `d` is added at the end.

<div class="callout note">
<span class="callout-title">Only between dicts</span>

`d | other` requires `other` to be a dictionary (a `TypeError` otherwise), while `d |= other` also accepts anything `update()` accepts, such as a list of key/value pairs.

</div>

## Removing a prefix or a suffix

Suppose you want to strip a fixed `"(log) "` tag from some log lines:

```python run
data = [
    "(log) [2022-03-01T13:30:01] Log record 1",
    "(log) log: [2022-03-01T13:30:02] Log record 2",
]
```

`lstrip` looks tempting, but its argument is a **set of characters**, not a prefix. It keeps removing any of `(`, `l`, `o`, `g`, `)` and space until it reaches a character that isn't in that set:

```python run
[s.lstrip("(log) ") for s in data]
```

The first line came out right by luck. The second lost its `log` too. `replace` is closer, but it also removes the text if it appears anywhere else in the string. Python 3.9 added methods that do exactly what we mean:

```python run
print([s.removeprefix("(log) ") for s in data])
print("report.csv".removesuffix(".csv"))
print("Python rocks!".removeprefix("Java"))   # no match: unchanged, no error
```

## Built-in generics in type hints

Since 3.9 you can write `list[int]`, `dict[str, float]` or `tuple[int, ...]` in annotations, and no longer need `List`, `Dict` and `Tuple` from `typing`:

```python run
def squares(values: list[int]) -> list[int]:
    return [v ** 2 for v in values]

print(squares([1, 2, 3]), squares.__annotations__)
```

<div class="takeaways">

## Key takeaways

- `zoneinfo.ZoneInfo("Region/City")` gives real, DST-aware time zones from the standard library; prefer aware datetimes.
- `math.gcd` accepts any number of arguments, and `math.lcm` is new.
- `d1 | d2` builds a merged dictionary, `d1 |= d2` updates in place; the right side wins on shared keys, and key order follows first appearance.
- `removeprefix`/`removesuffix` remove an exact substring; `lstrip`/`rstrip` remove a *set of characters*.
- Type hints can use `list[int]` and friends directly.

</div>
