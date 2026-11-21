---
title: Tuples as Data Structures
summary: A tuple is more than a read-only list. Its fixed length and fixed order let the position of each element carry meaning, which makes it a lightweight data record.
minutes: 12
---

## More than a "read-only list"

Tuples are often introduced as *immutable lists*. That's not wrong, but it hides the more interesting half of the story. Compare the three built-in sequence types you already know:

| | `tuple` | `list` | `str` |
|---|---|---|---|
| container (holds other objects) | yes | yes | yes (characters) |
| order matters | yes | yes | yes |
| indexable, sliceable, iterable | yes | yes | yes |
| mutable | **no** | yes | **no** |
| fixed length and fixed order | **yes** | no | **yes** |
| usually holds | mixed types | one kind of thing | characters only |

On the points that matter most here, a tuple has more in common with a **string** than with a list. In a string, the position of each character is part of what the string *means*: `'python'` and `'ypthon'` are different words. A list can be sorted or reversed in place, so the position of an item is often incidental. A tuple can never be reordered, grown or shrunk, so if you decide that "position 0 is the x-coordinate", that will always be true for that tuple.

That's the idea behind using a tuple as a **data record**: the position of each element has meaning, by convention.

## Commas make the tuple

The parentheses you usually see around a tuple are not what creates it. The **commas** do:

```python run
a = ('a', 10, True)
b = 'b', 20, False
print(type(a), type(b))
```

Parentheses are still needed when the commas would otherwise mean something else, for example inside a function call, where commas separate arguments:

```python run
def iterate(t):
    for element in t:
        print(element)

try:
    iterate(1, 2, 3)        # three separate arguments
except TypeError as ex:
    print('TypeError:', ex)

iterate((1, 2, 3))          # one argument: a tuple
```

A one-element tuple needs a trailing comma, because `(5)` is just the number 5 in parentheses:

```python run
print(type((5)), type((5,)), type(5,))
```

The last one, `type(5,)`, is an int too: inside a call, a trailing comma after the last argument is allowed and simply ignored.

## Tuples are sequences

Everything you can do to read a sequence, you can do to a tuple:

```python run
a = 1, 2, 3, 4, 5
print(a[2])       # indexing
print(a[2:4])     # slicing returns a tuple
for element in a[:2]:
    print(element)
```

## Immutable container, possibly mutable contents

You can't replace an element of a tuple, or add or remove one:

```python run
a = 10, 'python', True
try:
    a[0] = 20
except TypeError as ex:
    print('TypeError:', ex)
```

"Extending" a tuple with `+` works, but just like with strings it builds a **new** tuple:

```python run
a = 1, 2, 3
print(hex(id(a)))
a = a + (4, 5, 6)
print(a, hex(id(a)))
```

Remember from Section 03 that a tuple holds *references*. If an element is a mutable object, that object can still change:

```python run
class Point2D:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'{self.__class__.__name__}(x={self.x}, y={self.y})'

points = Point2D(0, 0), Point2D(10, 10), Point2D(20, 20)

try:
    points[0] = Point2D(-10, -10)     # replacing an element: not allowed
except TypeError as ex:
    print('TypeError:', ex)

points[0].x = -10                     # mutating an element: fine
points
```

The tuple still holds the same three references. The first `Point2D` object changed its own state. When a tuple and all of its elements are immutable (strings, numbers, other such tuples), the record is completely locked down: you can pass it to any function and be certain nobody changes it behind your back.

## Position gives meaning

Here's the record idea in action. We decide that a city is a tuple of *(name, country, population)*:

```python run
london = 'London', 'UK', 8_780_000
new_york = 'New York', 'USA', 8_500_000
beijing = 'Beijing', 'China', 21_000_000

cities = [london, new_york, beijing]
```

Each city tuple is **heterogeneous** (strings and an int). The list of cities is **homogeneous**: every element is the same kind of record. That's typical, and it's exactly what makes code like this safe:

```python run
print([city[0] for city in cities])
print(sum(city[2] for city in cities))
```

`city[2]` works for every element because we guaranteed every element is a city tuple. If someone slipped a plain integer into `cities`, `city[2]` would raise a `TypeError`. Lists tend to be homogeneous precisely so you can apply the same operation to every item.

## Unpacking a record

Indexing works, but `city[2]` doesn't tell a reader *what* position 2 is. Unpacking gives each position a name:

```python run
city, country, population = new_york
print(city)
print(country)
print(population)
```

You can unpack directly in a `for` loop, which is how `enumerate` is usually used: it yields `(index, value)` tuples, another small data record.

```python run
for city, country, population in cities:
    print(f'{city}: {population:,}')

for index, value in enumerate(beijing):
    print(index, value)
```

### Ignoring fields with `_` and `*`

Take a stock price record with the structure *symbol, year, month, day, open, high, low, close*:

```python run
record = 'DJIA', 2018, 1, 19, 25_987, 26_072, 25_942, 26_072

symbol, year, month, day, *_, close = record
print(symbol, year, month, day, close)
print(_)
```

Extended unpacking puts everything not claimed by the other names into a **list**. Using `_` as that name is a convention meaning "I don't care about this". There's nothing special about `_` itself: it's an ordinary variable, and you can print it. (In the interactive Python shell, `_` also holds the result of the last expression, which is another reason not to rely on its value.)

<div class="callout tip">
<span class="callout-title">Avoid pack-then-unpack</span>

Code like `symbol, year, close = record[0], record[1], record[7]` works, but it indexes three times, builds a brand-new tuple on the right, and then unpacks it again. It's also harder to read. Prefer `symbol, year, *_, close = record`. If you only need one or two values, plain indexing such as `record[7]` is perfectly fine.

</div>

## Returning multiple values

A function can only return one object, but that object can be a tuple. This is one of the most common uses of tuples as records. Here a function generates a random point in a square and reports whether it falls inside a circle; repeating it many times estimates π (the circle covers π/4 of the square):

```python run
from random import uniform, seed
from math import sqrt

def random_shot(radius):
    """Return a random point in the square [-radius, radius]²
    and whether it lies inside the circle of that radius."""
    x = uniform(-radius, radius)
    y = uniform(-radius, radius)
    is_in_circle = sqrt(x ** 2 + y ** 2) <= radius
    return x, y, is_in_circle

seed(0)
num_attempts = 200_000
count_inside = 0
for i in range(num_attempts):
    *_, is_in_circle = random_shot(1)
    if is_in_circle:
        count_inside += 1

print(f'Pi is approximately {4 * count_inside / num_attempts}')
```

The caller unpacks the result and keeps only what it needs. The weakness is the same as before: the caller must *know* that the third value is the flag. The next lesson fixes exactly that by giving each position a name.

## The fragility of positions

Positional records are cheap and safe from mutation, but they're fragile when the structure changes. Suppose `person = 'Idle', 42` is unpacked as `last_name, age = person` in several places. If you later add a first name at the front, every one of those unpackings breaks, or silently puts the wrong value in the wrong name. Records that are accessed **by name** don't have this problem, which is the motivation for named tuples.

<div class="takeaways">

## Key takeaways

- Tuples have a fixed length and fixed order, so the **position** of an element can carry meaning, just as with characters in a string.
- Commas create tuples. Parentheses are only needed to avoid ambiguity; a single-element tuple needs a trailing comma.
- A tuple is immutable, but its elements may be mutable objects.
- Lists of records are typically homogeneous; the records themselves are typically heterogeneous.
- Unpacking (including `*rest` and `_`) is the readable way to pull fields out of a record and to receive multiple return values.
- The downside of positional records: readers must remember what each position means, and changing the structure breaks code.

</div>
