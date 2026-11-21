---
title: Exercise 3 - Solution
summary: Redo the stock and trade round trip declaratively with marshmallow schemas, including Decimal fields, nested lists and post_load hooks.
minutes: 12
---

## The plan

This time we don't write an encoder or a decoder at all. Instead we **declare** what the data looks like, and let marshmallow derive both directions:

- a `StockSchema` and a `TradeSchema` describing each object's fields and types;
- an `ActivitySchema` describing the top-level dictionary, with a list of each.

The classes go back to their original form: no `as_dict`, no type markers. They only get an `__eq__` so we can check the round trip at the end.

marshmallow isn't available in the browser, so these are static snippets with the output they produce with **marshmallow 4.4**. (Older versions return results wrapped in an object with `.data` and `.errors`; current versions return the data directly and raise `ValidationError` for bad input. See the marshmallow lesson for details.)

```python
from datetime import date, datetime
from decimal import Decimal

class Stock:
    def __init__(self, symbol, date, open_, high, low, close, volume):
        self.symbol = symbol
        self.date = date
        self.open = open_
        self.high = high
        self.low = low
        self.close = close
        self.volume = volume

    def __eq__(self, other):
        return type(other) is Stock and vars(self) == vars(other)

class Trade:
    def __init__(self, symbol, timestamp, order, price, volume, commission):
        self.symbol = symbol
        self.timestamp = timestamp
        self.order = order
        self.price = price
        self.commission = commission
        self.volume = volume

    def __eq__(self, other):
        return type(other) is Trade and vars(self) == vars(other)

# activity = {"quotes": [...], "trades": [...]}  -- the same data as in the exercise
```

## Step 1: a stock schema

Each attribute gets a field type. marshmallow has a `Decimal` field, so let's try it:

```python
from marshmallow import Schema, fields

class StockSchema(Schema):
    symbol = fields.Str()
    date = fields.Date()
    open = fields.Decimal()
    high = fields.Decimal()
    low = fields.Decimal()
    close = fields.Decimal()
    volume = fields.Integer()

tsla = activity['quotes'][0]
print(StockSchema().dump(tsla))
try:
    StockSchema().dumps(tsla)
except TypeError as ex:
    print('TypeError:', ex)
```

```
{'symbol': 'TSLA', 'date': '2018-11-22', 'open': Decimal('338.19'), 'high': Decimal('338.64'), 'low': Decimal('337.60'), 'close': Decimal('338.19'), 'volume': 365607}
TypeError: Object of type Decimal is not JSON serializable
```

The date became an ISO string, but `fields.Decimal` dumps a `Decimal` **object** by default, which `json` can't write. For the same exactness reason as in Exercise 1 we want the prices as strings, and the field has an option for that, `as_string=True`:

```python
class StockSchema(Schema):
    symbol = fields.Str()
    date = fields.Date()
    open = fields.Decimal(as_string=True)
    high = fields.Decimal(as_string=True)
    low = fields.Decimal(as_string=True)
    close = fields.Decimal(as_string=True)
    volume = fields.Integer()

print(StockSchema().dumps(tsla))
```

```
{"symbol": "TSLA", "date": "2018-11-22", "open": "338.19", "high": "338.64", "low": "337.60", "close": "338.19", "volume": 365607}
```

## Step 2: trades and the activity

The trade schema uses `fields.DateTime` for the timestamp:

```python
class TradeSchema(Schema):
    symbol = fields.Str()
    timestamp = fields.DateTime()
    order = fields.Str()
    price = fields.Decimal(as_string=True)
    commission = fields.Decimal(as_string=True)
    volume = fields.Integer()

print(TradeSchema().dumps(activity['trades'][0]))
```

```
{"symbol": "TSLA", "timestamp": "2018-11-22T10:05:12", "order": "buy", "price": "338.25", "commission": "9.99", "volume": 100}
```

The top-level dictionary is described by a schema too. Schemas can dump dictionaries as well as objects, and `fields.List(fields.Nested(...))` describes a list of nested objects:

```python
class ActivitySchema(Schema):
    quotes = fields.List(fields.Nested(StockSchema))
    trades = fields.List(fields.Nested(TradeSchema))

result = ActivitySchema().dumps(activity, indent=2)
print(result[:300])
```

```
{
  "quotes": [
    {
      "symbol": "TSLA",
      "date": "2018-11-22",
      "open": "338.19",
      "high": "338.64",
      "low": "337.60",
      "close": "338.19",
      "volume": 365607
    },
    {
      "symbol": "AAPL",
      "date": "2018-11-22",
      "open": "176.66",
      "high": "177
```

Notice there are no type markers in the JSON. We don't need them: the **schema** says that every item under `"quotes"` is a stock. The structure is known in advance instead of being discovered from the data.

