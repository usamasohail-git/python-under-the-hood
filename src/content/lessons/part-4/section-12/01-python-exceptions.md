---
title: Python Exceptions
summary: Exceptions are instances of classes in a hierarchy rooted at BaseException. Raising one interrupts normal flow and sends it up the call stack until a matching except clause catches it.
minutes: 16
---

## Exceptions are just objects

When something goes wrong, Python creates an **exception object** and *raises* it. Before looking at the raising part, notice that the object itself is nothing special. Exception types are ordinary classes, and you can create an instance like any other object:

```python run
print(type(Exception))        # a class, like any other

ex = Exception('something went wrong')
print(type(ex), ex.__class__)
print(isinstance(ex, BaseException))
```

Creating `ex` didn't stop anything. The program carried on normally, because an exception only has an effect when it is **raised**. Raising starts what you can think of as an *exception workflow*: Python stops executing the current code, and begins looking for a piece of code that has said it can **handle** this kind of exception.

Most built-in exceptions have a useful `str` (the message) and `repr` (how to re-create it):

```python run
ex = ValueError('custom message')
print(str(ex))
print(repr(ex))
```

<div class="callout modern">
<span class="callout-title">Modern Python: no trailing comma in the repr</span>

Before Python 3.7, an exception's repr included a stray comma, like `ValueError('custom message',)`, because it simply showed the `args` tuple. Older notebooks show that form. Since 3.7 the repr looks like a normal constructor call: `ValueError('custom message')`.

</div>

## The exception hierarchy

All exceptions inherit from **`BaseException`**. Only a handful of special ones inherit from it directly; everything you normally deal with derives from its subclass **`Exception`**, and is grouped further into families:

<figure class="diagram">
<svg viewBox="0 0 680 410" role="img" aria-label="The built-in exception hierarchy. BaseException has the direct subclasses SystemExit, KeyboardInterrupt, GeneratorExit, BaseExceptionGroup and Exception. Exception has many subclasses, including ArithmeticError, LookupError, ValueError, TypeError, AttributeError, NameError, ImportError, OSError, RuntimeError, StopIteration, AssertionError and ExceptionGroup.">
<defs>
<marker id="eh1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker>
</defs>
<rect x="10" y="14" width="150" height="32" rx="8" class="d-name"/><text x="22" y="35" class="d-text">BaseException</text>
<path d="M30 46 V235" class="d-arrow"/>
<path d="M30 75 H50 M30 115 H50 M30 155 H50 M30 195 H50 M30 235 H50" class="d-arrow"/>
<rect x="50" y="60" width="165" height="30" rx="8" class="d-obj"/><text x="62" y="80" class="d-text">SystemExit</text>
<rect x="50" y="100" width="165" height="30" rx="8" class="d-obj"/><text x="62" y="120" class="d-text">KeyboardInterrupt</text>
<rect x="50" y="140" width="165" height="30" rx="8" class="d-obj"/><text x="62" y="160" class="d-text">GeneratorExit</text>
<rect x="50" y="180" width="165" height="30" rx="8" class="d-obj"/><text x="62" y="200" class="d-text">BaseExceptionGroup</text>
<rect x="50" y="220" width="165" height="30" rx="8" class="d-obj-hl"/><text x="62" y="240" class="d-text">Exception</text>
<path d="M215 235 L226 235" class="d-arrow-hl" marker-end="url(#eh1)"/>
<text x="12" y="285" class="d-sub">The four siblings of Exception</text>
<text x="12" y="301" class="d-sub">signal "stop" (exit, Ctrl+C,</text>
<text x="12" y="317" class="d-sub">closing a generator) rather</text>
<text x="12" y="333" class="d-sub">than errors. Don't catch them</text>
<text x="12" y="349" class="d-sub">by accident.</text>
<rect x="230" y="10" width="440" height="390" rx="10" class="d-obj"/>
<text x="246" y="34" class="d-sub">SUBCLASSES OF Exception (a selection)</text>
<text x="250" y="62" class="d-text">ArithmeticError</text>
<text x="270" y="86" class="d-text">ZeroDivisionError</text>
<text x="270" y="110" class="d-text">OverflowError</text>
<path d="M256 68 V106 M256 82 H266 M256 106 H266" class="d-arrow"/>
<text x="250" y="134" class="d-text">LookupError</text>
<text x="270" y="158" class="d-text">IndexError</text>
<text x="270" y="182" class="d-text">KeyError</text>
<path d="M256 140 V178 M256 154 H266 M256 178 H266" class="d-arrow"/>
<text x="250" y="206" class="d-text">ValueError</text>
<text x="270" y="230" class="d-text">UnicodeError</text>
<path d="M256 212 V226 M256 226 H266" class="d-arrow"/>
<text x="250" y="254" class="d-text">TypeError</text>
<text x="250" y="278" class="d-text">AttributeError</text>
<text x="250" y="302" class="d-text">NameError</text>
<text x="270" y="326" class="d-text">UnboundLocalError</text>
<path d="M256 308 V322 M256 322 H266" class="d-arrow"/>
<text x="250" y="350" class="d-text">ImportError</text>
<text x="270" y="374" class="d-text">ModuleNotFoundError</text>
<path d="M256 356 V370 M256 370 H266" class="d-arrow"/>
<text x="470" y="62" class="d-text">OSError</text>
<text x="490" y="86" class="d-text">FileNotFoundError</text>
<text x="490" y="110" class="d-text">PermissionError</text>
<text x="490" y="134" class="d-text">TimeoutError</text>
<path d="M476 68 V130 M476 82 H486 M476 106 H486 M476 130 H486" class="d-arrow"/>
<text x="470" y="158" class="d-text">RuntimeError</text>
<text x="490" y="182" class="d-text">NotImplementedError</text>
<text x="490" y="206" class="d-text">RecursionError</text>
<path d="M476 164 V202 M476 178 H486 M476 202 H486" class="d-arrow"/>
<text x="470" y="230" class="d-text">StopIteration</text>
<text x="470" y="254" class="d-text">AssertionError</text>
<text x="470" y="278" class="d-text">ExceptionGroup</text>
<text x="470" y="296" class="d-sub">(also a BaseExceptionGroup)</text>
</svg>
<figcaption>The core of the built-in hierarchy. Indented names are subclasses of the name above them: a <code>KeyError</code> is a <code>LookupError</code>, which is an <code>Exception</code>, which is a <code>BaseException</code>.</figcaption>
</figure>

