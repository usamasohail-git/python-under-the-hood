---
title: Set Operations
summary: Intersection, union, difference and symmetric difference, the subset and superset comparisons, and why the methods accept any iterable while the operators insist on sets.
minutes: 15
---

## The four core operations

Sets come with the operations from mathematical set theory. Each one is available both as an **operator** and as a **method**, and each returns a **new** set, leaving its operands untouched.

<figure class="diagram">
<svg viewBox="0 0 560 150" role="img" aria-label="Four Venn diagrams of two overlapping sets s1 and s2, shading the intersection, the union, the difference s1 minus s2, and the symmetric difference">
<defs><clipPath id="vn-c0"><circle cx="96" cy="62" r="32"/></clipPath><mask id="vn-m2"><rect x="284" y="0" width="137" height="150" fill="white"/><circle cx="370" cy="62" r="32" fill="black"/></mask><mask id="vn-ma3"><rect x="421" y="0" width="137" height="150" fill="white"/><circle cx="507" cy="62" r="32" fill="black"/></mask><mask id="vn-mb3"><rect x="421" y="0" width="137" height="150" fill="white"/><circle cx="467" cy="62" r="32" fill="black"/></mask></defs>
<circle cx="56" cy="62" r="32" class="d-obj"/>
<circle cx="96" cy="62" r="32" class="d-obj"/>
<circle cx="56" cy="62" r="32" class="d-obj-hl" clip-path="url(#vn-c0)" style="stroke:none"/>
<circle cx="56" cy="62" r="32" class="d-obj" style="fill:none"/>
<circle cx="96" cy="62" r="32" class="d-obj" style="fill:none"/>
<text x="42" y="66" text-anchor="middle" class="d-text">s1</text>
<text x="110" y="66" text-anchor="middle" class="d-text">s2</text>
<text x="76" y="122" text-anchor="middle" class="d-text">s1 &amp; s2</text>
<text x="76" y="140" text-anchor="middle" class="d-sub">intersection</text>
<circle cx="193" cy="62" r="32" class="d-obj"/>
<circle cx="233" cy="62" r="32" class="d-obj"/>
<circle cx="193" cy="62" r="32" class="d-obj-hl" style="stroke:none"/>
<circle cx="233" cy="62" r="32" class="d-obj-hl" style="stroke:none"/>
<circle cx="193" cy="62" r="32" class="d-obj" style="fill:none"/>
<circle cx="233" cy="62" r="32" class="d-obj" style="fill:none"/>
<text x="179" y="66" text-anchor="middle" class="d-text">s1</text>
<text x="247" y="66" text-anchor="middle" class="d-text">s2</text>
<text x="213" y="122" text-anchor="middle" class="d-text">s1 | s2</text>
<text x="213" y="140" text-anchor="middle" class="d-sub">union</text>
<circle cx="330" cy="62" r="32" class="d-obj"/>
<circle cx="370" cy="62" r="32" class="d-obj"/>
<circle cx="330" cy="62" r="32" class="d-obj-hl" mask="url(#vn-m2)" style="stroke:none"/>
<circle cx="330" cy="62" r="32" class="d-obj" style="fill:none"/>
<circle cx="370" cy="62" r="32" class="d-obj" style="fill:none"/>
<text x="316" y="66" text-anchor="middle" class="d-text">s1</text>
<text x="384" y="66" text-anchor="middle" class="d-text">s2</text>
<text x="350" y="122" text-anchor="middle" class="d-text">s1 - s2</text>
<text x="350" y="140" text-anchor="middle" class="d-sub">difference</text>
<circle cx="467" cy="62" r="32" class="d-obj"/>
<circle cx="507" cy="62" r="32" class="d-obj"/>
<circle cx="467" cy="62" r="32" class="d-obj-hl" mask="url(#vn-ma3)" style="stroke:none"/>
<circle cx="507" cy="62" r="32" class="d-obj-hl" mask="url(#vn-mb3)" style="stroke:none"/>
<circle cx="467" cy="62" r="32" class="d-obj" style="fill:none"/>
<circle cx="507" cy="62" r="32" class="d-obj" style="fill:none"/>
<text x="453" y="66" text-anchor="middle" class="d-text">s1</text>
<text x="521" y="66" text-anchor="middle" class="d-text">s2</text>
<text x="487" y="122" text-anchor="middle" class="d-text">s1 ^ s2</text>
<text x="487" y="140" text-anchor="middle" class="d-sub">symmetric difference</text>
</svg>
<figcaption>The shaded region is the result. Intersection keeps what both sets share, union keeps everything, difference keeps what is only in the left set, and symmetric difference keeps what is in exactly one of them.</figcaption>
</figure>

