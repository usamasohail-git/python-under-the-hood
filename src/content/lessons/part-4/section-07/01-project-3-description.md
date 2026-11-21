---
title: Project 3 - Description
summary: The brief for an inventory of computer parts, modeled as a Resource base class with CPU, Storage, HDD and SSD subclasses that validate their data and protect their counts.
minutes: 10
---

## The scenario

Someone who builds computers for a living (and films the builds) keeps a stock of parts: say ten AMD Ryzen CPUs of one model, a box of identical 1 TB hard drives, a few SSDs. For each kind of part they need to know how many they own and how many are currently **in use** in a build. Parts move around:

- they **claim** some from the pool for a new build,
- they **free up** parts when a build is taken apart,
- some parts **die** (one overclocking experiment too many) and leave the inventory for good,
- and they **purchase** new ones to restock.

A real application would keep this in a database. Here we only build the classes the program would use while it runs, and don't worry about loading or saving the state.

## The data

Each object in the program tracks **one pool of identical parts**. Here's the kind of information it holds, for a few sample pools:

```python run
inventory = [
    {'kind': 'CPU', 'name': 'Ryzen 7 2700', 'manufacturer': 'AMD',
     'total': 5, 'allocated': 2, 'cores': 8, 'socket': 'AM4', 'power_watts': 65},
    {'kind': 'CPU', 'name': 'Core i9-9900K', 'manufacturer': 'Intel',
     'total': 3, 'allocated': 3, 'cores': 8, 'socket': 'LGA1151', 'power_watts': 95},
    {'kind': 'HDD', 'name': '1TB SATA HDD', 'manufacturer': 'Seagate',
     'total': 10, 'allocated': 3, 'capacity_gb': 1_000, 'size': '3.5"', 'rpm': 7_200},
    {'kind': 'SSD', 'name': '860 EVO', 'manufacturer': 'Samsung',
     'total': 8, 'allocated': 1, 'capacity_gb': 500, 'interface': 'SATA III'},
]

common = ['kind', 'name', 'manufacturer', 'total', 'allocated']
for item in inventory:
    extras = {k: v for k, v in item.items() if k not in common}
    available = item['total'] - item['allocated']
    print(f"{item['kind']:<4} {item['name']:<14} {item['manufacturer']:<8}"
          f" total={item['total']:<3} in use={item['allocated']:<3} available={available:<3} {extras}")
```

Two things stand out. First, **every** pool has the same five pieces of information (a name, a manufacturer, a total, the number allocated, and therefore the number available). Second, each **kind** of part adds its own details: cores and a socket for a CPU, a capacity for any storage device, a physical size and spin speed for a hard drive, an interface for an SSD. That's precisely the shape of a class hierarchy.

## The class hierarchy

<figure class="diagram">
<svg viewBox="0 0 620 300" role="img" aria-label="Class hierarchy: CPU and Storage inherit from Resource; HDD and SSD inherit from Storage">
<defs>
<marker id="pd1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-head"/></marker>
</defs>
<rect x="190" y="15" width="240" height="72" rx="8" class="d-obj-hl"/><text x="310" y="40" text-anchor="middle" class="d-text">Resource</text><text x="310" y="60" text-anchor="middle" class="d-sub">name, manufacturer, total, allocated</text><text x="310" y="77" text-anchor="middle" class="d-sub">claim · freeup · died · purchased</text>
<rect x="30" y="130" width="210" height="60" rx="8" class="d-obj"/><text x="135" y="155" text-anchor="middle" class="d-text">CPU</text><text x="135" y="175" text-anchor="middle" class="d-sub">cores, socket, power_watts</text>
<rect x="380" y="130" width="210" height="60" rx="8" class="d-obj"/><text x="485" y="155" text-anchor="middle" class="d-text">Storage</text><text x="485" y="175" text-anchor="middle" class="d-sub">capacity_gb</text>
<rect x="280" y="235" width="150" height="55" rx="8" class="d-obj"/><text x="355" y="258" text-anchor="middle" class="d-text">HDD</text><text x="355" y="277" text-anchor="middle" class="d-sub">size, rpm</text>
<rect x="450" y="235" width="150" height="55" rx="8" class="d-obj"/><text x="525" y="258" text-anchor="middle" class="d-text">SSD</text><text x="525" y="277" text-anchor="middle" class="d-sub">interface</text>
<path d="M135 130 L270 89" class="d-arrow" marker-end="url(#pd1)"/>
<path d="M485 130 L350 89" class="d-arrow" marker-end="url(#pd1)"/>
<path d="M355 235 L455 192" class="d-arrow" marker-end="url(#pd1)"/>
<path d="M525 235 L505 192" class="d-arrow" marker-end="url(#pd1)"/>
</svg>
<figcaption>Each class lists only what it adds. An <code>HDD</code> is a <code>Storage</code> device, which is a <code>Resource</code>, so it has all the attributes along its chain.</figcaption>
</figure>

