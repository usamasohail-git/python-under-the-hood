---
title: Project 5 - Solution
summary: The problem statement and a step-by-step solution, building an AppException enumeration whose members carry an error code, an exception class and a default message, and can raise themselves.
minutes: 20
---

## The problem

Imagine an application that raises exceptions from dozens of places. We want the exceptions it raises to be **consistent**: the same kind of failure should always raise the same exception type, carry the same numeric error code and use the same wording. We'd also like a single place that lists every error the application can produce.

The task is to solve this with an **enumeration** called `AppException`. Each member describes one kind of error:

| Member | Code | Exception class | Default message |
|---|---|---|---|
| `Generic` | 100 | `GenericException` (custom) | `Application exception.` |
| `Timeout` | 101 | `Timeout` (custom) | `Timeout connecting to resource.` |
| `NotAnInteger` | 200 | `ValueError` | `Value must be an integer.` |
| `NotAList` | 201 | `ValueError` | `Value must be a list.` |

### Goals

1. **Describe each error once.** Every member stores its code, its exception class and its default message. The **code** must be the member's value, so `AppException(201)` finds `NotAList`, and lookup by name (`AppException['NotAList']`) works too. Expose the code as a `code` property, the class as `exception` and the message as `message`.
2. **Raise in one call.** `AppException.Timeout.throw()` raises a `Timeout` exception whose message is `'101 - Timeout connecting to resource.'`, i.e. `'<code> - <message>'`. An optional argument overrides the default message: `AppException.Timeout.throw('Timeout connecting to database.')` raises `Timeout('101 - Timeout connecting to database.')`.
3. **List the errors.** Produce a catalog of every error as `(name, code, message)` tuples, in definition order.

The method can't be called `raise`, because that's a reserved keyword, hence `throw`.

### Hints

- Each member is assigned a 3-tuple. Recall from the customizing lesson how `__new__` can unpack such a tuple and choose the member's `_value_`.
- Exception classes are ordinary objects, so you can store one in an attribute and call it later to create an exception instance.
- Iterating the enumeration gives every member in definition order.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution, open the **Practice** page for this section. Each goal is an auto-graded exercise with starter code and tests. Then come back and compare your approach with the walkthrough below.

</div>

## Step 1: the custom exceptions

Two of the errors use exception classes of our own. For now they are minimal subclasses of `Exception`; the section on exceptions explains why a real application would arrange them in a hierarchy.

```python run
class GenericException(Exception):
    pass

class Timeout(Exception):
    pass
```

## Step 2: three pieces of data per member

Each member needs three things, so the obvious first step is to assign a 3-tuple. But if we stop there, the member's value is the entire tuple, and the lookup by code from goal 1 fails:

```python run
from enum import Enum

class AppException(Enum):
    Generic = (100, GenericException, 'Application exception.')
    Timeout = (101, Timeout, 'Timeout connecting to resource.')

print(AppException.Timeout.value)
try:
    AppException(101)
except ValueError as ex:
    print('ValueError:', ex)
```

The fix is the `__new__` technique. When the class is created, each assigned tuple is unpacked into `__new__`'s arguments. We build the member with `object.__new__(cls)`, make the **code** its `_value_`, and attach the class and message as ordinary attributes:

```python run
class AppException(Enum):
    Generic = (100, GenericException, 'Application exception.')
    Timeout = (101, Timeout, 'Timeout connecting to resource.')
    NotAnInteger = (200, ValueError, 'Value must be an integer.')
    NotAList = (201, ValueError, 'Value must be a list.')

    def __new__(cls, ex_code, ex_class, ex_message):
        member = object.__new__(cls)
        member._value_ = ex_code
        member.exception = ex_class
        member.message = ex_message
        return member

print(AppException.Timeout.value, AppException.Timeout.exception, AppException.Timeout.message)
print(repr(AppException(201)), repr(AppException['NotAList']))
```

Why `__new__` rather than `__init__`? By the time `__init__` runs, the member's value has already been registered as the full tuple, so `AppException(201)` would still fail. `__new__` is where the value gets decided.

Note that `Timeout` inside the class body still refers to our exception class: the right-hand side `(101, Timeout, ...)` is evaluated *before* the name `Timeout` is bound in the class namespace.

We could already raise an exception by hand from this:

```python run
try:
    ex = AppException.Timeout
    raise ex.exception(f'{ex.value} - {ex.message}')
except Timeout as err:
    print(type(err).__name__, '->', err)
```

It works, but it's long, and every call site would have to get the format string right. That's exactly the inconsistency we're trying to avoid.

## Step 3: a `code` property and a `throw` method

Two additions finish goals 1 and 2. A read-only `code` property gives the value a meaningful name. We keep the value itself as the code, because that's what makes `AppException(201)` work. And a `throw` method builds the message and raises the exception, so the format lives in exactly one place:

