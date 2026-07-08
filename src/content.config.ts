import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artifacts = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/data/artifacts' }),
  schema: z.object({
    name: z.string(),
    type: z.enum(['dataset', 'tool', 'library', 'demo', 'benchmark']),
    area: z.string().default('Other'),
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
        access: z.string().optional(),
        video: z.string().optional(),
      })
      .default({}),
    logo: z.string().optional(),
    figure: z.string().optional(),
    figureCaption: z.string().optional(),
    demo: z
      .object({
        intro: z.string().optional(),
        outputLabel: z.string().default('Output'),
        countOutput: z.boolean().default(true),
        note: z.string().default('Precomputed example — no live model is called.'),
        scenarios: z.array(
          z.object({
            label: z.string(),
            query: z.string(),
            thinking: z.array(z.string()),
            output: z.array(z.string()),
            explanation: z.string().optional(),
          })
        ),
      })
      .optional(),
    badges: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    license: z.string().optional(),
    bibtex: z.string().optional(),
  }),
});

export const collections = { artifacts };
