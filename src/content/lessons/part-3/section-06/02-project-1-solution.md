---
title: Project 1 - Solution
summary: Build the template validator step by step, from keys-view differences at one level to a recursive walk with dotted paths, then switch from status tuples to custom exceptions.
minutes: 18
---

## The plan

The data can be nested to any depth, so we can't write a fixed number of loops. Instead we'll write a function that validates **one level** and calls itself for each nested dictionary. Along the way it carries a *path* (like `bio.dob`) so that errors can say where they happened.

At each level, the function will:

1. compare the keys of the data and the template (missing or extra keys are an error);
2. go through the template's keys in order, checking that each value has the right type;
3. for nested templates, validate the sub-dictionary recursively before moving on.

First, the template and sample records from the project description:

```python run
template = {
    'user_id': int,
    'name': {'first': str, 'last': str},
    'bio': {
        'dob': {'year': int, 'month': int, 'day': int},
        'birthplace': {'country': str, 'city': str},
    },
}

ada = {
    'user_id': 100,
    'name': {'first': 'Ada', 'last': 'Lovelace'},
    'bio': {
        'dob': {'year': 1815, 'month': 12, 'day': 10},
        'birthplace': {'country': 'United Kingdom', 'city': 'London'},
    },
}

alan = {
    'user_id': 101,
    'name': {'first': 'Alan', 'last': 'Turing'},
    'bio': {
        'dob': {'year': 1912, 'month': 6, 'day': 23},
        'birthplace': {'country': 'United Kingdom'},
    },
}

grace = {
    'user_id': 102,
    'name': {'first': 'Grace', 'last': 'Hopper'},
    'bio': {
        'dob': {'year': 1906, 'month': 'December', 'day': 9},
        'birthplace': {'country': 'United States', 'city': 'New York'},
    },
}
```

## Step 1: building paths

A tiny helper keeps path handling in one place. At the top level the path is empty, and we don't want a leading dot:

```python run
def join_path(path, key):
    return f'{path}.{key}' if path else str(key)

print(join_path('', 'bio'), join_path('bio', 'dob'), join_path('bio.dob', 'month'))
```

`str(key)` matters for the top level: dictionary keys don't have to be strings, and an f-string converts them for us in the nested case anyway.

## Step 2: mismatched keys (Goal 1)

This is where the previous section pays off. The keys views of two dictionaries support set difference directly, without building any sets ourselves:

```python run
def key_mismatches(data, template, path=''):
    missing = template.keys() - data.keys()
    extra = data.keys() - template.keys()
    return ({join_path(path, k) for k in missing},
            {join_path(path, k) for k in extra})
```

We could get all mismatched keys in one go with the symmetric difference `data.keys() ^ template.keys()`, but keeping missing and extra apart costs nothing and gives the caller more information. Let's try it:

```python run
t = {'a': int, 'b': int, 'c': int, 'd': int}

print(key_mismatches({'a': 'wrong type', 'b': 1, 'c': 2, 'd': {}}, t, 'some.path'))
print(key_mismatches({'a': 1, 'b': 2, 'c': 3}, t, 'some.path'))
print(key_mismatches({'a': 1, 'b': 2, 'c': 3, 'd': 4, 'z': 0}, t, 'some.path'))

missing, extra = key_mismatches({'a': 1, 'b': 2, 'z': 0}, t, 'some.path')
print(sorted(missing), sorted(extra))
```

The first call reports no mismatch even though two values have the wrong type: this step only looks at keys. Note the `sorted` calls in the last line. With two missing keys, the set could list them in either order, and we'll want messages that are the same every time.

## Step 3: checking one value's type

What type should a value have? If the template holds a type, that's it. If it holds a nested template, the value must be a `dict`:

```python run
def expected_type(template_value):
    return dict if isinstance(template_value, dict) else template_value

print(expected_type(int), expected_type({'first': str}))
print(isinstance(12, expected_type(int)), isinstance('December', expected_type(int)))
print(isinstance('oops', expected_type({'first': str})))
```

## Step 4: the recursive walk (Goal 2)

Now combine the pieces. For the status-tuple version, every step returns `(True, '')` or `(False, message)`, and the caller stops at the first `False`:

```python run
def recurse_validate(data, template, path):
    missing, extra = key_mismatches(data, template, path)
    if missing or extra:
        return False, 'mismatched keys: ' + ', '.join(sorted(missing | extra))

    for key, template_value in template.items():      # template order
        key_path = join_path(path, key)
        value = data[key]                              # safe: keys already match
        if not isinstance(value, expected_type(template_value)):
            return False, f'bad type: {key_path}'
        if isinstance(template_value, dict):
            is_ok, message = recurse_validate(value, template_value, key_path)
            if not is_ok:
                return False, message
    return True, ''

def validate(data, template):
    return recurse_validate(data, template, '')
```

A few design decisions are worth spelling out:

