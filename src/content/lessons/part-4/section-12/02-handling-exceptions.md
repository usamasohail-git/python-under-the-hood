---
title: Handling Exceptions
summary: The full try statement with several except clauses, else and finally, nested handlers, the EAFP style, why try is free in 3.11+, and handling exception groups with except*.
minutes: 22
---

## The shape of a `try` statement

A `try` statement has one guarded block and up to three kinds of clauses after it:

```python
try:
    ...                      # code that might raise
except SomeError as ex:      # zero or more handlers, checked top to bottom
    ...
except (OtherError, ThirdError):
    ...
else:                        # runs only if the try block raised nothing
    ...
finally:                     # runs no matter what
    ...
```

You need at least one `except` **or** a `finally`. An `else` is only allowed if there is at least one `except`. We'll go through each piece.

## Several handlers, checked in order

You can attach as many `except` clauses as you like. When an exception is raised in the `try` block, Python checks the clauses **from top to bottom** and runs the **first** one whose type matches (the exception is an instance of that type, or of a subclass). The rest are skipped.

```python run
def handle(exc):
    try:
        raise exc
    except ValueError as ex:
        print('handling a value error:', repr(ex))
    except IndexError as ex:
        print('handling an index error:', repr(ex))

handle(ValueError('bad value'))
handle(IndexError('bad index'))
```

The message isn't limited to one argument, either. Built-in exceptions accept any number of positional arguments, and `str()` changes once there's more than one:

```python run
try:
    raise ValueError('custom message', 'secondary message')
except ValueError as ex:
    print(ex)          # str() of an exception with several args shows the tuple
    print(repr(ex))
```

Because the first match wins, **order matters**. Put the most specific handlers first. If a broad handler comes first, the specific one below it is dead code:

```python run
try:
    raise ValueError('value error')
except Exception as ex:
    print('handling Exception:', repr(ex))
except ValueError as ex:
    print('handling ValueError:', repr(ex))   # can never run
```

To give several types the same treatment, list them in a **tuple**:

```python run
def first_item(container):
    try:
        return container[0]
    except (IndexError, KeyError, TypeError) as ex:
        return f'no first item ({type(ex).__name__})'

print(first_item([10, 20]))
print(first_item([]))
print(first_item({}))
print(first_item(42))
```

If no clause matches, the `try` statement simply doesn't handle the exception, and it propagates to the caller as if the `try` weren't there:

```python run
def lookup():
    try:
        raise KeyError('bad key')
    except ValueError:
        print('handling value error...')
    except IndexError:
        print('handling index error...')

try:
    lookup()
except KeyError as ex:
    print('KeyError escaped lookup():', ex)
```

<div class="callout note">
<span class="callout-title">The `as` name disappears</span>

At the end of an `except ... as ex:` block, Python deletes `ex`. A traceback keeps references to every frame it passed through, so keeping the exception alive would also keep all their local variables alive. If you need the exception later, assign it to another name inside the handler.

```python run
try:
    raise ValueError('temporary')
except ValueError as ex:
    saved = ex

try:
    ex
except NameError as err:
    print('NameError:', err)
print('but saved is still here:', repr(saved))
```

</div>

## `finally`: runs no matter what

A `finally` block runs when the `try` statement is left, **however** it's left: after normal completion, after a handled exception, and even when an unhandled exception is on its way out.

```python run
def demo(exc=None):
    try:
        if exc:
            raise exc
        print('  try block finished normally')
    except ValueError:
        print('  handled the ValueError')
    finally:
        print('  running finally')

print('no exception:');         demo()
print('handled exception:');    demo(ValueError())
print('unhandled exception:')
try:
    demo(IndexError())
except IndexError:
    print('  ...and then IndexError propagated to the caller')
```

It even runs when the `try` block leaves with `return`, `break` or `continue`. That's what makes it the right place for cleanup such as closing files or releasing locks (it's exactly what a `with` statement does for you behind the scenes):

```python run
def read_config():
    print('opening resource')
    try:
        return 'config data'
    finally:
        print('closing resource')     # runs before the value is handed back

print(read_config())
```

<div class="callout note">
<span class="callout-title">Never `return` from `finally`</span>

A `return` (or `break`/`continue`) inside `finally` silently **discards** any exception that was propagating, which is almost never what you want. Python 3.14 makes this a `SyntaxWarning`.

```python run
def swallow():
    try:
        1 / 0
    finally:
        return 'the ZeroDivisionError is gone'

print(swallow())
```

</div>

## `else`: only when nothing went wrong

The `else` block runs if the `try` block completed **without raising**. It's tempting to think that's the same as writing the code after the `try` statement, but it isn't:

```python run
def with_else():
    try:
        raise ValueError()
    except ValueError:
        print('value error...')
    else:
        print('no exception occurred')

def without_else():
    try:
        raise ValueError()
    except ValueError:
        print('value error...')
    print('no exception occurred')    # runs even after the handler ran

with_else()
print('---')
without_else()
```

