export const ARTIFACT_TYPES = ['dataset', 'tool', 'library', 'demo', 'benchmark'] as const;

export const ARTIFACT_AREAS = [
  'Android Static & Dynamic Analysis',
  'Android Security & Malware',
  'Android Datasets',
  'Patches & Program Repair',
  'LLMs for Software Engineering',
  'Multilingual NLP & LLMs',
  'Networking & Fuzzing',
] as const;

export const ARTIFACT_FILTERS = ['all', ...ARTIFACT_TYPES] as const;

export type ArtifactFilter = (typeof ARTIFACT_FILTERS)[number];

export const ARTIFACT_TYPE_LABELS = {
  all: 'All',
  dataset: 'Datasets',
  tool: 'Tools',
  library: 'Libraries',
  demo: 'Demos',
  benchmark: 'Benchmarks',
} satisfies Record<ArtifactFilter, string>;

export const ARTIFACT_TYPE_NOUNS = {
  all: ['artifact', 'artifacts'],
  dataset: ['dataset', 'datasets'],
  tool: ['tool', 'tools'],
  library: ['library', 'libraries'],
  demo: ['demo', 'demos'],
  benchmark: ['benchmark', 'benchmarks'],
} satisfies Record<ArtifactFilter, readonly [string, string]>;
