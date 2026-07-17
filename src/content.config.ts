import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ARTIFACT_AREAS, ARTIFACT_TYPES } from './data/taxonomy';

const nonBlank = z.string().refine((value) => value.trim().length > 0, {
  message: 'Must not be blank',
});
const trimmedNonBlank = z.string().trim().min(1);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

function isPreprintVenue(value: string): boolean {
  return /^(?:arxiv|preprint)$/i.test(value.trim());
}

function isArxivReference(value: string): boolean {
  return /(?:arxiv\.org|10\.48550\/arxiv\.)/i.test(value);
}

function isSafePath(value: string, allowRootRelative: boolean): boolean {
  if (
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('//') ||
    (!allowRootRelative && value.startsWith('/'))
  ) {
    return false;
  }

  const candidate = value.startsWith('/') ? value.slice(1) : value;
  const segments = candidate.split('/');
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment !== '' &&
        segment !== '.' &&
        segment !== '..' &&
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
    )
  );
}

const httpUrl = z
  .url({ protocol: /^https?$/ })
  .refine(isHttpUrl, { message: 'Must be an HTTP(S) URL without credentials' });

const safeSamplesFile = trimmedNonBlank.refine(
  (value) => isSafePath(value, false),
  { message: 'Must be a safe path relative to src/data/samples' }
);

const safeFigureSource = trimmedNonBlank.refine(
  (value) => isHttpUrl(value) || isSafePath(value, true),
  { message: 'Must be an HTTP(S) URL or a safe local figure path' }
);

const resourceSchema = z
  .object({
    label: trimmedNonBlank,
    url: httpUrl,
  })
  .strict();

const paperSchema = z
  .object({
    title: trimmedNonBlank,
    venue: trimmedNonBlank.refine((value) => !isPreprintVenue(value), {
      message: 'Only papers published in a venue can have an artifact page',
    }),
    year: z.number().int().min(1900).max(2100),
    doi: trimmedNonBlank
      .max(255)
      .regex(/^10\.\d{4,9}\/[\x21-\x7E]+$/, 'Must be a valid DOI')
      .optional(),
    url: httpUrl.optional(),
  })
  .strict()
  .superRefine((paper, ctx) => {
    if (!paper.doi && !paper.url) {
      ctx.addIssue({
        code: 'custom',
        path: ['doi'],
        message: 'A paper must provide either doi or url',
      });
    }
    if (paper.doi && isArxivReference(paper.doi)) {
      ctx.addIssue({
        code: 'custom',
        path: ['doi'],
        message: 'Use the final publication DOI, not an arXiv DOI',
      });
    }
    if (paper.url && isArxivReference(paper.url)) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'Use the final publication URL, not arXiv',
      });
    }
  });

const linksSchema = z
  .object({
    github: httpUrl.optional(),
    website: httpUrl.optional(),
    download: httpUrl.optional(),
    access: httpUrl.optional(),
    video: httpUrl.optional(),
    resources: z.array(resourceSchema).max(50).default([]),
  })
  .strict();

const datasetSchema = z
  .object({
    stats: z
      .array(
        z
          .object({
            // Some existing metrics are percentages or durations, so they are
            // bounded finite numbers rather than integers.
            value: z.number().min(0).max(Number.MAX_SAFE_INTEGER),
            label: trimmedNonBlank,
            suffix: z.string().max(32).default(''),
            animate: z.boolean().default(true),
          })
          .strict()
      )
      .max(100)
      .default([]),
    sampleTitle: trimmedNonBlank.default('Sample entries'),
    sampleSource: trimmedNonBlank.optional(),
    sampleHeader: trimmedNonBlank.optional(),
    sampleCount: z.number().int().min(1).max(1000).default(8),
    sampleNote: nonBlank.optional(),
    samples: z.array(nonBlank).max(10_000).default([]),
    samplesFile: safeSamplesFile.optional(),
    usage: z
      .object({
        title: trimmedNonBlank.default('How to use it'),
        note: nonBlank.optional(),
        code: nonBlank,
      })
      .strict()
      .optional(),
  })
  .strict();

