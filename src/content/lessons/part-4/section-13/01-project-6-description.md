---
title: Project 6 - Description
summary: "Your task: design the exception hierarchy for a widget web shop, with separate internal and customer messages, an HTTP status per type, a logging method, a JSON response and (as a bonus) the traceback."
minutes: 8
---

## The scenario

You're building the backend of an online shop that sells widgets. Things go wrong in a web shop all the time: a supplier stops making a product, a shipment is late, an item is out of stock, a customer types an expired coupon code. Every one of these situations should be reported with an exception from **your** application, never with a bare `ValueError` or a generic `Exception`, so that the web layer can handle them all in one consistent way.

## The exception categories

Analysis of the shop has produced these categories:

```text
1. Supplier exceptions
   a. Not manufactured anymore
   b. Production delayed
   c. Shipping delayed

2. Checkout exceptions
   a. Inventory exceptions
      - out of stock
   b. Pricing exceptions
      - invalid coupon code
      - cannot stack coupons
```

Every category and every leaf becomes an exception class, and all of them derive, directly or indirectly, from one base class, `WidgetException`. That gives callers a choice: catch one precise situation (`OutOfStockException`), a family (`CheckoutException`), or anything the shop raises (`WidgetException`).

## The HTTP statuses

Each exception type carries an HTTP status code. Keep it simple: **500** (Internal Server Error) for everything, except the two coupon problems, which are the customer's fault and get **400** (Bad Request). The standard library's `http.HTTPStatus` enum has every status with its number and its standard phrase:

```python run
from http import HTTPStatus

for status in (HTTPStatus.INTERNAL_SERVER_ERROR, HTTPStatus.BAD_REQUEST):
    print(repr(status), '|', status.value, '|', status.phrase)
```

## Requirements

1. **The hierarchy.** A `WidgetException` base class (derived from `Exception`) and a subclass for every category and leaf listed above. Give each class a default internal `message` that describes it.
2. **Two messages.** Each exception has an internal message (for logs and developers) and a separate `customer_message` (safe to show to a customer). Both have sensible defaults: if you raise an exception with no arguments, the class's default message is used, and if no customer message is given, it's the same as the internal one. Extra positional arguments (an order number, a product id...) must be preserved in `args`.
3. **An HTTP status per type,** as described above.
4. **A logging method,** `log_exception()`, that records the exception's details: its type, message, extra arguments, the time it occurred (in UTC) and its HTTP status.
5. **A JSON method,** `to_json()`, that returns a JSON string to send back to the customer: the HTTP status code, the customer message (prefixed with the status phrase, e.g. `"Bad Request: Sorry, this coupon has expired."`), the exception category and a UTC timestamp.

**Bonus:** include the formatted **traceback** in what you log.

## Hints

- Use **class attributes** (`message`, `http_status`) for the per-type defaults. A subclass then only has to redefine what's different.
- Make `customer_message` a **keyword-only** parameter (`def __init__(self, *args, customer_message=None)`), so it can't be confused with the positional arguments.
- Call `super().__init__(...)` so `args`, `str()` and `repr()` keep working, and pass the default message when no arguments were given (otherwise `str(ex)` would be an empty string).
- For timestamps, use `datetime.now(timezone.utc)`; `datetime.utcnow()` is deprecated since Python 3.12.
- For the bonus, look at the `traceback` module: `traceback.format_exception(exc)` and `traceback.TracebackException.from_exception(exc).format()`. Inside a method, the exception is `self`.
- An exception that was created but never raised has no traceback frames yet. Test your traceback code on an exception you actually raised and caught.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution, open the **Practice** page for this section. The hierarchy, the messages, the HTTP status with the JSON response, and the logging with tracebacks are each an auto-graded exercise with starter code and tests. Then compare your approach with the walkthrough in the next lesson.

</div>

<div class="takeaways">

## Key takeaways

- The goal is one exception family for the whole application, rooted at `WidgetException`, with a class for each category and situation.
- Each exception knows its internal message, its customer message, its HTTP status, how to log itself and how to render itself as JSON.
- Coupon problems are 400 (Bad Request); everything else is 500 (Internal Server Error).

</div>
