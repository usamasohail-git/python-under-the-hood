---
title: Partial Functions
summary: functools.partial pre-fills some of a function's arguments and gives you back a new callable that needs fewer arguments.
minutes: 13
---

## Reducing a function's arguments

Sometimes you have a function that takes several arguments, but in a particular situation some of them are always the same. Or another piece of code wants a function with **fewer** parameters than yours has (a `key` function for `sorted` must take exactly one argument, for example).

A **partial function** solves both problems: it's a new callable made from an existing function with some of the arguments **already filled in**.

```python run
from functools import partial

def my_func(a, b, c):
    print(a, b, c)

f = partial(my_func, 10)
f(20, 30)
```

`partial(my_func, 10)` returned a callable `f`. Calling `f(20, 30)` calls `my_func(10, 20, 30)`: the frozen argument goes first, followed by the ones you supply.

We could get the same effect by writing a wrapper function, or a lambda:

```python run
def partial_func(b, c):
    return my_func(10, b, c)

fn = lambda b, c: my_func(10, b, c)

partial_func(20, 30)
fn(20, 30)
```

All three work. `partial` is often the most concise, and as you'll see it handles complicated signatures without any extra effort.

## Freezing positional and keyword arguments

`partial` accepts both positional and keyword arguments to freeze:

```python run
def my_func(a, b, *args, k1, k2, **kwargs):
    print(a, b, args, k1, k2, kwargs)

f = partial(my_func, 10, k1='a')
f(20, 30, 40, k2='b', k3='c')
```

Writing the equivalent by hand means repeating the whole signature:

```python run
def f(b, *args, k2, **kwargs):
    return my_func(10, b, *args, k1='a', k2=k2, **kwargs)

f(20, 30, 40, k2='b', k3='c')
```

### Freezing a parameter that isn't first

You don't have to fill in the *first* parameters. A keyword argument can freeze any parameter:

```python run
def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(4), cube(2), cube(base=3))
```

A partial object remembers what it holds, and you can inspect it:

```python run
print(cube)
print(cube.func, cube.args, cube.keywords)
```

### Frozen keywords can be overridden

Keyword arguments frozen in a partial act as **defaults**: if you pass the same keyword again at call time, your value wins.

```python run
print(cube(2, exponent=4))
```

But passing it **positionally** fails. `cube(2, 4)` becomes `power(2, 4, exponent=3)`: `4` is assigned to `exponent` by position, and then `exponent=3` tries to assign it again:

```python run
try:
    cube(2, 4)
except TypeError as ex:
    print('TypeError:', ex)
```

## Caveat: arguments are captured when the partial is created

The arguments you give `partial` are evaluated and stored **at creation time**. Changing the variable afterwards doesn't affect the partial:

```python run
def my_func(a, b, c):
    print(a, b, c)

a = 10
f = partial(my_func, a)
f(20, 30)

a = 100        # re-binds the name a to a new object
f(20, 30)      # the partial still holds the old object, 10
```

The partial holds a reference to the **object** that `a` referred to at the time, the integer `10`. Re-binding `a` points the *name* at a different object; the partial's reference is unaffected.

If that object is **mutable**, though, changes to it are visible through the partial, because both refer to the same object:

```python run
a = [10, 20]
f = partial(my_func, a)
f(100, 200)

a.append(30)   # mutates the very list the partial holds
f(100, 200)
```

This is exactly the shared-reference behavior from Section 03, and it's the same reason default values behave the way they do.

## Use case: adapting a function to an interface

Suppose we have points stored as tuples and want to sort them by their distance from a fixed point. Our distance function takes **two** points, but `key` must take **one**:

```python run
l = [(1, 1), (0, 2), (-3, 2), (0, 0), (10, 10)]

dist2 = lambda x, y: (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2
print(dist2((0, 0), (1, 1)))

print(sorted(l, key=lambda x: dist2((0, 0), x)))
print(sorted(l, key=partial(dist2, (0, 0))))
```

`partial(dist2, (0, 0))` freezes the first point and produces exactly the one-argument function `sorted` needs. The same need comes up with **callbacks**: a library promises to call your function with a certain number of arguments, and you need to sneak in extra information. You'll meet callbacks again with asynchronous programming later in the series.

## Use case: specialized versions of a general function

Here's a stand-in for a function that sends email:

```python run
def sendmail(to, subject, body, *, cc=None, bcc=None):
    print(f'To: {to} | Subject: {subject} | Body: {body} | CC: {cc} | BCC: {bcc}')

email_admin = 'admin@example.com'
email_devteam = 'dev1@example.com;dev2@example.com'

sendmail(email_admin, 'My App Notification', 'disk is almost full')
```

If many parts of an application send the same kinds of messages, partials give each kind a short, descriptive name:

```python run
send_admin = partial(sendmail, email_admin, 'Admin notification')
send_dev = partial(sendmail, email_devteam, 'Dear IT', bcc=email_admin)
send_all = partial(sendmail, ';'.join((email_admin, email_devteam)), 'To everyone')

send_admin('disk is almost full')
send_dev('the build is broken')
send_all('the office is closed tomorrow')
send_dev('the build is fixed', bcc=None)   # override a frozen keyword
```

<div class="callout modern">
<span class="callout-title">`functools.Placeholder` (Python 3.14+)</span>

On 3.13 you can only freeze leading positional arguments, or use keywords. Python 3.14 adds `functools.Placeholder`, which reserves a positional slot to be filled at call time. It isn't available in the browser's 3.13 runtime, so here is a static example:

```python
from functools import partial, Placeholder as _P

remove_dashes = partial(str.replace, _P, '-', '')
remove_dashes('2025-01-31')    # '20250131'
```

That's particularly handy for built-ins with positional-only parameters, which can't be frozen by keyword.

</div>

<div class="takeaways">

## Key takeaways

- `partial(func, *args, **kwargs)` returns a callable that calls `func` with those arguments pre-filled, followed by the arguments you pass at call time.
- Frozen keyword arguments act like defaults and can be overridden by keyword; passing the same parameter positionally causes a `TypeError`.
- Arguments are captured when the partial is created: re-binding a variable later has no effect, but mutating a captured mutable object does.
- Partials adapt functions to interfaces that expect fewer arguments (sort keys, callbacks) and create specialized versions of general functions.

</div>