GPUs and memory would fit in the same tree, but for this project only `CPU`, `HDD` and `SSD` (plus the intermediate `Storage`) are required.

## Your goals

**Goal 1. A validation helper.** Write `validate_integer(arg_name, arg_value, min_value=None, max_value=None, custom_min_message=None, custom_max_message=None)`. It raises `TypeError` if the value isn't an integer, and `ValueError` if it is below `min_value` or above `max_value` (both inclusive, both optional). The default error messages should mention the argument name and the bound; a custom message, when given, replaces the default one.

**Goal 2. The `Resource` base class**, created with `Resource(name, manufacturer, total, allocated)`, where `total` and `allocated` are the **current** counts. It provides:

| Member | Behavior |
| --- | --- |
| `name`, `manufacturer` | read-only properties |
| `total`, `allocated` | read-only properties, stored in private attributes, changed **only** by the methods below |
| `available` | computed: `total - allocated` |
| `category` | computed: the lower-case name of the instance's class (`'resource'`, `'cpu'`, `'hdd'`, …) |
| `__str__` | just the name |
| `__repr__` | a more detailed representation, e.g. `Parrot (resource - Pirates A-Hoy) : total=100, allocated=50` |
| `claim(n)` | takes `n` items from the pool, if that many are available |
| `freeup(n)` | returns `n` items to the pool (at most the number in use) |
| `died(n)` | permanently removes `n` items that were in use |
| `purchased(n)` | adds `n` new items to the pool |

`total` must be a non-negative integer, `allocated` an integer between `0` and `total`, and every `n` a positive integer within the limits above. Invalid values raise `TypeError` or `ValueError`.

**Goal 3. `CPU(Resource)`** adds `cores` (e.g. `8`), `socket` (e.g. `'AM4'`) and `power_watts` (e.g. `94`). Cores and watts must be positive integers.

**Goal 4. `Storage(Resource)`** adds `capacity_gb` (a positive integer). It's a common base for:

- **`HDD(Storage)`**, which adds `size` (only `'2.5"'` or `'3.5"'` are valid) and `rpm` (an integer between 1,000 and 50,000);
- **`SSD(Storage)`**, which adds `interface` (e.g. `'PCIe NVMe 3.0 x4'`).

## Constraints and hints

- **Every attribute is read-only** from the outside: use properties backed by "private" (`_name`) attributes. The counts change only through the four methods.
- **Each subclass initializer takes all the arguments of its parent plus its own**, and hands the parent's part over with `super().__init__(...)`. No class should repeat the validation or the assignments of the classes above it.
- **Validate numbers in one place.** `validate_integer` with its `min_value`/`max_value` covers almost every rule above; the bounds for `claim`, `freeup` and `died` depend on the object's current state.
- `category` shouldn't be overridden in every subclass: compute it once in `Resource` from `type(self)`.
- Give each class a `__repr__` that shows its specific attributes. A subclass can build on its parent's `__repr__` with `super().__repr__()`.
- Lay the code out as a package: `app/utils/validators.py` for the helper, `app/models/inventory.py` for the classes, and unit tests for each class under `tests/unit/`.

Here's how the finished classes should behave (a static preview, not runnable yet):

```python
cpu = CPU('Ryzen 7 2700', 'AMD', total=5, allocated=2, cores=8, socket='AM4', power_watts=65)
cpu.claim(2)
cpu.available     # 1
cpu.category      # 'cpu'
cpu.claim(5)      # ValueError: Cannot claim more than available
cpu.total = 100   # AttributeError: the counts are read-only
```

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution walkthrough, open the **practice page** for this section. Each goal is an auto-graded exercise (the validator, `Resource`, `CPU`, and the storage classes) with tests modeled on the project's unit tests: they check values, read-only properties, every validation rule and the use of inheritance. Have a go first; the next lesson builds a complete solution step by step and runs the full test suite against it.

</div>

<div class="takeaways">

## Key takeaways

- Each object tracks a **pool** of identical parts: total, allocated and (derived) available counts, changed only by `claim`, `freeup`, `died` and `purchased`.
- Shared state and behavior live in a `Resource` base class; `CPU`, `Storage`, `HDD` and `SSD` add only their own attributes.
- All attributes are read-only properties, all numbers are validated, and every subclass delegates to its parent's initializer.
- The solution is organized as a package with a separate validators module and unit tests.

</div>
