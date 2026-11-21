---
title: Closure Applications - Part 2
summary: Closures that wrap other functions, counting their calls without changing what they do. This is a decorator in all but name.
minutes: 11
---

## A counter with a starting value

Python has no `++` operator. A closure makes a neat substitute, with the step size as an optional argument:

```python run
def counter(initial_value):
    def inc(increment=1):
        nonlocal initial_value      # the parameter of counter lives on in a cell
        initial_value += increment
        return initial_value
    return inc

counter1 = counter(0)
print(counter1(0), counter1(), counter1(), counter1(8))

counter2 = counter(1000)
print(counter2(0), counter2(1), counter2(), counter2(220))
```

A parameter is just a local variable that gets its initial value from the caller, so it can be captured like any other local. Every call to `counter` creates a new `initial_value`, which is why `counter1` and `counter2` count independently.

## Counting calls to *another* function

Now the interesting part: a closure that receives a **function**, and returns a new function that calls the original while keeping count. Since we don't know what arguments the wrapped function takes, the inner function accepts anything with `*args` and `**kwargs` and passes it straight through:

```python run
def counter(fn):
    cnt = 0                          # fn has been called zero times so far

    def inner(*args, **kwargs):
        nonlocal cnt
        cnt += 1
        print(f'{fn.__name__} has been called {cnt} times')
        return fn(*args, **kwargs)  # call the original and return its result

    return inner

def add(a, b):
    return a + b

def mult(a, b, c):
    return a * b * c

counted_add = counter(add)
counted_mult = counter(mult)
print(counted_add.__code__.co_freevars)
```

Both `fn` and `cnt` are free variables: the closure remembers *which* function it wraps and *how many times* it has been called.

```python run
print(counted_add(1, 2))
print(counted_add(2, 3))
print(counted_mult(1, 2, 3))
print(counted_mult(2, 3, 4))
```

`counted_add` behaves exactly like `add` (same arguments, same result) but with an extra side effect. The original `add` is untouched and can still be called directly.

## Storing the counts instead of printing them

Printing on every call gets noisy. Let's record counts in a dictionary. A first attempt uses a module-level dictionary:

```python run
counters = {}

def counter(fn):
    cnt = 0
    def inner(*args, **kwargs):
        nonlocal cnt
        cnt += 1
        counters[fn.__name__] = cnt    # counters is global
        return fn(*args, **kwargs)
    return inner

counted_add = counter(add)
counted_mult = counter(mult)

counted_add(1, 2)
counted_add(2, 3)
counted_mult(1, 2, 'a')
counted_mult(2, 3, 'b')
counted_mult(1, 1, 'abc')
print(counters)
print(counted_add.__code__.co_freevars)
```

(Multiplying a string by an integer repeats it, so `mult` happily works with strings too: our wrapper doesn't care what the arguments are.)

`counters` is **not** a free variable: it's a global, found by the normal LEGB lookup. That works, but it ties our `counter` function to a global with a specific name. Better to let the caller pass the dictionary in. Then it's a parameter of `counter`, and therefore a free variable of `inner`:

```python run
def counter(fn, counters):
    cnt = 0
    def inner(*args, **kwargs):
        nonlocal cnt
        cnt += 1
        counters[fn.__name__] = cnt    # counters is now a free variable
        return fn(*args, **kwargs)
    return inner

func_counters = {}
counted_add = counter(add, func_counters)
counted_mult = counter(mult, func_counters)
print(counted_add.__code__.co_freevars)

for i in range(5):
    counted_add(i, i)
for i in range(10):
    counted_mult(i, i, i)

print(func_counters)
```

Note that `counters[...] = cnt` doesn't need `nonlocal counters`: it mutates the dictionary rather than re-binding the name.

## Re-using the same name

Here's the step that changes everything. We don't have to give the counted version a new name. We can bind it to the **original** name:

```python run
def fact(n):
    product = 1
    for i in range(2, n + 1):
        product *= i
    return product

fact = counter(fact, func_counters)   # 'fact' now refers to the closure

print(fact(0), fact(3), fact(4))
print(func_counters)
```

After `fact = counter(fact, ...)`, every caller who uses the name `fact` gets the counting version, yet the factorial logic was never edited. The closure still holds the original function in its cell for `fn`:

```python run
print(fact.__name__)
print(fact.__closure__[2].cell_contents)   # cells follow co_freevars order: cnt, counters, fn
print(fact.__closure__[2].cell_contents(5))
```

We've **added behavior to a function without modifying the function itself**. That pattern, a function that takes a function and returns an enhanced replacement, is a **decorator**, and it's the subject of the next lesson. Notice also that `fact.__name__` is now `'inner'`: wrapping hides the original function's identity. We'll fix that too.

<div class="takeaways">

## Key takeaways

- Parameters of the outer function can be captured and updated just like any other local.
- A closure can capture a **function** and call it with `*args, **kwargs`, adding behavior around the call.
- Globals used inside a closure are not free variables; parameters and locals of the enclosing function are.
- Assigning the wrapper back to the original name (`fact = counter(fact)`) enhances every future call to that name. That's the idea behind decorators.

</div>