You can check any link in that tree with `issubclass`, or print a class's whole ancestry with `__mro__`:

```python run
print(issubclass(IndexError, LookupError))
print(issubclass(LookupError, Exception))
print(IndexError.__mro__)
print(KeyboardInterrupt.__mro__)
```

`IndexError` reaches `BaseException` through `LookupError` and `Exception`. `KeyboardInterrupt` skips `Exception` entirely. That difference matters, as we'll see at the end of this lesson.

## Catching an exception

Python raises exceptions for you whenever an operation fails. Indexing past the end of a list raises an `IndexError`. To handle it, put the risky code in a `try` block and name the exception type in an `except` clause:

```python run
l = [1, 2, 3]

try:
    l[4]
except IndexError as ex:
    print(type(ex).__name__, ':', ex)
```

The `as ex` part binds the exception object to a name, so the handler can inspect it.

Here's the key rule: an `except` clause catches the type you name **and every subclass of it**. Because `IndexError` is a `LookupError`, and both are `Exception`s, all three of these handlers catch the same error:

```python run
for handler_type in (IndexError, LookupError, Exception):
    try:
        l[4]
    except handler_type as ex:
        print(f'caught by except {handler_type.__name__}: {type(ex).__name__}')
```

The exception is **still** an `IndexError` every time. The handler type is just a filter that decides which exceptions it accepts. This is the whole reason the hierarchy exists: you can be as specific (`KeyError`) or as general (`LookupError`) as your handler needs.

## How exceptions travel up the call stack

When an exception is raised inside a function and nothing in that function handles it, the function stops right there and the exception is passed to its **caller**, at the line that made the call. If the caller doesn't handle it either, it goes to the caller's caller, and so on. This is called **propagation**. If it reaches the top of the program unhandled, Python prints a **traceback** and the program ends.

```python run
import traceback

def func_1():
    func_2()

def func_2():
    func_3()

def func_3():
    raise ValueError('raised deep inside func_3')

try:
    func_1()
except ValueError:
    print(traceback.format_exc())
```

We caught the error only so the page can keep running, then printed the same traceback Python would show. Read a traceback **from the bottom up**: the last line is the exception type and message, and the frame just above it is where it was raised (`func_3`). Each frame higher up is one step back along the call chain: `func_2` called `func_3`, `func_1` called `func_2`, and the top-level code called `func_1`. Each frame shows the line of code that was running, and `~^^^` markers point at the exact expression involved.

You can stop the propagation at **any** level. Handle it in `func_2`, and `func_1` never even knows something went wrong:

```python run
def func_2():
    try:
        func_3()
    except ValueError:
        print('error occurred in func_3 - silencing it')

func_1()
print('the program carries on')
```

Once a handler has caught an exception, the exception workflow is over and normal execution continues after the `try` statement. Inside the handler you decide what happens: recover and carry on (as here), raise a different exception, or re-raise the same one. Those last two are the subject of the lesson on raising exceptions.

