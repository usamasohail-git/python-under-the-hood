---
title: Project 4 - Solution - Part 2
summary: Refactor `IntegerField` and `CharField` onto a shared `BaseValidator` with a `validate()` hook, using the unit tests as a safety net, then extend the suite and add a new field type cheaply.
minutes: 15
---

## Where we left off

Part 1 ended with two working descriptors and two test suites. Here they are again (this page runs in its own namespace), with the tests in a slightly condensed form:

```python run
import io
import numbers
import sys
import unittest

def run_tests(test_class, quiet=False):
    suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
    stream = io.StringIO() if quiet else sys.stdout
    result = unittest.TextTestRunner(stream=stream, verbosity=2 if not quiet else 0).run(suite)
    if quiet:
        problems = {}
        for test, tb in result.errors + result.failures:
            case = getattr(test, 'test_case', test)
            problems[case._testMethodName] = tb.strip().splitlines()[-1]
        for name, error in sorted(problems.items()):
            print(f'{name}: {error}')
    print(f'{result.testsRun} tests:', 'ALL PASSED' if result.wasSuccessful() else 'SOME TESTS FAILED')


class TestIntegerField(unittest.TestCase):
    @staticmethod
    def create_test_class(min_, max_):
        return type('TestClass', (), {'age': IntegerField(min_, max_)})()

    def check_valid(self, obj, values):
        for i, value in enumerate(values):
            with self.subTest(test_number=i):
                obj.age = value
                self.assertEqual(value, obj.age)

    def test_set_age_ok(self):
        """Tests that valid values can be assigned/retrieved"""
        self.check_valid(self.create_test_class(5, 10), range(5, 11))

    def test_set_age_invalid(self):
        """Tests that invalid values raise ValueErrors"""
        obj = self.create_test_class(-10, 10)
        bad_values = [*range(-15, -10), *range(11, 15), 10.5, 1 + 0j, 'abc', (1, 2)]
        for i, value in enumerate(bad_values):
            with self.subTest(test_number=i):
                with self.assertRaises(ValueError):
                    obj.age = value

    def test_class_get(self):
        """Tests that class attribute retrieval returns the descriptor instance"""
        self.assertIsInstance(type(self.create_test_class(0, 0)).age, IntegerField)

    def test_set_age_min_only(self):
        """Tests that we can specify a min value only"""
        self.check_valid(self.create_test_class(0, None), range(0, 100, 10))

    def test_set_age_max_only(self):
        """Tests that we can specify a max value only"""
        self.check_valid(self.create_test_class(None, 10), range(-90, 10, 10))

    def test_set_age_no_limits(self):
        """Tests that we can use IntegerField without any limits at all"""
        self.check_valid(self.create_test_class(None, None), range(-100, 100, 10))


class TestCharField(unittest.TestCase):
    @staticmethod
    def create_test_class(min_, max_):
        return type('TestClass', (), {'name': CharField(min_, max_)})()

    def check_valid(self, obj, lengths):
        for i, length in enumerate(lengths):
            value = 'a' * length
            with self.subTest(test_number=i):
                obj.name = value
                self.assertEqual(value, obj.name)

    def test_set_name_ok(self):
        """Tests that valid values can be assigned/retrieved"""
        self.check_valid(self.create_test_class(1, 10), range(1, 11))

    def test_set_name_invalid(self):
        """Tests that invalid values raise ValueErrors"""
        obj = self.create_test_class(5, 10)
        bad_values = ['a' * n for n in [*range(0, 5), *range(11, 15)]] + [10, None]
        for i, value in enumerate(bad_values):
            with self.subTest(test_number=i):
                with self.assertRaises(ValueError):
                    obj.name = value

    def test_class_get(self):
        """Tests that class attribute retrieval returns the descriptor instance"""
        self.assertIsInstance(type(self.create_test_class(0, 0)).name, CharField)

    def test_set_name_min_negative_or_none(self):
        """Tests that setting a negative or None length results in a zero length"""
        descriptor = type(self.create_test_class(-10, 100)).name
        self.assertEqual((descriptor._min, descriptor._max), (0, 100))
        descriptor = type(self.create_test_class(None, None)).name
        self.assertEqual((descriptor._min, descriptor._max), (0, None))

    def test_set_name_max_only(self):
        """Tests that we can specify a max length only"""
        self.check_valid(self.create_test_class(None, 10), range(0, 11))

    def test_set_name_no_limits(self):
        """Tests that we can use CharField without any limits at all"""
        self.check_valid(self.create_test_class(None, None), range(0, 100, 10))
```

And the two descriptors as they stood:

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


class CharField:
    def __init__(self, min_=None, max_=None):
        min_ = max(min_ or 0, 0)
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

run_tests(TestIntegerField, quiet=True)
run_tests(TestCharField, quiet=True)
```

## Spotting the duplication

Compare the two classes method by method:

| Method | `IntegerField` vs `CharField` |
|---|---|
| `__set_name__` | identical |
| `__get__` | identical |
| `__init__` | same storage; `CharField` normalizes the minimum first |
| `__set__` | different *checks*, identical *storage* (`instance.__dict__[...] = value`) |

The pattern is clear: everything about **being a descriptor** is shared; only the **validation rule** differs. So we'll move the descriptor machinery into a base class, and have `__set__` call a `validate(value)` method that subclasses override. This is the *template method* pattern: the base class defines the algorithm (validate, then store), and subclasses fill in one step.

## The base class

```python run
class BaseValidator:
    def __init__(self, min_=None, max_=None):
        self._min = min_
        self._max = max_

    def __set_name__(self, owner_class, prop_name):
        self.prop_name = prop_name

    def __get__(self, instance, owner_class):
        if instance is None:
            return self
        return instance.__dict__.get(self.prop_name, None)

    def validate(self, value):
        # Subclasses override this to raise ValueError for bad values.
        # The base implementation accepts everything.
        pass

    def __set__(self, instance, value):
        self.validate(value)
        instance.__dict__[self.prop_name] = value
