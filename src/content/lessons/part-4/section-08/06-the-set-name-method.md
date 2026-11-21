---
title: The __set_name__ Method
summary: "`__set_name__` is called once, when the owner class is created, and tells the descriptor which attribute name it was assigned to."
minutes: 11
---

## When `__set_name__` runs

Since Python 3.6, the descriptor protocol has one more method: `__set_name__(self, owner_class, name)`. Python calls it **once**, at the moment the class containing the descriptor is created, passing the owner class and the attribute name:

```python run
class ValidString:
    def __set_name__(self, owner_class, property_name):
        print(f'__set_name__ called: owner={owner_class}, name={property_name}')

class Person:
    name = ValidString()
```

The message printed while the `class` statement executed, before we ever made an instance. It's never called again.

The point of it is to let the descriptor **remember its own name**. Earlier we had to write `x = IntegerValue('x')`. Now Python tells the descriptor:

```python run
class ValidString:
    def __set_name__(self, owner_class, property_name):
        self.property_name = property_name

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        print(f'__get__ for property {self.property_name!r}')

class Person:
    first_name = ValidString()
    last_name = ValidString()

p = Person()
p.first_name
p.last_name
```

Each descriptor object knows which attribute it is.

<div class="callout note">
<span class="callout-title">Who calls it?</span>

`__set_name__` is called by `type.__new__`, the machinery that builds every class. That means it also runs for classes created with `type(name, bases, namespace)`. But it does **not** run if you attach a descriptor to a class *after* the class exists:

```python
class Person:
    pass

Person.age = ValidString()   # __set_name__ is NOT called here
```

In that case you'd have to call `Person.age.__set_name__(Person, 'age')` yourself. You'll run into this in the next project when writing unit tests.

</div>

## Better error messages

Knowing the name immediately makes validation errors more useful. Let's also use it to store values in the instance under a derived name:

```python run
class ValidString:
    def __init__(self, min_length):
        self.min_length = min_length

    def __set_name__(self, owner_class, property_name):
        self.property_name = property_name

    def __set__(self, instance, value):
        if not isinstance(value, str):
            raise ValueError(f'{self.property_name} must be a string.')
        if len(value) < self.min_length:
            raise ValueError(f'{self.property_name} must be at least '
                             f'{self.min_length} characters')
        setattr(instance, '_' + self.property_name, value)

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return getattr(instance, '_' + self.property_name, None)

class Person:
    first_name = ValidString(1)
    last_name = ValidString(2)

p = Person()
try:
    p.first_name = 'Alex'
    p.last_name = 'M'
except ValueError as ex:
    print('ValueError:', ex)
print(p.first_name, p.__dict__)
```

The error names the attribute that failed, and we no longer repeat names. That solves the first of the three problems from the "instance properties" lesson.

## The clash problem remains

The derived name `_first_name` can still collide with an attribute the class uses for its own purposes:

```python run
p = Person()
p._first_name = 'some data I need to keep'
print(p.__dict__)
p.first_name = 'Alex'
print(p.__dict__)
```

Our data was silently overwritten. Any prefix scheme (`_`, `__desc_`, …) only makes a collision *less likely*.

## Why not use the same name?

What if the descriptor stored the value under **exactly** its own name, `first_name`, in the instance dictionary? Nothing else could legitimately be using that key, because `first_name` is already the descriptor's attribute.

But wait: instance attributes normally **shadow** class attributes of the same name. Here's a plain class attribute being shadowed:

```python run
class BankAccount:
    apr = 10

b = BankAccount()
print(b.apr, b.__dict__)
b.apr = 20
print(b.apr, b.__dict__, BankAccount.apr)
```

Once `apr` is in the instance dictionary, `b.apr` finds it there and never looks at the class. If the same thing happened with a descriptor, storing `first_name` in the instance would bypass the descriptor from then on. Would it? Let's try, writing directly into `instance.__dict__`:

```python run
class ValidString:
    def __init__(self, min_length):
        self.min_length = min_length

    def __set_name__(self, owner_class, property_name):
        self.property_name = property_name

    def __set__(self, instance, value):
        if not isinstance(value, str):
            raise ValueError(f'{self.property_name} must be a string.')
        if len(value) < self.min_length:
            raise ValueError(f'{self.property_name} must be at least '
                             f'{self.min_length} characters')
        instance.__dict__[self.property_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        print(f'calling __get__ for {self.property_name}')
        return instance.__dict__.get(self.property_name, None)

class Person:
    first_name = ValidString(1)
    last_name = ValidString(2)

p = Person()
p.first_name = 'Alex'
print(p.__dict__)
p.first_name
```

`first_name` is in the instance dictionary, and yet reading `p.first_name` **still called `__get__`**. The instance attribute did *not* shadow the descriptor. That's because `ValidString` defines `__set__`, which makes it a *data* descriptor, and data descriptors get priority over the instance dictionary. The next lesson spells out the exact rules.

<div class="takeaways">

## Key takeaways

- `__set_name__(self, owner_class, name)` is called once, by `type.__new__`, when the owner class is created.
- It lets a descriptor learn its attribute name, so you don't have to repeat it, and error messages can mention it.
- It is **not** called when you assign a descriptor to an existing class; call it manually in that case.
- Storing values under a prefixed name (`'_' + name`) can still clobber other attributes.
- A data descriptor is **not** shadowed by an instance attribute of the same name, which makes "same-name" storage in `instance.__dict__` possible.

</div>