<div class="callout modern">
<span class="callout-title">Modern Python: tracebacks that point at the problem (3.10–3.13)</span>

Recent versions made tracebacks far more helpful. Since **3.11**, when the source is available, each frame underlines the exact expression that failed: `~` marks the surrounding expression and `^` the operation that raised. On a line like `d['a']['b']['c']`, that tells you *which* lookup hit `None`. To see it, this cell writes a small module to a real file (so Python can show its source) and calls it:

```python run
import sys, pathlib, importlib, traceback

pkg = pathlib.Path('/tmp/tb_demo')
pkg.mkdir(exist_ok=True)
(pkg / 'shapes.py').write_text('''\
def area(rect):
    return rect["w"] * rect["h"]

def total_area(rects):
    return sum(area(r) for r in rects)

def city(user):
    return user["address"]["city"]["name"]
''')
sys.path.insert(0, str(pkg))
importlib.invalidate_caches()
import shapes

try:
    shapes.total_area([{'w': 2, 'h': 3}, {'w': None, 'h': 4}])
except TypeError:
    print(traceback.format_exc())

try:
    shapes.city({'address': {'city': None}})
except TypeError:
    print(traceback.format_exc())
```

In the second traceback the carets sit under `["name"]`: it was `user["address"]["city"]` that turned out to be `None`.

Error **messages** got smarter too. Since 3.10, a typo in an attribute or variable name gets a *Did you mean* suggestion (3.12 extended this to `self.` attributes, imports and more):

```python run
import collections

try:
    collections.namedtupel
except AttributeError as ex:
    print(traceback.format_exception_only(ex)[0])
```

</div>

## Don't catch too broadly

Since `except Exception` catches nearly everything, it's tempting to use it as a safety net. The trouble is that it catches the errors you expected *and* the ones you didn't. Here's a generator that yields the squares of the first `max_n` items of a sequence, and is meant to stop quietly if the sequence runs out:

```python run
def square(seq, index):
    return seq[index] ** 2

def squares(seq, max_n):
    for i in range(max_n):
        try:
            yield square(seq, i)
        except Exception:      # meant for "index out of range"
            return

print(list(squares([1, 2, 3], 5)))
```

That works. Now pass in a sequence with a string in it:

```python run
print(list(squares([1, 2, '3', 4, 5], 10)))
```

We got `[1, 4]` and no hint that anything went wrong. `'3' ** 2` raised a `TypeError`, a genuine bug in the data, and the broad handler swallowed it as if the sequence had simply ended. Catch only what you mean to handle:

```python run
def squares(seq, max_n):
    for i in range(max_n):
        try:
            yield square(seq, i)
        except IndexError:     # exactly the situation we planned for
            return

print(list(squares([1, 2, 3], 10)))

try:
    list(squares([1, 2, '3', 4, 5], 10))
except TypeError as ex:
    print('TypeError:', ex)
```

The planned case still works, and the unexpected one is now loud. A broad handler does have legitimate uses, for example "roll back the database transaction if *anything* fails", but it should be a deliberate choice (and a context manager is often the cleaner tool for that job).

## Bare `except` and `BaseException`

An `except:` with no type at all is a **bare except**. It catches *everything*, including the `BaseException` subclasses that aren't errors:

```python run
try:
    1 / 0
except:
    print('exception occurred')
```

`except Exception` and a bare `except` are **not** the same. `SystemExit` (raised by `sys.exit()`) and `KeyboardInterrupt` (raised when the user presses Ctrl+C) deliberately sit outside `Exception`, so that a normal `except Exception` lets them through and the program can still be stopped:

```python run
import sys

try:
    try:
        sys.exit(2)
    except Exception:
        print('except Exception caught it')   # never printed
except SystemExit as ex:
    print('SystemExit got past except Exception, exit code', ex.code)
```

A bare `except` would have trapped that `SystemExit` and kept the program alive when someone asked it to quit. That's why bare `except` (and `except BaseException`) is reserved for rare cases such as top-level code that logs every failure and then re-raises it.

<div class="takeaways">

## Key takeaways

- Exceptions are instances of classes. Creating one does nothing; **raising** it starts the exception workflow.
- Everything derives from `BaseException`; normal errors derive from `Exception`. `SystemExit`, `KeyboardInterrupt` and `GeneratorExit` deliberately don't.
- `except SomeType` catches that type **and all its subclasses**, so the hierarchy decides what a handler accepts.
- Unhandled exceptions propagate up the call stack, one caller at a time. Read the traceback from the bottom up.
- Python 3.11+ underlines the failing expression in tracebacks, and 3.10+ suggests fixes for misspelled names.
- Catch the most specific exception you can handle. Broad handlers and bare `except` hide bugs.

</div>
