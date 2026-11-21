---
summary: How to turn Python objects into bytes or text and back again, with pickle, JSON, JSON Schema, YAML and the libraries that build on them.
---

A dictionary in memory is a web of objects connected by references. The moment you want to save it to disk, send it over a network or hand it to a program written in another language, that web has to be flattened into a sequence of bytes or characters: it has to be **serialized**. The reverse step, rebuilding objects from that sequence, is **deserialization** (together they're often called *marshalling*). It sounds mechanical, but the details decide what survives the round trip, what gets silently changed, and whether loading data can hurt you.

In this section you'll learn:

- how `pickle` serializes almost any Python object, what it preserves, and why you must **never unpickle untrusted data**
- how the `json` module maps Python types to JSON, and the conversions that make `loads(dumps(d)) != d`
- how to encode types JSON doesn't know (dates, decimals, sets, your own classes) with a `default` function, `functools.singledispatch` or a `JSONEncoder` subclass
- how to decode them again with `object_hook`, `object_pairs_hook`, the `parse_*` hooks and `JSONDecoder`
- how to describe and enforce the *shape* of JSON documents with JSON Schema and the `jsonschema` library
- what schema-based libraries such as **marshmallow** and **serpy** add, and how to get the same effect with the standard library
- how YAML compares with JSON, and how to load it safely with PyYAML
