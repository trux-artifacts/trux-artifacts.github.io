import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artifacts = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/data/artifacts' }),
  schema: z.object({
    name: z.string(),
    type: z.enum(['dataset', 'tool', 'library', 'demo', 'benchmark']),
    description: z.string(),
    authors: z.array(z.string()),
    status: z.enum(['maintained', 'stable', 'archived']).default('stable'),
    paper: z
      .object({
        title: z.string(),
        venue: z.string(),
        year: z.number(),
        doi: z.string().optional(),
        url: z.string().optional(),
      })
      .optional(),
    links: z
      .object({
        github: z.string().optional(),
        website: z.string().optional(),
        download: z.string().optional(),
        video: z.string().optional(),
      })
      .default({}),
    logo: z.string().optional(),
    badges: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    license: z.string().optional(),
    bibtex: z.string().optional(),
  }),
});

export const collections = { artifacts };
