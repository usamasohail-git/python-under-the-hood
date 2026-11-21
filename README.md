# Python Deep Dive (interactive site)

A free, interactive Python course with notes, runnable code, quizzes and auto-graded exercises.
It follows the 4-part / section / lecture structure of Dr. Fred Baptiste's *Python 3: Deep Dive* series
(credited on the home and About pages). Python runs in the browser via Pyodide (CPython 3.13 on WebAssembly).

## Commands

| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | dev server at http://localhost:4321 |
| `npm run build` | static build into `dist/` |
| `npm run test:content` | run every lesson cell and exercise in Pyodide (`-- --show`, `-- --quiz`, `-- <filter>`) |
| `npm run curriculum` | regenerate `src/data/curriculum.json` from `../python-deepdive` |

For GitHub Pages under a repo path: `SITE_BASE=/repo-name/ npm run build`.

## Adding content

- Lesson: `src/content/lessons/part-N/section-NN/<lecture-slug>.md` (slug from `curriculum.json`).
  Frontmatter: `title`, `summary`, `minutes`. Use ` ```python run ` for interactive cells
  (cells share one namespace per page; add `fresh` for an isolated cell). Plain ` ```python ` is static.
  Callouts: `<div class="callout note|tip|modern">`. Takeaways: `<div class="takeaways">`.
- Section overview: `src/content/sections/part-N/section-NN.md` (frontmatter `summary`).
- Practice: `src/content/practice/part-N/section-NN.yaml` with `quiz` (q, code?, options, answer, explain)
  and `exercises` (id, title, prompt, starter, tests with `test_*` functions, solution, hints).

Lectures without a markdown file show as "soon" in the section list.

## License

GPL-3.0-or-later, matching the python-deepdive repository it adapts code from.

## Project docs

- `CLAUDE.md`: architecture, commands, rules and known limits (loaded automatically by Claude Code)
- `docs/AUTHORING.md`: how to write or extend a section
- `docs/ROADMAP.md`: open work (search, deployment, browser tests)
