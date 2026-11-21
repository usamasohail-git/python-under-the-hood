---
title: Raising Exceptions
summary: Use raise to start an exception workflow, a bare raise to re-raise, and raise ... from to translate one exception into another while controlling the chained traceback. Add context with add_note() in 3.11+.
minutes: 18
---

## The `raise` statement

You start an exception workflow yourself with `raise`, followed by an exception **instance**. You may also give just the class, in which case Python creates an instance by calling it with no arguments:

```python run
try:
    raise ValueError('some message here')
except ValueError as ex:
    print(repr(ex))

try:
    raise ValueError          # same as raise ValueError()
except ValueError as ex:
    print(repr(ex))
```

Whatever you raise must be a `BaseException` (or a subclass). Raising anything else is itself an error:

```python run
class Person:
    pass

try:
    raise Person()
except TypeError as ex:
    print(repr(ex))
```

## What an exception carries: `args`

`BaseException.__init__` accepts any number of positional arguments and stores them, unchanged, in the `args` attribute. That tuple is also what `str()` and `repr()` are built from: with one argument, `str()` is just that argument; with several, it's the whole tuple.

```python run
ex = ValueError('a', 'b', 'c')
print(ex.args)
print(str(ex))
print(repr(ex))

ex = ValueError('just one')
print(ex.args, '|', str(ex))
```

Usually you pass a single, human-readable message. Extra arguments are handy for data a handler may want to inspect, such as an error code or the offending value.

## Re-raising: `raise` on its own

Sometimes a handler wants to do something, like log the error or clean up, and then let the exception continue as though it had never been caught. A bare `raise` inside an `except` block re-raises the exception currently being handled, with its original traceback:

```python run
def div(a, b):
    try:
        return a // b
    except ZeroDivisionError as ex:
        print('logging zero division exception:', type(ex).__name__, ex.args)
        raise

try:
    div(1, 0)
except ZeroDivisionError as ex:
    print('the caller still receives it:', repr(ex))
```

You stepped into the propagation, did your work, and stepped out again.

## Raising a new exception while handling one

Often you want to **translate** a low-level exception into one that makes sense to *your* callers. A function that parses settings shouldn't leak a `ZeroDivisionError`; it should raise something meaningful. If you raise a new exception inside an `except` block, Python remembers the one you were handling and stores it on the new one as `__context__`. This is **implicit chaining**, and the traceback shows both:

```python run
import traceback

class CustomError(Exception):
    """a custom exception"""

def my_func(a, b):
    try:
        return a // b
    except ZeroDivisionError as ex:
        raise CustomError(*ex.args)

try:
    my_func(1, 0)
except CustomError as ex:
    print(repr(ex), '| context:', repr(ex.__context__))
    print()
    print(traceback.format_exc())
```

Python prints the older exception first, then the line *"During handling of the above exception, another exception occurred"*, then the new one. That wording suggests the second exception might be an accident (a bug in the handler, say), and that's the situation implicit chaining is meant for. The chain can be as long as you like:

```python run
try:
    try:
        raise ValueError('level 1')
    except ValueError:
        try:
            raise TypeError('level 2')
        except TypeError:
            raise KeyError('level 3')
except KeyError as ex:
    print(traceback.format_exc())
```

## Explicit chaining: `raise ... from ...`

When the translation is deliberate, say so with `from`. `raise NewError(...) from original` sets `__cause__` to `original`, and the traceback uses different wording: *"The above exception was the direct cause of the following exception"*.

```python run
def load_port(settings):
    try:
        return int(settings['port'])
    except (KeyError, ValueError) as ex:
        raise RuntimeError('invalid port setting') from ex

try:
    load_port({'port': 'eighty'})
except RuntimeError as ex:
    print('cause:', repr(ex.__cause__))
    print()
    print(traceback.format_exc())
```

## Hiding the details: `raise ... from None`

Sometimes the original exception is an implementation detail your callers shouldn't have to wade through. `from None` suppresses the chain in the traceback. Here's `make_bool` from the previous lesson; without `from None`, a call like `make_bool('ABC')` would produce a traceback showing the inner `TypeError` and `ValueError` too:

```python run
class ConversionError(Exception):
    pass

def convert_int(val):
    if not isinstance(val, int):
        raise TypeError()
    if val not in {0, 1}:
        raise ValueError('Integer values 0 or 1 only')
    return bool(val)

def convert_str(val):
    if not isinstance(val, str):
        raise TypeError()
    val = val.casefold()
    if val in {'0', 'f', 'false'}:
        return False
    elif val in {'1', 't', 'true'}:
        return True
    else:
        raise ValueError('Admissible string values are: T, F, True, False (case insensitive)')

def make_bool(val):
    try:
        try:
            b = convert_int(val)
        except TypeError:
            try:
                b = convert_str(val)
            except TypeError:
                raise ConversionError(
                    f'The type {type(val).__name__} cannot be converted to a bool'
                ) from None
    except ValueError as ex:
        raise ConversionError(
            f'The value {val} cannot be converted to a bool: {ex}'
        ) from None
    else:
        return b

for value in ('ABC', 1.0):
    try:
        make_bool(value)
    except ConversionError:
        print(traceback.format_exc())
```

