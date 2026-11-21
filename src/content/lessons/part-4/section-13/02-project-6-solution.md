---
title: Project 6 - Solution
summary: A step-by-step build of the widget shop's exceptions, from the base class with two messages, through HTTP statuses, JSON responses and logging with tracebacks, to the full hierarchy in use.
minutes: 18
---

## Step 1: sketch the hierarchy

Before writing any code, turn the category list into a tree. Each category becomes an intermediate class, each situation a leaf, and everything hangs off one base class:

```text
WidgetException
├── SupplierException
│   ├── NotManufacturedException
│   ├── ProductionDelayedException
│   └── ShippingDelayedException
└── CheckoutException
    ├── InventoryException
    │   └── OutOfStockException
    └── PricingException
        ├── InvalidCouponCodeException
        └── CannotStackCouponException
```

The intermediate classes aren't just decoration. A handler that retries supplier calls can catch `SupplierException`, a checkout page can catch `CheckoutException`, and the outermost web layer catches `WidgetException`. All the shared behavior (messages, status, logging, JSON) goes in the base class, so the subclasses stay tiny.

## Step 2: the base class and its two messages

The base class stores the default internal message as a **class attribute**. Subclasses will override it. The `__init__`:

- takes any positional arguments, like every built-in exception, and treats the first one as the internal message;
- takes `customer_message` as a **keyword-only** argument, defaulting to the internal message;
- calls `super().__init__()` so that `args`, `str()` and `repr()` work. If there were no arguments it passes the class's default message, so `str(ex)` is never empty.

```python run
class WidgetException(Exception):
    """Base exception for the Widget application."""
    message = 'Generic Widget exception.'

    def __init__(self, *args, customer_message=None):
        if args:
            self.message = args[0]
        else:
            args = (self.message,)
        super().__init__(*args)
        self.customer_message = (customer_message if customer_message is not None
                                 else self.message)

ex1 = WidgetException('some custom message', 10, 100)
ex2 = WidgetException(customer_message='A custom user message.')

for ex in (ex1, ex2):
    print(repr(ex), '| message:', ex.message, '| customer:', ex.customer_message)
```

`self.message = args[0]` creates an *instance* attribute that shadows the class default for this one exception only; `ex2` still uses the class's default message.

<div class="callout note">
<span class="callout-title">Unpack the arguments</span>

`super().__init__(*args)` with the star matters. Writing `super().__init__(args)` passes the whole tuple as **one** argument, so `args` becomes a tuple inside a tuple and the extra arguments seem to vanish:

```python run
class Broken(Exception):
    def __init__(self, *args):
        super().__init__(args)          # missing *

b = Broken('message', 10, 100)
print(b.args, '| args[1:] =', b.args[1:])
print(WidgetException('message', 10, 100).args[1:])
```

</div>

## Step 3: an HTTP status and a JSON response

The status is another class attribute: `500` in the base class, overridden where needed. `to_json` builds a dictionary and serializes it. `HTTPStatus` members have a `.value` (the number) and a `.phrase` (the standard text), which we use as a prefix for the customer message. The timestamp is timezone-aware, as `datetime.utcnow()` is deprecated since Python 3.12.

Since we'll keep adding to the class, here is the base class with everything so far plus `to_json`:

```python run
import json
from datetime import datetime, timezone
from http import HTTPStatus

class WidgetException(Exception):
    """Base exception for the Widget application."""
    message = 'Generic Widget exception.'
    http_status = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init__(self, *args, customer_message=None):
        if args:
            self.message = args[0]
        else:
            args = (self.message,)
        super().__init__(*args)
        self.customer_message = (customer_message if customer_message is not None
                                 else self.message)

    def to_json(self):
        response = {
            'code': self.http_status.value,
            'message': f'{self.http_status.phrase}: {self.customer_message}',
            'category': type(self).__name__,
            'time_utc': datetime.now(timezone.utc).isoformat(),
        }
        return json.dumps(response)

e = WidgetException('custom internal message', customer_message='custom user message')
print(e.to_json())
print(json.loads(e.to_json())['message'])
```

The internal message never leaves the server; the customer only sees their message and a status.

## Step 4: logging, with the traceback

`log_exception` gathers the details into a dictionary, prints a log line and returns the record (returning it makes the method easy to test and lets a caller send it to a real logging system).

For the bonus, we need the traceback as text. `repr(ex.__traceback__)` only gives `<traceback object at 0x...>`, but the `traceback` module can format it. There are two equivalent ways:

```python run
import traceback

try:
    raise ValueError('demo')
except ValueError as ex:
    print(repr(ex.__traceback__))
    print(traceback.format_exception(ex))
    print(list(traceback.TracebackException.from_exception(ex).format()))
```

Both produce the same list of strings, exactly what Python would print for an uncaught exception, including any chained exceptions and notes. `TracebackException.from_exception(...).format()` returns a generator, so it needs `list()` (or `''.join(...)`) to see the lines.

<div class="callout modern">
<span class="callout-title">Modern Python: simpler traceback formatting (3.10+)</span>

Before 3.10, `traceback.format_exception` needed three arguments, `(type(ex), ex, ex.__traceback__)`, which is why older code reaches for `TracebackException`. Since 3.10 you can pass the exception alone, as above. Formatted tracebacks also include any notes added with `add_note()` (3.11+), so context added while the exception propagated ends up in your logs for free.

</div>

We expose the formatted traceback as a property, so it's available even without logging:

