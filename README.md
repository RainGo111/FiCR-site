# FiCR Site

FiCR is an ontology for fire compliance and risk analysis in existing buildings. It connects building elements, fire-protection equipment, inspection findings and supporting evidence so assessment results can be queried and traced to their sources.

Live: [https://ficr-site.vercel.app](https://ficr-site.vercel.app)

The site presents the ontology, the Duplex A enrichment study, and 22 competency queries across building inventory, REI compliance, boundary evidence, assessment workflow and equipment inspection. The study includes three controlled information scenarios, assessed on 17 March 2025. All 66 query/scenario frames and 1,313 typed result rows passed reference comparison.

The query explorer displays verified scenario results and supports live execution against [FiCR-Query-S1 on TriplyDB](https://triplydb.com/Raincheung111/FiCR-Query-S1/sparql). Browser requests use `https://api.triplydb.com/datasets/Raincheung111/FiCR-Query-S1/sparql`. Public results are labelled separately from the saved scenario results. The existing Skill showcase is retained without changes to its content or data.

## Development

```bash
npm ci
npm run dev
npm run build
npm run verify
```

`public/research/` contains the published B1 workbook, PDF, canonical query bundle, typed results, binding contracts, verification summary, scenario graphs and provenance. It is a distribution of the accepted enrichment experiment, not a separate editable input source. `scripts/build-data.mjs` derives the site query catalogue and study summary from these records. Builds do not need the parent workspace or a private filesystem path.

To check the live baseline as well as the local distribution, run `npm run verify -- --live`. The live check compares every projected binding with S1. Endpoint failures and mismatches produce a nonzero exit status.

The case uses simulated inspection and evidence records. Its illustrative boundary priority score is not a calibrated fire-risk probability, and its authored requirements do not establish current regulatory applicability.
