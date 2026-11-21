---
title: Everything is an Object
summary: Integers, strings, functions, classes, even types themselves are all objects, and objects can be stored, passed around and returned.
minutes: 9
---

## Everything has a type, an address and a value

Throughout this course you'll work with integers, booleans, floats, strings, lists, tuples, sets, dictionaries, `None`, functions, classes, modules and more. In Python, **all of them are objects**: each is an instance of some class, has a memory address and can be referenced by a name.

```python run
a = 10
print(type(a))
```

`a` refers to an instance of the class `int`. And if `int` is a class, we should be able to call it like any other class to make an instance:

```python run
b = int(10)
print(b, type(b))
```

The class even has documentation:

```python run
help(int)
```

The docs show that `int` accepts a string and a `base`, so this builds the integer 2 from the binary text `'10'`:

```python run
b = int('10', base=2)
print(b, type(b))
```

## Functions are objects too

```python run
def square(a):
    return a ** 2

type(square)
```

Because a function is an object, we can do everything with it that we do with other objects. We can **assign it to another name**:

```python run
f = square
print(f is square)   # same function object
print(f(2))
```

We can **return it from another function**:

```python run
def cube(a):
    return a ** 3

def select_function(fn_id):
    if fn_id == 1:
        return square
    else:
        return cube

f = select_function(1)
print(f is square, f is cube, f(2))

f = select_function(2)
print(f is square, f is cube, f(2))
```

and even call the result directly:

```python run
select_function(1)(5)
```

We can **pass it as an argument**:

```python run
def exec_function(fn, n):
    return fn(n)

exec_function(cube, 2)
```

Functions that take or return other functions are called **higher-order functions**. You'll use this idea constantly in later sections: `sorted(..., key=fn)`, `map`, closures and decorators all depend on it.

## Even types are objects

```python run
print(type(int))        # the class int is itself an object, of type `type`
print(type(square))
print(type(type))       # ...and so is `type`
print(isinstance(square, object), isinstance(int, object), isinstance(None, object))
```

<div class="callout note">
<span class="callout-title">First-class objects</span>

Being an object means a thing can be bound to a name, stored in a container, passed as an argument and returned from a function. Python's functions are **first-class objects** in exactly this sense. Section 06 is dedicated to them.

</div>

<div class="takeaways">

## Key takeaways

- In Python, every value (ints, strings, functions, classes, modules, `None`) is an object.
- Classes like `int` can be called to create instances and have documentation you can read with `help()`.
- Functions are first-class: you can assign, pass and return them like any other object.

</div>
