---
title: Coding Exercises
summary: "The problem set: serialize a dictionary of Stock and Trade objects to JSON with a custom encoder, decode it back to equal objects, then do the same with schemas."
minutes: 8
---

## The data

Two small classes describe market data. A `Stock` is one day's quote for a symbol (open, high, low and close prices plus the traded volume); a `Trade` is a single buy or sell order:

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


class Trade:
    def __init__(self, symbol, timestamp, order, price, volume, commission):
        self.symbol = symbol
        self.timestamp = timestamp
        self.order = order
        self.price = price
        self.commission = commission
        self.volume = volume
```

(The parameter is called `open_` because `open` is a built-in function; the attribute is still called `open`. That small mismatch will matter later.)

A typical structure to serialize groups the objects in lists:

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

print(vars(activity['quotes'][0]))
print(vars(activity['trades'][0]))
```

Look at the types involved: strings and integers are fine for JSON, but `Stock`, `Trade`, `date`, `datetime` and `Decimal` are not:

```python run
import json

try:
    json.dumps(activity)
except TypeError as ex:
    print('TypeError:', ex)
```

## Exercise 1: encode

Write a custom `JSONEncoder` subclass that can serialize dictionaries (like `activity`) containing `Stock` and `Trade` instances.

Keep the next exercise in mind: whoever reads the JSON must be able to tell **which** objects were stocks and which were trades, so your encoding needs some way of recording the object type. You may modify the classes if that helps (for example by adding a method that returns their data as a dict).

Think about:

- how to write `date` and `datetime` values (ISO 8601 is the standard choice);
- how to write `Decimal` prices without turning them into binary floats, which would lose exactness (`Decimal('337.60')` should come back as `Decimal('337.60')`);
- the fact that a `datetime` is also a `date`.

## Exercise 2: decode

Write the reverse: a custom decoder that turns the JSON produced in Exercise 1 back into a dictionary with `Stock` and `Trade` objects, with real `date`, `datetime` and `Decimal` values in them.

To check your work you'll want `decoded == activity` to be `True`. Out of the box, two separate `Stock` objects are never equal (the default `==` compares identity), so you'll need to define equality for the classes too.

## Exercise 3: use a schema library

Do the same serialization and deserialization again, but declaratively, with schemas: define a schema for stocks, one for trades and one for the overall activity dictionary, and let the library handle the conversions. The solution uses **marshmallow**.

<div class="callout tip">
<span class="callout-title">Try it yourself</span>

Head over to the **Practice** page for this section before reading the solutions. It turns each problem into an auto-graded exercise: the encoder, the decoder, and a schema-driven round trip. Since marshmallow isn't available in the browser, the third exercise has you build the schema-driven version with dataclasses and the standard library instead.

</div>

<div class="takeaways">

## Key takeaways

- The data mixes custom classes with `date`, `datetime` and `Decimal`, none of which JSON supports directly.
- Encoding must leave enough information (a type marker) for decoding to rebuild the right objects.
- Exactness matters: dates should round-trip as dates and prices as `Decimal`s.
- Verifying a round trip requires the classes to define `__eq__`.

</div>
