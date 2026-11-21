---
title: Exercise 2 - Solution
summary: Decode the JSON from Exercise 1 back into Stock and Trade objects with exact dates and Decimals, and prove the round trip with __eq__.
minutes: 13
---

## Where we start

Here are the classes and encoder from Exercise 1. The classes also get an `__eq__` method now; we'll see why at the end. Two objects are equal if they're the same class and have the same data:

```python run
from json import JSONEncoder, JSONDecoder, dumps, loads
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

    def as_dict(self):
        return dict(symbol=self.symbol, date=self.date, open=self.open, high=self.high,
                    low=self.low, close=self.close, volume=self.volume)

    def __eq__(self, other):
        return isinstance(other, Stock) and self.as_dict() == other.as_dict()


class Trade:
    def __init__(self, symbol, timestamp, order, price, volume, commission):
        self.symbol = symbol
        self.timestamp = timestamp
        self.order = order
        self.price = price
        self.commission = commission
        self.volume = volume

    def as_dict(self):
        return dict(symbol=self.symbol, timestamp=self.timestamp, order=self.order,
                    price=self.price, volume=self.volume, commission=self.commission)

    def __eq__(self, other):
        return isinstance(other, Trade) and self.as_dict() == other.as_dict()


class CustomEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (Stock, Trade)):
            result = obj.as_dict()
            result['object'] = type(obj).__name__
            return result
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


activity = {
    "quotes": [
        Stock('TSLA', date(2018, 11, 22),
              Decimal('338.19'), Decimal('338.64'), Decimal('337.60'), Decimal('338.19'), 365_607),
        Stock('AAPL', date(2018, 11, 22),
              Decimal('176.66'), Decimal('177.25'), Decimal('176.64'), Decimal('176.78'), 3_699_184),
        Stock('MSFT', date(2018, 11, 22),
              Decimal('103.25'), Decimal('103.48'), Decimal('103.07'), Decimal('103.11'), 4_493_689)
    ],
    "trades": [
        Trade('TSLA', datetime(2018, 11, 22, 10, 5, 12), 'buy', Decimal('338.25'), 100, Decimal('9.99')),
        Trade('AAPL', datetime(2018, 11, 22, 10, 30, 5), 'sell', Decimal('177.01'), 20, Decimal('9.99'))
    ]
}

encoded = dumps(activity, cls=CustomEncoder)
print(encoded[:200], '...')
```

We won't assume anything about the overall document structure: `Stock` and `Trade` objects could appear anywhere, at any depth. All we rely on is that each one is a JSON object carrying `"object": "Stock"` or `"object": "Trade"` and the fields needed to rebuild it.

## Step 1: one converter per class

Start small. A function that turns one stock dictionary into a `Stock`, converting each field back to its real type. The encoder wrote dates in ISO format, so `date.fromisoformat` (Python 3.7+) parses them; prices were written as strings, so `Decimal(text)` restores them exactly:

```python run
def decode_stock(d):
    return Stock(d['symbol'],
                 date.fromisoformat(d['date']),
                 Decimal(d['open']),
                 Decimal(d['high']),
                 Decimal(d['low']),
                 Decimal(d['close']),
                 int(d['volume']))

s = decode_stock({"symbol": "AAPL", "date": "2018-11-22", "open": "176.66", "high": "177.25",
                  "low": "176.64", "close": "176.78", "volume": 3699184, "object": "Stock"})
print(type(s).__name__, vars(s))
```

The same for trades, with `datetime.fromisoformat` for the timestamp:

```python run
def decode_trade(d):
    return Trade(d['symbol'],
                 datetime.fromisoformat(d['timestamp']),
                 d['order'],
                 Decimal(d['price']),
                 int(d['volume']),
                 Decimal(d['commission']))

t = decode_trade({"symbol": "TSLA", "timestamp": "2018-11-22T10:05:12", "order": "buy",
                  "price": "338.25", "volume": 100, "commission": "9.99", "object": "Trade"})
print(type(t).__name__, vars(t))
```

Testing each converter on its own first, before wiring it into the decoder, makes mistakes much easier to find.

## Step 2: a dispatcher

Next, a function that looks at a dictionary's marker and picks the right converter, returning anything else **unchanged**:

```python run
DECODERS = {'Stock': decode_stock, 'Trade': decode_trade}

def decode_financials(d):
    decoder = DECODERS.get(d.get('object'))
    return decoder(d) if decoder else d

print(decode_financials({"symbol": "TSLA", "timestamp": "2018-11-22T10:05:12", "order": "buy",
                         "price": "338.25", "volume": 100, "commission": "9.99", "object": "Trade"}))
print(decode_financials({'a': 1}))
```

A dict lookup instead of an `if`/`elif` chain makes supporting a new class a one-line change.

## Step 3: plug it in

`decode_financials` takes a dict and returns a replacement: exactly the contract of `object_hook`. The parser calls it for every JSON object, at every depth, so there's no need to walk the structure ourselves:

```python run
decoded = loads(encoded, object_hook=decode_financials)
print(decoded)
print(decoded['quotes'][0].date, type(decoded['quotes'][0].date).__name__)
print(decoded['quotes'][0].low, type(decoded['quotes'][0].low).__name__)
```

To package it as a reusable decoder class (to use as `loads(s, cls=CustomDecoder)`, mirroring the encoder), set the hook in `__init__`:

```python run
class CustomDecoder(JSONDecoder):
    def __init__(self, **kwargs):
        kwargs['object_hook'] = decode_financials
        super().__init__(**kwargs)

decoded = loads(encoded, cls=CustomDecoder)
print(decoded['trades'][1].timestamp)
```

<div class="callout note">
<span class="callout-title">The decode-override alternative</span>

You could also override `decode(self, s)`: parse with `super().decode(s)`, then recursively walk the result, replacing tagged dicts in nested dicts and lists. It works, but it re-implements a traversal the parser already does. The `object_hook` version is shorter and visits each object exactly once.

</div>

## Step 4: prove the round trip

Is `decoded` really the same data as `activity`? Without `__eq__`, `==` on two different `Stock` objects falls back to identity and would always be `False`, even with identical data. That's why we added `__eq__` to both classes. Dictionaries and lists compare element by element using it:

```python run
print(decoded == activity)
print(decoded is activity, decoded['quotes'][0] is activity['quotes'][0])
```

Equal, but entirely new objects. And because the `Decimal`s were written as strings, nothing was rounded:

```python run
print(activity['quotes'][0].low, decoded['quotes'][0].low)
print(float(activity['quotes'][0].low))     # what a float round trip would have kept
```

<div class="takeaways">

## Key takeaways

- Write and test a converter per class first, then a dispatcher keyed on the type marker.
- An `object_hook` sees every JSON object at every depth, so it finds tagged objects anywhere without a manual traversal.
- Wrap the hook in a `JSONDecoder` subclass (set in `__init__`) for a reusable `cls=` decoder.
- Restore values with `date.fromisoformat`, `datetime.fromisoformat` and `Decimal(text)` for an exact round trip.
- Define `__eq__` on your classes, otherwise `decoded == original` can never be `True`.

</div>