- **Keys first.** Once the key check passes, `data[key]` can't raise `KeyError`, so the loop doesn't need `get` or a sentinel default.
- **Template order.** Iterating over `template.items()` (a dict, so ordered) makes "the first error" well defined. If we had collected the nested keys into a *set* and looped over that, two errors in different branches could be reported in either order from one run to the next.
- **Sorted messages.** `missing | extra` is a set; `sorted` turns it into a stable list before joining.
- **A thin public wrapper.** `validate` hides the `path` parameter, which is an implementation detail of the recursion.

Let's check the samples:

```python run
for name, record in [('ada', ada), ('alan', alan), ('grace', grace)]:
    print(f'{name:<6}', validate(record, template))
```

And a few edge cases: a scalar where a nested dict should be, an extra key at the top, and several problems at one level:

```python run
print(validate({'user_id': 1, 'name': 'Ada', 'bio': {}}, template))
print(validate({**ada, 'admin': True}, template))
print(validate({'user_id': 1, 'name': {'first': 'A'}, 'bio': ada['bio']}, template))
print(validate({'name': {}, 'bio': {}, 'x': 0, 'y': 0}, template))
```

The first record fails on `name`'s type before the validator ever looks inside `bio`: that's the template-order rule at work. The last one lists every mismatched key at the top level, sorted.

<div class="callout note">
<span class="callout-title">A wrinkle: `bool` is an `int`</span>

`isinstance(True, int)` is `True`, because `bool` is a subclass of `int`. So this validator accepts `'user_id': True`. If that matters to you, special-case it: reject a `bool` value when the expected type is `int` (for example `type(value) is bool and expected is not bool`). The exercises keep plain `isinstance` semantics.

```python run
print(isinstance(True, int), validate({**ada, 'user_id': True}, template))
```

</div>

## Step 5: exceptions instead of status codes (Goal 3)

Returning `(False, message)` works, but every caller has to remember to check the flag, and every level of the recursion has to pass failures up by hand. Exceptions do both jobs for us: they can't be silently ignored, and they travel up through any number of recursive calls on their own.

We'll define a small hierarchy, so callers can catch every validation problem at once **or** handle the two kinds separately:

```python run
class SchemaError(Exception):
    """Data does not match the template."""

class SchemaKeyMismatch(SchemaError):
    """Missing or extra keys."""

class SchemaTypeMismatch(SchemaError, TypeError):
    """A value has the wrong type."""
```

`SchemaTypeMismatch` also inherits from `TypeError`, so code that already catches `TypeError` for "wrong type" situations will catch it too.

With exceptions, the recursive function no longer returns anything. Notice how much shorter it gets, since there's no result to propagate:

```python run
def check_level(data, template, path):
    missing, extra = key_mismatches(data, template, path)
    if missing or extra:
        raise SchemaKeyMismatch('mismatched keys: ' + ', '.join(sorted(missing | extra)))

    for key, template_value in template.items():
        key_path = join_path(path, key)
        value = data[key]
        if not isinstance(value, expected_type(template_value)):
            raise SchemaTypeMismatch(f'bad type: {key_path}')
        if isinstance(template_value, dict):
            check_level(value, template_value, key_path)

def check(data, template):
    check_level(data, template, '')
```

Valid data passes silently:

```python run
print(check(ada, template))
```

Callers choose how specific to be. Catching the base class handles every validation failure:

```python run
for record in (alan, grace):
    try:
        check(record, template)
    except SchemaError as ex:
        print(f'{type(ex).__name__}: {ex}')
```

Or handle each kind differently:

```python run
def describe(record):
    try:
        check(record, template)
    except SchemaKeyMismatch as ex:
        return f'structure problem -> {ex}'
    except SchemaTypeMismatch as ex:
        return f'type problem -> {ex}'
    return 'valid'

for record in (ada, alan, grace):
    print(describe(record))
```

And because of the multiple inheritance, generic code catching `TypeError` also sees type problems:

```python run
try:
    check(grace, template)
except TypeError as ex:
    print('caught as TypeError:', ex)
```

<div class="callout tip">
<span class="callout-title">Taking it further</span>

Ideas to extend the validator: collect **all** errors instead of stopping at the first one (gather messages in a list as you walk); allow optional keys (for example, a template wrapper type `Optional(str)`); accept a tuple of types such as `(int, float)` (it already works, since `isinstance` accepts tuples); or support lists with a template like `[str]` meaning "a list of strings".

</div>

<div class="takeaways">

## Key takeaways

- Keys-view differences find missing and extra keys at a level in one expression each.
- A recursive function with a path parameter handles any nesting depth and produces precise dotted error locations.
- Iterate in a defined order (the template's) and sort anything that comes out of a set, so results are deterministic.
- Exceptions remove the boilerplate of passing status tuples up the recursion, and a small hierarchy lets callers catch broadly (`SchemaError`) or narrowly (`SchemaKeyMismatch`, `SchemaTypeMismatch`, even `TypeError`).

</div>
