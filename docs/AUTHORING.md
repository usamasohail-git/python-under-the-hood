# Authoring guide

How to write one section of the course. The reference implementation is **Part 1 · Section 03**:
read `src/content/sections/part-1/section-03.md`, at least three lessons in
`src/content/lessons/part-1/section-03/`, and `src/content/practice/part-1/section-03.yaml`
before you start, and match their style, depth and formatting.

## Source material (read, never copy)

- Curriculum: `src/data/curriculum.json` gives each lecture's `slug`, `title` and `source` path
  (relative to `../python-deepdive/`). A source is a notebook or a folder (read every notebook and
  `.py` file inside a folder).
- Notebook text: `python3 -I scripts/authoring/notebook_text.py "<path>.ipynb" ...`
- Parts 2–4 have no captions: the notebooks (and any `.py`/data files in lecture folders) are the
  whole source, so rely on your own expertise for the theory and explanations around the code.
- Part 1 only: captions in `../python-deepdive/Part 1/Captioning/sectionNN/*.vtt`
  (folder number = section number). Read them with
  `python3 -I scripts/authoring/caption_text.py <files>`. They contain the spoken lecture, including
  theory that isn't in the notebooks. Use them to learn **what** is taught. Never quote or closely
  paraphrase them, and never publish them.

**Copyright rule:** lesson prose, quiz questions and exercises must be written in your own words. Short
code examples adapted from the notebooks are fine (GPL-3.0). Do not mention the instructor, Udemy,
"the course", "the video" or "the lecture" in lesson text; credits live only on the home/About pages.
(A "Modern Python" callout may say "older notebooks/versions show …".)

## Files to create for section `part-N/section-NN`

1. `src/content/sections/part-N/section-NN.md`: frontmatter `summary:` (one sentence) plus a short
   intro and a bullet list of what the section covers.
2. One lesson per lecture: `src/content/lessons/part-N/section-NN/<slug>.md`. The filename must
   equal the curriculum slug exactly.
   ```yaml
   ---
   title: <lecture title; quote it if it contains a colon>
   summary: <one sentence; quote it if it contains a colon or starts with a backtick>
   minutes: <estimated reading+running time>
   ---
   ```
3. `src/content/practice/part-N/section-NN.yaml`: 8–12 quiz questions and 2–4 exercises.

Don't edit anything else (no components, styles, configs, other sections).

## Lesson format

- Start with `##` headings (the page already renders the title as `h1`). Aim for about 400–1200 words.
  Explain *why*, not just *what*. Make the lessons beginner-friendly but deep.
- Interactive cells: ```` ```python run ````. All cells on a page share one namespace, top to bottom,
  like a notebook; the value of a trailing expression is printed (repr). Add `fresh` (```` ```python run fresh ````)
  for a cell that must run in its own empty namespace. Plain ```` ```python ```` is a static, non-runnable
  snippet (use it for pseudo-code, other languages, or code that can't run in the browser).
- Every `run` cell must run without an uncaught exception. To show an error, catch it:
  `try: ... except TypeError as ex: print('TypeError:', ex)`.
- Callouts (keep the blank lines exactly like this):
  ```html
  <div class="callout note">
  <span class="callout-title">Title</span>

  Markdown body…

  </div>
  ```
  Kinds: `note` (clarification), `tip` (advice / try it), `modern` (behavior that changed in recent
  Python versions, or differs from older notebooks).
- End every lesson with:
  ```html
  <div class="takeaways">

  ## Key takeaways

  - …

  </div>
  ```
- Optional inline SVG diagrams: copy the `<figure class="diagram">` pattern from
  `01-variables-are-memory-references.md` (classes `d-name`, `d-obj`, `d-obj-hl`, `d-text`, `d-sub`,
  `d-arrow`, `d-arrow-hl`, `d-head`, `d-head-hl`; unique marker ids per page; **no blank lines inside the
  `<figure>`**). Use diagrams only where a picture really helps.

## The runtime: Pyodide (CPython 3.13 in WebAssembly)

- **Verify every claim about output by running it.** The notebooks were recorded on Python 3.6–3.10.
  When the behavior differs on 3.13, show the modern behavior and add a `modern` callout explaining
  the change. Also cover newer features relevant to the topic where it helps (e.g. `match`, the `|`
  dict merge, `functools.cache`), clearly labeled with their version.
- Keep benchmarks small (each cell should finish in about 2 seconds; the browser stops code after 15s).
  Use `1_000_000` iterations rather than `10_000_000`.
- No network, no `input()`, no threads or subprocesses, and no real command line. For
  `sys.argv`/argparse, pass an explicit list to `parse_args([...])`.
- The file system is an in-memory virtual one and **is writable**: a cell can create modules or packages
  with `open(...).write(...)` / `pathlib`, then import them (use a temp dir and add it to `sys.path`, and
  call `importlib.invalidate_caches()` after writing files). Use this for the modules/packages lessons.
- In the same cell, identical literals compile to one constant (see Section 03 lesson 11). Keep this in
  mind for any `is` demonstration.
- Packages bundled with Pyodide (e.g. `pyyaml`, `jsonschema`, `numpy`) can be used by listing them in
  the lesson frontmatter (`packages: ['pyyaml']`) or at the top of the practice YAML; they're loaded
  before cells run. Packages that are only on PyPI (e.g. marshmallow, serpy) are **not** available.
- Other third-party packages are not available; prefer the standard library. If
  a lecture is about a third-party library (e.g. marshmallow, serpy, PyYAML, jsonschema), check whether
  `import <pkg>` works in Pyodide. If it doesn't, explain it with static ```` ```python ```` snippets and
  outputs you've verified locally, and keep the runnable cells to the standard library.