```python run
class WidgetException(Exception):
    """Base exception for the Widget application."""
    message = 'Generic Widget exception.'
    http_status = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init__(self, *args, customer_message=None):
        if args:
            self.message = args[0]
        else:
            args = (self.message,)
        super().__init__(*args)
        self.customer_message = (customer_message if customer_message is not None
                                 else self.message)

    @property
    def traceback_lines(self):
        return traceback.format_exception(self)

    def log_exception(self):
        record = {
            'type': type(self).__name__,
            'http_status': self.http_status.value,
            'message': self.message,
            'args': self.args[1:],
            'time_utc': datetime.now(timezone.utc).isoformat(),
            'traceback': self.traceback_lines,
        }
        print(f"EXCEPTION {record['time_utc']}: {record['type']}: {record['message']} {record['args']}")
        return record

    def to_json(self):
        response = {
            'code': self.http_status.value,
            'message': f'{self.http_status.phrase}: {self.customer_message}',
            'category': type(self).__name__,
            'time_utc': datetime.now(timezone.utc).isoformat(),
        }
        return json.dumps(response)
```

Inside the property, `self` *is* the exception, which is all `format_exception` needs. Let's check it on an exception that was created but never raised, and on one that was raised while another was being handled:

```python run
e = WidgetException('never raised')
print(e.traceback_lines)

try:
    a = 1 / 0
except ZeroDivisionError:
    try:
        raise WidgetException('raised during another error', 'order=1001')
    except WidgetException as ex:
        record = ex.log_exception()
        print()
        print(''.join(record['traceback']))
```

The unraised exception has no frames yet, only its `Type: message` line, because the traceback is built as an exception propagates. The raised one shows its full chain, including the `ZeroDivisionError` it was raised during. (Its last line shows the whole `args` tuple because we passed two arguments; that's how `str()` works for every exception.)

## Step 5: the full hierarchy

With the base class finished, each subclass only states what differs: its default `message`, and `http_status` for the two coupon errors. Everything else is inherited:

```python run
class SupplierException(WidgetException):
    message = 'Supplier exception.'

class NotManufacturedException(SupplierException):
    message = 'Widget is no longer manufactured by supplier.'

class ProductionDelayedException(SupplierException):
    message = 'Widget production has been delayed by supplier.'

class ShippingDelayedException(SupplierException):
    message = 'Widget shipping has been delayed by supplier.'

class CheckoutException(WidgetException):
    message = 'Checkout exception.'

class InventoryException(CheckoutException):
    message = 'Checkout inventory exception.'

class OutOfStockException(InventoryException):
    message = 'Inventory out of stock.'

class PricingException(CheckoutException):
    message = 'Checkout pricing exception.'

class InvalidCouponCodeException(PricingException):
    message = 'Invalid checkout coupon code.'
    http_status = HTTPStatus.BAD_REQUEST

class CannotStackCouponException(PricingException):
    message = 'Cannot stack checkout coupon codes.'
    http_status = HTTPStatus.BAD_REQUEST

for cls in (OutOfStockException, InvalidCouponCodeException, CannotStackCouponException):
    ex = cls()
    print(f'{cls.__name__:28} {ex.http_status.value}  {ex}')
```

Writing `http_status = HTTPStatus.INTERNAL_SERVER_ERROR` in every subclass would also work, but it's redundant: if the default ever changes, you'd have to change it in ten places.

## Step 6: using it

Here's a toy checkout that can fail in several ways, and a web-layer function that turns *any* widget exception into a response with a single `except` clause:

```python run
STOCK = {'blue-widget': 3, 'red-widget': 0}
VALID_COUPONS = {'SAVE10'}

def checkout(item, quantity, coupons=()):
    if STOCK.get(item, 0) < quantity:
        raise OutOfStockException(f'{item}: requested {quantity}, have {STOCK.get(item, 0)}',
                                  customer_message=f'Sorry, {item} is out of stock.')
    if len(coupons) > 1:
        raise CannotStackCouponException(f'coupons={coupons}',
                                         customer_message='Only one coupon per order.')
    for code in coupons:
        if code not in VALID_COUPONS:
            raise InvalidCouponCodeException(f'unknown coupon {code!r}',
                                             customer_message='Sorry, this coupon has expired.')
    STOCK[item] -= quantity
    return 'order placed'

def handle_checkout(*args, **kwargs):
    try:
        return checkout(*args, **kwargs)
    except WidgetException as ex:
        ex.log_exception()
        return ex.to_json()

print(handle_checkout('blue-widget', 1, coupons=['SAVE10']))
print(handle_checkout('red-widget', 1))
print(handle_checkout('blue-widget', 1, coupons=['OLD5']))
print(handle_checkout('blue-widget', 1, coupons=['SAVE10', 'OLD5']))
```

The internal message, with its details, goes to the log; the customer gets the friendly message and the right status code. And because the hierarchy has intermediate classes, other code can be more selective, for instance retrying only `SupplierException`s, or showing pricing problems next to the coupon field:

```python run
try:
    checkout('blue-widget', 1, coupons=['OLD5'])
except PricingException as ex:
    print('show next to the coupon field:', ex.customer_message)
```

<div class="takeaways">

## Key takeaways

- Design the tree first; a single base class plus intermediate categories lets callers catch errors at the level of detail they need.
- Class attributes hold per-type defaults (`message`, `http_status`); the base `__init__` lets one instance override them, with `customer_message` keyword-only.
- Always unpack: `super().__init__(*args)`, and pass the default message when there are no args, so `args` and `str()` behave.
- `HTTPStatus` provides `.value` and `.phrase`; `json.dumps` builds the response; use timezone-aware UTC timestamps.
- `traceback.format_exception(self)` (3.10+) formats the traceback, chain and notes. An exception that was never raised has no frames.

</div>
