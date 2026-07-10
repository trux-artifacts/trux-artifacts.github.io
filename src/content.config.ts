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
    dataset: z
      .object({
        stats: z
          .array(
            z.object({
              value: z.number(),
              label: z.string(),
              suffix: z.string().default(''),
              animate: z.boolean().default(true),
            })
          )
          .default([]),
        sampleTitle: z.string().default('Sample entries'),
        sampleSource: z.string().optional(),
        sampleHeader: z.string().optional(),
        sampleCount: z.number().default(8),
        sampleNote: z.string().optional(),
        samples: z.array(z.string()).default([]),
        samplesFile: z.string().optional(),
        usage: z
          .object({
            title: z.string().default('How to use it'),
            note: z.string().optional(),
            code: z.string(),
          })
          .optional(),
      })
      .optional(),
    demo: z
      .object({
        intro: z.string().optional(),
        style: z.enum(['llm', 'terminal', 'patch', 'image']).default('llm'),
        outputLabel: z.string().default('Output'),
        countOutput: z.boolean().default(true),
        note: z.string().default('Precomputed example — no live model is called.'),
        scenarios: z.array(
          z.object({
            label: z.string(),
            query: z.string().optional(),
            thinking: z.array(z.string()),
            output: z.array(z.string()).optional(),
            file: z.string().optional(),
            pattern: z.string().optional(),
            seed: z.number().optional(),
            verdictAnswer: z.string().optional(),
            verdictLabel: z.string().optional(),
            verdictKind: z.enum(['correct', 'incorrect', 'malware', 'goodware']).optional(),
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
