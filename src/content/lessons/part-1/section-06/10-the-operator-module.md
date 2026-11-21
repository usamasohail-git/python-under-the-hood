---
title: The operator Module
summary: The operator module provides Python's operators as ordinary functions, plus itemgetter, attrgetter and methodcaller, which build small callables for you.
minutes: 14
---

## Operators as functions

Operators like `+`, `<` and `[]` are syntax, so you can't pass them to another function. Whenever a higher-order function such as `reduce`, `map` or `sorted` needs one, you end up writing a tiny lambda like `lambda x, y: x * y`.

The `operator` module saves you the trouble: it provides a function for (nearly) every operator in the language.

```python run
import operator

print([name for name in dir(operator) if not name.startswith('_')][:20], '...')
```

## Arithmetic

```python run
print(operator.add(1, 2))
print(operator.mul(2, 3))
print(operator.pow(2, 3))
print(operator.mod(13, 2))
print(operator.floordiv(13, 2))
print(operator.truediv(3, 2))
print(operator.neg(5))
```

These are exactly what the previous lessons were missing. Instead of a lambda, pass `operator.mul` to `reduce`:

```python run
from functools import reduce

print(reduce(lambda x, y: x * y, [1, 2, 3, 4]))
print(reduce(operator.mul, [1, 2, 3, 4]))
```

They also pair nicely with `map` over two iterables:

```python run
list(map(operator.add, [1, 2, 3], [10, 20, 30]))
```

## Comparison and boolean operators

```python run
print(operator.lt(10, 100))       # 10 < 100
print(operator.le(10, 10))        # 10 <= 10
print(operator.eq(1, 1.0))        # 1 == 1.0
print(operator.is_('abc', 'def')) # 'abc' is 'def'
print(operator.contains([1, 2, 3], 2))   # 2 in [1, 2, 3]  (note the argument order)
```

`operator.truth` returns the truth value of an object, like `bool()`:

```python run
print(operator.truth([1, 2]), operator.truth([]))
print(operator.not_([]))
```

`and_` and `or_` (with a trailing underscore, because `and` and `or` are keywords) are the **bitwise** operators `&` and `|`. On booleans that looks like logical and/or, but they don't short-circuit, and on integers they work bit by bit:

```python run
print(operator.and_(True, False), operator.or_(True, False))
print(operator.and_(6, 3), 6 & 3)    # 0b110 & 0b011 = 0b010
```

## Getting, setting and deleting items

Indexing is an operator too:

```python run
my_list = [1, 2, 3, 4]
print(my_list[1], operator.getitem(my_list, 1))
```

For mutable sequences, `setitem` and `delitem` correspond to assignment and `del`:

```python run
my_list = [1, 2, 3, 4]
my_list[1] = 100
del my_list[3]
print(my_list)

my_list = [1, 2, 3, 4]
operator.setitem(my_list, 1, 100)
operator.delitem(my_list, 3)
print(my_list)
```

Slicing works the same way: `l[0:2]` is really `l[slice(0, 2)]`, so you can pass a `slice` object to these functions:

```python run
l = [1, 2, 3, 4]
print(operator.getitem(l, slice(0, 2)))

operator.setitem(l, slice(0, 2), ['a', 'b', 'c'])
print(l)

operator.delitem(l, slice(3, 5))
print(l)
```

## `itemgetter`: a callable that fetches items

`operator.getitem(s, i)` fetches an item immediately. `operator.itemgetter(i)` is different: it **returns a callable**. Calling that callable with a sequence returns the item at index `i`:

```python run
f = operator.itemgetter(2)
print(f([1, 2, 3, 4]))
print(f('python'))
```

`f` doesn't care what kind of object it gets, as long as it supports `[2]`. Give `itemgetter` several indices and the callable returns a **tuple**:

```python run
f = operator.itemgetter(2, 3)
print(f([1, 2, 3, 4]))
print(f('python'))
```

It works with any key, not just integers, so it can fetch dictionary values too:

```python run
person = {'name': 'Ada', 'born': 1815, 'field': 'mathematics'}
operator.itemgetter('name', 'born')(person)
```

## `attrgetter`: a callable that fetches attributes

`attrgetter` does the same for **attributes**, which you name as strings:

```python run
class MyClass:
    def __init__(self):
        self.a = 10
        self.b = 20
        self.c = 30

    def test(self):
        print('test method running...')

obj = MyClass()

f = operator.attrgetter('a')
print(f(obj))

my_var = 'b'
print(operator.attrgetter(my_var)(obj))

print(operator.attrgetter('a', 'b', 'c')(obj))
```

Because the attribute name is a string, it can come from a variable, which isn't possible with the `obj.b` syntax. (`getattr(obj, my_var)` is the built-in way to do a one-off lookup.) `attrgetter` also follows dotted names: `attrgetter('real.bit_length')` would fetch `x.real.bit_length`.

A method is just an attribute too, so `attrgetter('test')` returns the bound method, which you can then call:

```python run
obj_test_method = operator.attrgetter('test')(obj)
obj_test_method()
```

All of these could be written as lambdas: `lambda x: (x.a, x.b, x.c)` or `lambda x: (x[2], x[3])`. The `operator` versions are a little shorter, describe their intent by name, and are implemented in C, so they're typically a bit faster.

## Use case: sorting keys

`itemgetter` and `attrgetter` really shine as `key` functions:

```python run
# complex numbers by their real part
l = [10+1j, 8+2j, 5+3j]
print(sorted(l, key=operator.attrgetter('real')))

# strings by their last character
l = ['aaz', 'aad', 'aaa', 'aac']
print(sorted(l, key=operator.itemgetter(-1)))

# tuples by their first element
l = [(2, 3, 4), (1, 2, 3), (4, ), (3, 4)]
print(sorted(l, key=operator.itemgetter(0)))
```

With several fields, `itemgetter` returns a tuple, so you get a multi-level sort for free:

```python run
rows = [('Bob', 25), ('alice', 30), ('Carol', 25)]
sorted(rows, key=operator.itemgetter(1, 0))   # by age, then by name
```

## `methodcaller`: calling a method by name

`methodcaller(name, *args, **kwargs)` returns a callable that **calls** the named method on whatever object it receives, passing along the arguments you gave:

```python run
x = 'python'
print(x.upper())
print(operator.methodcaller('upper')(x))
print(operator.attrgetter('upper')(x)())   # the long way: get the method, then call it
```

Arguments for the method are given when creating the `methodcaller`, both positional and keyword:

```python run
class MyClass:
    def __init__(self):
        self.a = 10
        self.b = 20

    def do_something(self, c, *, d=0):
        print(self.a, self.b, c, d)

obj = MyClass()
obj.do_something(100, d=5)
operator.methodcaller('do_something', 100, d=5)(obj)
```

That makes it easy to apply the same method call to many objects:

```python run
words = ['  spam ', 'eggs  ', ' ham']
list(map(operator.methodcaller('strip'), words))
```

<div class="callout modern">
<span class="callout-title">`operator.call` (Python 3.11+)</span>

Python 3.11 added `operator.call(obj, *args, **kwargs)`, the function form of the call operator `obj(...)`. It's handy when you have a collection of functions to call:

```python run
funcs = [str.upper, str.title, len]
print([operator.call(f, 'hello world') for f in funcs])
```

</div>

<div class="takeaways">

## Key takeaways

- The `operator` module provides functions for Python's operators (`add`, `mul`, `lt`, `getitem`, `setitem`, `delitem`, `truth`, ...), so you don't need lambdas like `lambda x, y: x * y`.
- `itemgetter(...)` and `attrgetter(...)` return callables that fetch one item/attribute, or a tuple of several. They're ideal `key` functions.
- `methodcaller(name, *args, **kwargs)` returns a callable that calls a named method with those arguments.
- `and_`/`or_` are the bitwise `&`/`|`, not the short-circuiting `and`/`or`.

</div>
