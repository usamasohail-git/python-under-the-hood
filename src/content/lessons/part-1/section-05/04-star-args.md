---
title: Star-Args
summary: A *args parameter collects any number of extra positional arguments into a tuple, and * in a call spreads an iterable into positional arguments.
minutes: 9
---

## From unpacking to function calls

In the previous lessons you saw that an assignment like `a, b, *c = 10, 20, 'x', 'y'` matches names to values by position and lets the starred name absorb the rest. Calling a function works almost the same way. Positional arguments are matched to parameters left to right, and a parameter written with a star collects whatever positional arguments are left over:

```python run
def func1(a, b, *args):
    print('a =', a)
    print('b =', b)
    print('args =', args)

func1(1, 2, 'x', 'y')
```

```python run
func1(10, 20)          # nothing extra: args is empty
```

Three things to notice:

1. Unlike extended unpacking (which produces a list), `*args` is always a **tuple**.
2. The name `args` is only a convention. `*values`, `*numbers` or `*my_vars` work just as well. The star is what matters, but stick to `args` unless a more descriptive name really helps.
3. `*args` **exhausts** the positional arguments. Nothing after it can be filled by position; we'll see what parameters after `*args` are for in the next lesson.

```python run
def func2(a, b, *c, d):
    print(a, b, c, d)

try:
    func2(10, 20, 'a', 'b', 100)    # 100 is swallowed by *c, so d is missing
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">A tuple of references, not a tuple of copies</span>

`args` is a new tuple, but its items are the **same objects** the caller passed. Nothing is copied (see Part 1 · Section 03, "Function Arguments and Mutability"). The tuple stops you from replacing its items, but it can't stop you from mutating a mutable object inside it, and the caller will see that change:

```python run
def f(*args):
    print('same object as x:', args[0] is x)
    args[0].append(99)      # mutates the caller's list

x = [1, 2]
f(x)
print(x)

def g(*args):
    try:
        args[0] = 'other'   # replacing an item of the tuple is not allowed
    except TypeError as ex:
        print('TypeError:', ex)

g(x)
```

</div>

## Example: an average of any number of values

`*args` is perfect when a function naturally accepts "one or more" or "zero or more" values:

```python run
def avg(*args):
    count = len(args)
    total = sum(args)
    return total / count

print(avg(2, 2, 4, 4))
try:
    avg()
except ZeroDivisionError as ex:
    print('ZeroDivisionError:', ex)
```

Calling it with no arguments divides by zero. There are two ways to handle that, and the choice is a design decision. You can decide what an empty average means:

```python run
def avg(*args):
    count = len(args)
    return sum(args) / count if count else 0

print(avg(2, 2, 4, 4), avg())
```

Or you can make at least one value **required** by adding a regular parameter before `*args`. Then Python itself rejects the empty call, with a clear message:

```python run
def avg(a, *args):
    count = len(args) + 1
    total = a + sum(args)
    return total / count

print(avg(2, 2, 4, 4))
try:
    avg()
except TypeError as ex:
    print('TypeError:', ex)
```

## Unpacking an iterable into the arguments

The star works in the other direction too. In a **call**, `*iterable` spreads the iterable's items out as separate positional arguments:

```python run
def func3(a, b, c):
    print(a, b, c)

l = [10, 20, 30]
try:
    func3(l)            # one argument: the whole list
except TypeError as ex:
    print('TypeError:', ex)

func3(*l)               # three arguments: 10, 20, 30
func3(*'xyz')           # any iterable works
func3(1, *(2, 3))       # and you can mix it with normal arguments
```

You can even combine both ends: the call spreads a list, and the definition gathers the values back up into a tuple. This is how `print` can accept any number of values:

```python run
def show(*args):
    print(type(args), args)

numbers = [1, 2, 3]
show(*numbers, *'ab')
print(*numbers, sep=' | ')
```

<div class="callout note">
<span class="callout-title">Define vs call: same symbol, opposite job</span>

- In a **definition**, `def f(*args)` *packs* extra positional arguments into a tuple.
- In a **call**, `f(*items)` *unpacks* an iterable into separate positional arguments.

</div>

## Positional then keyword, again

Remember that in a call, keyword arguments must come after positional ones. That makes this impossible:

```python run
try:
    compile("func1(10, b=20, 'x', 'y')", '<example>', 'exec')
except SyntaxError as ex:
    print('SyntaxError:', ex.msg)
```

Once you pass `b` by name, there is no way to supply the extra positional values that `*args` is supposed to collect. If you want a parameter that's set by name while also accepting extra positional values, the parameter has to come *after* `*args`. That's the topic of the next lesson.

<div class="takeaways">

## Key takeaways

- `def f(a, *args)` collects any extra positional arguments into the tuple `args` (possibly empty).
- Put required parameters before `*args` when at least some arguments are mandatory.
- In a call, `f(*iterable)` unpacks an iterable into separate positional arguments.
- After `*args`, no more parameters can be filled by position.

</div>
