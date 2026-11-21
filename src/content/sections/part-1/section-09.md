---
summary: What modules and packages really are, how the import system finds, loads and caches them, and how to structure, run and ship your own.
---

Every `import` statement you write sets off a small chain of events: Python checks a cache, searches for code, builds a module object, runs the code inside it, and finally binds a name for you. Once you understand that chain, many puzzling behaviors make sense: why a module's code runs only once, why `from x import y` doesn't save memory, why reloading is risky, and how a package can present a simple interface over dozens of files.

In this section you'll write real modules and packages to the browser's in-memory file system and import them. You'll learn:

- that modules are ordinary objects of type `module`, cached in `sys.modules`
- the steps of an import, `sys.path`, finders, loaders and module specs
- how to import programmatically with `importlib`, and what each import variant really does
- how to reload a module and why it's rarely a good idea
- how `__name__ == '__main__'` lets one file be both a library and a script, and how `__main__.py` makes folders and zip files runnable
- what packages are: regular packages with `__init__.py`, and namespace packages without it
- how to use relative imports and `__all__` to expose a clean package interface
- how Python imports packages straight out of zip archives
