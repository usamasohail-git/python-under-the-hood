---
title: Exercise 2 - Solution
summary: Counting people by eye color with a Counter so that every possible color appears, either by filling in zeros afterwards or by seeding the counter with zeros first.
minutes: 8
---

## The data

```python run
eye_colors = ("amber", "blue", "brown", "gray", "green", "hazel", "red", "violet")

class Person:
    def __init__(self, eye_color):
        self.eye_color = eye_color

from random import seed, choices
seed(0)
persons = [Person(color) for color in choices(eye_colors[2:], k=50)]
```

## Counting is the easy part

A `Counter` can count any iterable, and a generator expression gives it exactly the values we care about, without building an intermediate list:

```python run
from collections import Counter

counts = Counter(p.eye_color for p in persons)
counts
```

That's correct as far as it goes, but `amber` and `blue` are missing. A `Counter` only contains elements it has actually seen. Asking for a missing color does return `0`, but that doesn't make the key appear:

```python run
print(counts['amber'], 'amber' in counts, len(counts))
```

Anyone who iterates over the result, converts it to JSON or builds a chart from it would silently lose those colors. There are two natural fixes.

## Approach 1: fill in the zeros afterwards

Count first, then build the result by walking the list of **all** colors. Since a `Counter` returns `0` for anything it hasn't seen, a plain lookup is enough (`.get(color, 0)` works just as well):

```python run
counts = Counter(p.eye_color for p in persons)
result = {color: counts[color] for color in eye_colors}
result
```

A bonus of driving the comprehension from `eye_colors`: the result follows the order of `eye_colors`, not the order in which colors happened to show up in the data.

## Approach 2: start from zeros, then count

Alternatively, seed the counter with a zero for every possible color, then add the real counts with `update`. Keys that are set explicitly stay in the counter even when their count is zero:

```python run
counts = Counter(dict.fromkeys(eye_colors, 0))
print(counts)
counts.update(p.eye_color for p in persons)
counts
```

`dict.fromkeys(eye_colors, 0)` is a short way of writing `{color: 0 for color in eye_colors}`. Since `update` **adds** counts when given an iterable, each person bumps the matching color up by one. (The repr lists the most common colors first, but iterating over `counts` still follows the order of `eye_colors`, because that's the order the keys were inserted.)

<div class="callout note">
<span class="callout-title">Careful with the operators</span>

Building the counter with `+` would undo the seeding. `Counter.__add__` drops every count that isn't positive, so the zeros disappear:

```python run
seeded = Counter(dict.fromkeys(eye_colors, 0))
combined = seeded + Counter(p.eye_color for p in persons)
print('amber' in combined)
```

`update` is the right tool here.

</div>

## Packaging it up

```python run
def count_eye_colors(persons, possible_eye_colors):
    counts = Counter(dict.fromkeys(possible_eye_colors, 0))
    counts.update(p.eye_color for p in persons)
    return counts

count_eye_colors(persons, eye_colors)
```

One more design question: what should happen to a person whose color *isn't* in the list, say a typo like `'gren'`? The two approaches handle it differently. Approach 1 silently ignores it, because the result only looks up the listed colors. Approach 2 keeps it as an extra key. Decide which behavior you want; for data validation, keeping it (or raising an error) is usually more helpful than hiding it.

```python run
print(count_eye_colors(persons + [Person('gren')], eye_colors)['gren'])
```

<div class="takeaways">

## Key takeaways

- A `Counter` contains only elements it has seen. Looking up a missing key gives `0` but doesn't add it.
- To guarantee an entry for every category, either build the result from the full list of categories, or seed the counter with zeros and then call `update`.
- `update` keeps zero counts; the `+` operator drops them.

</div>
