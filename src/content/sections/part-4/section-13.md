---
summary: Design the exception hierarchy for an online widget shop, with internal and customer-facing messages, an HTTP status per exception type, structured logging, JSON error responses and a logged traceback.
---

Time to apply the exceptions section to a realistic design problem. You're writing the backend of an online store that sells widgets, and every error it raises must come from one well-organized family of exceptions. Each exception should know how serious it is (its HTTP status), what to tell the customer, what to write to the log, and how to describe itself as a JSON response.

This project practices:

- designing a custom exception hierarchy under a single application base class
- using class attributes for per-type defaults, and an `__init__` with a keyword-only override
- keeping `args`, `str()` and `repr()` working by calling `super().__init__()` correctly
- the `HTTPStatus` enum's `value` and `phrase`, and building JSON with `json.dumps`
- formatting an exception's traceback (including its chain and notes) with the `traceback` module
