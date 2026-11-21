---
title: Project 3 - Solution - Approach
summary: Building the inventory package step by step, from the validate_integer helper through the Resource base class to CPU, Storage, HDD and SSD, then writing it to disk and running its unittest suite.
minutes: 25
---

## Plan

We'll build the solution in the same order a real project would grow, testing each piece before moving on:

1. **`validate_integer`**, the helper every class relies on.
2. **`Resource`**, the base class with all the shared state and the inventory rules.
3. **`CPU`**, the first subclass.
4. **`Storage`**, then **`HDD`** and **`SSD`** below it.
5. **Packaging**: write the modules into an `app` package, port the unit tests, and run them.

The finished project is laid out like this:

```python
<project root>/
    app/
        models/
            inventory.py        # Resource, CPU, Storage, HDD, SSD
        utils/
            validators.py       # validate_integer
    tests/
        unit/
            test_validators.py
            test_resource.py
            test_cpu.py
            test_storage.py
            test_hdd.py
            test_ssd.py
```

None of the folders needs an `__init__.py`: they are **implicit namespace packages**, which is enough for `from app.utils.validators import validate_integer` to work as long as the project root is on `sys.path`.

## Step 1: one validator for every number

Almost every rule in the brief has the same shape: "this must be an integer, at least X and at most Y". Writing those checks inline in every method would scatter near-identical `if` statements all over the classes. One helper keeps the rules consistent and the error messages uniform:

```python run
def validate_integer(
        arg_name, arg_value, min_value=None, max_value=None,
        custom_min_message=None, custom_max_message=None
):
    """Raise TypeError if arg_value isn't an int, ValueError if it's out of bounds."""
    if not isinstance(arg_value, int):
        raise TypeError(f'{arg_name} must be an integer.')

    if min_value is not None and arg_value < min_value:
        if custom_min_message is not None:
            raise ValueError(custom_min_message)
        raise ValueError(f'{arg_name} cannot be less than {min_value}')

    if max_value is not None and arg_value > max_value:
        if custom_max_message is not None:
            raise ValueError(custom_max_message)
        raise ValueError(f'{arg_name} cannot be greater than {max_value}')
```

Both bounds are optional and inclusive. Callers that know a friendlier explanation than "cannot be greater than 7" (for example "Cannot claim more than available") can pass their own message. Let's try every branch:

```python run
validate_integer('arg', 10, 0, 20)          # passes silently, returns None

for args, kwargs in [(('arg', 1.5), {}),
                     (('arg', 10, 100), {}),
                     (('arg', 10, 1, 5), {}),
                     (('arg', 10, 1, 5), {'custom_max_message': 'too many!'})]:
    try:
        validate_integer(*args, **kwargs)
    except (TypeError, ValueError) as ex:
        print(f'{type(ex).__name__}: {ex}')
```

<div class="callout note">
<span class="callout-title">`True` is an integer</span>

Since `bool` is a **subclass** of `int`, `isinstance(True, int)` is `True`, so `validate_integer('n', True)` passes. That's inheritance at work: a `bool` *is an* `int`. It's harmless here, but if you want to reject booleans, add an explicit `isinstance(arg_value, bool)` check first.

</div>

## Step 2: the `Resource` base class

The base class holds everything common to all parts. Three design decisions shape it:

- **State is private, access is read-only.** Each value is stored in an underscore attribute (`_total`) and exposed through a property with only a getter. Nobody can write `cpu.total = 100`; the counts change only through methods that enforce the rules.
- **Validate once, on the way in.** The initializer validates `total` and `allocated` before storing them, so an invalid `Resource` can never exist. Afterwards, every method validates its argument against the *current* state.
- **Derive, don't store.** `available` and `category` are computed properties. Storing them would mean keeping them in sync by hand.

