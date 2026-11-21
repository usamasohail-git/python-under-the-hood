---
summary: "Project: use an enumeration to define every exception your application can raise, each with a unique code, an exception class and a default message, and raise any of them with one call."
---

Large applications tend to raise the same errors from many places, and the messages drift apart: one module says `'timeout'`, another `'Timed out!'`, a third forgets the error code entirely. This project puts every application error in one place, an **enumeration**, so each error has exactly one code, one exception class and one default message, and raising it is a single method call.

It's a compact exercise in the techniques from the previous section: members with several attributes built in `__new__`, a chosen `_value_` for lookups, properties and methods on members, and iteration over the members to produce a catalog.

In this section you'll:

- read the problem statement: what `AppException.Timeout.throw()` should do
- store a code, an exception class and a message in each member, with the code as the member's value
- look errors up by code (`AppException(201)`) or by name (`AppException['NotAList']`)
- write a `throw()` method that raises the right exception with a consistent message, optionally overridden
- list every error the application knows about, and guard against duplicate codes with `@unique`
