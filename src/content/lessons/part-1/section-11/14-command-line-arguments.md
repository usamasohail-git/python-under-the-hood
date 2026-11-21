---
title: Command Line Arguments
summary: Scripts receive command line arguments as a list of strings in sys.argv; argparse turns them into typed, validated values with automatic help.
minutes: 15
---

## Passing input to a script

When you run a Python script from a terminal, you can add **arguments** after the file name. They are how command line tools receive their input: file names, options, numbers, flags.

Python puts them in `sys.argv`, a plain list of strings. The first element is the script name, and the rest are the arguments, split on whitespace:

```python
# example1.py
import sys
print(sys.argv)
```

```python
$ python example1.py 123 hello 456 goodbye
['example1.py', '123', 'hello', '456', 'goodbye']

$ python example1.py [1, 2, 3] [4, 5, 6]
['example1.py', '[1,', '2,', '3]', '[4,', '5,', '6]']

$ python example1.py --name John --years 1980 1981 1982
['example1.py', '--name', 'John', '--years', '1980', '1981', '1982']
```

Two things to notice. First, the **shell** does the splitting, so `[1, 2, 3]` arrives as three separate pieces (quote it, `"[1, 2, 3]"`, to keep it together). Second, everything is a **string**. Python doesn't know that `123` was meant to be a number.

<div class="callout note">
<span class="callout-title">No terminal in the browser</span>

Code on this page runs in your browser, where there is no real command line and `sys.argv` isn't filled from one. The terminal examples are static. To experiment, we'll pass argument lists **explicitly**, which is exactly what the parsing code would receive from a real terminal.

</div>

## Working with `sys.argv` by hand

Here's a script that sums the numbers it's given. Because the arguments are strings, the naive version fails:

```python run
argv = ['sum.py', '1', '2', '3', '4', '5', '6']   # what sys.argv would contain

numbers = argv[1:]
try:
    print(sum(numbers))
except TypeError as ex:
    print('TypeError:', ex)
```

Converting each one first fixes it:

```python run
numbers = [int(a) for a in argv[1:]]
print(sum(numbers))
```

Positional values are easy. Named options are harder. Suppose we want `--first-name John --last-name Cleese`, in any order. We could pair up names and values with slicing:

```python run
argv = ['names.py', '--last-name', 'Cleese', '--first-name', 'John']

keys = argv[1::2]
values = argv[2::2]
args = dict(zip(keys, values))
print(args)

first_name = args.get('--first-name')
last_name = args.get('--last-name')
print(first_name, last_name)
```

It works for this exact input, but think about what a real tool needs: some options mandatory and others optional, several values for one option, conversion to `int` or `float`, short and long names (`-f` and `--first`), flags that take no value, sensible error messages, and a `--help` screen. Writing all of that by hand would be tedious and fragile. The standard library already did it: the **`argparse`** module.

## `argparse` basics

You describe the arguments your program accepts, then let the parser read the command line:

```python run
import argparse

parser = argparse.ArgumentParser(
    prog='divmod.py',
    description='Calculates a // b and a % b of two integers.')
parser.add_argument('a', help='first integer', type=int)
parser.add_argument('b', help='second integer', type=int)

args = parser.parse_args(['10', '3'])
print(args)
print(f'{args.a} // {args.b} = {args.a // args.b}, {args.a} % {args.b} = {args.a % args.b}')
```

- `ArgumentParser` creates the parser. `description` appears in the help text; `prog` is the program name used in messages (in a real script you'd leave it out and it defaults to the script's file name).
- `add_argument('a', ...)` declares a **positional** argument. `type=int` converts the string and rejects anything that isn't an integer.
- `parse_args()` returns a `Namespace` object whose attributes are the parsed values, already converted.

In a real script you call `parser.parse_args()` with no arguments, and it reads `sys.argv[1:]`. Passing a list explicitly, as we do here, is also how you test argument parsing.

### Help for free

Every parser understands `-h` and `--help`. It prints a usage line and a description of each argument, then **exits the program** by raising `SystemExit`. We catch that here so the page keeps running:

```python run
try:
    parser.parse_args(['-h'])
except SystemExit as ex:
    print('SystemExit with code', ex.code)
```

### Errors exit too

Invalid input is rejected with a usage line and a clear message (on standard error), followed by `SystemExit` with exit code **2**, the conventional code for "bad command line usage":

```python run
try:
    parser.parse_args(['10.5', '3'])
except SystemExit as ex:
    print('SystemExit with code', ex.code)
```

```python run
try:
    parser.parse_args(['10'])
except SystemExit as ex:
    print('SystemExit with code', ex.code)
```

In a terminal that's exactly what you want: the user sees what went wrong and the script stops before doing anything with bad data.

<div class="callout modern">
<span class="callout-title">Things older code gets wrong or does differently</span>

- The first positional parameter of `ArgumentParser` is **`prog`**, not the description. Older examples sometimes write `ArgumentParser('Calculates ...')`, which silently turns the sentence into the program's *name* in the usage line. Always pass `description=` by keyword.
- Since **3.10** the help section for options is titled `options:` (it used to be `optional arguments:`).
- Since **3.9** you can pass `exit_on_error=False` to get an `argparse.ArgumentError` exception instead of an exit, useful when parsing inside a larger program.

</div>

## Named (optional) arguments

Arguments that start with `-` or `--` are **options**. They can appear in any order, and they're optional unless you say `required=True`. `dest` sets the attribute name on the result (by default it's derived from the long name, with dashes turned into underscores):