| Operation | Operator | Method | Result contains elements… |
|---|---|---|---|
| intersection | `s1 & s2` | `s1.intersection(s2)` | in both |
| union | `s1 \| s2` | `s1.union(s2)` | in either |
| difference | `s1 - s2` | `s1.difference(s2)` | in `s1` but not in `s2` |
| symmetric difference | `s1 ^ s2` | `s1.symmetric_difference(s2)` | in exactly one of them |

## Intersection

```python run
s1 = {1, 2, 3}
s2 = {2, 3, 4}
s3 = {3, 4, 5}
print(s1 & s2 == s1.intersection(s2) == {2, 3})
print(sorted(s1 & s2 & s3))
print(sorted(s1.intersection(s2, s3)))   # the method takes several arguments
```

## Union

```python run
s1 = {1, 2, 3}
s2 = {3, 4, 5}
s3 = {5, 6, 7}
print(sorted(s1 | s2))
print(sorted(s1 | s2 | s3) == sorted(s1.union(s2, s3)))
```

The shared `3` and `5` appear only once, of course: the result is a set.

## Disjoint sets

Two sets are **disjoint** when they have no elements in common, that is, their intersection is empty. There's a method for that:

```python run
s1 = {1, 2, 3}
s2 = {2, 3, 4}
s3 = {30, 40, 50}
print(s1.isdisjoint(s2), s2.isdisjoint(s3))
```

You'll also see the intersection used directly, relying on the fact that an empty set is falsy and a non-empty one is truthy (even `{0}`):

```python run
print(bool(set()), bool({0}))

if not {1, 2} & {3, 4}:
    print('disjoint')
if {1, 2} & {2, 3}:
    print('overlapping')
```

`isdisjoint` is the better choice when that's all you want to know: it can stop at the first common element instead of building a whole intersection set.

## Difference

```python run
s1 = {1, 2, 3, 4, 5}
s2 = {4, 5}
print(sorted(s1 - s2))
print(s2 - s1)
```

Difference is **not commutative**: `s1 - s2` and `s2 - s1` are usually different. Here, everything in `s2` is also in `s1`, so `s2 - s1` is empty.

## Symmetric difference

The symmetric difference keeps the elements that belong to one set or the other, **but not both**. Another way to say it: the union minus the intersection.

```python run
s1 = {1, 2, 3, 4, 5}
s2 = {4, 5, 6, 7, 8}
print(sorted(s1 ^ s2))
print((s1 ^ s2) == (s1 | s2) - (s1 & s2))
print((s1 ^ s2) == (s1 - s2) | (s2 - s1))
```

Unlike difference, it *is* commutative: `s1 ^ s2 == s2 ^ s1`.

## Subsets and supersets

`s1` is a **subset** of `s2` if every element of `s1` is in `s2`. It's a **proper** (strict) subset if, in addition, the two sets aren't equal. Python spells these with the comparison operators, by analogy with `<=` and `<` for numbers:

| Question | Operator | Method |
|---|---|---|
| subset | `s1 <= s2` | `s1.issubset(s2)` |
| proper subset | `s1 < s2` | (none) |
| superset | `s1 >= s2` | `s1.issuperset(s2)` |
| proper superset | `s1 > s2` | (none) |

