---
title: Sorting Iterables
summary: sorted() accepts any finite iterable, not just sequences. It consumes the iterable and always returns a new list.
minutes: 7
---

## `sorted` works on any iterable

You've used `sorted()` on lists and other sequences. It doesn't actually need a sequence: it just iterates its argument, collects the items into a new list, sorts that list and returns it. So **any finite iterable** works: sets, dict views, generators, files, and your own classes.

```python run
print(sorted({'banana', 'apple', 'cherry'}))
print(sorted({'b': 2, 'a': 1}.items(), reverse=True))
print(sorted(map(abs, [-3, 1, -2])))
print(sorted('python'))
```

The result is always a `list`, whatever the input was.

## A custom iterable of random numbers

Let's build a lazy, re-iterable collection of random integers. To make each pass repeatable, every new iterator re-seeds the random number generator with the same seed:

```python run
import random

class RandomInts:
    def __init__(self, length, *, seed=0, lower=0, upper=10):
        self.length = length
        self.seed = seed
        self.lower = lower
        self.upper = upper

    def __len__(self):
        return self.length

    def __iter__(self):
        return self.RandomIterator(self.length, seed=self.seed,
                                   lower=self.lower, upper=self.upper)

    class RandomIterator:
        def __init__(self, length, *, seed, lower, upper):
            self.length = length
            self.lower = lower
            self.upper = upper
            self.num_requests = 0
            random.seed(seed)

        def __iter__(self):
            return self

        def __next__(self):
            if self.num_requests >= self.length:
                raise StopIteration
            self.num_requests += 1
            return random.randint(self.lower, self.upper)

randoms = RandomInts(10)
print(list(randoms))
print(list(randoms))     # same numbers: each iterator re-seeds
```

The numbers are never stored, yet `sorted` handles the object without complaint:

```python run
print(sorted(randoms))
print(sorted(randoms, reverse=True))
```

Each call to `sorted` asks `randoms` for a fresh iterator, consumes it and sorts the values it collected. The `key=` argument works too:

```python run
print(sorted(randoms, key=lambda x: (x % 2, x)))   # evens first, then odds
```

<div class="callout tip">
<span class="callout-title">A cleaner random iterator</span>

`random.seed()` resets the **global** generator shared by the whole program, so two of these iterators running at the same time would interfere with each other (and with any other code using `random`). A better design gives each iterator its own generator: `self._rng = random.Random(seed)` and then `self._rng.randint(lower, upper)`.

</div>

```python run
class RandomInts:
    def __init__(self, length, *, seed=0, lower=0, upper=10):
        self.length, self.seed, self.lower, self.upper = length, seed, lower, upper

    def __iter__(self):
        rng = random.Random(self.seed)          # private generator per pass
        return (rng.randint(self.lower, self.upper) for _ in range(self.length))

r0, r1 = RandomInts(5, seed=0), RandomInts(5, seed=1)
print(list(zip(r0, r1)))    # two passes running side by side...
print(list(zip(r0, r1)))    # ...and still exactly reproducible
print(sorted(r1))
```

`zip` advances both iterators in turn. With the global-seed version, the second iterator's `random.seed()` call would reset the generator the first one was using, and the pairs would no longer match what each iterable produces on its own.

(The expression in parentheses is a *generator expression*, a quick way to make an iterator that's covered in detail later in this part.)

## Sorting consumes iterators

Since `sorted` iterates its argument, passing it an **iterator** uses it up:

```python run
it = iter([3, 1, 2])
print(sorted(it))
print(sorted(it))    # nothing left to sort
```

And of course an infinite iterable can't be sorted: `sorted` would try to collect every item and never finish.

<div class="takeaways">

## Key takeaways

- `sorted()` works on **any finite iterable** and always returns a new `list`.
- With a custom iterable, `sorted` calls `__iter__` to get a fresh iterator and consumes it.
- Passing an iterator to `sorted` exhausts it.
- To make a random iterable reproducible, give each iterator its own `random.Random(seed)` rather than re-seeding the global generator.

</div>
