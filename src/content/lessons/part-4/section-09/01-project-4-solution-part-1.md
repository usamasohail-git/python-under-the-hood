---
title: Project 4 - Solution - Part 1
summary: "The project brief, then a test-driven build of the `IntegerField` and `CharField` descriptors, including how to create test classes with `type()` so `__set_name__` runs."
minutes: 22
---

## The project

Your task is to write two **data descriptors** that other classes can use to declare validated attributes:

- **`IntegerField(min_, max_)`** only accepts integral numbers (anything that is a `numbers.Integral`, so not `10.5`, `1+0j` or `'abc'`) between a minimum and a maximum value, inclusive.
- **`CharField(min_, max_)`** only accepts strings whose length is between a minimum and a maximum, inclusive.

Assigning an invalid value must raise a `ValueError` whose message names the attribute. The intended usage looks like this:

```python
class Person:
    name = CharField(1, 50)
    age = IntegerField(0, 200)

p = Person()
p.name = 'Alex'
p.age = 42
p.age = -1        # ValueError: age must be >= 0.
```

Requirements and constraints:

1. Both descriptors use `__set_name__` to learn their attribute name; the name must not be repeated by the user.
2. Store values **in the instance dictionary, under the attribute's own name**. You may assume the classes using these fields don't use `__slots__`.
3. Accessing the attribute through the **class** returns the descriptor instance; reading a value that was never set returns `None`.
4. Both bounds are **optional**: either may be `None`, meaning "no limit on that side".
5. For `CharField`, a minimum length of `None` or a negative number makes no sense, so treat it as `0`.
6. Write **unit tests** for both descriptors, covering valid values, invalid values, missing bounds and class access.
7. Once everything passes, notice how much code the two classes share, and **refactor** the common parts into a base class. The tests must still pass afterwards.

Hints:

- Since a data descriptor isn't shadowed by the instance dictionary, `instance.__dict__[self.prop_name] = value` is safe storage. Remember the recursion trap: don't use `setattr` with the same name.
- To test different bounds you'll want a fresh owner class per test. Think about what happens to `__set_name__` if you attach a descriptor to a class that already exists.
- Be careful with `if self._min and ...`: a bound of `0` is falsy.

<div class="callout tip">
<span class="callout-title">Try it yourself first</span>

Head to the **practice page** for this section: each goal is an auto-graded exercise, with tests that check exactly the requirements above. Give it a real attempt before reading the walkthrough below.

</div>

## Walkthrough: a first `IntegerField`

Let's start with the obvious implementation, with both bounds required:

```python run
import numbers

class IntegerField:
    def __init__(self, min_, max_):
        self._min = min_
        self._max = max_

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, numbers.Integral):
            raise ValueError(f'{self.prop_name} must be an integer.')
        if value < self._min:
            raise ValueError(f'{self.prop_name} must be >= {self._min}.')
        if value > self._max:
            raise ValueError(f'{self.prop_name} must be <= {self._max}.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

class Person:
    age = IntegerField(0, 100)

p = Person()
p.age = 5
print(p.age, p.__dict__)
try:
    p.age = 200
except ValueError as ex:
    print('ValueError:', ex)
```

Why `numbers.Integral` and not `int`? It's the abstract type for "integer-like" values, so it also accepts other integral types that register with it. (`bool` is an `int` subclass and passes too; the project doesn't ask us to exclude it.)

A manual check is reassuring, but we'll change this code several times, so let's set up proper unit tests.

## A test runner for the browser

`unittest` normally runs from the command line. Here we load a single `TestCase` class into a suite and run it, sending the report to standard output. With `quiet=True` it hides the tracebacks and lists just the failing tests with the last line of their error, which keeps the output short when we *expect* failures:

```python run
import io
import sys
import unittest

def run_tests(test_class, quiet=False):
    suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
    stream = io.StringIO() if quiet else sys.stdout
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    if quiet:
        problems = {}
        for test, tb in result.errors + result.failures:
            case = getattr(test, 'test_case', test)    # a subTest wraps its test case
            problems[case._testMethodName] = tb.strip().splitlines()[-1]
        for name, error in sorted(problems.items()):
            print(f'{name}: {error}')
    print('ALL PASSED' if result.wasSuccessful() else 'SOME TESTS FAILED')
```

## Problem: each test needs its own owner class

A descriptor only works as a class attribute, so every test needs a class that uses an `IntegerField`. We'd like each test to choose its own bounds. A natural first idea is to assign a fresh descriptor to a test class inside the test:

```python run
class TestIntegerField(unittest.TestCase):
    class Person:
        pass

    def test_set_age_ok(self):
        self.Person.age = IntegerField(5, 10)   # attach after the class exists
        p = self.Person()
        p.age = 5
        self.assertEqual(5, p.age)

run_tests(TestIntegerField)
```

The test errors out with `'IntegerField' object has no attribute 'prop_name'`. Remember from the descriptors lessons: `__set_name__` is called by `type.__new__` **while a class is being created**. Assigning a descriptor to a class that already exists doesn't call it, so `prop_name` was never set.

