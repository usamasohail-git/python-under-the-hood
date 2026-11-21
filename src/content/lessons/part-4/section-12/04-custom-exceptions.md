---
title: Custom Exceptions
summary: Define your own exceptions by subclassing Exception, organize them into a hierarchy under one base class, give them attributes and methods, and use multiple inheritance to make them match built-in types too.
minutes: 18
---

## A custom exception is a subclass

To create your own exception type, subclass `Exception` (or any subclass of it). That's all it takes. A docstring is a statement on its own, so the class doesn't even need `pass`:

```python run
class DeadlineExceeded(Exception):
    """Raised when an operation takes longer than allowed."""

try:
    raise DeadlineExceeded('job 42 took longer than 5s', 42)
except DeadlineExceeded as ex:
    print(repr(ex))
    print(ex.args)
    print(isinstance(ex, Exception))
```

Everything is inherited from `BaseException`: the `*args` constructor, `args`, `str`/`repr`, tracebacks, chaining and notes. It behaves like any built-in exception, and can be caught as `DeadlineExceeded`, `Exception` or `BaseException`.

Why `Exception` and not `BaseException`? Because `BaseException`'s other direct children (`SystemExit`, `KeyboardInterrupt`, `GeneratorExit`) aren't errors, and everyone expects `except Exception` to catch application errors, yours included. Subclassing `BaseException` directly would make your exception slip past those handlers.

<div class="callout note">
<span class="callout-title">Don't shadow built-in names</span>

Pick names that don't collide with built-ins. Older notebooks define a custom `TimeoutError`, but Python already has a built-in `TimeoutError` (a subclass of `OSError`, since 3.3). A class with the same name hides the built-in in that module, and `except TimeoutError` then means different things in different files.

```python run
print(TimeoutError.__mro__)
```

</div>

You don't have to inherit from `Exception` directly. If your error is really a special kind of built-in error, subclass that, so existing handlers for the built-in type still catch it:

```python run
class ReadOnlyError(AttributeError):
    """Indicates an attribute is read-only."""

try:
    raise ReadOnlyError('Account number is read-only', 'BA10001')
except AttributeError as ex:            # catches our subclass too
    print(repr(ex))
```

## A hierarchy for your library

A library or larger application usually defines **one base exception**, and derives every other exception it raises from that. Here's a sketch for a web-scraping library:

```python run
class WebScraperException(Exception):
    """Base exception for WebScraper."""

class HTTPException(WebScraperException):
    """General HTTP exception for WebScraper."""

class InvalidUrlException(HTTPException):
    """The url is invalid (DNS lookup fails)."""

class TimeoutException(HTTPException):
    """General timeout exception in HTTP connectivity."""

class PingTimeoutException(TimeoutException):
    """Ping timed out."""

class LoadTimeoutException(TimeoutException):
    """Page load timed out."""

class ParserException(WebScraperException):
    """General page parsing exception."""
```

```text
WebScraperException
├── HTTPException
│   ├── InvalidUrlException
│   └── TimeoutException
│       ├── PingTimeoutException
│       └── LoadTimeoutException
└── ParserException
```

Users of the library can now choose their level of detail: handle one specific case, a whole family, or *anything* the library raises, without resorting to `except Exception` (which would also catch their own bugs):

```python run
for handler in (PingTimeoutException, TimeoutException, HTTPException, WebScraperException):
    try:
        raise PingTimeoutException('Ping to www.example.com timed out')
    except handler as ex:
        print(f'except {handler.__name__:20} caught {ex!r}')

try:
    raise ParserException('no <table> found')
except HTTPException:
    print('not reached: a parser error is not an HTTP error')
except WebScraperException as ex:
    print('library-wide handler:', repr(ex))
```

## Exceptions with data and behavior

Exception classes are ordinary classes, so they can have class attributes, an `__init__`, properties and methods. That lets you put the knowledge *about* an error into the error itself.

Suppose we're writing a REST API. Every error must be turned into an HTTP status and a message that's safe to show the user, which may differ from the detailed message we log. Without help from the exception classes, every endpoint repeats the same mapping:

