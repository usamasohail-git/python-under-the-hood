---
title: The While Loop
summary: Repeating code while a condition holds, emulating do-while with while True and break, skipping with continue, and the loop's else clause.
minutes: 11
---

## Repeat while a condition is true

A `while` loop runs its block over and over as long as its condition is truthy:

```python
while <condition>:
    <code block>
```

```python run
i = 0
while i < 5:
    print(i)
    i += 1
```

Each time around, Python tests the condition **first**. If it's true, the block runs and control jumps back to the test. As soon as the test is false, the loop ends and execution continues after it. Something in the block has to eventually make the condition false (here `i += 1`), otherwise the loop never stops.

Because the test comes first, the body may not run at all:

```python run
i = 5
while i < 5:
    print(i)
    i += 1
print('loop body never ran')
```

## Emulating a do-while loop

Some languages have a `do ... while` loop that runs its body once *before* testing the condition, so the body always runs at least once. Python doesn't have one, but the pattern is easy to build: loop forever with `while True`, and leave with `break` when the exit condition is met.

```python run
i = 5

while True:
    print(i)
    if i >= 5:
        break
```

`break` ends the loop immediately; anything after it in the block is skipped, and execution resumes on the first line after the loop.

### A realistic example: re-asking for input

A typical use is validating input: keep asking until the answer is acceptable. Interactive `input()` isn't available on this page, so we'll simulate a user with a list of answers they "type", one after the other:

```python run
answers = iter(['a123', 'a', 'sam'])   # what the user types, in order

def ask(prompt):
    answer = next(answers)
    print(prompt, answer)
    return answer
```

Here's a first attempt. The name must be at least 2 characters, printable and alphabetic:

```python run
min_length = 2

name = ask('Please enter your name:')
while not (len(name) >= min_length and name.isprintable() and name.isalpha()):
    name = ask('Please enter your name:')

print(f'Hello, {name}')
```

It works, but the "ask" line appears **twice**: once to get a first value to test, and again inside the loop. Duplicated code is a maintenance trap: change the prompt in one place and forget the other, and the behavior drifts. The `while True` pattern asks in exactly one place:

```python run
answers = iter(['a', '123', 'sam'])

while True:
    name = ask('Please enter your name:')
    if len(name) >= min_length and name.isprintable() and name.isalpha():
        break

print(f'Hello, {name}')
```

<div class="callout modern">
<span class="callout-title">The walrus operator (Python 3.8+)</span>

The assignment expression `:=` assigns a value *and* returns it, so you can assign inside a `while` condition. That's another way to avoid repeating the "get the next value" code:

```python run
data = iter(['10', '20', '', '30'])   # stop at the first empty line

total = 0
while (line := next(data)) != '':
    total += int(line)
print(total)
```

</div>

## Skipping the rest of an iteration: `continue`

`break` leaves the loop entirely. `continue` only cuts the **current iteration** short: Python jumps straight back to the condition test and, if it's still true, starts the next iteration.

```python run
a = 0
while a < 10:
    a += 1
    if a % 2:        # odd numbers have a remainder of 1, which is truthy
        continue
    print(a)
```

For odd `a`, `continue` skips the `print`, so only the even numbers appear. Notice that the counter is incremented *before* the `continue`. If it came after, an odd value would skip the increment and the loop would never end.

(For filtering like this you'll usually reach for a comprehension or a generator. Those come later.)

## The loop's `else` clause

A `while` loop can have an `else` block. It runs **only if the loop ended normally**, meaning its condition became false, and **not** if the loop was ended by `break`.

That is exactly what a search loop needs: "if I never found the thing (never hit `break`), do something". Here's a search for `val` in a list, appending it if it's missing. Without `else` you need a flag variable:

```python run
l = [1, 2, 3]
val = 10

found = False
idx = 0
while idx < len(l):
    if l[idx] == val:
        found = True
        break
    idx += 1

if not found:
    l.append(val)
print(l)
```

With `else`, the flag disappears:

```python run
l = [1, 2, 3]
val = 10

idx = 0
while idx < len(l):
    if l[idx] == val:
        break
    idx += 1
else:
    l.append(val)      # runs only if we never hit break

print(l)
```

And when the value is already there, `break` is hit, so the `else` block is skipped:

```python run
l = [1, 2, 3]
val = 3

idx = 0
while idx < len(l):
    if l[idx] == val:
        break
    idx += 1
else:
    l.append(val)

print(l)
```

<div class="callout note">
<span class="callout-title">Reading `else` on a loop</span>

The name trips people up. A helpful way to read it is "**no break**": the `else` block runs when the loop finished without breaking. It also runs if the loop body never executed at all, since that's a normal end too. (Of course, `if val not in l: l.append(val)` is the idiomatic way to write this particular task; the loop just makes the mechanism visible.)

</div>

<div class="takeaways">

## Key takeaways

- `while` tests its condition **before** every iteration, so the body may run zero times.
- `while True:` plus `break` emulates a do-while loop and avoids duplicated set-up code.
- `break` ends the loop; `continue` skips to the next condition test.
- A loop's `else` block runs only when the loop ends **without** `break`.

</div>
