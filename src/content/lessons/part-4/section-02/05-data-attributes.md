---
title: Data Attributes
summary: Attribute lookup checks the instance namespace first and then the class, so instance attributes can shadow class attributes shared by every instance.
minutes: 12
---

## Class attributes are shared

Let's focus on **data attributes**, the ones that aren't callables. Start with a class attribute:

```python run
class BankAccount:
    apr = 1.2

acc_1 = BankAccount()
acc_2 = BankAccount()

print(acc_1.__dict__, acc_2.__dict__)
print(acc_1.apr, acc_2.apr)
```

Both instance namespaces are empty, yet both instances have an `apr`. The value comes from the class. And because it lives in the class, there's only **one** copy: change it on the class, and every instance sees the change.

```python run
BankAccount.apr = 2.5
print(acc_1.apr, acc_2.apr)

BankAccount.account_type = 'Savings'
print(acc_1.account_type, acc_2.account_type)
```

Even `account_type`, added to the class *after* the instances were created, is visible through them. Instances don't copy class attributes; they look them up every time.

## The lookup rule

When you read `obj.name`, Python (for now, ignoring a few details we'll add with descriptors) does this:

1. Look for `name` in the **instance** namespace, `obj.__dict__`. If it's there, use it.
2. Otherwise, look in the **class** namespace, `type(obj).__dict__` (and, once we have inheritance, its parent classes).
3. Otherwise, raise `AttributeError`.

<figure class="diagram">
<svg viewBox="0 0 560 170" role="img" aria-label="acc_2.apr looks first in the instance dict, then in the class dict">
<defs><marker id="da-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker><marker id="da-arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head-hl"/></marker></defs>
<rect x="10" y="62" width="100" height="40" rx="8" class="d-name"/><text x="60" y="87" text-anchor="middle" class="d-text">acc_2.apr</text>
<rect x="150" y="54" width="160" height="56" rx="8" class="d-obj"/><text x="230" y="77" text-anchor="middle" class="d-text">acc_2.__dict__</text><text x="230" y="98" text-anchor="middle" class="d-sub">{ } no 'apr'</text>
<rect x="380" y="54" width="170" height="56" rx="8" class="d-obj-hl"/><text x="465" y="77" text-anchor="middle" class="d-text">BankAccount.__dict__</text><text x="465" y="98" text-anchor="middle" class="d-sub">'apr': 2.5</text>
<path d="M110 82 L146 82" class="d-arrow" marker-end="url(#da-arrow)"/>
<path d="M310 82 L376 82" class="d-arrow-hl" marker-end="url(#da-arrow-hl)"/>
<text x="343" y="72" text-anchor="middle" class="d-sub">miss</text>
<text x="280" y="150" text-anchor="middle" class="d-sub">1. instance namespace, then 2. class namespace</text>
</svg>
<figcaption>Reading an attribute: the instance namespace is checked first, then the class.</figcaption>
</figure>

## Instance attributes shadow class attributes

Writing is different from reading. `obj.name = value` **always** stores into the instance namespace (again, until descriptors enter the picture). It never modifies the class:

```python run
acc_1.apr = 0
print(acc_1.__dict__, acc_2.__dict__)
print(acc_1.apr, acc_2.apr, BankAccount.apr)
```

Now `acc_1` has its own `apr` in its namespace, and step 1 of the lookup finds it first. The class attribute is still there, still `2.5`, and still visible through `acc_2`; for `acc_1` it's just **hidden** (shadowed) by the instance attribute.

Delete the instance attribute, and the class attribute shows through again:

```python run
del acc_1.apr
print(acc_1.__dict__, acc_1.apr)
```

`getattr`, `setattr` and `delattr` follow exactly the same rules as dotted notation:

```python run
acc_1 = BankAccount()
print(acc_1.__dict__, getattr(acc_1, 'apr'))

setattr(acc_1, 'apr', 0)
print(acc_1.__dict__, getattr(acc_1, 'apr'))
```

And you can of course add attributes that the class doesn't have at all. They belong to that one instance only:

```python run
acc_1.bank = 'Acme Savings & Loans'
acc_2 = BankAccount()
print(acc_1.__dict__)
print(acc_2.__dict__)
```

## Class attributes vs instance attributes

This distinction matters for design:

- **Class attributes** hold state *shared* by all instances: a common interest rate, a configuration value, a counter of how many instances exist.
- **Instance attributes** hold state *specific* to each instance: an account's owner, its balance.

<div class="callout tip">
<span class="callout-title">The mutable class attribute trap</span>

`acc.apr = 0` creates an instance attribute, but `acc.history.append(x)` doesn't assign anything: it *reads* `history` (finding the class attribute) and then mutates that one shared list. Every instance sees the change.

```python run
class Account:
    history = []          # shared by all instances!

a, b = Account(), Account()
a.history.append('deposit')
print(b.history)
```

If each instance needs its own list, create it per instance (in `__init__`, coming up in lesson 7).

</div>

## Instance `__dict__` is a real dictionary

There's one more difference between class and instance namespaces. A class gives you a read-only `mappingproxy`, but an instance's `__dict__` is an ordinary, writable `dict`:

```python run
class Program:
    language = 'Python'

p = Program()
print(type(Program.__dict__).__name__, type(p.__dict__).__name__)

p.__dict__['version'] = '3.13'
print(p.version, getattr(p, 'version'))
```

Writing to `p.__dict__` directly is the same as `setattr(p, 'version', ...)`, and it only affects that one instance. It's occasionally useful (for example to bypass a custom `__setattr__`), but dotted notation is the normal way.

<div class="takeaways">

## Key takeaways

- Reading `obj.name` checks the instance namespace first, then the class.
- Class attributes are stored once, in the class, and are shared by all instances, including ones created before the attribute was added.
- Assigning `obj.name = value` stores into the instance namespace, **shadowing** any class attribute with the same name.
- Mutating a mutable class attribute through an instance changes it for everyone.
- `Class.__dict__` is a read-only `mappingproxy`; `instance.__dict__` is a regular `dict`.

</div>