```python run
from datetime import date

parser = argparse.ArgumentParser(
    prog='age.py',
    description="Returns a string containing a person's name and current age.")
parser.add_argument('-f', '--first', help='first name', dest='first_name')
parser.add_argument('-l', '--last', help='last name', required=True, dest='last_name')
parser.add_argument('--yob', help='year of birth', type=int, required=True, dest='birth_year')

def describe(argv):
    args = parser.parse_args(argv)
    names = [args.first_name] if args.first_name else []
    names.append(args.last_name)
    age = date.today().year - args.birth_year
    print(f"{' '.join(names)} is {age} years old.")

describe(['-f', 'Polly', '-l', 'Parrot', '--yob', '1969'])
describe(['--yob', '1969', '--last', 'Parrot'])      # any order, first name optional
```

A missing required option is reported by name:

```python run
try:
    describe(['-f', 'Polly', '--yob', '1969'])
except SystemExit as ex:
    print('SystemExit with code', ex.code)
```

### Several values for one argument

`nargs` controls how many values an argument consumes: `'*'` means zero or more, `'+'` one or more, and an integer means exactly that many. The values are collected into a list:

```python run
parser = argparse.ArgumentParser(
    prog='powers.py',
    description='Prints the squares of one list of numbers and the cubes of another.')
parser.add_argument('--sq', help='numbers to square', nargs='*', type=float)
parser.add_argument('--cu', help='numbers to cube', nargs='+', type=float, required=True)

def powers(argv):
    args = parser.parse_args(argv)
    if args.sq:                       # None if --sq was absent, [] if given with no values
        print('squares:', [n ** 2 for n in args.sq])
    print('cubes:  ', [n ** 3 for n in args.cu])

powers(['--sq', '1.5', '2', '3', '--cu', '2.5', '3', '4'])
powers(['--sq', '--cu', '2', '3'])
print(parser.parse_args(['--cu', '1']))
```

`--cu` is both required and needs at least one value, so each of these is an error:

```python run
for argv in (['--sq', '--cu'], ['--sq', '1', '2']):
    try:
        powers(argv)
    except SystemExit as ex:
        print('SystemExit with code', ex.code)
```

### Defaults, flags and actions

Each argument has an **action** describing what to do when it's seen. The default action, `'store'`, stores the value. Others create **flags**, options that take no value:

- `'store_const'` stores a fixed `const` value when the flag is present
- `'store_true'` / `'store_false'` are shortcuts for storing `True` / `False`
- `default=` sets the value used when the option is absent (otherwise it's `None`, or the opposite boolean for `store_true`/`store_false`)

```python run
parser = argparse.ArgumentParser(prog='flags.py', description='testing defaults and flags')
parser.add_argument('--monty', action='store_const', const='Python')
parser.add_argument('-v', '--verbose', action='store_true')
parser.add_argument('-q', '--quiet', action='store_false')
parser.add_argument('-n', '--name', default='John')

print(parser.parse_args([]))
print(parser.parse_args(['--monty', '-v', '-q', '-n', 'Eric']))
```

### Mutually exclusive options

Sometimes two options make no sense together, like `--verbose` and `--quiet`. Put them in a **mutually exclusive group** and `argparse` enforces it:

```python run
import cmath

parser = argparse.ArgumentParser(prog='polar.py')
group = parser.add_mutually_exclusive_group()
group.add_argument('-v', '--verbose', action='store_true')
group.add_argument('-q', '--quiet', action='store_true')
parser.add_argument('-n', type=complex, help='a complex number', required=True)

def polar(argv):
    args = parser.parse_args(argv)
    if args.quiet:
        print('quiet mode: nothing to see here.')
    elif args.verbose:
        print(f'input: {args.n}, re={args.n.real}, im={args.n.imag}')
        print(f'{args.n} = {cmath.polar(args.n)}')
    else:
        print(f'{args.n} = {cmath.polar(args.n)}')

polar(['-n', '3+4j'])
polar(['-v', '-n', '3+4j'])
polar(['-q', '-n', '3+4j'])
try:
    polar(['-q', '-v', '-n', '3+4j'])
except SystemExit as ex:
    print('SystemExit with code', ex.code)
```

`cmath.polar` returns the modulus and phase angle of a complex number; for `3+4j` the modulus is 5.

## Putting it in a real script

A typical script wraps the parsing in a `main` function and only runs it when the file is executed directly:

```python
# polar.py
import argparse

def main(argv=None):
    parser = argparse.ArgumentParser(description='...')
    # parser.add_argument(...)
    args = parser.parse_args(argv)   # argv=None means "read sys.argv[1:]"
    ...

if __name__ == '__main__':
    main()
```

```python
$ python polar.py -h
$ python polar.py -v -n 3+4j
```

Because `main` accepts an optional list, tests can call `main(['-v', '-n', '3+4j'])` directly, just like the cells on this page.

<div class="takeaways">

## Key takeaways

- `sys.argv` is a list of strings: the script name, then the arguments split by the shell. Convert types yourself if you use it directly.
- `argparse` declares positional arguments and `-`/`--` options, converts types, enforces `required`, collects lists with `nargs`, and handles flags through `action`.
- `-h`/`--help` and invalid input both raise `SystemExit` (code 0 for help, 2 for errors) after printing a message.
- `parse_args()` reads `sys.argv[1:]`; `parse_args([...])` parses an explicit list, which is ideal for testing.
- Pass `description=` by keyword: the first positional parameter of `ArgumentParser` is `prog`.

</div>