```

On its own, `BaseValidator` is a working (if not very useful) descriptor that accepts anything:

```python run
class Person:
    name = BaseValidator()

p = Person()
p.name = 'Alex'
print(p.name, p.__dict__, type(Person.name).__name__)
```

## The subclasses

Each field now contains only what makes it special:

```python run
class IntegerField(BaseValidator):
    def validate(self, value):
        if not isinstance(value, numbers.Integral):
            raise ValueError(f'{self.prop_name} must be an integer.')
        if self._min is not None and value < self._min:
            raise ValueError(f'{self.prop_name} must be >= {self._min}.')
        if self._max is not None and value > self._max:
            raise ValueError(f'{self.prop_name} must be <= {self._max}.')


class CharField(BaseValidator):
    def __init__(self, min_=None, max_=None):
        min_ = max(min_ or 0, 0)
        super().__init__(min_, max_)

    def validate(self, value):
        if not isinstance(value, str):
            raise ValueError(f'{self.prop_name} must be a string.')
        if self._min is not None and len(value) < self._min:
            raise ValueError(f'{self.prop_name} must be >= {self._min} chars.')
        if self._max is not None and len(value) > self._max:
            raise ValueError(f'{self.prop_name} must be <= {self._max} chars.')
```

`IntegerField` inherits `__init__` unchanged. `CharField` overrides `__init__` only to normalize the minimum, then delegates to `super().__init__`. Neither defines `__get__`, `__set__` or `__set_name__`: those come from `BaseValidator`, and since `__set__` is found on the class through the MRO, both are still data descriptors.

## Did we break anything?

This is the payoff for writing tests first. Instead of re-checking everything by hand, re-run the suites. The test classes look up `IntegerField` and `CharField` by name when they run, so they automatically test the new versions:

```python run
run_tests(TestIntegerField)
```

```python run
run_tests(TestCharField)
```

Everything passes: the refactoring preserved the behavior.

## Closing the gaps in the suite

Part 1 pointed out a bug the suite couldn't catch: writing `if self._min and value < self._min` ignores a bound of `0`. Let's prove it by planting that bug in a throwaway subclass and writing tests that pin the exact edges:

```python run
class TestIntegerFieldEdges(TestIntegerField):
    def test_zero_bounds(self):
        """Bounds of 0 are enforced"""
        obj = self.create_test_class(0, 0)
        obj.age = 0
        for bad in (-1, 1):
            with self.subTest(value=bad):
                with self.assertRaises(ValueError):
                    obj.age = bad

    def test_error_mentions_name(self):
        """Error messages name the attribute"""
        obj = self.create_test_class(0, 10)
        with self.assertRaisesRegex(ValueError, 'age'):
            obj.age = 11


class BuggyIntegerField(IntegerField):
    def validate(self, value):
        if not isinstance(value, numbers.Integral):
            raise ValueError(f'{self.prop_name} must be an integer.')
        if self._min and value < self._min:           # bug: skips min_ == 0
            raise ValueError(f'{self.prop_name} must be >= {self._min}.')
        if self._max and value > self._max:           # bug: skips max_ == 0
            raise ValueError(f'{self.prop_name} must be <= {self._max}.')

GoodIntegerField = IntegerField
IntegerField = BuggyIntegerField        # the tests look up this name
run_tests(TestIntegerFieldEdges, quiet=True)
IntegerField = GoodIntegerField
run_tests(TestIntegerFieldEdges, quiet=True)
```

The edge test catches the buggy version and passes on the real one. (Temporarily re-binding a global name is a crude way to swap implementations; in a real project you'd use `unittest.mock.patch` or parametrize the test class.)

## The payoff: new fields are cheap

With the base class in place, a new field type is just a `validate` method. For example, a `ChoiceField` that only accepts one of a fixed set of values:

```python run
class ChoiceField(BaseValidator):
    def __init__(self, *choices):
        super().__init__()
        self.choices = choices

    def validate(self, value):
        if value not in self.choices:
            raise ValueError(f'{self.prop_name} must be one of {self.choices}.')


class Person:
    name = CharField(1, 50)
    age = IntegerField(0, 200)
    status = ChoiceField('active', 'inactive')

p = Person()
p.name, p.age, p.status = 'Alex', 42, 'active'
print(p.__dict__)
for attr, value in [('name', ''), ('age', 250), ('status', 'retired')]:
    try:
        setattr(p, attr, value)
    except ValueError as ex:
        print('ValueError:', ex)
```

<div class="callout tip">
<span class="callout-title">Taking it further</span>

Working in a notebook or a browser page gets unwieldy as a project grows. In a real code base you'd put the descriptors in a module (say `validators.py`), the tests in `test_validators.py`, and run them with `python -m unittest` (or `pytest`) from the command line or your editor.

</div>

<div class="takeaways">

## Key takeaways

- When classes share structure but differ in one step, move the structure into a base class and make the step an overridable method (`validate`).
- `BaseValidator` owns `__init__`, `__set_name__`, `__get__` and `__set__`; subclasses inherit the data-descriptor behavior through the MRO.
- Subclasses override `__init__` only to add something, and call `super().__init__()` for the rest.
- A good test suite turns refactoring from risky into routine: change the code, re-run, done.
- Tests at exact boundaries (like a bound of `0`) catch truthiness bugs that "typical" values miss.

</div>