```python run
class Resource:
    """Base class for resources"""

    def __init__(self, name, manufacturer, total, allocated):
        self._name = name
        self._manufacturer = manufacturer

        validate_integer('total', total, min_value=0)
        self._total = total

        validate_integer(
            'allocated', allocated, 0, total,
            custom_max_message='Allocated inventory cannot exceed total inventory'
        )
        self._allocated = allocated

    @property
    def name(self):
        return self._name

    @property
    def manufacturer(self):
        return self._manufacturer

    @property
    def total(self):
        return self._total

    @property
    def allocated(self):
        return self._allocated

    @property
    def category(self):
        return type(self).__name__.lower()

    @property
    def available(self):
        return self.total - self.allocated

    def __str__(self):
        return self.name

    def __repr__(self):
        return (f'{self.name} ({self.category} - {self.manufacturer}) : '
                f'total={self.total}, allocated={self.allocated}')

    def claim(self, num):
        validate_integer('num', num, 1, self.available,
                         custom_max_message='Cannot claim more than available')
        self._allocated += num

    def freeup(self, num):
        validate_integer('num', num, 1, self.allocated,
                         custom_max_message='Cannot return more than allocated')
        self._allocated -= num

    def died(self, num):
        validate_integer('num', num, 1, self.allocated,
                         custom_max_message='Cannot retire more than allocated')
        self._total -= num
        self._allocated -= num

    def purchased(self, num):
        validate_integer('num', num, 1)
        self._total += num
```

Notice how little each method has to do: the bounds express the whole rule. You can claim between 1 and `available` items, free up or retire between 1 and `allocated`, and buy any positive number.

`died` is the one rule the brief leaves open to interpretation. Parts break while they're **in a build**, so a dead part is removed from both the allocated count and the total. Bounding it by `allocated` also guarantees that `allocated` can never become negative or exceed `total`.

Let's exercise it:

```python run
r = Resource('Parrot', 'Pirates A-Hoy', 100, 50)
print(str(r))
print(repr(r))
print(r.category, r.available)

r.claim(10); print('after claim(10):    ', r.total, r.allocated, r.available)
r.freeup(5); print('after freeup(5):    ', r.total, r.allocated, r.available)
r.died(3); print('after died(3):      ', r.total, r.allocated, r.available)
r.purchased(20); print('after purchased(20):', r.total, r.allocated, r.available)
```

And the guard rails:

```python run
attempts = [
    lambda: r.claim(1_000),
    lambda: r.freeup(0),
    lambda: r.died(500),
    lambda: r.purchased(2.5),
    lambda: Resource('x', 'y', 10, 20),
    lambda: setattr(r, 'total', 1),
]
for attempt in attempts:
    try:
        attempt()
    except (TypeError, ValueError, AttributeError) as ex:
        print(f'{type(ex).__name__}: {ex}')
```

The last line shows the read-only property doing its job.

## Step 3: `CPU` extends the initializer

A `CPU` needs everything a `Resource` has, plus three attributes. The initializer accepts the parent's arguments and its own, passes the parent's part to `super().__init__()`, and then validates and stores only what's new:

```python run
class CPU(Resource):
    """Resource subclass used to track specific CPU inventory pools"""

    def __init__(self, name, manufacturer, total, allocated,
                 cores, socket, power_watts):
        super().__init__(name, manufacturer, total, allocated)

        validate_integer('cores', cores, 1)
        validate_integer('power_watts', power_watts, 1)

        self._cores = cores
        self._socket = socket
        self._power_watts = power_watts

    @property
    def cores(self):
        return self._cores

    @property
    def socket(self):
        return self._socket

    @property
    def power_watts(self):
        return self._power_watts

    def __repr__(self):
        return f'{self.category}: {self.name} ({self.socket} - x{self.cores})'

cpu = CPU('RYZEN Threadripper 2990WX', 'AMD', 10, 3, cores=32, socket='sTR4', power_watts=250)
print(repr(cpu))
print(str(cpu), cpu.category, cpu.available)
cpu.claim(7)
print(cpu.available)
```

`CPU` inherits `claim`, `available`, `__str__` and the rest unchanged. It **overrides** `__repr__` completely, because a CPU's most useful summary (socket and core count) is different from the generic one. And `category` is `'cpu'` without `CPU` doing anything: the property in `Resource` uses `type(self)`, which is `CPU` here. Had it hard-coded `'resource'`, or used `Resource.__name__`, every subclass would need its own override.