```python run
s1 = {1, 2, 3}
s2 = {1, 2, 3}
s3 = {1, 2, 3, 4}
print(s1 <= s2, s1.issubset(s2))   # equal sets are subsets of each other
print(s1 < s2)                     # ...but not proper subsets
print(s1 < s3, s3 > s1, s3.issuperset(s1))
```

There is no method for the strict versions; if you must avoid the operator, combine `s1.issubset(s2) and s1 != s2`.

### Careful: this is not a total order

With numbers, exactly one of `a < b`, `a == b`, `a > b` is always true. Sets only have a **partial order**: two sets can be incomparable, with every comparison `False`:

```python run
s1 = {1, 2, 3}
s2 = {10, 20, 30}
print(s1 < s2, s1 <= s2, s1 == s2, s1 >= s2, s1 > s2)
```

So `not (a <= b)` does **not** imply `a > b` for sets. This also means `sorted()` on a list of sets doesn't give you a meaningful ordering, because sorting assumes a total order.

## Operators vs methods

There's one practical difference between the two spellings. The **operators** require sets (or frozensets) on both sides:

```python run
try:
    {1, 2} & [2, 3]
except TypeError as ex:
    print('TypeError:', ex)
```

The **methods** accept any iterable (and several of them), converting as needed:

```python run
print({1, 2}.intersection([2, 3]))
print(sorted({1, 2}.union(range(5), 'ab'), key=str))
```

The iterable's elements still have to be hashable, because they're going to be compared against set elements by hash:

```python run
try:
    {1, 2}.intersection([[1, 2]])
except TypeError as ex:
    print('TypeError:', ex)
```

This makes the methods handy for working with other collections. To find the common elements of two lists, wrap one in a set and pass the other directly:

```python run
l1 = [1, 2, 3, 3, 3]
l2 = [2, 3, 4]
sorted(set(l1).intersection(l2))
```

Why are the operators stricter? It's a deliberate choice to catch mistakes: `s & some_list` is more likely a bug than an intention, and requiring the explicit `set(...)` keeps the meaning obvious.

## Side note: why `&`, `|` and `^`?

These are the same symbols Python uses for **bitwise** operations on integers, and the connection is real. Think of an integer's binary digits as a row of slots, each either "in" (1) or "out" (0):

```python run
a = 0b101010
b = 0b110100
print(f'a     {a:06b}')
print(f'b     {b:06b}')
print(f'a & b {a & b:06b}   bit set in both (and)')
print(f'a | b {a | b:06b}   bit set in either (or)')
print(f'a ^ b {a ^ b:06b}   bit set in exactly one (xor)')
```

If you treat each number as the set of positions where it has a `1` bit, then `&` is intersection, `|` is union and `^` is symmetric difference. You can check that directly:

```python run
def bits(n):
    return {i for i in range(n.bit_length()) if n >> i & 1}

print(bits(a & b) == bits(a) & bits(b))
print(bits(a | b) == bits(a) | bits(b))
print(bits(a ^ b) == bits(a) ^ bits(b))
```

<div class="callout tip">
<span class="callout-title">Where these really pay off</span>

The operations themselves are simple. Their value shows up when you apply them: comparing the keys of two dictionaries, finding which users gained or lost a permission, or checking that a document has exactly the fields a schema requires. You'll do exactly that in the last lesson of this section and in the project that follows.

</div>

<div class="takeaways">

## Key takeaways

- `&` / `intersection`, `|` / `union`, `-` / `difference`, `^` / `symmetric_difference` all return new sets.
- Difference isn't commutative; symmetric difference is, and equals `(a | b) - (a & b)`.
- `<=`, `<`, `>=`, `>` test (proper) subsets and supersets; sets are only partially ordered, so all of them can be `False` at once.
- `isdisjoint` checks for an empty intersection without building one.
- Operators need sets on both sides; methods accept any iterables of hashable elements, and several at once.

</div>
