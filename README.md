# FiCR Site

Standalone static showcase for the FiCR web demo.

The site presents the FiCR ontology overview, a browser-only competency-query interface, and a frozen showcase of accepted ficr-abox-builder outputs. It has no backend and no bundled API token. Query buttons send the selected SPARQL text directly from the browser to the public TriplyDB endpoint:

`https://api.triplydb.com/datasets/Raincheung111/FiCRquery/sparql`

## Local Data

Showcase data is copied into `data/` and bundled at build time:

- `data/all_queries.sparql`
- `data/memo/extracted_survey.json`
- `data/memo/readiness_report.json`
- `data/memo/cq_results.json`
- `data/ifc/frozen_fixture/readiness_report.json`
- `data/ifc/frozen_fixture/gate_report.json`

Only skill outputs are included. The site does not bundle skill source, validator scripts, or internal test code.

## Development

```bash
npm ci
npm run build
npm run verify
npm run dev
```

## Vercel Deployment

This is a static Vite project. For a local Vercel deployment:

```bash
npm ci
npm run build
vercel
```

The included `vercel.json` sets `npm ci` as the install command, `npm run build` as the build command, and `dist` as the output directory.
