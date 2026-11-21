---
title: Read-Only and Computed Properties
summary: A getter-only property makes an attribute read-only, and can compute its value on the fly, cache it, or load it lazily, all behind plain attribute syntax.
minutes: 14
---

## Read-only properties

A property with a getter but no setter is **read-only**: reading works, assigning raises `AttributeError`.

```python run
class Account:
    def __init__(self, number):
        self._number = number

    @property
    def number(self):
        return self._number

a = Account('A-100')
print(a.number)
try:
    a.number = 'B-200'
except AttributeError as ex:
    print('AttributeError:', ex)
```

Keep in mind what "read-only" means in Python: a strong signal, not a lock. Anyone can still write `a._number = ...`. Nothing in Python is truly private. The property documents your intent and protects against accidents, which is usually all you need.

## Computed properties

A common reason for a read-only property is that the value isn't stored at all: it's **computed** from other attributes every time it's read.

```python run
from math import pi

class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        print('calculating area...')
        return pi * self.radius ** 2

c = Circle(1)
c.area
```

You could write `area()` as a regular method instead. A property reads better when the value is conceptually an *attribute* of the object (a circle *has* an area) and it's cheap to obtain. A method is better when the call does real work or takes arguments, because the parentheses tell the reader something happens.

The computed value is always up to date. Change the radius, and the area follows:

```python run
c.radius = 2
c.area
```

The flip side: the area is recalculated on every access, even when nothing has changed.

```python run
c.area
c.area
```

## Caching a computed value

For an expensive computation, we'd rather calculate once and remember the result until an input changes. Properties let us add that **without changing the interface**. The trick is to make `radius` a property too, so its setter knows when the cached area has become stale:

```python run
from math import pi

class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        self._area = None        # invalidate the cache
        self._radius = value     # (validation could go here)

    @property
    def area(self):
        if self._area is None:
            print('calculating area...')
            self._area = pi * self.radius ** 2
        return self._area

c = Circle(1)
print(c.area)
print(c.area)      # cached: no recalculation
c.radius = 2
print(c.area)      # recalculated after the change
print(c.area)
```

Note that `__init__` assigns `self.radius`, which runs the setter, which initializes `_area`. So every instance starts with an empty cache without any extra code.

<div class="callout tip">
<span class="callout-title">`functools.cached_property` (Python 3.8+)</span>

For values that never need invalidating, the standard library has a ready-made decorator. It computes the value on first access and then stores it in the instance `__dict__`, so later reads don't call the function at all:

```python run
from functools import cached_property

class Circle:
    def __init__(self, radius):
        self.radius = radius

    @cached_property
    def area(self):
        print('calculating area...')
        return pi * self.radius ** 2

c = Circle(1)
print(c.area, c.area)
print(c.__dict__)
```

Unlike our hand-written version it won't notice if `radius` changes; you'd have to `del c.area` to reset it.

</div>

## Lazy loading

Properties can hide any amount of work: a database query, a file read, a network request. A typical pattern is **lazy loading**: do nothing until somebody asks for the data, then fetch it once and keep it.

Here's a class that reports statistics about a web page. With real network access the download would look like this:

```python
from urllib.request import urlopen

def download(url):
    with urlopen(url) as f:
        return f.read()
```

The browser sandbox has no network, so the runnable version below swaps in a fake `download` function that sleeps briefly and returns made-up bytes. The class doesn't care where the bytes come from.

```python run
from time import perf_counter, sleep

def download(url):
    sleep(0.05)                          # pretend the network is slow
    return url.encode() * 1_000          # pretend this is the page

class WebPage:
    def __init__(self, url):
        self.url = url

    @property
    def url(self):
        return self._url

    @url.setter
    def url(self, value):
        self._url = value
        self._page = None                # lazy: don't download yet

    @property
    def page(self):
        if self._page is None:
            self.download_page()
        return self._page

    @property
    def page_size(self):
        return len(self.page)

    @property
    def time_elapsed(self):
        self.page                        # make sure it's been downloaded
        return self._load_time_secs

    def download_page(self):
        start = perf_counter()
        self._page = download(self.url)
        self._load_time_secs = perf_counter() - start
```

Creating a `WebPage` costs nothing. The first property that needs the page triggers the download; after that, everything is served from `_page`. Setting a new `url` clears it, so the next read fetches again.

```python run
urls = ['https://www.python.org', 'https://docs.python.org/3/', 'https://pypi.org']

for url in urls:
    page = WebPage(url)
    print(f'{url:30} size={page.page_size:_}  elapsed={page.time_elapsed:.2f}s')
```

The calling code just reads attributes. It doesn't know (or need to know) that the first read did a download and the second didn't.

<div class="takeaways">

## Key takeaways

- A getter without a setter gives a **read-only** property; assignment raises `AttributeError`.
- "Read-only" is a convention backed by the property: the backing attribute can still be changed.
- **Computed** properties derive their value from other state on every access, so they're always current.
- Make an input a property too, and its setter can invalidate a **cached** value; the interface stays the same.
- `functools.cached_property` computes once and stores the result on the instance.
- Properties are a natural home for **lazy loading**: fetch on first access, then reuse.

</div>
