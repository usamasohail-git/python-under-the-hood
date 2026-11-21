---
title: Strong and Weak References
summary: A weak reference points to an object without keeping it alive. Learn `weakref.ref`, dead references, which objects support them, and the self-cleaning `WeakKeyDictionary`.
minutes: 14
---

## Strong references

Every reference you've used so far (a variable, a list element, a dictionary key, an attribute) is a **strong reference**. Strong references are what the reference count counts, and an object lives exactly as long as at least one of them exists.

```python run
import ctypes, gc, sys, weakref

def ref_count(address):
    return ctypes.c_long.from_address(address).value

class Person:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Person(name={self.name})'

p1 = Person('Guido')
p2 = p1                      # a second strong reference
p_id = id(p1)
print(ref_count(p_id))
del p2
print(ref_count(p_id))
```

When the last strong reference goes away (`del p1`), the count hits 0 and CPython frees the object immediately. After that, `p_id` is just a number; reading memory at that address would tell us nothing, so we won't.

## Weak references

A **weak reference** also points to an object, but it **doesn't count**: it never keeps the object alive. The `weakref` module creates them:

```python run
p1 = Person('Guido')
p_id = id(p1)
p2 = p1
print('strong refs:', ref_count(p_id))

weak1 = weakref.ref(p1)
print('strong refs after weakref.ref:', ref_count(p_id))
print(weak1)
```

The strong count is still 2. `weak1` is its own small object, a `weakref`, whose repr shows the type and address of its target. It isn't the person:

```python run
print(weak1 is p1)
print(weak1() is p1)     # call the weakref to get the target back
print(weak1())
```

Calling a weak reference returns the object it points to. Careful, though: whatever you *keep* from that call is an ordinary strong reference.

```python run
p3 = weak1()             # p3 is a strong reference!
print('strong:', ref_count(p_id), ' weak:', weakref.getweakrefcount(p1))
print('sys.getrefcount:', sys.getrefcount(p1))
```

Three strong references (`p1`, `p2`, `p3`) and one weak one. `weakref.getweakrefcount(obj)` counts the weak references. `sys.getrefcount(obj)` reports one more than our `ref_count`, because passing `p1` as an argument creates a temporary extra reference for the duration of the call.

## When the target dies

Now remove all the strong references:

```python run
del p3, p2
print('strong refs left:', ref_count(p_id))
del p1
gc.collect()             # not needed for plain refcounting, but makes the demo deterministic
print(weak1)
print(weak1() is None)
```

The `Person` was destroyed even though `weak1` still pointed at it. The weakref object survives, but it's now **dead**: its repr says so, and calling it returns `None`. That's the whole contract of a weak reference: *I'll give you the object if it still exists; I won't be the reason it exists.*

<div class="callout note">
<span class="callout-title">Interactive shells hold references too</span>

Jupyter and the standard REPL store the last results in variables like `_`, `__` and `Out[...]`, which are strong references. In those environments a weakref demo can seem not to work because the shell kept the object alive. This site doesn't store cell results, but it's a good habit to `print()` values in such demos rather than leave them as the last expression in a cell. We also call `gc.collect()` after `del`: reference counting already freed these objects, but if a reference cycle were involved, only the collector would free it.

</div>

## Not everything can be weakly referenced

Supporting weak references costs a little memory per object, so many built-in types don't:

```python run
for obj in ([1, 2, 3], {'a': 1}, 100, 'python', (1, 2)):
    try:
        weakref.ref(obj)
    except TypeError as ex:
        print(ex)
```

Instances of your own classes do support them (we'll see exactly why in the next lesson), and that's all we need for descriptors.

## `WeakKeyDictionary`

Remember the leak from the last lesson: a dictionary that uses instances as keys keeps them alive. The `weakref` module has a dictionary type built for this situation. A `WeakKeyDictionary` holds **weak references to its keys**, and when a key object dies, its entry disappears automatically.

```python run
p1 = Person('Guido')
d = weakref.WeakKeyDictionary()
print('before:', ref_count(id(p1)), weakref.getweakrefcount(p1))
d[p1] = 'Guido'
print('after: ', ref_count(id(p1)), weakref.getweakrefcount(p1))
print(list(d.keyrefs()))
```

Adding `p1` as a key didn't increase the strong count; it created one weak reference. Now delete the last strong reference:

```python run
del p1
gc.collect()
print(list(d.keyrefs()))
print(len(d))
```

The entry cleaned itself up.

## Two requirements for keys

A `WeakKeyDictionary` key must be **weak-referenceable** (so no strings, ints, lists…):

```python run
try:
    d['python'] = 'test'
except TypeError as ex:
    print('TypeError:', ex)
```

And it must still be **hashable**, because it's a dictionary. Recall that a class which defines `__eq__` without `__hash__` gets `__hash__ = None`, making its instances unhashable:

```python run
class Person:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return isinstance(other, Person) and self.name == other.name

p1, p2 = Person('Guido'), Person('Guido')
print(p1 == p2)
try:
    d[p1] = 'Guido'
except TypeError as ex:
    print('TypeError:', ex)
```

So a `WeakKeyDictionary` fixes the leak for hashable objects. In the next lesson we'll plug it into our descriptor and then deal with unhashable instances too.

<div class="takeaways">

## Key takeaways

- **Strong** references (names, containers, attributes) keep objects alive; the reference count counts only these.
- `weakref.ref(obj)` creates a **weak** reference: call it to get the object, or `None` once the object has been destroyed (a *dead* reference).
- Anything you store from calling a weakref is a strong reference again.
- `weakref.getweakrefcount(obj)` counts weak references; `sys.getrefcount(obj)` is one higher than the true strong count.
- Many built-ins (`list`, `dict`, `int`, `str`, `tuple`) can't be weakly referenced; instances of normal custom classes can.
- `WeakKeyDictionary` holds its keys weakly and drops entries whose keys die. Keys must be weak-referenceable **and** hashable.

</div>