## Step 4: `Storage`, `HDD` and `SSD`

Hard drives and SSDs share a capacity, so an intermediate `Storage` class holds it. It isn't really meant to be used on its own, but there's nothing wrong with creating one (a USB stick, say), so it stays a normal class:

```python run
class Storage(Resource):
    """A base class for storage devices"""

    def __init__(self, name, manufacturer, total, allocated, capacity_gb):
        super().__init__(name, manufacturer, total, allocated)
        validate_integer('capacity_gb', capacity_gb, 1)
        self._capacity_gb = capacity_gb

    @property
    def capacity_gb(self):
        return self._capacity_gb

    def __repr__(self):
        return f'{self.category}: {self.capacity_gb} GB'

Storage('Thumbdrive', 'Sandisk', 10, 3, 512)
```

The two concrete devices add their own attributes. This time, instead of replacing the parent's `__repr__`, they **extend** it: `super().__repr__()` produces the `'hdd: 1000 GB'` part, and each subclass appends its own details. Note that `Storage.__repr__` uses `self.category`, which, again, is computed from the actual class:

```python run
class HDD(Storage):
    """Class used for HDD type resources"""

    def __init__(self, name, manufacturer, total, allocated, capacity_gb,
                 size, rpm):
        super().__init__(name, manufacturer, total, allocated, capacity_gb)

        allowed_sizes = ['2.5"', '3.5"']
        if size not in allowed_sizes:
            raise ValueError(f'Invalid HDD size. Must be one of {", ".join(allowed_sizes)}')
        validate_integer('rpm', rpm, min_value=1_000, max_value=50_000)

        self._size = size
        self._rpm = rpm

    @property
    def size(self):
        return self._size

    @property
    def rpm(self):
        return self._rpm

    def __repr__(self):
        return f'{super().__repr__()} ({self.size}, {self.rpm} rpm)'


class SSD(Storage):
    """Class used for SSD type resources"""

    def __init__(self, name, manufacturer, total, allocated, capacity_gb,
                 interface):
        super().__init__(name, manufacturer, total, allocated, capacity_gb)
        self._interface = interface

    @property
    def interface(self):
        return self._interface

    def __repr__(self):
        return f'{super().__repr__()} ({self.interface})'


hdd = HDD('1TB SATA HDD', 'Seagate', 10, 3, 1_000, '3.5"', 10_000)
ssd = SSD('Samsung 860 EVO', 'Samsung', 10, 3, 1_000, 'SATA III')
print(repr(hdd))
print(repr(ssd))
print(hdd.category, ssd.category, hdd.available)

for bad in [lambda: HDD('x', 'y', 1, 0, 500, '5.25"', 7_200),
            lambda: HDD('x', 'y', 1, 0, 500, '2.5"', 100_000),
            lambda: SSD('x', 'y', 1, 0, 0, 'SATA III')]:
    try:
        bad()
    except ValueError as ex:
        print('ValueError:', ex)
```

The last error is raised by `Storage`'s validation, reached through `SSD.__init__` → `super().__init__`. Each class validates exactly what it introduced.

## The hierarchy, as Python sees it

Following the MRO of an `HDD` shows the chain every lookup walks:

```python run
print([cls.__name__ for cls in HDD.__mro__])
print(isinstance(hdd, Storage), isinstance(hdd, Resource), isinstance(ssd, HDD))
print(issubclass(SSD, Resource))

for name in ('__repr__', 'capacity_gb', 'claim', '__str__'):
    owner = next(cls for cls in HDD.__mro__ if name in cls.__dict__)
    print(f'hdd.{name:<12} comes from {owner.__name__}')
```

When `repr(hdd)` runs, `HDD.__repr__` is found first; its `super().__repr__()` continues the search after `HDD` and lands on `Storage.__repr__`; there, `self.category` is looked up from `HDD` again and found in `Resource`. Three classes cooperate, and `self` is the same `hdd` throughout.

Because every subclass delegates to its parent, a single `isinstance(item, Resource)` check (or simply calling `claim`) works for any part in the inventory:

```python run
parts = [cpu, hdd, ssd]
for part in parts:
    print(f'{part.category:<4} {str(part):<28} available={part.available}')
```

## Step 5: packaging and testing

Now let's turn this into the real project: write the two modules into an `app` package in a scratch directory (no `__init__.py` files, so these are namespace packages), and import the classes from there. The module code is exactly what we built above, with the validator imported from its own module:

```python run
import importlib, sys, tempfile
from pathlib import Path

root = Path(tempfile.mkdtemp())
sys.path.insert(0, str(root))

def write(relative_path, source):
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source)

write('app/utils/validators.py', '''\
"""Various validators"""


def validate_integer(
        arg_name, arg_value, min_value=None, max_value=None,
        custom_min_message=None, custom_max_message=None
):
    if not isinstance(arg_value, int):
        raise TypeError(f'{arg_name} must be an integer.')
    if min_value is not None and arg_value < min_value:
        if custom_min_message is not None:
            raise ValueError(custom_min_message)
        raise ValueError(f'{arg_name} cannot be less than {min_value}')
    if max_value is not None and arg_value > max_value:
        if custom_max_message is not None:
            raise ValueError(custom_max_message)
        raise ValueError(f'{arg_name} cannot be greater than {max_value}')
''')

write('app/models/inventory.py', '''\
"""Inventory models"""

from app.utils.validators import validate_integer


class Resource:
    def __init__(self, name, manufacturer, total, allocated):
        self._name = name
        self._manufacturer = manufacturer
        validate_integer('total', total, min_value=0)
        self._total = total
        validate_integer(
            'allocated', allocated, 0, total,
            custom_max_message='Allocated inventory cannot exceed total inventory'
        )
        self._allocated = allocated

    @property
    def name(self):
        return self._name

    @property
    def manufacturer(self):
        return self._manufacturer

    @property
    def total(self):
        return self._total

    @property
    def allocated(self):
        return self._allocated

    @property
    def category(self):
        return type(self).__name__.lower()

    @property
    def available(self):
        return self.total - self.allocated

    def __str__(self):
        return self.name

    def __repr__(self):
        return (f'{self.name} ({self.category} - {self.manufacturer}) : '
                f'total={self.total}, allocated={self.allocated}')

    def claim(self, num):
        validate_integer('num', num, 1, self.available,
                         custom_max_message='Cannot claim more than available')
        self._allocated += num

    def freeup(self, num):
        validate_integer('num', num, 1, self.allocated,
                         custom_max_message='Cannot return more than allocated')
        self._allocated -= num

    def died(self, num):
        validate_integer('num', num, 1, self.allocated,
                         custom_max_message='Cannot retire more than allocated')
        self._total -= num
        self._allocated -= num

    def purchased(self, num):
        validate_integer('num', num, 1)
        self._total += num


class CPU(Resource):
    def __init__(self, name, manufacturer, total, allocated,
                 cores, socket, power_watts):
        super().__init__(name, manufacturer, total, allocated)
        validate_integer('cores', cores, 1)
        validate_integer('power_watts', power_watts, 1)
        self._cores = cores
        self._socket = socket
        self._power_watts = power_watts

    @property
    def cores(self):
        return self._cores

    @property
    def socket(self):
        return self._socket

    @property
    def power_watts(self):
        return self._power_watts

    def __repr__(self):
        return f'{self.category}: {self.name} ({self.socket} - x{self.cores})'


class Storage(Resource):
    def __init__(self, name, manufacturer, total, allocated, capacity_gb):
        super().__init__(name, manufacturer, total, allocated)
        validate_integer('capacity_gb', capacity_gb, 1)
        self._capacity_gb = capacity_gb

    @property
    def capacity_gb(self):
        return self._capacity_gb

    def __repr__(self):
        return f'{self.category}: {self.capacity_gb} GB'


class HDD(Storage):
    def __init__(self, name, manufacturer, total, allocated, capacity_gb,
                 size, rpm):
        super().__init__(name, manufacturer, total, allocated, capacity_gb)
        allowed_sizes = ['2.5"', '3.5"']
        if size not in allowed_sizes:
            raise ValueError(f'Invalid HDD size. '
                             f'Must be one of {", ".join(allowed_sizes)}')
        validate_integer('rpm', rpm, min_value=1_000, max_value=50_000)
        self._size = size
        self._rpm = rpm

    @property
    def size(self):
        return self._size

    @property
    def rpm(self):
        return self._rpm

    def __repr__(self):
        return f'{super().__repr__()} ({self.size}, {self.rpm} rpm)'


class SSD(Storage):
    def __init__(self, name, manufacturer, total, allocated, capacity_gb,
                 interface):
        super().__init__(name, manufacturer, total, allocated, capacity_gb)
        self._interface = interface

    @property
    def interface(self):
        return self._interface

    def __repr__(self):
        return f'{super().__repr__()} ({self.interface})'
''')

importlib.invalidate_caches()
for name in [k for k in sys.modules if k == 'app' or k.startswith('app.')]:
    del sys.modules[name]

from app.models import inventory
import app

print(app.__path__)
print(inventory.HDD('1TB', 'Seagate', 2, 0, 1_000, '2.5"', 5_400))
```

