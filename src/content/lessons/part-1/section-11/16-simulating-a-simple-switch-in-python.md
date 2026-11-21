---
title: Simulating a simple Switch in Python
summary: Python has no C-style switch statement, but if/elif chains, dictionaries of functions and a decorator-based registry all do the job, and since 3.10 there is match.
minutes: 11
---

## What a switch statement does

Many languages have a `switch` statement that picks one branch based on a single value. In Java it looks like this:

```java
switch (dow) {
    case 1: dowString = "Monday";
            break;
    case 2: dowString = "Tuesday";
            break;
    // ... cases 3 to 6 ...
    case 7: dowString = "Sunday";
            break;
    default: dowString = "Invalid day of week";
}
```

Here we'll assume the simple, common form: every case ends with `break` (no "fall through" into the next case), and the choice depends on one value. For a long time Python had no such statement; a proposal to add one (PEP 3103) was considered and rejected. Let's look at the ways Python programmers simulate it, then at what modern Python offers.

To make the examples a bit more interesting, each branch will **select a function** and call it, rather than just set a string. In real code that function could do anything.

## Option 1: `if` / `elif` / `else`

The most direct translation:

```python run
def dow_switch_fn(dow):
    if dow == 1:
        fn = lambda: print('Monday')
    elif dow == 2:
        fn = lambda: print('Tuesday')
    elif dow == 3:
        fn = lambda: print('Wednesday')
    elif dow == 4:
        fn = lambda: print('Thursday')
    elif dow == 5:
        fn = lambda: print('Friday')
    elif dow == 6:
        fn = lambda: print('Saturday')
    elif dow == 7:
        fn = lambda: print('Sunday')
    else:
        fn = lambda: print('Invalid day of week')
    return fn()

dow_switch_fn(1)
dow_switch_fn(100)
```

It's explicit and each branch can hold as much code as you like, including nested logic. The downsides: it's verbose, the conditions are checked one by one from the top, and the set of cases is fixed when you write the code.

## Option 2: a dictionary of functions

A dictionary maps each case value to the function to run. `dict.get` with a fallback provides the `default` branch:

```python run
def dow_switch_dict(dow):
    dow_dict = {
        1: lambda: print('Monday'),
        2: lambda: print('Tuesday'),
        3: lambda: print('Wednesday'),
        4: lambda: print('Thursday'),
        5: lambda: print('Friday'),
        6: lambda: print('Saturday'),
        7: lambda: print('Sunday'),
        'default': lambda: print('Invalid day of week'),
    }
    return dow_dict.get(dow, dow_dict['default'])()

dow_switch_dict(1)
dow_switch_dict(100)
```

Lookup is a single hash-table access no matter how many cases there are. Because a dictionary is a runtime object, you can also **add or remove cases while the program runs**, something neither `if`/`elif` nor a compiled switch statement allows. The trade-off is that each value must be a single callable. Lambdas are limited to one expression, so for anything substantial you'd write named functions and put those in the dictionary.

(Here the dictionary is rebuilt on every call. In real code you'd usually create it once, outside the function.)

## Option 3: a registry built with a decorator

`functools.singledispatch` picks an implementation based on the **type** of the first argument, with functions registered through a `.register` decorator. We can't use it to switch on a *value*, but the same idea is easy to adapt. Here is a minimal registry: the decorated function becomes the default case, and `.register(value)` adds other cases:

```python run
def switcher(fn):
    registry = {}
    registry['default'] = fn

    def register(case):
        def inner(fn):
            registry[case] = fn
            return fn          # returning fn lets register decorators be stacked
        return inner

    def decorator(case):
        fn = registry.get(case, registry['default'])
        return fn()

    decorator.register = register
    return decorator
```

`switcher` returns `decorator`, a closure over `registry`. Attaching `register` as an attribute of that function gives us the `@dow.register(...)` syntax:

```python run
@switcher
def dow():
    print('Invalid day of week')

@dow.register(1)
def dow_1():
    print('Monday')

dow.register(2)(lambda: print('Tuesday'))
dow.register(3)(lambda: print('Wednesday'))
dow.register(4)(lambda: print('Thursday'))
dow.register(5)(lambda: print('Friday'))
dow.register(6)(lambda: print('Saturday'))
dow.register(7)(lambda: print('Sunday'))

dow(1)
dow(2)
dow(100)
```

Registering a lambda doesn't need the `@` syntax: `dow.register(2)` returns the `inner` decorator, and calling it with the lambda stores it. Since `inner` returns its argument unchanged, you can also stack decorators to map several values to the same function:

```python run
@switcher
def weekend():
    print('weekday')

@weekend.register(6)
@weekend.register(7)
def _():
    print('weekend!')

weekend(3)
weekend(6)
weekend(7)
```

Under the hood this is still the dictionary approach. The decorators just give it a tidier, extensible interface, where different modules can register their own cases.

<div class="callout modern">
<span class="callout-title">Python 3.10+: the match statement</span>

Python 3.10 added **structural pattern matching** (PEP 634), the `match` statement. Its simplest use is exactly a switch: compare one value against literal patterns, with `_` as the catch-all default. There's no fall-through and no `break`; the first matching `case` runs and that's it.

```python run
def dow_match(dow):
    match dow:
        case 1:
            return 'Monday'
        case 2:
            return 'Tuesday'
        case 3:
            return 'Wednesday'
        case 4:
            return 'Thursday'
        case 5:
            return 'Friday'
        case 6 | 7:                 # | combines alternatives
            return 'Weekend'
        case _:                     # default
            return 'Invalid day of week'

print(dow_match(1), dow_match(7), dow_match(100))
```

`match` goes much further than a switch: it can destructure sequences and mappings, check types, bind names and add `if` guards:

```python run
def describe(command):
    match command.split():
        case ['go', direction]:
            return f'moving {direction}'
        case ['pick', 'up', *items] if items:
            return f'picking up {", ".join(items)}'
        case ['quit' | 'exit']:
            return 'bye'
        case _:
            return f'unknown command: {command!r}'

for c in ('go north', 'pick up key lamp', 'exit', 'dance'):
    print(describe(c))
```

One trap: a **bare name** in a pattern is a *capture* that matches anything and binds the value, not a comparison with a variable. To compare against a constant, use a dotted name such as `Color.RED` or `self.MONDAY`.

```python run
MONDAY = 1

def check(day):
    match day:
        case MONDAY:        # captures! matches every value and rebinds MONDAY locally
            return f'matched, MONDAY is now {MONDAY}'

print(check(5))
```

On 3.10+, `match` is the natural choice for a fixed set of cases. The dictionary and registry approaches remain useful when the cases need to change at runtime.

</div>

<div class="takeaways">

## Key takeaways

- A simple switch (one value, no fall-through) can be written as an `if`/`elif`/`else` chain: explicit and flexible, but verbose and fixed.
- A dictionary mapping values to functions, with `dict.get(value, default)`, gives fast lookup and cases that can change at runtime.
- A decorator-based registry (adapted from the `singledispatch` idea) wraps that dictionary in a clean `@fn.register(value)` interface.
- Since Python 3.10, `match`/`case` provides a real switch with `_` as the default and `|` for alternatives, plus full pattern matching. Beware that a bare name in a `case` captures instead of comparing.

</div>
