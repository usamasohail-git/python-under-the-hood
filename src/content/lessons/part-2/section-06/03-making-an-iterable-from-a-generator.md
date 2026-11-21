---
title: Making an Iterable from a Generator
summary: Generators are single-use iterators; wrap one in a class whose __iter__ returns a fresh generator to get an iterable you can loop over again and again.
minutes: 11
---

## The problem: single use

A generator is an iterator, so once it has been consumed it's done:

```python run
def squares_gen(n):
    for i in range(n):
        yield i ** 2

sq = squares_gen(5)
for num in sq:
    print(num)

print('second pass:', list(sq))
```

To loop again you have to call `squares_gen(5)` again. That's fine inside your own code, but it's a trap for anyone you hand `sq` to: a function that loops over its argument twice (say, once to compute a total and once to compute percentages) will silently see an empty second pass.

```python run
def percentages(values):
    total = sum(values)                       # first pass
    return [round(100 * v / total) for v in values]   # second pass

print(percentages([1, 2, 3, 4]))           # a list is re-iterable
print(percentages(squares_gen(5)))         # the generator is spent after sum()
```

No error, just a wrong answer. What we want is an **iterable**: an object that creates a *new* iterator every time `iter()` is called on it.

## Wrap the generator in an iterable class

The iterable protocol only requires `__iter__`, which must return a new iterator. A generator is an iterator, so `__iter__` can simply call the generator function:

```python run
class Squares:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return squares_gen(self.n)

sq = Squares(5)
print(list(sq))
print(list(sq))                 # works again
print(percentages(Squares(5)))
```

Each `for` loop (or `list()`, or `sum()`) calls `iter(sq)`, gets a brand-new generator and consumes *that*. The `Squares` object itself never gets exhausted.

If you'd rather keep everything in one place, the generator can live inside the class, for example as a static method:

```python run
class Squares:
    def __init__(self, n):
        self.n = n

    @staticmethod
    def squares_gen(n):
        for i in range(n):
            yield i ** 2

    def __iter__(self):
        return Squares.squares_gen(self.n)

list(Squares(5)), list(Squares(3))
```

## Even shorter: make `__iter__` a generator

There's an idiom that's shorter still and very common in real code. `__iter__` is just a method, and a method can contain `yield`. Then *calling* `__iter__` returns a new generator, which is exactly what the protocol asks for:

```python run
class Squares:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        for i in range(self.n):
            yield i ** 2

sq = Squares(4)
print(list(sq), list(sq))
print(type(iter(sq)))
print(iter(sq) is iter(sq))     # a fresh generator each time
```

No separate iterator class, no `__next__`, no state stored on `self` except the configuration (`n`). This is usually the cleanest way to make your own container iterable.

## Watch out when generators feed other iterators

Lazy iterators that wrap other iterators don't copy anything. They pull values from the underlying iterator only when they themselves are asked for a value. That's what makes them efficient, but it also means **consuming the inner iterator directly affects the wrapper**:

```python run
def squares(n):
    for i in range(n):
        yield i ** 2

sq = squares(5)
enum_sq = enumerate(sq)    # lazy: nothing has been read from sq yet

print(next(sq))            # we take two values directly...
print(next(sq))
print(next(enum_sq))       # ...so enumerate starts at the third one
```

Two surprises in that last line. First, `enumerate` gives us `4` (that is, `2 ** 2`), because the first two squares were already taken out of the shared generator. Second, the index is `0`, not `2`: `enumerate` counts the items *it* has produced, and it has no idea someone else consumed values before it started.

The same thing happens with `zip`, `map`, `filter` and your own generators. The rule of thumb: once you've wrapped an iterator, use only the wrapper.

<div class="callout tip">
<span class="callout-title">Iterable or iterator?</span>

A quick way to tell what you've got: for an iterator, `iter(obj) is obj` is `True`. For a re-usable iterable like a list, a `range` or the `Squares` class above, it's `False`.

```python run
for obj in (squares(3), Squares(3), [1, 2], range(3)):
    print(type(obj).__name__, iter(obj) is obj)
```

</div>

<div class="takeaways">

## Key takeaways

- A generator is single-use. Passing it to code that iterates twice gives silently wrong results.
- To make something re-iterable, give a class an `__iter__` that returns a **new** generator each time.
- The shortest form is to write `__iter__` itself as a generator function (put `yield` in it).
- Lazy wrappers such as `enumerate`, `zip` and `map` share the underlying iterator; consuming it directly changes what the wrapper sees. Use only the wrapper once you've created it.
- `iter(obj) is obj` is `True` for iterators and `False` for re-usable iterables.

</div>
