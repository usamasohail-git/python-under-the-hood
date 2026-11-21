---
title: Project 1
summary: Write a validator that checks a nested dictionary against a template of required keys and value types, and reports the first problem it finds.
minutes: 10
---

## The problem

When a program receives structured data from outside (a JSON payload sent to an API, a configuration file, a message from another service), it can't trust the shape of that data. A missing field or a string where a number should be will cause a crash somewhere deep in your code, far from where the bad data came in. It's much better to check the structure **at the door** and reject bad input with a clear message.

Your job is to write that check. You'll describe the expected structure with a **template**: a dictionary with the same keys as valid data, whose values are either a **type** (like `int` or `str`) or a nested **template dictionary**. Here's one for a user record:

```python run
template = {
    'user_id': int,
    'name': {
        'first': str,
        'last': str,
    },
    'bio': {
        'dob': {
            'year': int,
            'month': int,
            'day': int,
        },
        'birthplace': {
            'country': str,
            'city': str,
        },
    },
}
```

The template says nothing about the actual *values*, only about the keys and the types.

## Sample data

This record matches the template exactly:

```python run
ada = {
    'user_id': 100,
    'name': {'first': 'Ada', 'last': 'Lovelace'},
    'bio': {
        'dob': {'year': 1815, 'month': 12, 'day': 10},
        'birthplace': {'country': 'United Kingdom', 'city': 'London'},
    },
}
```

This one is missing a key: its birthplace has no `city`.

```python run
alan = {
    'user_id': 101,
    'name': {'first': 'Alan', 'last': 'Turing'},
    'bio': {
        'dob': {'year': 1912, 'month': 6, 'day': 23},
        'birthplace': {'country': 'United Kingdom'},
    },
}
```

And this one has every key, but one value has the wrong type: the month is a string.

```python run
grace = {
    'user_id': 102,
    'name': {'first': 'Grace', 'last': 'Hopper'},
    'bio': {
        'dob': {'year': 1906, 'month': 'December', 'day': 9},
        'birthplace': {'country': 'United States', 'city': 'New York'},
    },
}
```

A quick look with keys views (from the last lesson of the previous section) already shows where the trouble is in `alan`:

```python run
print(template['bio']['birthplace'].keys() - alan['bio']['birthplace'].keys())
print(type(grace['bio']['dob']['month']).__name__)
```

## The rules

To keep the project focused, the validator makes these simplifying assumptions:

- A template value is either a **type** or a **dict** (a nested template). There are no lists.
- Every key in the template is **required**, and the data may not contain **extra** keys.
- A value matches a type if `isinstance(value, the_type)` is true. A value matches a nested template if it is a `dict` that itself validates against that template.

Real-world validators relax all of these (optional keys, lists, value constraints such as "month between 1 and 12"). Libraries like `jsonschema` exist for that, and you'll meet some in the next section. Writing a small one yourself is the best way to understand what they do.

## Paths and error messages

When something is wrong, the message should say exactly *where*. Use **dotted paths** from the top of the document: the `city` key inside `birthplace` inside `bio` is `bio.birthplace.city`, and a top-level key is just its own name, like `user_id`.

## Goals

**Goal 1: find mismatched keys at one level.** Write `key_mismatches(data, template, path='')` that compares the keys of one dictionary level and returns a tuple `(missing, extra)` of **sets of dotted paths**: template keys absent from the data, and data keys absent from the template. `path` is the dotted path of the level being checked, so `key_mismatches({'a': 1}, {'b': int}, 'x.y')` returns `({'x.y.b'}, {'x.y.a'})`.

**Goal 2: validate a whole document.** Write `validate(data, template)` that returns `(True, '')` for valid data, or `(False, message)` describing the **first** problem found:

- `'mismatched keys: <paths>'` when keys are missing or extra at some level; `<paths>` lists **all** the mismatched paths at that level (missing and extra together), sorted and separated by `', '`;
- `'bad type: <path>'` when a value has the wrong type (including a non-dict where the template has a nested dict).

"First" is defined precisely so the result is always the same: at each level, check the keys first; then visit the template's keys **in the template's order**, checking each value's type and, for a nested template, validating that sub-dictionary completely (recursively) before moving on to the next key.

For the samples:

```python
validate(ada, template)    # (True, '')
validate(alan, template)   # (False, 'mismatched keys: bio.birthplace.city')
validate(grace, template)  # (False, 'bad type: bio.dob.month')
```

**Goal 3: use exceptions instead of status codes.** Define `SchemaError` (a subclass of `Exception`) with two subclasses, `SchemaKeyMismatch` and `SchemaTypeMismatch`; make `SchemaTypeMismatch` also a subclass of `TypeError`. Then write `check(data, template)` that returns `None` for valid data and otherwise raises the appropriate exception, with the same message as in Goal 2.

## Hints

- `data.keys() - template.keys()` and `template.keys() - data.keys()` give you the extra and missing keys of one level directly.
- The number of nesting levels isn't fixed, so a **recursive** function is the natural fit. Pass the current path down and extend it for each nested dictionary.
- A small helper that joins a path and a key (`''` + `'bio'` → `'bio'`, `'bio'` + `'dob'` → `'bio.dob'`) avoids an annoying leading dot.
- Sets have no reliable order, so **sort** the mismatched paths before joining them into a message.
- For the type check, the "expected type" of a nested template is simply `dict`.

## Try it yourself

Head to the **practice page** for this section: each goal is an auto-graded exercise with tests. Work through them before reading the solution in the next lesson.

<div class="takeaways">

## Key takeaways

- A template mirrors valid data: same keys, with types (or nested templates) as values.
- Every template key is required and extra keys are errors; types are checked with `isinstance`.
- Errors carry a dotted path so the caller knows exactly where the data went wrong.
- The validator reports the *first* problem, in a well-defined order, with stable (sorted) messages.

</div>