```python run
from http import HTTPStatus

class APIException(Exception):
    """Base API exception."""

class ApplicationException(APIException):
    """Application error (not caused by the user): 5xx errors."""

class DBException(ApplicationException):
    """General database exception."""

class DBConnectionError(DBException):
    """Error connecting to the database."""

class ClientException(APIException):
    """Error caused by the user's request: 4xx errors."""

class NotFoundError(ClientException):
    """Resource was not found."""

class NotAuthorizedError(ClientException):
    """User may not perform the requested action."""

class Account:
    def __init__(self, account_id, account_type):
        self.account_id = account_id
        self.account_type = account_type

def lookup_account_by_id(account_id):
    # a stand-in for a database query that can fail in several ways
    if not isinstance(account_id, int) or account_id <= 0:
        raise ClientException(f'Account number {account_id} is invalid.')
    if account_id < 100:
        raise DBConnectionError('Permanent failure connecting to database.')
    elif account_id < 200:
        raise NotAuthorizedError('User does not have permissions to read this account')
    elif account_id < 300:
        raise NotFoundError('Account not found.')
    return Account(account_id, 'Savings')

def get_account(account_id):
    try:
        account = lookup_account_by_id(account_id)
    except ApplicationException as ex:
        return HTTPStatus.INTERNAL_SERVER_ERROR, str(ex)
    except NotFoundError:
        return HTTPStatus.NOT_FOUND, f'The account {account_id} does not exist.'
    except NotAuthorizedError:
        return HTTPStatus.UNAUTHORIZED, 'You do not have the proper authorization.'
    except ClientException as ex:
        return HTTPStatus.BAD_REQUEST, str(ex)
    else:
        return HTTPStatus.OK, {'id': account.account_id, 'type': account.account_type}

for account_id in ('abc', 50, 150, 250, 350):
    print(get_account(account_id))
```

It works, but the status code and user message for, say, `NotFoundError` should be the same everywhere. Let's move that knowledge into the classes. The base class gets defaults as **class attributes**, an `__init__` that lets callers override the messages, and two methods: one to build the JSON error response and one to log the details:

```python run
import json
from datetime import datetime, timezone

class APIException(Exception):
    """Base API exception."""
    http_status = HTTPStatus.INTERNAL_SERVER_ERROR
    internal_err_msg = 'API exception occurred.'
    user_err_msg = 'We are sorry. An unexpected error occurred on our end.'

    def __init__(self, *args, user_err_msg=None):
        if args:
            self.internal_err_msg = args[0]
            super().__init__(*args)
        else:
            super().__init__(self.internal_err_msg)
        if user_err_msg is not None:
            self.user_err_msg = user_err_msg

    def to_json(self):
        err_object = {'status': self.http_status, 'message': self.user_err_msg}
        return json.dumps(err_object)

    def log_exception(self):
        exception = {
            'type': type(self).__name__,
            'http_status': self.http_status,
            'message': self.args[0] if self.args else self.internal_err_msg,
            'args': self.args[1:],
        }
        print(f'EXCEPTION: {datetime.now(timezone.utc):%Y-%m-%d %H:%M:%S}: {exception}')

try:
    raise APIException()
except APIException as ex:
    print(repr(ex))
    ex.log_exception()
    print(ex.to_json())

try:
    raise APIException('custom message...', 10, 20, user_err_msg='custom user message')
except APIException as ex:
    print(repr(ex), '|', ex.user_err_msg)
```

A few design points:

- **Always call `super().__init__(...)`.** That's what fills `args`, and `str()`/`repr()` are built from `args`. When no message is given we pass the default `internal_err_msg`, so `str(ex)` is never empty.
- `user_err_msg` is **keyword-only** (it comes after `*args`), so it can never be confused with the positional message.
- Instance attributes set in `__init__` override the class-level defaults for that one exception; subclasses override the defaults by redefining the class attributes.
- `HTTPStatus` is an `IntEnum`, so `json.dumps` writes it as the plain number `500`.

<div class="callout modern">
<span class="callout-title">Modern Python: timezone-aware timestamps</span>

Older notebooks timestamp log entries with `datetime.utcnow()`. Since Python 3.12 that method is **deprecated** (it returns a "naive" datetime with no time zone attached, which is easy to misinterpret) and emits a `DeprecationWarning`. Use `datetime.now(timezone.utc)` (or, in 3.11+, `datetime.now(UTC)` after `from datetime import UTC`), which carries its time zone with it:

```python run
now = datetime.now(timezone.utc)
print(now.tzinfo, now.isoformat()[-6:])
```

</div>

Now each subclass only declares what's different about it:

