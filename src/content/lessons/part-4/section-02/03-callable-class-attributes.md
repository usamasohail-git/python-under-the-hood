---
title: Callable Class Attributes
summary: A function defined in a class body is just another class attribute whose value happens to be callable.
minutes: 7
---

## Functions are attributes too

A class attribute can hold any object: a string, a number, a list, or a **function**. When you write `def` inside a class body, Python creates a function object and stores it in the class namespace under that name, exactly as an assignment would.

```python run
class Program:
    language = 'Python'

    def say_hello():
        print(f'Hello from {Program.language}!')

Program.__dict__
```

`say_hello` sits in the namespace right next to `language`. Nothing about it is special yet: its value is an ordinary `function` object.

```python run
print(Program.say_hello)
print(type(Program.say_hello))
```

The repr shows `Program.say_hello`, which is the function's **qualified name** (`__qualname__`). It records where the function was defined, which helps when reading tracebacks, but it doesn't change what the function is.

## Calling it

Since the attribute is callable, you can retrieve it any way you like and call it:

```python run
Program.say_hello()
getattr(Program, 'say_hello')()
Program.__dict__['say_hello']()
```

All three routes reach the same function object:

```python run
f1 = Program.say_hello
f2 = getattr(Program, 'say_hello')
f3 = Program.__dict__['say_hello']
print(f1 is f2 is f3)
```

<div class="callout note">
<span class="callout-title">Why `Program.language` and not just `language`?</span>

Inside `say_hello` we wrote `Program.language`, not `language`. A function defined in a class body can't see the other names in that body directly; it has to go through the class (or, as you'll see soon, through `self` or `cls`). The reason is the way class scopes work, covered in the last lesson of this section.

</div>

## A function in a class, not yet a method

Notice that `say_hello` takes no parameters. That's fine as long as we call it through the class, as we've done here. Things change when we call it through an *instance* of the class: Python then automatically passes the instance as the first argument, and a function with no parameters can't accept it.

That transformation, from plain function to **bound method**, is the key to how methods work in Python. You'll see it step by step in the lesson on function attributes. For now, the point is simpler: in the class namespace, a "method" is just a function stored as a class attribute.

<div class="takeaways">

## Key takeaways

- `def` inside a class body stores a function object in the class namespace, like any other class attribute.
- You can fetch it with dotted notation, `getattr`, or the class `__dict__`, and call it.
- Accessed through the class, it's a plain function: no arguments are added for you.
- Code inside the function must reach other class attributes through the class (e.g. `Program.language`), not by bare name.

</div>
