---
title: Exercises
summary: Three problems for the specialized dictionaries, merging frequency counts, counting with zero entries, and layered JSON settings with ChainMap.
minutes: 8
files: ['common.json', 'dev.json', 'prod.json']
---

## Exercise 1: merge word counts

Text data is spread over several servers. Each server analyzes its share and returns a dictionary of words and how often they occur. Your job is to combine any number of these dictionaries into **one** dictionary with the total frequency of every word, **sorted by frequency from highest to lowest**.

Here's what three servers might return:

```python run
d1 = {'python': 10, 'java': 3, 'c#': 8, 'javascript': 15}
d2 = {'java': 10, 'c++': 10, 'c#': 4, 'go': 9, 'python': 6}
d3 = {'erlang': 5, 'haskell': 2, 'python': 1, 'pascal': 1}
```

Merging all three should give:

```python
{'python': 17, 'javascript': 15, 'java': 13, 'c#': 12, 'c++': 10,
 'go': 9, 'erlang': 5, 'haskell': 2, 'pascal': 1}
```

and merging only `d1` and `d2`:

```python
{'python': 16, 'javascript': 15, 'java': 13, 'c#': 12, 'c++': 10, 'go': 9}
```

A solution using only plain dicts looks like this:

```python run
def merge(*dicts):
    unsorted = {}
    for d in dicts:
        for k, v in d.items():
            unsorted[k] = unsorted.get(k, 0) + v
    return dict(sorted(unsorted.items(), key=lambda e: e[1], reverse=True))

merge(d1, d2)
```

**Your task:** write two more versions, **(a)** using a `defaultdict` and **(b)** using a `Counter`. Both must return a plain `dict` sorted by frequency.

## Exercise 2: count eye colors, zeros included

Here is the list of all possible eye colors:

```python run
eye_colors = ("amber", "blue", "brown", "gray", "green", "hazel", "red", "violet")
```

Some other collection (from a database or an API, say) holds `Person` objects with an `eye_color` attribute. Here's some sample data. It's drawn only from `eye_colors[2:]`, so nobody has amber or blue eyes:

```python run
class Person:
    def __init__(self, eye_color):
        self.eye_color = eye_color

from random import seed, choices
seed(0)
persons = [Person(color) for color in choices(eye_colors[2:], k=50)]
print(len(persons), [p.eye_color for p in persons[:5]])
```

**Your task:** write a function that returns a dictionary with the number of people for **every** color in `eye_colors`. The twist: colors nobody has must still appear, with a count of zero (`'amber': 0`).

## Exercise 3: layered settings

An application keeps its settings in three JSON files: `common.json` holds the defaults, and `dev.json` and `prod.json` hold environment-specific settings that override them. They're available in the working directory, so let's look at them:

```python run
import json

for name in ('common', 'dev', 'prod'):
    with open(f'{name}.json') as f:
        print(name, '→', json.load(f))
    print()
```

Notice that the settings are **nested**: `dev.json` overrides `database.user` and `database.pwd`, but says nothing about `database.port`, which should still come from `common.json`.

**Your task:** write a function `settings(env)` that takes the environment name (`'dev'` or `'prod'`, the same as the file name without `.json`) and returns the combined settings, with the environment's values overriding the common ones.

The twist: don't copy data into a new merged dictionary. Use a `ChainMap` instead, and make sure nested sections are combined too, so that `settings('prod')['database']['port']` is `5432`.

## Try it yourself

Head to the **practice page** for this section: each exercise is set up there with starter code and automatic tests (the JSON files are available there too). Have a go before reading the solution walkthroughs that follow.
