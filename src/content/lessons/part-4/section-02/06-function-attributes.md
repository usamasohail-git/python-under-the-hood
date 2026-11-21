---
title: Function Attributes
summary: A function reached through an instance becomes a bound method that passes the instance as the first argument, which is all that self really is.
minutes: 15
---

## Same function, different result

So far we've worked with data attributes. Function attributes follow the same lookup rules, but something extra happens when you reach a function **through an instance**. Start with a function that takes no parameters:

```python run
class Person:
    def say_hello():
        print('Hello!')

print(Person.say_hello)
print(type(Person.say_hello))
Person.say_hello()
```

Through the class, it's a plain function, and calling it works. Now go through an instance:

```python run
p = Person()
print(p.say_hello)
print(type(p.say_hello))
```

The type changed from `function` to `method`, and the repr says **bound method** `Person.say_hello` **of** a specific `Person` object (compare the address with `hex(id(p))`). Calling it fails:

```python run
print(hex(id(p)))
try:
    p.say_hello()
except TypeError as ex:
    print('TypeError:', ex)
```

"Takes 0 positional arguments but 1 was given": we didn't pass any arguments, so where did the one argument come from?

<div class="callout modern">
<span class="callout-title">Qualified names in error messages</span>

Since Python 3.10, these `TypeError` messages use the function's qualified name, `Person.say_hello()`, where older versions printed just `say_hello()`.

</div>

## Methods pass the instance for you

A `method` object is a small wrapper that combines two things: a function, and an object it's **bound** to. When you call the method, it calls the function with the bound object inserted as the **first** argument, followed by whatever arguments you passed.

A function that accepts any arguments shows exactly what arrives:

```python run
class Person:
    def say_hello(*args):
        print('say_hello args:', args)

Person.say_hello()      # plain function: no extra arguments

p = Person()
print(hex(id(p)))
p.say_hello()           # bound method: p is passed first
p.say_hello(10, 20)
```

That's the whole mechanism behind instance methods. Because the function receives the instance, it can read and write that instance's attributes:

```python run
class Person:
    def set_name(instance_obj, new_name):
        instance_obj.name = new_name

p = Person()
p.set_name('Alex')
print(p.__dict__)
```

And `p.set_name('Alex')` is the same as calling the underlying function through the class and passing the instance yourself:

```python run
Person.set_name(p, 'John')
print(p.__dict__)
```

## `self` is just a convention

We called the first parameter `instance_obj`, and it worked. The name doesn't matter to Python; it's simply the first positional parameter. By a very strong **convention**, it's called `self`, and you should always use that name so other people can read your code. Functions designed to be called this way are called **instance methods**.

<div class="callout note">
<span class="callout-title">How does Python do it?</span>

The transformation happens at attribute lookup time. Function objects implement the **descriptor** protocol: they have a `__get__` method, and when Python finds a function in the class while looking up an attribute of an instance, it calls that `__get__`, which returns a bound method. You can try it by hand: `Person.__dict__['set_name'].__get__(p)` builds the same bound method. Descriptors get a whole section later in Part 4.

</div>

## Inside a method object

Method objects have their own attributes. `__func__` is the underlying function, and `__self__` is the object the method is bound to:

```python run
class Person:
    def say_hello(self):
        print(f'{self} says hello')

p = Person()
m_hello = p.say_hello

print(type(m_hello))
print(m_hello.__func__)
print(m_hello.__func__ is Person.say_hello)
print(m_hello.__self__ is p)
```

Calling `m_hello()` is equivalent to `m_hello.__func__(m_hello.__self__)`:

```python run
m_hello()
m_hello.__func__(m_hello.__self__)
```

A new method object is created every time you look the attribute up, which is why two lookups are equal (same function, same object) but not identical:

```python run
print(p.say_hello == p.say_hello, p.say_hello is p.say_hello)
```

## Methods added later still bind

The binding doesn't depend on the function being written inside the class body. Any function stored as a **class** attribute, even one added at run time (sometimes called monkey-patching), becomes a bound method when accessed through an instance:

```python run
class Person:
    def say_hello(self):
        print(f'instance method called from {self}')

p = Person()
Person.do_work = lambda self: f'do_work called from {self}'

print(p.do_work)
print(p.do_work())
```

`p` was created *before* `do_work` existed, but the lookup happens at call time, finds the function in the class, and binds it.

## Functions stored on the instance don't bind

The rule only applies to functions found in the **class**. A function stored in the **instance** namespace is returned as is, a plain function, and nothing is passed automatically:

```python run
p.other_func = lambda *args: print(f'other_func called with {args}')

print(p.other_func)
print('other_func' in Person.__dict__)
p.other_func()
```

That's why `args` is empty. The next lesson but one shows how to create a real bound method on a single instance.

<div class="takeaways">

## Key takeaways

- A function found in the **class** and accessed through an **instance** becomes a **bound method**.
- Calling a bound method calls the function with the instance as the first argument: `p.f(x)` is `type(p).f(p, x)`.
- `self` is only a naming convention for that first parameter, but always follow it.
- Method objects expose the function as `__func__` and the bound object as `__self__`.
- Functions added to the class at run time bind too; functions stored on the instance don't.

</div>