`app` has a `__path__` but no `__file__`, the mark of a namespace package.

### The unit tests

Each class gets its own test module. Real-world projects often use `pytest`, whose tests are plain functions with fixtures and `@pytest.mark.parametrize`. Here we use the standard library's `unittest`, which works everywhere: a fixture becomes `setUp`, and a parametrized test becomes a loop with `self.subTest(...)`, so each case is still reported separately if it fails. Here are the tests for `Resource`:

```python run
write('tests/unit/test_resource.py', '''\
import unittest

from app.models import inventory


class TestResource(unittest.TestCase):
    def setUp(self):
        self.values = {'name': 'Parrot', 'manufacturer': 'Pirates A-Hoy',
                       'total': 100, 'allocated': 50}
        self.resource = inventory.Resource(**self.values)

    def test_create_resource(self):
        for attr_name, value in self.values.items():
            self.assertEqual(getattr(self.resource, attr_name), value)

    def test_create_invalid_types(self):
        with self.assertRaises(TypeError):
            inventory.Resource('Parrot', 'Pirates A-Hoy', 10.5, 5)
        with self.assertRaises(TypeError):
            inventory.Resource('name', 'manu', 10, 2.5)

    def test_create_invalid_values(self):
        for total, allocated in [(-10, 0), (10, -5), (10, 20)]:
            with self.subTest(total=total, allocated=allocated):
                with self.assertRaises(ValueError):
                    inventory.Resource('name', 'manu', total, allocated)

    def test_read_only(self):
        for attr_name in self.values:
            with self.subTest(attr=attr_name):
                with self.assertRaises(AttributeError):
                    setattr(self.resource, attr_name, 1)

    def test_available(self):
        self.assertEqual(self.resource.available, 50)

    def test_category(self):
        self.assertEqual(self.resource.category, 'resource')

    def test_str_repr(self):
        self.assertEqual(str(self.resource), 'Parrot')
        self.assertEqual(repr(self.resource),
                         'Parrot (resource - Pirates A-Hoy) : total=100, allocated=50')

    def test_claim(self):
        self.resource.claim(2)
        self.assertEqual((self.resource.total, self.resource.allocated), (100, 52))

    def test_freeup(self):
        self.resource.freeup(2)
        self.assertEqual((self.resource.total, self.resource.allocated), (100, 48))

    def test_died(self):
        self.resource.died(2)
        self.assertEqual((self.resource.total, self.resource.allocated), (98, 48))

    def test_purchased(self):
        self.resource.purchased(2)
        self.assertEqual((self.resource.total, self.resource.allocated), (102, 50))

    def test_invalid_amounts(self):
        cases = [('claim', -1), ('claim', 0), ('claim', 1_000),
                 ('freeup', -1), ('freeup', 0), ('freeup', 1_000),
                 ('died', -1), ('died', 0), ('died', 1_000),
                 ('purchased', -1), ('purchased', 0)]
        for method, value in cases:
            with self.subTest(method=method, value=value):
                with self.assertRaises(ValueError):
                    getattr(self.resource, method)(value)
''')
print('written')
```

