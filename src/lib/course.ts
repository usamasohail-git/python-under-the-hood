import curriculum from '../data/curriculum.json';
import { getCollection } from 'astro:content';

export interface Lecture { num: number; slug: string; title: string; source: string }
export interface Section { num: number; slug: string; title: string; kind: 'lessons' | 'project' | 'exercises'; lectures: Lecture[] }
export interface Part { num: number; slug: string; title: string; subtitle: string; blurb: string; sections: Section[] }

export const parts: Part[] = curriculum.parts as Part[];

/** Prefix a site path with the configured base (GitHub Pages friendly). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`.replace(/([^/])$/, '$1/').replace(/\/+/g, '/');
}

export const sectionId = (p: Part, s: Section) => `${p.slug}/${s.slug}`;
export const lectureId = (p: Part, s: Section, l: Lecture) => `${p.slug}/${s.slug}/${l.slug}`;
export const sectionLabel = (s: Section) => `Section ${String(s.num).padStart(2, '0')}`;

/** Which lectures/sections actually have written content on the site. */
export async function contentIndex() {
  const lessons = await getCollection('lessons');
  const practice = await getCollection('practice');
  const sections = await getCollection('sections');
  return {
    lessons: new Map(lessons.map((e) => [e.id, e])),
    practice: new Map(practice.map((e) => [e.id, e])),
    sections: new Map(sections.map((e) => [e.id, e])),
  };
}

export function findPart(slug: string) {
  return parts.find((p) => p.slug === slug);
}