Code after the `try` statement runs whenever the statement didn't end with an exception, *including* after an `except` clause handled one. `else` runs only on the success path.

There's a second, subtler reason to use `else`: it keeps the `try` block **small**. Code in `else` is not guarded by the `except` clauses, so if it raises the same type of exception by accident, that bug won't be silently treated as the failure you were guarding against.

## Nested `try` statements

`try` statements can be nested, and each level handles the problems it understands. Suppose we're turning JSON data into `Person` objects. Unknown extra attributes should be ignored, but an invalid value should skip that person entirely:

```python run
import json

json_data = """{
    "Alex": {"age": 18},
    "Bryan": {"age": 21, "city": "London"},
    "Guido": {"age": "unknown"}
}"""
data = json.loads(json_data)

class Person:
    __slots__ = 'name', '_age'

    def __init__(self, name):
        self.name = name
        self._age = None

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, value):
        if isinstance(value, int) and value >= 0:
            self._age = value
        else:
            raise ValueError('Invalid age')

    def __repr__(self):
        return f'Person(name={self.name}, age={self.age})'
```

Setting `city` raises an `AttributeError` (there's no slot for it), and Guido's age raises a `ValueError`:

```python run
persons = []
for name, attributes in data.items():
    try:
        p = Person(name)
        for attrib_name, attrib_value in attributes.items():
            try:
                setattr(p, attrib_name, attrib_value)
            except AttributeError:
                print(f'ignoring attribute: {name}.{attrib_name}={attrib_value}')
    except ValueError as ex:
        print(f'Data for Person({name}) contains an invalid attribute value: {ex}')
    else:
        persons.append(p)

print(persons)
```

The inner `try` handles the `AttributeError` completely, so the outer `try` never hears about it and its `else` still appends Bryan. The `ValueError` isn't matched by the inner handler, so it propagates to the outer one, which skips Guido. Doing the same with a single level of handling needs a flag variable and a `break`, which is harder to follow.

## Handling at different levels of the call stack

Handlers can just as well live in different functions. Here two helper functions convert a value to a `bool`. Each raises `TypeError` if it doesn't accept that type at all, and `ValueError` if it accepts the type but not the value:

```python run
def convert_int(val):
    if not isinstance(val, int):        # True and False are ints too
        raise TypeError()
    if val not in {0, 1}:
        raise ValueError('Integer values 0 or 1 only')
    return bool(val)

def convert_str(val):
    if not isinstance(val, str):
        raise TypeError()
    val = val.casefold()                # case-insensitive comparison
    if val in {'0', 'f', 'false'}:
        return False
    elif val in {'1', 't', 'true'}:
        return True
    else:
        raise ValueError('Admissible string values are: T, F, True, False (case insensitive)')

class ConversionError(Exception):
    pass

def make_bool(val):
    try:
        try:
            b = convert_int(val)
        except TypeError:
            # not an int, so try it as a string
            try:
                b = convert_str(val)
            except TypeError:
                raise ConversionError(f'The type {type(val).__name__} cannot be converted to a bool')
    except ValueError as ex:
        # a ValueError from either converter ends up here
        raise ConversionError(f'The value {val} cannot be converted to a bool: {ex}')
    else:
        return b

for value in [True, 0, 'T', 'false', 10, 'ABC', 1.0]:
    try:
        result = make_bool(value)
    except ConversionError as ex:
        result = str(ex)
    print(value, '->', result)
```

Notice the style: `make_bool` never checks the type before calling a converter. It just **tries** `convert_int`, and if that complains about the type, it tries `convert_str`. Whatever goes wrong, the caller only has to know about one exception, `ConversionError`.

## EAFP vs LBYL

That style has a name: **EAFP**, "it's Easier to Ask Forgiveness than Permission". The alternative, **LBYL** ("Look Before You Leap"), checks every precondition first so that nothing can fail. Python code generally favors EAFP. Here's why. We want `seq[idx]`, or a default if that doesn't work:

```python run
def get_item_forgive_me(seq, idx, default=None):
    try:
        return seq[idx]
    except (IndexError, TypeError, KeyError):
        return default

def get_item_ask_perm(seq, idx, default=None):
    if hasattr(seq, '__getitem__'):
        if isinstance(seq, dict):
            return seq.get(idx, default)
        elif isinstance(idx, int) and idx < len(seq):
            return seq[idx]
    return default

print(get_item_forgive_me([1, 2, 3], 10, 'Nope'), get_item_ask_perm([1, 2, 3], 10, 'Nope'))
print(get_item_forgive_me({'a': 100}, 'a'), get_item_ask_perm({'a': 100}, 'a'))
```

The LBYL version already needed a special case for dictionaries. Now give both an object that supports indexing but has no length, such as an infinite sequence:

```python run
class ConstantSequence:
    def __init__(self, val):
        self.val = val
    def __getitem__(self, idx):
        return self.val

seq = ConstantSequence(10)
print(get_item_forgive_me(seq, 10, 'Nope'))
try:
    print(get_item_ask_perm(seq, 10, 'Nope'))
except TypeError as ex:
    print('TypeError:', ex)
```

The "look first" version keeps needing more checks, and each check is a guess about what the object can do. The EAFP version asks the only question that matters: *can this object do `seq[idx]`?* That fits Python's duck typing. EAFP also avoids race conditions where the situation changes between the check and the action (a file deleted right after you checked that it exists).

LBYL isn't wrong, though. When the check is simple and the failure is common, an `if` can be clearer, as with `if key in d`. The `make_bool` above is arguably easier to read when written with `isinstance` checks. Choose whichever makes the intent clearest.

<div class="callout modern">
<span class="callout-title">Modern Python: "zero-cost" try (3.11+)</span>

Before 3.11, entering a `try` block executed a setup instruction that pushed a handler block onto a stack, so every pass through a `try` cost a little. Since 3.11, the compiler instead writes an **exception table** next to the bytecode, mapping ranges of instructions to their handlers. Nothing runs when you enter a `try`; the table is consulted only when an exception is actually raised. You can see that there's no setup instruction, just a `NOP` where the `try` starts, and the table at the end:

```python run
import dis

def guarded():
    try:
        x = 1
    except ValueError:
        x = 2
    return x

dis.dis(guarded)
```

So wrapping code in `try` is essentially free when nothing goes wrong. *Raising* and catching an exception still costs real work (creating the exception object, building the traceback, finding the handler):

```python run
from timeit import timeit

def loop_plain():
    for i in range(100_000):
        pass

def loop_try_no_raise():
    for i in range(100_000):
        try:
            pass
        except ValueError:
            pass

def loop_try_raise():
    for i in range(100_000):
        try:
            raise ValueError
        except ValueError:
            pass

for fn in (loop_plain, loop_try_no_raise, loop_try_raise):
    print(f'{fn.__name__:18}: {timeit(fn, number=5):.3f}s')
```

The first two take about the same time, and raising is many times slower. In practice: use `try` freely for things that *occasionally* fail, but don't use exceptions as the normal path of a tight loop.

</div>

## Handling several exceptions at once: `except*`

Sometimes several independent things fail at the same time: you validate a form and three fields are wrong, or you run five tasks concurrently and two crash. Raising only the first error throws away information. Python 3.11 added **exception groups** for this.

<div class="callout modern">
<span class="callout-title">Modern Python: ExceptionGroup and except* (3.11+)</span>

An `ExceptionGroup` bundles a message and a list of exceptions (which may themselves be groups). You raise it like any exception:

```python run
def validate(user):
    errors = []
    if not user.get('name'):
        errors.append(ValueError('name is required'))
    if not isinstance(user.get('age'), int):
        errors.append(TypeError('age must be an int'))
    if 'email' not in user:
        errors.append(KeyError('email'))
    if errors:
        raise ExceptionGroup('invalid user', errors)

try:
    validate({'name': '', 'age': 'old'})
except ExceptionGroup as eg:
    print(repr(eg))
    print(eg.exceptions)
```

A plain `except` treats the group as one exception. The new **`except*`** syntax instead looks *inside* the group. Each `except*` clause extracts every exception in the group that matches its type (at any nesting depth) and receives them as a smaller group. Unlike plain `except`, **several** `except*` clauses can run for one group:

```python run
try:
    validate({'name': '', 'age': 'old'})
except* ValueError as eg:
    print('value problems:', eg.exceptions)
except* (TypeError, KeyError) as eg:
    print('type/key problems:', eg.exceptions)
```

Anything no `except*` clause matched is re-raised automatically, still wrapped in a group:

```python run
try:
    try:
        validate({'name': '', 'age': 'old'})
    except* ValueError as eg:
        print('handled here:', eg.exceptions)
except* (TypeError, KeyError) as eg:
    print('escaped to the outer handler:', eg.exceptions)
```

And a plain exception caught by `except*` is wrapped in a group (with an empty message) for you, so the handler always gets a group:

```python run
try:
    raise ValueError('single')
except* ValueError as eg:
    print(repr(eg))
```

In a single `try`, you can use `except` or `except*`, not both. The standard library raises groups from `asyncio.TaskGroup`, and you'll see them whenever you want to report *all* the failures rather than only the first.

</div>

<div class="takeaways">

## Key takeaways

- `except` clauses are tried top to bottom and the **first** match wins, so put specific types before general ones. A tuple catches several types.
- An unmatched exception propagates as if the `try` weren't there. The `as` name is deleted when the handler ends.
- `finally` always runs, even on `return` or an unhandled exception; it's for cleanup. Never `return` from it.
- `else` runs only when the `try` block raised nothing, which is **not** the same as code after the `try`. It also keeps the guarded block small.
- Python favors **EAFP** (try it and handle the failure) over **LBYL** (check everything first), but choose whatever is clearest.
- Since 3.11, entering `try` costs nothing; raising is what's expensive.
- `ExceptionGroup` carries several exceptions at once; `except*` handles the matching parts and re-raises the rest (3.11+).

</div>