The other modules follow the same pattern. They're written in one go here:

```python run
write('tests/unit/test_validators.py', '''\
import unittest

from app.utils.validators import validate_integer


class TestIntegerValidator(unittest.TestCase):
    def test_valid(self):
        self.assertIsNone(validate_integer('arg', 10, 0, 20, 'min msg', 'max msg'))

    def test_type_error(self):
        with self.assertRaises(TypeError):
            validate_integer('arg', 1.5)

    def test_min_std_err_msg(self):
        with self.assertRaises(ValueError) as cm:
            validate_integer('arg', 10, 100)
        self.assertIn('arg', str(cm.exception))
        self.assertIn('100', str(cm.exception))

    def test_min_custom_msg(self):
        with self.assertRaises(ValueError) as cm:
            validate_integer('arg', 10, 100, custom_min_message='custom')
        self.assertEqual(str(cm.exception), 'custom')

    def test_max_std_err_msg(self):
        with self.assertRaises(ValueError) as cm:
            validate_integer('arg', 10, 1, 5)
        self.assertIn('arg', str(cm.exception))
        self.assertIn('5', str(cm.exception))

    def test_max_custom_err_msg(self):
        with self.assertRaises(ValueError) as cm:
            validate_integer('arg', 10, 1, 5, custom_max_message='custom')
        self.assertEqual(str(cm.exception), 'custom')
''')

write('tests/unit/test_cpu.py', '''\
import unittest

from app.models import inventory


class TestCPU(unittest.TestCase):
    def setUp(self):
        self.values = {'name': 'RYZEN Threadripper 2990WX', 'manufacturer': 'AMD',
                       'total': 10, 'allocated': 3,
                       'cores': 32, 'socket': 'sTR4', 'power_watts': 250}
        self.cpu = inventory.CPU(**self.values)

    def test_create_cpu(self):
        for attr_name, value in self.values.items():
            self.assertEqual(getattr(self.cpu, attr_name), value)

    def test_create_invalid(self):
        for field in ('cores', 'power_watts'):
            for value, exception in [(10.5, TypeError), (-1, ValueError), (0, ValueError)]:
                with self.subTest(field=field, value=value):
                    values = dict(self.values, **{field: value})
                    with self.assertRaises(exception):
                        inventory.CPU(**values)

    def test_repr(self):
        for part in (self.cpu.category, self.cpu.name, self.cpu.socket, str(self.cpu.cores)):
            self.assertIn(part, repr(self.cpu))
''')

write('tests/unit/test_storage.py', '''\
import unittest

from app.models import inventory


class TestStorage(unittest.TestCase):
    def setUp(self):
        self.values = {'name': 'Thumbdrive', 'manufacturer': 'Sandisk',
                       'total': 10, 'allocated': 3, 'capacity_gb': 512}
        self.storage = inventory.Storage(**self.values)

    def test_create(self):
        for attr_name, value in self.values.items():
            self.assertEqual(getattr(self.storage, attr_name), value)

    def test_create_invalid_capacity(self):
        for value, exception in [(10.5, TypeError), (-1, ValueError), (0, ValueError)]:
            with self.subTest(value=value):
                with self.assertRaises(exception):
                    inventory.Storage(**dict(self.values, capacity_gb=value))

    def test_repr(self):
        self.assertIn(self.storage.category, repr(self.storage))
        self.assertIn('512', repr(self.storage))
''')

write('tests/unit/test_hdd.py', '''\
import unittest

from app.models import inventory


class TestHDD(unittest.TestCase):
    def setUp(self):
        self.values = {'name': '1TB SATA HDD', 'manufacturer': 'Seagate',
                       'total': 10, 'allocated': 3, 'capacity_gb': 1_000,
                       'size': '3.5"', 'rpm': 10_000}
        self.hdd = inventory.HDD(**self.values)

    def test_create(self):
        for attr_name, value in self.values.items():
            self.assertEqual(getattr(self.hdd, attr_name), value)

    def test_create_invalid_size(self):
        for size in ('2.5', '5.25"'):
            with self.subTest(size=size):
                with self.assertRaises(ValueError):
                    inventory.HDD(**dict(self.values, size=size))

    def test_create_invalid_rpm(self):
        for rpm, exception in [('100', TypeError), (100, ValueError), (100_000, ValueError)]:
            with self.subTest(rpm=rpm):
                with self.assertRaises(exception):
                    inventory.HDD(**dict(self.values, rpm=rpm))

    def test_repr(self):
        for part in (self.hdd.category, '1000', self.hdd.size, '10000'):
            self.assertIn(part, repr(self.hdd))
''')

write('tests/unit/test_ssd.py', '''\
import unittest

from app.models import inventory


class TestSSD(unittest.TestCase):
    def setUp(self):
        self.values = {'name': 'Samsung 860 EVO', 'manufacturer': 'Samsung',
                       'total': 10, 'allocated': 3, 'capacity_gb': 1_000,
                       'interface': 'SATA III'}
        self.ssd = inventory.SSD(**self.values)

    def test_create(self):
        for attr_name, value in self.values.items():
            self.assertEqual(getattr(self.ssd, attr_name), value)

    def test_repr(self):
        for part in (self.ssd.category, '1000', self.ssd.interface):
            self.assertIn(part, repr(self.ssd))
''')

print(sorted(str(p.relative_to(root)) for p in root.rglob('*.py')))
```

