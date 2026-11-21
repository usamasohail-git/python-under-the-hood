---
title: Kwargs
summary: A **kwargs parameter collects any keyword arguments that no other parameter claims into a dictionary, and ** in a call spreads a dictionary into keyword arguments.
minutes: 9
---

## Collecting extra keyword arguments

`*args` scoops up leftover **positional** arguments. Its counterpart, `**kwargs`, scoops up leftover **keyword** arguments, the ones whose names don't match any other parameter, and stores them in a dictionary:

```python run
def func(**kwargs):
    print(kwargs)

func(x=100, y=200)
func()
```

As with `args`, the name `kwargs` is just a convention (short for "keyword arguments"); the double star is what matters. The keys are the argument names as strings, and since Python 3.6 the dictionary keeps them **in the order the caller wrote them**.

`*args` and `**kwargs` combine naturally. Together they accept absolutely any call:

```python run
def func(*args, **kwargs):
    print(args)
    print(kwargs)

func(1, 2, a=100, b=200)
```

And they can follow regular parameters. Named parameters claim their arguments first; `**kwargs` only receives what's left over:

```python run
def func(a, b, **kwargs):
    print(a, b, kwargs)

func(1, 2, x=100, y=200)
func(b=2, a=1, c=3)    # a and b are claimed by name, c is extra
```

## Where `**kwargs` can go

`**kwargs` must be the **very last** parameter. Nothing can follow it, since there would be no way to pass a value to that parameter that `**kwargs` wouldn't also want:

```python run
for src in ['def func(a, b, **kwargs, c): pass',
            'def func(*, **kwargs): pass']:
    try:
        compile(src, '<example>', 'exec')
    except SyntaxError as ex:
        print(f'{src!r:40} -> SyntaxError: {ex.msg}')
```

The second example shows that a bare `*` directly followed by `**kwargs` is not allowed either. A bare `*` must introduce at least one named keyword-only parameter, and you don't need it here anyway: `**kwargs` can't absorb positional arguments, so any extras would already be rejected.

If you want some *specific* keyword-only parameters **and** a catch-all, put them between the `*` (or `*args`) and `**kwargs`:

```python run
def func(*, d, **kwargs):
    print(d, kwargs)

func(d=1, x=100, y=200)
try:
    func(x=100)
except TypeError as ex:
    print('TypeError:', ex)
```

## Unpacking a dictionary into keyword arguments

In a call, `**mapping` spreads a dictionary out as keyword arguments. Its keys must be strings that are valid for the function you call:

```python run
def connect(host, port, *, timeout=10):
    print(f'connect to {host}:{port} (timeout={timeout})')

options = {'host': 'localhost', 'port': 5432}
connect(**options)
connect(**options, timeout=3)
connect(*['example.com', 80], **{'timeout': 1})
```

Passing the same name twice is an error, even when one of them comes from an unpacked dictionary:

```python run
try:
    connect(**options, port=8080)
except TypeError as ex:
    print('TypeError:', ex)
```

This "collect, then pass on" pattern is everywhere in real code. A function can accept `*args, **kwargs` and forward them untouched to another function, without knowing anything about that function's parameters:

```python run
def logged(fn, *args, **kwargs):
    print(f'calling {fn.__name__} with {args} {kwargs}')
    return fn(*args, **kwargs)

logged(connect, 'db.local', 5432, timeout=2)
logged(print, 'a', 'b', sep='-')
```

You'll build on exactly this idea for the function timer later in this section, and again when you meet decorators.

<div class="callout modern">
<span class="callout-title">Modern Python: `/` frees names for `**kwargs` (3.8+)</span>

A regular parameter "owns" its name, so a caller can never pass a keyword argument with that name to `**kwargs`. Making the parameter positional-only releases the name:

```python run
def tag(name, **attrs):
    return name, attrs

try:
    tag('div', name='main')          # clashes with the parameter `name`
except TypeError as ex:
    print('TypeError:', ex)

def tag(name, /, **attrs):
    return name, attrs

print(tag('div', name='main'))       # now 'name' goes into attrs
```

This is one of the main reasons positional-only parameters were added to the language.

</div>

<div class="takeaways">

## Key takeaways

- `**kwargs` collects keyword arguments not matched by other parameters into a dict, in call order.
- It must be the last parameter; specific keyword-only parameters go before it, after `*` or `*args`.
- In a call, `f(**mapping)` unpacks a dictionary into keyword arguments; duplicates raise `TypeError`.
- `def f(*args, **kwargs)` accepts any call, which makes it ideal for forwarding arguments.

</div>
