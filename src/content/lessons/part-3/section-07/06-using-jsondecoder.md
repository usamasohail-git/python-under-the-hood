---
title: Using JSONDecoder
summary: Subclassing json.JSONDecoder lets you package decoding rules into a reusable class, either by overriding decode for whole-document processing or by passing hooks to the parent constructor.
minutes: 14
---

## Decoders are not encoders in reverse

`loads(s, cls=MyDecoder)` uses your subclass of `json.JSONDecoder` instead of the default one, just as `cls=` selects an encoder for `dumps`. But the two classes are customized very differently:

- `JSONEncoder.default` is called **per object**, only for objects the encoder can't handle, and can delegate to the parent.
- `JSONDecoder.decode` is called **once**, with the **entire JSON document as a string**, and whatever it returns is the result of `loads`.

Let's prove that:

```python run
import json

j = '''
{
    "a": 100,
    "b": [1, 2, 3],
    "c": "python",
    "d": {"e": 4, "f": 5.5}
}
'''

class CustomDecoder(json.JSONDecoder):
    def decode(self, arg):
        print('decode received a', type(arg).__name__, 'of length', len(arg))
        return 'a simple string object'

json.loads(j, cls=CustomDecoder)
```

The decoder ignored the document entirely and `loads` returned our string. Overriding `decode` is all-or-nothing: you can inspect the text, decide to handle it yourself, or hand the whole thing to `super().decode(arg)`.

## Post-processing the whole document

A typical use: parse normally with `super().decode`, then transform the result. Suppose a document may contain a top-level `"points"` list of coordinate pairs that we want as `Point` objects:

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'Point(x={self.x}, y={self.y})'


class PointsDecoder(json.JSONDecoder):
    def decode(self, arg):
        obj = super().decode(arg)
        if isinstance(obj, dict) and 'points' in obj:
            obj['points'] = [Point(x, y) for x, y in obj['points']]
        return obj

j_points = '{"points": [[10, 20], [-1, -2], [0.5, 0.5]]}'
j_other = '{"a": 1, "b": 2}'

print(json.loads(j_points, cls=PointsDecoder))
print(json.loads(j_other, cls=PointsDecoder))
```

Calling `super().decode(arg)` (rather than `json.loads(arg)`) matters: it uses this decoder's own configuration, including any hooks passed to it, which we'll use below.

## Finding tagged objects anywhere

A more flexible convention marks each point explicitly, wherever it appears:

```
{"_type": "point", "x": 1, "y": 2}
```

To convert those, the decoder needs to walk the whole parsed structure recursively: dictionaries may be points themselves or contain points, and lists may contain points.

As a cheap shortcut, we can first check whether the text mentions a point at all and skip the walk otherwise. JSON allows any whitespace around the `:`, so a plain substring test isn't reliable; a regular expression is. In the pattern below, `\s*` means "zero or more whitespace characters", and the `r` prefix makes it a raw string so Python leaves the backslashes alone:

```python run
import re

pattern = re.compile(r'"_type"\s*:\s*"point"')
print(pattern.search('"a": 1'))
print(pattern.search('"_type": "point"'))
print(pattern.search('"_type"   :"point"'))
```

Now the decoder:

```python run
class CustomDecoder(json.JSONDecoder):
    point_pattern = re.compile(r'"_type"\s*:\s*"point"')

    def decode(self, arg):
        obj = super().decode(arg)
        if self.point_pattern.search(arg):    # only walk if there is a point somewhere
            obj = self.make_pts(obj)
        return obj

    def make_pts(self, obj):
        if isinstance(obj, dict):
            if obj.get('_type') == 'point':
                return Point(obj['x'], obj['y'])
            return {key: self.make_pts(value) for key, value in obj.items()}
        if isinstance(obj, list):
            return [self.make_pts(item) for item in obj]
        return obj      # str, int, float, bool, None

j = '''
{
    "a": 100,
    "b": 0.5,
    "rectangle": {
        "corners": {
            "b_left": {"_type": "point", "x": -1, "y": -1},
            "b_right": {"_type": "point", "x": 1, "y": -1},
            "t_left": {"_type": "point", "x": -1, "y": 1},
            "t_right": {"_type": "point", "x": 1, "y": 1}
        },
        "rotate": {"_type" : "point", "x": 0, "y": 0},
        "interior_pts": [
            {"_type": "point", "x": 0, "y": 0},
            {"_type": "point", "x": 0.5, "y": 0.5}
        ]
    }
}
'''
from pprint import pprint
pprint(json.loads(j, cls=CustomDecoder))
```

`make_pts` handles the three cases a parsed JSON value can be: a dict, a list, or a scalar. Every point was found, at every depth, including `"rotate"`, which has a space before its colon.

## The simpler way: hooks in the constructor

That recursive walk duplicates work the decoder already does: it visits every object while parsing. `JSONDecoder.__init__` accepts the same hooks as `loads` (`object_hook`, `parse_float`, `parse_int`, `parse_constant`, `object_pairs_hook`, and `strict`). An instance with preset hooks is a reusable decoder:

```python run
from decimal import Decimal

decimal_decoder = json.JSONDecoder(parse_float=Decimal)
pprint(decimal_decoder.decode('{"price": 9.99, "qty": 3}'))
```

And a subclass can bake hooks into every instance, so `loads(..., cls=...)` uses them automatically. This version replaces the regex and the recursive walk with an `object_hook`, which the parser calls for every object, innermost first:

```python run
class PointDecoder(json.JSONDecoder):
    def __init__(self, **kwargs):
        kwargs['object_hook'] = self.make_point
        kwargs['parse_float'] = Decimal
        super().__init__(**kwargs)

    @staticmethod
    def make_point(obj):
        if obj.get('_type') == 'point':
            return Point(obj['x'], obj['y'])
        return obj

result = json.loads(j, cls=PointDecoder)
pprint(result)

pt = result['rectangle']['interior_pts'][1]
print(type(pt.x), type(pt.y))
```

The floats inside points are `Decimal`s now: `parse_float` ran while each number was parsed, before the hook built the `Point`. This is usually the best way to write a custom decoder class. Override `decode` itself only when you really need to see, or transform, the whole document at once.

<div class="callout tip">
<span class="callout-title">raw_decode for streams of documents</span>

`JSONDecoder.raw_decode(s)` parses one JSON value from the start of `s` and returns `(value, end_index)`, ignoring whatever follows. That's handy for text containing several JSON documents back to back:

```python run
dec = json.JSONDecoder()
text = '{"a": 1} {"b": 2} [3]'
pos = 0
while pos < len(text):
    value, end = dec.raw_decode(text, pos)
    print(value)
    pos = end
    while pos < len(text) and text[pos].isspace():
        pos += 1
```

(Many log formats instead use *JSON Lines*: one document per line, so `json.loads(line)` on each line is enough.)

</div>

<div class="takeaways">

## Key takeaways

- `loads(s, cls=MyDecoder)` uses your `JSONDecoder` subclass.
- `decode(self, s)` receives the **whole document as a string**, and its return value is the result of `loads`. It's all-or-nothing; use `super().decode(s)` to parse normally.
- Converting tagged objects after parsing requires a recursive walk over dicts and lists.
- Usually simpler: set `object_hook`, `parse_float` and friends in the decoder's `__init__`, so the parser converts objects as it goes.
- A decoder instance such as `JSONDecoder(parse_float=Decimal)` is a reusable, preconfigured decoder; `raw_decode` parses one value from the start of a string.

</div>
