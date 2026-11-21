---
title: Exercise 1 - Solution
summary: Build a JSONEncoder subclass step by step that serializes Stock and Trade objects with a type marker and handles dates, datetimes and Decimals.
minutes: 12
---

## Step 1: give the classes an as_dict method

The encoder will need each object's data as a dictionary. We could use `vars(obj)`, but an explicit `as_dict` method is better: it documents exactly which data belongs in the serialization, and it keeps working if the class later gains private helper attributes that shouldn't be written out.

```python run
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
```

```python run
from datetime import date, datetime
from decimal import Decimal

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
```

## Step 2: a first encoder

The encoder's `default` method is called for every object `json` can't handle. A first attempt converts our two classes and delegates everything else to the parent:

```python run
from json import JSONEncoder, dumps

class CustomEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (Stock, Trade)):
            return obj.as_dict()
        return super().default(obj)

try:
    dumps(activity, cls=CustomEncoder)
except TypeError as ex:
    print('TypeError:', ex)
```

Progress: the `Stock` was converted. But the dict it returned contains a `date`, and the encoder fed that back into `default`, which didn't know it. Remember that whatever `default` returns is encoded recursively.

## Step 3: handle the value types in one place

We could format the date inside the `Stock` branch, the timestamp inside the `Trade` branch, and every price in both. That spreads the same conversions across every class. Since `default` is called recursively anyway, it's much cleaner to give each **value type** its own branch, once:

- `datetime` → ISO string such as `2018-11-22T10:05:12`
- `date` → ISO string such as `2018-11-22`
- `Decimal` → **string**, such as `"337.60"`

Why a string for `Decimal`? Writing it as a JSON number would mean converting it to `float`, and then `337.60` becomes the binary approximation of 337.6 and loses its trailing zero. A string keeps the exact digits, and `Decimal(string)` restores the exact value.

The order of the checks matters: `datetime` is a subclass of `date`, so a `datetime` passes `isinstance(obj, date)` too. Check `datetime` first:

```python run
print(issubclass(datetime, date), isinstance(datetime(2018, 11, 22, 10, 5), date))
```

```python run
class CustomEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (Stock, Trade)):
            return obj.as_dict()
        if isinstance(obj, datetime):        # before date: a datetime is also a date
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

print(dumps(activity, cls=CustomEncoder, indent=2)[:420])
```

(Since `date` and `datetime` are formatted the same way here, the two branches could be merged into one `isinstance(obj, date)` check. Keeping them separate makes it easy to choose different formats later.)

## Step 4: record the object type

The output is valid JSON, but a reader can't tell a stock from a trade except by guessing from the keys. For decoding we need an explicit **type marker**. We could put it into `as_dict`, but that method describes the object's data and may be used for other things; the marker is a detail of *this* serialization format. So the encoder injects it, using the class name:

```python run
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

encoded = dumps(activity, cls=CustomEncoder, indent=2)
print(encoded)
```

Every object now says what it is. Anything else still fails loudly, which is what we want:

```python run
try:
    dumps({'oops': 1 + 2j}, cls=CustomEncoder)
except TypeError as ex:
    print('TypeError:', ex)
```

<div class="callout note">
<span class="callout-title">Notice what isn't marked</span>

Dates and prices are written as plain strings, without a marker. The decoder will recognize them by **position**: it knows that the `date` field of a `Stock` is a date and its `open` field is a `Decimal`. The alternative would be to tag every value (`{"type": "decimal", "value": "338.19"}`), which is more generic but much more verbose.

</div>

<div class="takeaways">

## Key takeaways

- An explicit `as_dict` method documents what gets serialized.
- Handle each value type (`datetime`, `date`, `Decimal`) once in `default`; recursion applies it wherever the value appears.
- Check `datetime` before `date`, because it's a subclass.
- Serialize `Decimal` as a string to keep it exact.
- Inject a type marker (`"object": "Stock"`) in the encoder so the decoder can rebuild the right class, and delegate unknown types to `super().default`.

</div>