const scenarioSchema = z
  .object({
    label: trimmedNonBlank,
    query: trimmedNonBlank.optional(),
    thinking: z.array(nonBlank).min(1).max(100),
    // Empty output lines are meaningful in terminal and patch renderings.
    output: z.array(z.string()).min(1).max(2_000).optional(),
    file: trimmedNonBlank.optional(),
    pattern: trimmedNonBlank.optional(),
    seed: z.number().int().min(0).max(0xffff_ffff).optional(),
    verdictAnswer: trimmedNonBlank.optional(),
    verdictLabel: trimmedNonBlank.optional(),
    verdictKind: z
      .enum(['correct', 'incorrect', 'malware', 'goodware', 'memorized', 'learned'])
      .optional(),
    explanation: nonBlank.optional(),
  })
  .strict()
  .superRefine((scenario, ctx) => {
    const verdictFields = [
      scenario.verdictAnswer,
      scenario.verdictLabel,
      scenario.verdictKind,
    ].filter((value) => value !== undefined);
    if (verdictFields.length > 0 && verdictFields.length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['verdictAnswer'],
        message: 'verdictAnswer, verdictLabel, and verdictKind must be provided together',
      });
    }
  });

const demoSchema = z
  .object({
    intro: nonBlank.optional(),
    style: z.enum(['llm', 'terminal', 'patch', 'image']),
    engineLabel: trimmedNonBlank.max(80).default('AI model'),
    inputLabel: trimmedNonBlank.max(50).default('Prompt'),
    outputLabel: trimmedNonBlank.default('Output'),
    countOutput: z.boolean().default(true),
    note: nonBlank.default('Precomputed example — no live model is called.'),
    scenarios: z.array(scenarioSchema).min(2).max(100),
  })
  .strict()
  .superRefine((demo, ctx) => {
    demo.scenarios.forEach((scenario, index) => {
      const needsQuery = demo.style === 'llm' || demo.style === 'terminal';
      const needsOutput = demo.style !== 'image';

      if (needsQuery && scenario.query === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', index, 'query'],
          message: `query is required for ${demo.style} demos`,
        });
      }
      if (needsOutput && scenario.output === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', index, 'output'],
          message: `output is required for ${demo.style} demos`,
        });
      }
      if (demo.style === 'patch' && scenario.file === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', index, 'file'],
          message: 'file is required for patch demos',
        });
      }
      if (demo.style === 'image' && scenario.seed === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', index, 'seed'],
          message: 'seed is required for image demos',
        });
      }
    });
  });

const artifactSchema = z
  .object({
    name: trimmedNonBlank,
    type: z.enum(ARTIFACT_TYPES),
    area: z.enum(ARTIFACT_AREAS),
    description: nonBlank,
    authors: z.array(trimmedNonBlank).min(1).max(100),
    addedAt: z.iso.date(),
    paper: paperSchema.optional(),
    links: linksSchema.default({ resources: [] }),
    logo: z.union([z.enum(['android', 'llm', 'network', 'repair']), httpUrl]).optional(),
    figure: safeFigureSource.optional(),
    figureCaption: nonBlank.optional(),
    dataset: datasetSchema.optional(),
    demo: demoSchema.optional(),
    badges: z.array(trimmedNonBlank).max(50).default([]),
    tags: z.array(trimmedNonBlank).max(100).default([]),
    license: trimmedNonBlank.optional(),
    bibtex: nonBlank.optional(),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (artifact.figure && !artifact.figureCaption) {
      ctx.addIssue({
        code: 'custom',
        path: ['figureCaption'],
        message: 'figureCaption is required when figure is present',
      });
    }
  });

const artifacts = defineCollection({
  // Artifact slugs are filenames and the detail route is /artifacts/[slug],
  // so nested YAML files are deliberately outside the catalog contract.
  loader: glob({ pattern: '*.yaml', base: './src/data/artifacts' }),
  schema: artifactSchema,
});

export const collections = { artifacts };
