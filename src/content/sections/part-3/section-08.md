---
summary: Practice serialization end to end by encoding and decoding stock quotes and trades with custom JSON classes, then with a schema library.
---

Time to put the serialization tools to work on a realistic data set: a dictionary of stock **quotes** and **trades** built from two small classes. The data mixes everything JSON can't represent on its own: custom objects, `date` and `datetime` values, and exact `Decimal` prices. Your job is to get it to JSON and back again **without losing anything**: the decoded data must compare equal to the original.

In this section you'll:

- write a `JSONEncoder` subclass that serializes `Stock` and `Trade` objects, with a type marker so they can be recognized later
- handle `date`, `datetime` and `Decimal` values in a way that survives the round trip exactly
- write a decoder that rebuilds the original objects anywhere in the document
- define equality for the classes so the round trip can be verified
- redo the whole job declaratively with marshmallow schemas, and compare the two approaches
