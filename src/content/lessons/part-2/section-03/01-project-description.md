---
title: Project Description
summary: Design an immutable regular Polygon class and a finite, sliceable sequence of polygons, then find the polygon with the best area-to-perimeter ratio.
minutes: 10
---

## The problem

You're going to build two classes.

1. **`Polygon`**: a regular, strictly convex polygon. "Regular" means all edges have the same length and all interior angles are equal. Every polygon is centered at the origin and defined by just two numbers:
   - `n`, the number of vertices (at least `3`);
   - `R`, the **circumradius**: the distance from the center to any vertex.
2. **`Polygons`**: a finite, read-only **sequence** of `Polygon` objects that share the same circumradius `R`, starting with a triangle (`n = 3`) and going up to, and including, a polygon with `m` vertices.

Both should be **immutable**: once created, nothing about a polygon or the sequence can be changed.

## Goal 1: the Polygon class

`Polygon(n, R)` should expose these read-only properties:

| Property | Meaning |
|---|---|
| `count_vertices` | number of vertices, `n` |
| `count_edges` | number of edges (also `n`) |
| `circumradius` | `R` |
| `interior_angle` | angle between two adjacent edges, in **degrees** |
| `side_length` | length of one edge |
| `apothem` | distance from the center to the midpoint of an edge |
| `area` | surface area |
| `perimeter` | total length of all edges |

It should also:

- have a `repr` of the form `Polygon(n=3, R=1)`;
- raise `ValueError` if `n < 3`;
- support **equality** (`==`): two polygons are equal when they have the same number of vertices **and** the same circumradius;
- support **ordering** (`>` and `<`) based on the number of vertices only.

### The formulas

Picture the polygon as `n` identical isosceles triangles meeting at the center. Each one has two sides of length `R` and an angle of `2π/n` at the center. Cutting one in half gives a right triangle with angle `π/n`, hypotenuse `R`, and legs equal to half an edge and the apothem. From that:

- interior angle = `(n - 2) × 180 / n`
- side length `s = 2 R sin(π / n)`
- apothem `a = R cos(π / n)`
- area = `n / 2 × s × a`
- perimeter = `n × s`

Here are some reference values you can test against (rounded to 5 decimal places):

```python run
import math

def reference(n, R):
    s = 2 * R * math.sin(math.pi / n)
    a = R * math.cos(math.pi / n)
    return dict(n=n, R=R,
                interior_angle=(n - 2) * 180 / n,
                side=round(s, 5), apothem=round(a, 5),
                area=round(n / 2 * s * a, 5), perimeter=round(n * s, 5))

for n, R in [(3, 1), (4, 1), (6, 2), (12, 3)]:
    print(reference(n, R))
```

A square with `R = 1` has side `√2 ≈ 1.41421` and area `2`; a hexagon's side equals its circumradius. Those are good sanity checks.

## Goal 2: the Polygons sequence

`Polygons(m, R)` is a sequence of the polygons with `3, 4, ..., m` vertices, all with circumradius `R`. It should:

- raise `ValueError` if `m < 3`;
- support `len()`: there are `m - 2` polygons;
- support full indexing and slicing: positive and negative indices, ordinary and extended slices (with `IndexError` for an out-of-range index), and therefore iteration;
- have a `repr` of the form `Polygons(m=6, R=1)`;
- provide a `max_efficiency_polygon` property returning the polygon with the highest **area-to-perimeter ratio**.

## Hints

- Every property except `n` and `R` is *computed*, so `@property` methods are a natural fit. A property without a setter is read-only, which gives you immutability almost for free.
- Floating-point results like `side_length` won't match reference values exactly. Compare them with `math.isclose` and a sensible tolerance, never with `==`.
- For ordering, think about what Python does with `a < b` when `a` has no `__lt__`, but `b` has a `__gt__`.
- The sequence doesn't need to re-implement indexing and slicing. If you keep the polygons in a built-in sequence, you can delegate to it.
- Test as you go: write small `assert`-based checks for each property before moving on.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Before reading the solution walkthroughs, open the **Practice** page for this section. Each goal is an auto-graded exercise with starter code and tests, so you can check your implementation as you build it.

</div>

<div class="takeaways">

## Key takeaways

- A regular polygon is fully defined by its vertex count `n` and circumradius `R`; everything else is computed.
- Goal 1 is an immutable `Polygon` class with geometric properties, equality and ordering.
- Goal 2 is a read-only `Polygons` sequence with full slicing support and a `max_efficiency_polygon` property.

</div>
