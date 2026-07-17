# TruX Artifacts

**https://trux-artifacts.github.io**

The research artifact showcase of the [Trustworthy Software Engineering (TruX)](https://www.uni.lu/snt-en/research-groups/trux/)
group at the Interdisciplinary Centre for Security, Reliability and Trust (SnT),
University of Luxembourg.

TruX investigates software security, automated program repair, and explainable software
systems. Alongside our publications, we release the concrete outputs of this research —
and this site is the single place to find them:

- **Datasets** — such as AndroZoo (25M+ Android apps) and AndroLibZoo (34k+ Android libraries)
- **Tools** — static analyzers and program repair tools such as JuCify, RAICC, Difuzer, and TBar
- **Libraries** — reusable building blocks for analysis pipelines, such as AndroSpecter
- **Demonstrations and benchmarks** — videos and reference material accompanying our papers

Every artifact page describes the research output and, when available, provides its
accompanying paper, a ready-to-copy BibTeX entry, and links to the code or data. Artifacts
are released for the research community — if you use one in your work, please cite the
corresponding paper.

## About this site

The site is a static catalog built with [Astro](https://astro.build) and served by GitHub
Pages. Each artifact is described by a data file in [`src/data/artifacts/`](src/data/artifacts/);
the catalog, search, and detail pages are generated from these files on every push to `main`.

The current catalog uses seven areas: Android Datasets; Android Static & Dynamic Analysis;
Android Security & Malware; Patches & Program Repair; LLMs for Software Engineering;
Multilingual NLP & LLMs; and Networking & Fuzzing.

## Local development

Use Node.js 22.12 or newer and npm (CI uses Node.js 22). Install the locked dependencies,
run the same checks as CI, then start the local development server:

```sh
npm ci
npm run check
npm run validate:content
npm run build
npm run dev        # open http://localhost:4321
```

Pull requests run the checks and production build. Merges to `main` are deployed to GitHub
Pages by the deployment workflow.

## Contact

Questions about a specific artifact are best directed to its authors (listed on each
artifact page). For questions about the site itself, please open an issue.