We could call `__set_name__` by hand after attaching the descriptor:

```python run
class TestIntegerField(unittest.TestCase):
    class Person:
        pass

    def create_person(self, min_, max_):
        self.Person.age = IntegerField(min_, max_)
        self.Person.age.__set_name__(self.Person, 'age')
        return self.Person()

    def test_set_age_ok(self):
        p = self.create_person(5, 10)
        p.age = 5
        self.assertEqual(5, p.age)

run_tests(TestIntegerField)
```

That works, but it relies on knowing the protocol's internals, and every test mutates one shared class. A cleaner approach is to create a **brand-new class** for every test.

## Creating classes with `type()`

Classes are objects, and their type is `type`. Called with three arguments, `type(name, bases, namespace)` creates a new class, exactly as a `class` statement would:

```python run
Person = type('Person', (), {'a': 10})
print(type(Person), Person.__name__, Person.a)
print({k: v for k, v in Person.__dict__.items() if not k.startswith('__')})
```

- `name` is the class name
- `bases` is a tuple of base classes (empty means just `object`)
- `namespace` is a dictionary of class attributes

Because this goes through `type.__new__`, descriptors in `namespace` **do** get their `__set_name__` call:

```python run
TestClass = type('TestClass', (), {'age': IntegerField(5, 10)})
print(TestClass.age.prop_name)
```

So our test case gets a small factory: given bounds, build a fresh class with an `IntegerField` named `age` and return an instance of it.

## The `IntegerField` tests

Now we can write real tests. `subTest` lets one test method check many values and still report exactly which one failed:

```python run
class TestIntegerField(unittest.TestCase):
    @staticmethod
    def create_test_class(min_, max_):
        obj = type('TestClass', (), {'age': IntegerField(min_, max_)})
        return obj()

    def test_set_age_ok(self):
        """Tests that valid values can be assigned/retrieved"""
        min_, max_ = 5, 10
        obj = self.create_test_class(min_, max_)
        for i, value in enumerate(range(min_, max_ + 1)):
            with self.subTest(test_number=i):
                obj.age = value
                self.assertEqual(value, obj.age)

    def test_set_age_invalid(self):
        """Tests that invalid values raise ValueErrors"""
        min_, max_ = -10, 10
        obj = self.create_test_class(min_, max_)
        bad_values = list(range(min_ - 5, min_))
        bad_values += list(range(max_ + 1, max_ + 5))
        bad_values += [10.5, 1 + 0j, 'abc', (1, 2)]
        for i, value in enumerate(bad_values):
            with self.subTest(test_number=i):
                with self.assertRaises(ValueError):
                    obj.age = value

    def test_class_get(self):
        """Tests that class attribute retrieval returns the descriptor instance"""
        obj = self.create_test_class(0, 0)
        self.assertIsInstance(type(obj).age, IntegerField)

run_tests(TestIntegerField)
```

Note the valid range includes both endpoints (`range(min_, max_ + 1)`): the bounds are inclusive, and the edges are where off-by-one bugs live.

## Test first: optional bounds

The next requirement is that either bound may be `None`. Let's write the tests **before** the code, run them, and watch them fail. This is test-driven development: a test you've never seen fail might not be testing anything.

```python run
class TestIntegerField(TestIntegerField):     # extend the suite we already have
    def test_set_age_min_only(self):
        """Tests that we can specify a min value only"""
        obj = self.create_test_class(0, None)
        for i, value in enumerate(range(0, 100, 10)):
            with self.subTest(test_number=i):
                obj.age = value
                self.assertEqual(value, obj.age)

    def test_set_age_max_only(self):
        """Tests that we can specify a max value only"""
        obj = self.create_test_class(None, 10)
        for i, value in enumerate(range(-90, 10, 10)):
            with self.subTest(test_number=i):
                obj.age = value
                self.assertEqual(value, obj.age)

    def test_set_age_no_limits(self):
        """Tests that we can use IntegerField without any limits at all"""
        obj = self.create_test_class(None, None)
        for i, value in enumerate(range(-100, 100, 10)):
            with self.subTest(test_number=i):
                obj.age = value
                self.assertEqual(value, obj.age)

run_tests(TestIntegerField, quiet=True)
```

(Subclassing the earlier `TestIntegerField` just saves us from retyping its three tests here; in a real project the suite lives in one file.)

The three original tests still pass, and the three new ones error out: comparing an `int` with `None` raises `TypeError`. Now implement the feature by skipping a bound when it's `None`:

```python run
class IntegerField:
    def __init__(self, min_=None, max_=None):
        self._min = min_
        self._max = max_

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, numbers.Integral):
            raise ValueError(f'{self.prop_name} must be an integer.')
        if self._min is not None and value < self._min:
            raise ValueError(f'{self.prop_name} must be >= {self._min}.')
        if self._max is not None and value > self._max:
            raise ValueError(f'{self.prop_name} must be <= {self._max}.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

run_tests(TestIntegerField)
```