```python run
class ApplicationException(APIException):
    """Application error (not caused by the user): 5xx errors."""
    internal_err_msg = 'Generic server side exception.'

class DBException(ApplicationException):
    """General database exception."""
    internal_err_msg = 'Database exception.'

class DBConnectionError(DBException):
    """Error connecting to the database."""
    internal_err_msg = 'DB connection error.'

class ClientException(APIException):
    """Error caused by the user's request: 4xx errors."""
    http_status = HTTPStatus.BAD_REQUEST
    internal_err_msg = 'Client submitted bad request.'
    user_err_msg = 'A bad request was received.'

class NotFoundError(ClientException):
    """Resource was not found."""
    http_status = HTTPStatus.NOT_FOUND
    internal_err_msg = 'Resource was not found.'
    user_err_msg = 'Requested resource was not found.'

class NotAuthorizedError(ClientException):
    """User may not perform the requested action."""
    http_status = HTTPStatus.UNAUTHORIZED
    internal_err_msg = 'Client not authorized to perform operation.'
    user_err_msg = 'You are not authorized to perform this request.'

def lookup_account_by_id(account_id):
    if not isinstance(account_id, int) or account_id <= 0:
        raise ClientException(f'Account number {account_id} is invalid.',
                              f'account_id = {account_id}',
                              'type error - account number not an integer')
    if account_id < 100:
        raise DBConnectionError('Permanent failure connecting to database.', 'db=db01')
    elif account_id < 200:
        raise NotAuthorizedError('User does not have permissions to read this account',
                                 f'account_id={account_id}')
    elif account_id < 300:
        raise NotFoundError('Account not found.', f'account_id={account_id}')
    return Account(account_id, 'Savings')
```

The endpoint collapses to a single handler, because every API exception knows how to log and describe itself:

```python run
def get_account(account_id):
    try:
        account = lookup_account_by_id(account_id)
    except APIException as ex:
        ex.log_exception()
        return ex.to_json()
    else:
        return HTTPStatus.OK, {'id': account.account_id, 'type': account.account_type}

for account_id in ('ABC', 50, 150, 250, 350):
    print(get_account(account_id))
    print()
```

Adding a new kind of error is now a matter of writing a small class; no endpoint needs to change.

## Inheriting from more than one exception

Sometimes you can't decide between a custom exception and a built-in one. A negative age is clearly a `ValueError`, but you'd also like it to be part of your application's hierarchy, so that `except AppException` catches it:

```python run
class AppException(Exception):
    """Generic application exception."""

class NegativeIntegerError(AppException):
    """An integer was negative."""

def set_age(age):
    if age < 0:
        raise NegativeIntegerError('age cannot be negative')

try:
    set_age(-10)
except ValueError:
    print('caught as ValueError')
except AppException as ex:
    print('only caught as AppException:', repr(ex))
```

Code that expects a `ValueError` for bad values misses it. Python's **multiple inheritance** solves this: a class can list several base classes, and it's then a subclass of **each** of them (full details come in the inheritance lessons; for exceptions this is all you need).

```python run
class NegativeIntegerError(AppException, ValueError):
    """An integer was negative."""

print(issubclass(NegativeIntegerError, AppException),
      issubclass(NegativeIntegerError, ValueError))

for handler in (NegativeIntegerError, AppException, ValueError):
    try:
        set_age(-10)
    except handler as ex:
        print(f'except {handler.__name__:20} caught {ex!r}')
```

Now the same exception is caught by application-wide handlers *and* by generic `ValueError` handlers. The standard library uses the same trick; for example `json.JSONDecodeError` is a `ValueError`.

## Custom exceptions in groups

Your own classes work with every modern feature too, including `except*` (3.11+). Because `except*` matches by type, a hierarchy lets you split a group of failures into families:

```python run
errors = [
    NotFoundError('Account not found.', 'account_id=250'),
    DBConnectionError('Permanent failure connecting to database.'),
    NotAuthorizedError('No permission', 'account_id=150'),
]

try:
    raise ExceptionGroup('batch lookup failed', errors)
except* ClientException as eg:
    print('client errors:', [type(e).__name__ for e in eg.exceptions])
except* ApplicationException as eg:
    print('server errors:', [type(e).__name__ for e in eg.exceptions])
```

<div class="takeaways">

## Key takeaways

- A custom exception is a subclass of `Exception` (or a more specific built-in such as `AttributeError`). A docstring is enough as its body.
- Give a library or app **one base exception** and derive everything from it, so users can catch your errors at any level of detail.
- Exceptions are classes: use class attributes for per-type defaults and methods for behavior such as logging or serializing. Always call `super().__init__()` so `args` and `str()` work.
- Multiple inheritance (`class E(AppException, ValueError)`) makes one exception match several handler types.
- Avoid names that shadow built-ins (like `TimeoutError`), and use timezone-aware datetimes instead of the deprecated `utcnow()`.

</div>
