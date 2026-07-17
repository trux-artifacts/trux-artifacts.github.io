import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = path.join(root, 'src/data/artifacts');
const samplesDir = path.join(root, 'src/data/samples');
const figuresDir = path.join(root, 'public/figures');
const logosDir = path.join(root, 'public/logos');
const people = JSON.parse(fs.readFileSync(path.join(root, 'src/data/people.json'), 'utf8'));

const errors = [];
const warnings = [];
const usedFigures = new Set();
const usedLogos = new Set();
const seenNames = new Map();
const missingLicenses = [];
const allowedAreas = new Set([
  'Android Datasets',
  'Android Security & Malware',
  'Android Static & Dynamic Analysis',
  'LLMs for Software Engineering',
  'Multilingual NLP & LLMs',
  'Networking & Fuzzing',
  'Patches & Program Repair',
]);

const artifactFiles = fs
  .readdirSync(artifactsDir)
  .filter((file) => file.endsWith('.yaml'))
  .sort();

function error(file, message) {
  errors.push(`${file}: ${message}`);
}

function warning(file, message) {
  warnings.push(`${file}: ${message}`);
}

function isHttpUrl(value) {
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

function checkUrl(file, label, value) {
  if (value && !isHttpUrl(value)) error(file, `${label} must be an HTTP(S) URL`);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function bibtexField(bibtex, field) {
  if (typeof bibtex !== 'string') return null;
  const match = bibtex.match(
    new RegExp(`^\\s*${field}\\s*=\\s*(?:\\{(.*)\\}|"(.*)")\\s*,?\\s*$`, 'im')
  );
  return (match?.[1] ?? match?.[2] ?? '').trim() || null;
}

function normalizeBibliographicText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[{}\\]/g, '')
    .replace(/[‘’'`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function isPreprintVenue(venue) {
  return /^(arxiv|preprint)$/i.test(String(venue ?? '').trim());
}

function safeLocalPath(base, relative) {
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(base, relative);
  const relation = path.relative(resolvedBase, resolved);
  return relation !== '' && !relation.startsWith('..') && !path.isAbsolute(relation)
    ? resolved
    : null;
}

function realPathInside(base, candidate) {
  try {
    const realBase = fs.realpathSync(base);
    const realCandidate = fs.realpathSync(candidate);
    const relation = path.relative(realBase, realCandidate);
    return relation !== '' && !relation.startsWith('..') && !path.isAbsolute(relation)
      ? realCandidate
      : null;
  } catch {
    return null;
  }
}

for (const [name, url] of Object.entries(people)) {
  if (url && (typeof url !== 'string' || !isHttpUrl(url))) {
    error('people.json', `invalid HTTP(S) URL for ${name}`);
  }
}

for (const file of artifactFiles) {
  const fullPath = path.join(artifactsDir, file);
  let artifact;
  try {
    artifact = loadYaml(fs.readFileSync(fullPath, 'utf8'));
  } catch (cause) {
    error(file, `cannot parse YAML (${cause.message})`);
    continue;
  }

  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    error(file, 'top-level YAML value must be an object');
    continue;
  }

  const slug = path.basename(file, '.yaml');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    error(file, 'filename must be a lowercase kebab-case slug');
  }

  if (seenNames.has(artifact.name)) {
    error(file, `duplicates name from ${seenNames.get(artifact.name)}`);
  } else {
    seenNames.set(artifact.name, file);
  }

  if (!allowedAreas.has(artifact.area)) {
    error(file, `area must use the controlled taxonomy: ${artifact.area ?? '(missing)'}`);
  }

  if ('status' in artifact) {
    error(file, 'status is no longer supported; use the factual addedAt date instead');
  }
  if (!isIsoDate(artifact.addedAt)) {
    error(file, 'addedAt must be a valid ISO date in YYYY-MM-DD format');
  }

  for (const author of artifact.authors ?? []) {
    if (!(author in people)) error(file, `author is missing from people.json: ${author}`);
  }

  for (const tag of artifact.tags ?? []) {
    if (!/^[a-z0-9]+(?:[-+][a-z0-9]+)*$/.test(tag)) {
      error(file, `tag is not normalized lowercase kebab-case: ${tag}`);
    }
  }

  if (artifact.paper) {
    if (isPreprintVenue(artifact.paper.venue)) {
      error(file, 'only papers published in a venue can have an artifact page');
    }
    if (!artifact.paper.doi && !artifact.paper.url) {
      error(file, 'paper must provide either doi or url');
    }
    checkUrl(file, 'paper.url', artifact.paper.url);
    if (!artifact.bibtex) {
      error(file, 'paper is present but bibtex is missing');
    } else {
      const bibTitle = bibtexField(artifact.bibtex, 'title');
      const bibYear = bibtexField(artifact.bibtex, 'year');
      const bibDoi = bibtexField(artifact.bibtex, 'doi');

      if (!bibTitle) {
        error(file, 'bibtex must provide a title');
      } else if (
        normalizeBibliographicText(bibTitle) !==
        normalizeBibliographicText(artifact.paper.title)
      ) {
        error(file, 'paper.title and bibtex title must match');
      }

      if (!bibYear) {
        error(file, 'bibtex must provide a year');
      } else if (String(artifact.paper.year) !== bibYear) {
        error(file, 'paper.year and bibtex year must match');
      }

      if (artifact.paper.doi) {
        if (!/^10\.\d{4,9}\/.+/.test(artifact.paper.doi)) {
          error(file, 'paper.doi is not a valid DOI');
        }
        if (!bibDoi) {
          error(file, 'paper.doi is present but bibtex doi is missing');
        } else if (artifact.paper.doi.toLowerCase() !== bibDoi.toLowerCase()) {
          error(file, 'paper.doi and bibtex doi must match');
        }
      } else if (bibDoi) {
        error(file, 'bibtex doi is present but paper.doi is missing');
      }

      const citationText = `${artifact.paper.url ?? ''}\n${artifact.bibtex}`;
      if (/arxiv\.org|10\.48550\/arxiv\./i.test(citationText)) {
        error(file, 'published papers must link to the final publication, not arXiv');
      }
    }
  }

  const links = artifact.links ?? {};
  for (const key of ['github', 'website', 'download', 'access', 'video']) {
    checkUrl(file, `links.${key}`, links[key]);
  }
  for (const [index, resource] of (links.resources ?? []).entries()) {
    checkUrl(file, `links.resources[${index}].url`, resource.url);
  }
  if (Object.keys(links).length === 0) warning(file, 'no artifact links are provided');

  if (artifact.figure) {
    if (!artifact.figureCaption) error(file, 'figure requires figureCaption');
    if (isHttpUrl(artifact.figure)) {
      // Remote figures are allowed, although local assets are preferred.
    } else {
      const relative = artifact.figure.startsWith('/') ? artifact.figure.slice(1) : artifact.figure;
      const figurePath = artifact.figure.startsWith('/')
        ? safeLocalPath(path.join(root, 'public'), relative)
        : safeLocalPath(figuresDir, relative);
      if (!figurePath || !fs.existsSync(figurePath)) {
        error(file, `figure does not exist: ${artifact.figure}`);
      } else {
        usedFigures.add(path.relative(figuresDir, figurePath));
      }
    }
  }

  if (artifact.logo) {
    if (isHttpUrl(artifact.logo)) {
      // Remote logos are allowed.
    } else {
      const logoName = `${artifact.logo}.svg`;
      const logoPath = safeLocalPath(logosDir, logoName);
      if (!logoPath || !fs.existsSync(logoPath)) {
        error(file, `logo does not exist: ${artifact.logo}`);
      } else {
        usedLogos.add(logoName);
      }
    }
  }

  if (artifact.dataset?.samplesFile) {
    const samplePath = safeLocalPath(samplesDir, artifact.dataset.samplesFile);
    if (!samplePath || artifact.dataset.samplesFile.includes('\\')) {
      error(file, 'dataset.samplesFile must stay inside src/data/samples');
    } else if (!fs.existsSync(samplePath)) {
      error(file, `dataset.samplesFile does not exist: ${artifact.dataset.samplesFile}`);
    } else {
      const realSamplePath = realPathInside(samplesDir, samplePath);
      if (!realSamplePath) {
        error(file, 'dataset.samplesFile must not escape src/data/samples through a symlink');
        continue;
      }
      const sampleStat = fs.statSync(realSamplePath);
      if (!sampleStat.isFile()) {
        error(file, `dataset.samplesFile is not a regular file: ${artifact.dataset.samplesFile}`);
      } else if (sampleStat.size > 5_000_000) {
        error(file, `dataset.samplesFile exceeds the 5 MB build limit`);
      } else {
        const rowCount = fs
          .readFileSync(realSamplePath, 'utf8')
          .split('\n')
          .filter((row) => row.trim().length > 0).length;
        if (rowCount > 10_000) {
          error(file, `dataset.samplesFile exceeds the 10,000-row limit`);
        }
      }
    }
  }

  if (artifact.dataset?.samples?.length) {
    const sampleCount = artifact.dataset.sampleCount ?? 8;
    if (sampleCount > artifact.dataset.samples.length) {
      warning(file, `sampleCount (${sampleCount}) exceeds the inline sample pool`);
    }
  }

  if (artifact.demo) {
    const style = artifact.demo.style;
    if (!['llm', 'terminal', 'patch', 'image'].includes(style)) {
      error(file, 'demo.style must explicitly be llm, terminal, patch, or image');
      continue;
    }
    if (!Array.isArray(artifact.demo.scenarios) || artifact.demo.scenarios.length < 2) {
      error(file, 'demo must provide at least two scenarios');
      continue;
    }
    if (!/(simulat|mock|precomputed|not executed|nothing runs|no live|does not run)/i.test(artifact.demo.note ?? '')) {
      error(file, 'demo.note must disclose that the interactive output is not a live execution');
    }
    for (const [index, scenario] of artifact.demo.scenarios.entries()) {
      if ((style === 'llm' || style === 'terminal') && !scenario.query) {
        error(file, `demo.scenarios[${index}] requires query for ${style} style`);
      }
      if (style !== 'image' && !Array.isArray(scenario.output)) {
        error(file, `demo.scenarios[${index}] requires output for ${style} style`);
      }
    }
  }

  if (!artifact.license) missingLicenses.push(file);
}

if (missingLicenses.length > 0) {
  warning(
    'artifacts',
    `license is not documented for ${missingLicenses.length}/${artifactFiles.length}: ${missingLicenses.join(', ')}`
  );
}

for (const figure of fs.readdirSync(figuresDir)) {
  if (!usedFigures.has(figure)) warning('public/figures', `unused figure: ${figure}`);
}

for (const logo of fs.readdirSync(logosDir)) {
  if (!usedLogos.has(logo)) warning('public/logos', `unused logo: ${logo}`);
}

if (warnings.length > 0) {
  console.warn(`Content warnings (${warnings.length}):`);
  for (const message of warnings) console.warn(`  - ${message}`);
}

if (errors.length > 0) {
  console.error(`Content validation failed (${errors.length}):`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Content validation passed for ${artifactFiles.length} artifacts.`);
}