```python run
from enum import Enum, unique

@unique
class AppException(Enum):
    Generic = (100, GenericException, 'Application exception.')
    Timeout = (101, Timeout, 'Timeout connecting to resource.')
    NotAnInteger = (200, ValueError, 'Value must be an integer.')
    NotAList = (201, ValueError, 'Value must be a list.')

    def __new__(cls, ex_code, ex_class, ex_message):
        member = object.__new__(cls)
        member._value_ = ex_code
        member.exception = ex_class
        member.message = ex_message
        return member

    @property
    def code(self):
        return self.value

    def throw(self, message=None):
        if message is None:
            message = self.message
        raise self.exception(f'{self.code} - {message}')
```

A few design decisions are worth spelling out:

- **`@unique`.** Codes are meant to identify errors. If someone later adds a member that reuses code `201`, Python would silently make it an *alias* of `NotAList`, so raising it would use `NotAList`'s exception class and message. `@unique` turns that mistake into an error when the module is imported.
- **`message is None` rather than `message or self.message`.** The `or` version also replaces an empty string or any other falsy argument. Testing for `None` replaces the message only when the caller really didn't pass one.
- **`throw` raises, it doesn't return.** The caller writes `AppException.NotAList.throw()` at the point of failure, just as it would write a `raise` statement.

Let's try it:

```python run
try:
    AppException.NotAnInteger.throw()
except ValueError as ex:
    print(type(ex).__name__, '->', ex)

try:
    AppException.Timeout.throw()
except Timeout as ex:
    print(type(ex).__name__, '->', ex)

try:
    AppException.Timeout.throw('Timeout connecting to database.')
except Timeout as ex:
    print(type(ex).__name__, '->', ex)
```

Because each member raises a normal exception, callers handle these errors with ordinary `except` clauses: `except ValueError` catches both `NotAnInteger` and `NotAList`, and `except Timeout` catches only the timeout.

Lookup by code or by name is useful when errors are reported elsewhere, for example when an error code arrives in a log line or an API response and we want its standard message:

```python run
print(AppException(200).message)
print(AppException['Generic'].code, AppException['Generic'].exception.__name__)
```

And `@unique` really does guard the codes:

```python run
try:
    @unique
    class Broken(Enum):
        NotAList = (201, ValueError, 'Value must be a list.')
        NotATuple = (201, ValueError, 'Value must be a tuple.')

        def __new__(cls, ex_code, ex_class, ex_message):
            member = object.__new__(cls)
            member._value_ = ex_code
            member.exception = ex_class
            member.message = ex_message
            return member
except ValueError as ex:
    print('ValueError:', ex)
```

## Step 4: listing every error

Goal 3 is the easiest, because enumerations are iterable in definition order. A comprehension produces the catalog:

```python run
catalog = [(ex.name, ex.code, ex.message) for ex in AppException]
for row in catalog:
    print(row)
```

If you want the catalog to be part of the enumeration's API, make it a class method; methods aren't members, so adding one doesn't change the list of errors. And since all the machinery (`__new__`, `code`, `throw`, `catalog`) is generic, it can move into a **member-less base enumeration**, exactly like the reusable bases in the customizing lesson. The concrete enumeration is then just the table of errors:

```python run
class ErrorEnum(Enum):
    def __new__(cls, ex_code, ex_class, ex_message):
        member = object.__new__(cls)
        member._value_ = ex_code
        member.exception = ex_class
        member.message = ex_message
        return member

    @property
    def code(self):
        return self.value

    def throw(self, message=None):
        if message is None:
            message = self.message
        raise self.exception(f'{self.code} - {message}')

    @classmethod
    def catalog(cls):
        return [(ex.name, ex.code, ex.message) for ex in cls]


@unique
class AppException(ErrorEnum):
    Generic = (100, GenericException, 'Application exception.')
    Timeout = (101, Timeout, 'Timeout connecting to resource.')
    NotAnInteger = (200, ValueError, 'Value must be an integer.')
    NotAList = (201, ValueError, 'Value must be a list.')

print(len(AppException), AppException.catalog()[-1])
try:
    AppException.NotAList.throw()
except ValueError as ex:
    print('ValueError:', ex)
```

A second module could now define its own `DatabaseError(ErrorEnum)` table and get the same behavior for free. In the practice exercises you'll also add a class method that finds every error raising a given exception class.

## Where this design shines, and its limits

The enumeration gives us one authoritative table of errors: codes can't be duplicated (thanks to `@unique`), members can't be modified at run time, and the full list is always available for documentation or a help screen. Raising an error is short and uniform everywhere in the code.

The limitation is that the exception classes are stored *outside* the enumeration and chosen per member, so the type tells you only the broad kind of error (`ValueError`), not which member raised it. The error code in the message carries that detail. When we study exceptions properly, we'll build a hierarchy of custom exception classes, which lets callers catch errors at whatever level of detail they need.

<div class="takeaways">

## Key takeaways

- An enumeration makes a good single source of truth for an application's errors: each member describes one error.
- `__new__` unpacks each member's tuple, sets `_value_` to the error code (so `AppException(code)` works) and stores the exception class and message as attributes.
- A `code` property and a `throw(message=None)` method keep the message format and the raising logic in one place. Test `message is None`, not truthiness, when deciding whether to use the default.
- `@unique` prevents two errors from silently sharing a code (which would make one an alias of the other).
- Iterating the members, optionally from a `@classmethod`, produces a catalog of every error in definition order.

</div>