## Data files

If cells need a data file (CSV etc.) from the source repo, copy it to
`public/data/part-N/section-NN/<path>` and list `<path>` under `files:` in the lesson frontmatter
(or at the top level of the practice YAML). It's written into Python's working directory before any
cell runs, so `open('<path>')` works (e.g. `files: ['data/employment.csv']` makes
`open('data/employment.csv')` work). Keep files under ~100 KB; if a source file is bigger, ship an
extract (the first rows) and say so.

## Project and coding-exercise sections

Sections whose `kind` is `project` or `exercises` in `curriculum.json` still get one lesson page per
lecture, written like this:

- **Description lecture:** restate the problem in your own words: the goals, the data (a few sample
  rows, shown with a runnable cell), the constraints and the hints. End with a "Try it yourself" call to
  action pointing to the practice page, *before* any solution.
- **Solution lectures:** a guided walkthrough that builds the solution step by step with `run` cells,
  explaining design decisions (why a generator, why a context manager, why a namedtuple…), and verifying
  results. Don't just dump the final code.
- **Practice YAML:** make the project goals into auto-graded exercises (one per goal, with starter
  code, `test_*` tests and a reference solution), plus 5–8 quiz questions on the techniques used.
  These exercises are the heart of a project section, so make the tests thorough but fair.

## Practice YAML

Follow `src/content/practice/part-1/section-03.yaml` exactly:

- `quiz`: items with `q`, optional `code`, `options` (2–4), `answer` (0-based index), `explain`.
  Prefer "what does this print?" questions with a `code` snippet, plus some conceptual ones. Vary the
  position of the correct answer. Inline markdown allowed: `code`, **bold**, *italic*. Quote YAML strings
  that start with a backtick or contain `: `.
- `exercises`: `id` (kebab-case, unique), `title`, `prompt`, `starter`, `tests`, `solution`, `hints`.
  `tests` defines `test_*` functions using `assert` with helpful messages; the docstring is shown as the
  test name. The solution must pass every test; the starter must fail at least one. Exercises should
  practice the section's ideas, not trivia.

## Validate before you finish

```bash
npm run test:content -- --show part-N/section-NN     # runs all cells, prints outputs
npm run test:content -- --quiz part-N/section-NN     # also runs quiz code snippets
```

The `--show` flag prints each cell's output: read it and make sure the prose matches what actually
prints. With `--quiz`, check that each snippet's output matches the marked answer. Fix the content until
the run ends with `All content checks passed`. Do **not** run `npm run build` (others may build
concurrently); just make sure the YAML frontmatter is valid.