## Step 3: loading back to objects

Loading the JSON converts every field back (dates, datetimes, `Decimal`s), but the items are still dictionaries:

```python
loaded = ActivitySchema().loads(result)
print(type(loaded['trades'][0]).__name__)
print(loaded['trades'][0])
```

```
dict
{'symbol': 'TSLA', 'timestamp': datetime.datetime(2018, 11, 22, 10, 5, 12), 'order': 'buy', 'price': Decimal('338.25'), 'commission': Decimal('9.99'), 'volume': 100}
```

To get objects, each schema needs a `@post_load` method. Here the mismatch from the problem statement bites: the schema field is `open`, but `Stock.__init__` expects `open_`, so `Stock(**data)` would fail with `TypeError: ... unexpected keyword argument 'open'`. The hook renames the key first. We also mark every field `required=True` (so the hooks can rely on complete data) and restrict `order` to the two legal values:

```python
from marshmallow import post_load, validate

class StockSchema(Schema):
    symbol = fields.Str(required=True)
    date = fields.Date(required=True)
    open = fields.Decimal(required=True, as_string=True)
    high = fields.Decimal(required=True, as_string=True)
    low = fields.Decimal(required=True, as_string=True)
    close = fields.Decimal(required=True, as_string=True)
    volume = fields.Integer(required=True)

    @post_load
    def make_stock(self, data, **kwargs):
        data['open_'] = data.pop('open')
        return Stock(**data)

class TradeSchema(Schema):
    symbol = fields.Str(required=True)
    timestamp = fields.DateTime(required=True)
    order = fields.Str(required=True, validate=validate.OneOf(['buy', 'sell']))
    price = fields.Decimal(required=True, as_string=True)
    commission = fields.Decimal(required=True, as_string=True)
    volume = fields.Integer(required=True)

    @post_load
    def make_trade(self, data, **kwargs):
        return Trade(**data)

class ActivitySchema(Schema):          # redefined so it nests the new schemas
    quotes = fields.List(fields.Nested(StockSchema))
    trades = fields.List(fields.Nested(TradeSchema))
```

Now a full round trip:

```python
schema = ActivitySchema()
text = schema.dumps(activity)
restored = schema.loads(text)
print([type(s).__name__ for s in restored['quotes']], [type(t).__name__ for t in restored['trades']])
print(restored['quotes'][0].open, type(restored['quotes'][0].open).__name__)
print(restored == activity)
```

```
['Stock', 'Stock', 'Stock'] ['Trade', 'Trade']
338.19 Decimal
True
```

As a bonus over the hand-written decoder, bad input is rejected with a report of every problem:

```python
from marshmallow import ValidationError

try:
    TradeSchema().load({'symbol': 'TSLA', 'timestamp': '2018-11-22T10:05:12',
                        'order': 'hold', 'price': 'cheap', 'volume': 100})
except ValidationError as ex:
    print(ex.messages)
```

```
{'order': ['Must be one of: buy, sell.'], 'price': ['Not a valid number.'], 'commission': ['Missing data for required field.']}
```

Our hand-written `decode_trade` would have failed on the first problem with a bare `KeyError` or `InvalidOperation`.

## Comparing the approaches

| | Encoder + decoder (Exercises 1–2) | Schemas (Exercise 3) |
|---|---|---|
| Type information | type markers inside the JSON | the schema, known in advance |
| Value conversions | written by hand in `default` and the converters | chosen per field (`Date`, `Decimal(as_string=True)`…) |
| Validation | none, beyond whatever crashes | built in, with per-field error messages |
| Dependencies | standard library only | a third-party library |

For a couple of classes, the standard library is perfectly adequate. As the number of classes, fields and validation rules grows, declaring the schema once and getting dumping, loading and validation from it pays off quickly.

The practice page has a standard-library version of this exercise: dataclasses already declare their fields and types, so a small generic function can use those declarations as the schema.

```python run
from dataclasses import dataclass, fields
from datetime import date
from decimal import Decimal

@dataclass
class Quote:
    symbol: str
    date: date
    close: Decimal

print([(f.name, f.type.__name__) for f in fields(Quote)])
```

<div class="takeaways">

## Key takeaways

- A schema per class plus one for the container replaces the custom encoder and decoder.
- Use `fields.Decimal(as_string=True)` to keep prices exact in JSON; `Date` and `DateTime` handle ISO formatting.
- `fields.List(fields.Nested(Schema))` describes lists of objects; no type markers are needed because the schema knows the structure.
- `@post_load` (with `**kwargs`) builds the objects; rename keys there when field names don't match the constructor's parameters.
- Schemas give validation for free: bad input raises `ValidationError` listing every problem.

</div>