### Running the suite

On a real machine you'd run `python -m unittest discover tests/unit` (or `python -m pytest tests`) from the project root. Here, the same discovery is available from Python: `TestLoader.discover` finds every `test_*.py` file in a folder, and `TextTestRunner` runs the tests and prints a report:

```python run
import unittest

importlib.invalidate_caches()
for name in [k for k in sys.modules if k.startswith('test_')]:
    del sys.modules[name]

suite = unittest.defaultTestLoader.discover(str(root / 'tests' / 'unit'))
result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
print('all passed:', result.wasSuccessful())
```

All 30 tests pass. To see that the tests actually guard the rules, introduce a plausible bug: a `claim` that forgets the **lower** bound. It still refuses to over-claim, but now accepts `0` and, worse, negative numbers, which would quietly *increase* the available stock. Run the relevant test again with the bug patched in:

```python run
def buggy_claim(self, num):
    inventory.validate_integer('num', num, max_value=self.available)   # no min_value!
    self._allocated += num

original_claim = inventory.Resource.claim
inventory.Resource.claim = buggy_claim
try:
    suite = unittest.defaultTestLoader.loadTestsFromName(
        'test_resource.TestResource.test_invalid_amounts')
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=1).run(suite)
finally:
    inventory.Resource.claim = original_claim

print('failures:', len(result.failures))
```

Thanks to `subTest`, the report names each failing case, `claim(-1)` and `claim(0)`, while the other nine cases in the same test still pass. And because `CPU`, `HDD` and `SSD` all inherit `claim`, that one bug (or its fix) affects every part type at once, which is both the power and the responsibility of a base class.

<div class="callout tip">
<span class="callout-title">Going further: slots</span>

An inventory can hold many objects, and these classes have a fixed set of attributes. Adding `__slots__` (for example `__slots__ = '_name', '_manufacturer', '_total', '_allocated'` in `Resource`, and only the **new** names in each subclass) would remove the per-instance `__dict__`. Remember the rule from the previous section: if any class in the chain forgets its `__slots__`, its instances get a dictionary back.

</div>

<div class="takeaways">

## Key takeaways

- A shared `validate_integer` helper with optional bounds and custom messages expresses every numeric rule in one line.
- `Resource` keeps its state in private attributes behind read-only properties, validates on creation, and changes counts only through methods whose bounds depend on the current state.
- Derived values (`available`, `category`) are computed properties. Using `type(self)` makes `category` correct for every subclass automatically.
- Each subclass passes the parent's arguments to `super().__init__()` and validates only what it adds. `HDD` and `SSD` extend `Storage.__repr__` via `super().__repr__()`.
- The package uses implicit namespace packages; pytest-style tests translate directly to `unittest` with `setUp` and `subTest`, and `TestLoader.discover` + `TextTestRunner` run them.

</div>