Each traceback now shows a single, clean `ConversionError`. The context is still recorded (`__context__` is set); `from None` just sets `__suppress_context__ = True` so it isn't displayed.

These three attributes are the whole mechanism:

```python run
def chained(mode):
    try:
        1 / 0
    except ZeroDivisionError as ex:
        if mode == 'implicit':
            raise ValueError(mode)
        elif mode == 'from ex':
            raise ValueError(mode) from ex
        else:
            raise ValueError(mode) from None

for mode in ('implicit', 'from ex', 'from None'):
    try:
        chained(mode)
    except ValueError as ex:
        print(f'{mode:10} cause={ex.__cause__!r:34} '
              f'context={ex.__context__!r} suppress={ex.__suppress_context__}')
```

| You write | `__cause__` | `__context__` | Traceback shows |
|---|---|---|---|
| `raise New()` inside `except` | `None` | the old exception | both, "During handling of…" |
| `raise New() from old` | `old` | the old exception | both, "…was the direct cause…" |
| `raise New() from None` | `None` | the old exception | only the new one |

Any `from` clause sets `__suppress_context__` to `True`: when printing, Python shows the `__cause__` if there is one, otherwise the `__context__` unless it's suppressed.

## Choosing which exception to chain from

`from` accepts *any* exception, not just the one being handled right now. That lets you skip intermediate failures that are just noise. Suppose `calc` accepts `0`/`1` and wants to be lenient with floats like `1.0`: if `convert_int` complains about the type, it tries `int(b)` first. If **that** also fails, the second failure is an implementation detail, but the first one (the wrong type) is what the caller should see:

```python run
def calc(b):
    try:
        b_bool = convert_int(b)
    except TypeError as ex_1:
        # not an int; perhaps a float we can convert first
        try:
            b_int = int(b)
        except (ValueError, TypeError):
            raise CustomError('Bad type') from ex_1
        b_bool = convert_int(b_int)
    return b_bool

print(calc(1), calc(0), calc(1.0))

try:
    calc('ab')
except CustomError as ex:
    print(traceback.format_exc())
```

The traceback shows the original `TypeError` from `convert_int` as the direct cause, and leaves out the `ValueError` from `int('ab')` entirely. Without `from ex_1`, both would appear.

<div class="callout modern">
<span class="callout-title">Modern Python: add context with add_note() (3.11+)</span>

Often you don't want to *replace* an exception, just enrich it: which file, which row, which user. Since 3.11, every exception has an `add_note(text)` method. Notes are stored in the `__notes__` list and printed after the message in the traceback. Combine it with a bare `raise` to keep the original type and traceback:

```python run
def parse_rows(rows):
    result = []
    for line_no, row in enumerate(rows, start=1):
        try:
            result.append(int(row))
        except ValueError as ex:
            ex.add_note(f'while parsing row {line_no}: {row!r}')
            raise
    return result

try:
    parse_rows(['10', '20', 'thirty', '40'])
except ValueError as ex:
    print(ex.__notes__)
    print()
    print(traceback.format_exc())
```

The handler that eventually catches it still sees a plain `ValueError`. Older code had to mangle `args` or wrap the exception in a new type to achieve this.

Notes work especially well with exception groups: collect every failure, tag each one, and raise them together.

```python run
def parse_all(rows):
    errors = []
    for line_no, row in enumerate(rows, start=1):
        try:
            int(row)
        except ValueError as ex:
            ex.add_note(f'row {line_no}')
            errors.append(ex)
    if errors:
        raise ExceptionGroup(f'{len(errors)} bad rows', errors)

try:
    parse_all(['10', 'x', '30', 'y'])
except* ValueError as eg:
    for ex in eg.exceptions:
        print(ex, '|', ex.__notes__)
```

</div>

<div class="takeaways">

## Key takeaways

- `raise` needs a `BaseException` instance (or class). Its constructor arguments end up in `args`, which drives `str()` and `repr()`.
- A bare `raise` in a handler re-raises the current exception with its original traceback, so you can log and pass it on.
- Raising inside `except` chains implicitly (`__context__`). `raise ... from ex` marks a deliberate translation (`__cause__`). `raise ... from None` hides the chain.
- `from` can point at any exception, so you can keep the meaningful cause and drop intermediate noise.
- In 3.11+, `ex.add_note(...)` attaches extra context that shows up in the traceback, without changing the exception's type.

</div>