All six tests pass. Notice that the test class didn't change: `create_test_class` looks up the name `IntegerField` when it runs, so it now picks up the new implementation.

<div class="callout note">
<span class="callout-title">`is not None`, not truthiness</span>

It's tempting to write `if self._min and value < self._min`. That silently ignores a bound of `0`, because `0` is falsy. None of the tests above would catch it, since none uses a bound of exactly `0` with a value just outside it. We'll add such a test in part 2.

</div>

## `CharField`

`CharField` is nearly the same, but it validates `len(value)`, and a minimum length of `None` or below zero is normalized to `0`:

```python run
class CharField:
    def __init__(self, min_=None, max_=None):
        min_ = min_ or 0         # None -> 0
        min_ = max(min_, 0)      # negative -> 0
        self._min = min_
        self._max = max_

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __set__(self, instance, value):
        if not isinstance(value, str):
            raise ValueError(f'{self.prop_name} must be a string.')
        if self._min is not None and len(value) < self._min:
            raise ValueError(f'{self.prop_name} must be >= {self._min} chars.')
        if self._max is not None and len(value) > self._max:
            raise ValueError(f'{self.prop_name} must be <= {self._max} chars.')
        instance.__dict__[self.prop_name] = value

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

class Person:
    name = CharField(1, 10)

p = Person()
for value in ('', 'Python Rocks!', 42):
    try:
        p.name = value
    except ValueError as ex:
        print('ValueError:', ex)
p.name = 'John'
print(p.name, p.__dict__)

class Person:
    name = CharField(-10)       # min normalized to 0, no max
p = Person()
p.name = ''
p.name = "I'm a lumberjack and I'm OK, I sleep all night and I work all day."
print(repr(p.name[:20]), type(p).name._min, type(p).name._max)
```

Here `min_ or 0` is fine, unlike in a comparison: whether `min_` is `None` or `0`, the result is `0`.

## The `CharField` tests

The tests mirror the integer ones, generating strings of chosen lengths with `'a' * length`, plus one test for the minimum-length normalization:

```python run
class TestCharField(unittest.TestCase):
    @staticmethod
    def create_test_class(min_, max_):
        obj = type('TestClass', (), {'name': CharField(min_, max_)})
        return obj()

    def test_set_name_ok(self):
        """Tests that valid values can be assigned/retrieved"""
        min_, max_ = 1, 10
        obj = self.create_test_class(min_, max_)
        for i, length in enumerate(range(min_, max_ + 1)):
            value = 'a' * length
            with self.subTest(test_number=i):
                obj.name = value
                self.assertEqual(value, obj.name)

    def test_set_name_invalid(self):
        """Tests that invalid values raise ValueErrors"""
        min_, max_ = 5, 10
        obj = self.create_test_class(min_, max_)
        bad_values = ['a' * length for length in range(0, min_)]
        bad_values += ['a' * length for length in range(max_ + 1, max_ + 5)]
        bad_values += [10, None, ['a'] * 6]
        for i, value in enumerate(bad_values):
            with self.subTest(test_number=i):
                with self.assertRaises(ValueError):
                    obj.name = value

    def test_class_get(self):
        """Tests that class attribute retrieval returns the descriptor instance"""
        obj = self.create_test_class(0, 0)
        self.assertIsInstance(type(obj).name, CharField)

    def test_set_name_min_negative_or_none(self):
        """Tests that setting a negative or None length results in a zero length"""
        obj = self.create_test_class(-10, 100)
        self.assertEqual(type(obj).name._min, 0)
        self.assertEqual(type(obj).name._max, 100)
        obj = self.create_test_class(None, None)
        self.assertEqual(type(obj).name._min, 0)
        self.assertIsNone(type(obj).name._max)

    def test_set_name_max_only(self):
        """Tests that we can specify a max length only"""
        obj = self.create_test_class(None, 10)
        for i, length in enumerate(range(0, 11)):
            value = 'a' * length
            with self.subTest(test_number=i):
                obj.name = value
                self.assertEqual(value, obj.name)

    def test_set_name_no_limits(self):
        """Tests that we can use CharField without any limits at all"""
        obj = self.create_test_class(None, None)
        for i, length in enumerate(range(0, 100, 10)):
            value = 'a' * length
            with self.subTest(test_number=i):
                obj.name = value
                self.assertEqual(value, obj.name)

run_tests(TestCharField)
```

Both descriptors now work and are covered by tests. But put the two classes side by side and most of their code is identical. Part 2 deals with that.

<div class="takeaways">

## Key takeaways

- A validating data descriptor checks in `__set__` and stores in `instance.__dict__[self.prop_name]`; `__get__` returns `self` for class access.
- `__set_name__` runs only when a class is **created**. Attaching a descriptor to an existing class skips it.
- `type(name, bases, namespace)` builds a fresh class per test, and does call `__set_name__`.
- `subTest` checks many values in one test while reporting each failure separately.
- Write the test first, watch it fail, then implement. Test bounds at their exact edges, and compare optional bounds with `is not None`.

</div>
