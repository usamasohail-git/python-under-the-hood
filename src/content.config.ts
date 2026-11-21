import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    minutes: z.number().optional(),
    // Data files copied into Python's working directory before cells run.
    // Paths are relative to public/data/<part>/<section>/ (e.g. 'data/employment.csv').
    files: z.array(z.string()).default([]),
    // Pyodide-bundled packages to load before cells run (e.g. 'pyyaml', 'jsonschema').
    packages: z.array(z.string()).default([]),
  }),
});

const choice = z.object({
  q: z.string(),
  code: z.string().optional(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explain: z.string(),
});

const exercise = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  starter: z.string(),
  tests: z.string(),
  solution: z.string(),
  hints: z.array(z.string()).default([]),
});

const practice = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/practice' }),
  schema: z.object({
    quiz: z.array(choice),
    exercises: z.array(exercise).default([]),
    files: z.array(z.string()).default([]),
    packages: z.array(z.string()).default([]),
  }),
});

// Section overviews: src/content/sections/part-1/section-03.md
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: z.object({ summary: z.string() }),
});

export const collections = { lessons, practice, sections };
