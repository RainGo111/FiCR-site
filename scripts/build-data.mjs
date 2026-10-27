import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(SITE_ROOT, 'data');
const RESEARCH_ROOT = path.join(SITE_ROOT, 'public/research');

export function parseQueries(text) {
  return [...text.matchAll(/^# BEGIN QUERY ([A-Z]\d+)\r?\n([\s\S]*?)^# END QUERY \1\s*$/gm)].map((match) => {
    const block = match[2].trim();
    const cq = block.match(/^# CQ:\s*([^|]+)\|\s*Module:\s*([^|]+)\|\s*Type:\s*([^\n]+)$/m);
    const inference = block.match(/^# Inference:\s*(yes|no)\s*\|/m)?.[1] ?? 'no';
    const queryStart = block.indexOf('PREFIX ');
    if (!cq || queryStart < 0 || cq[1].trim() !== match[1]) throw new Error(`Invalid query block ${match[1]}`);
    return {
      id: match[1],
      group: match[1][0],
      module: cq[2].trim(),
      type: cq[3].trim(),
      inference,
      text: block.slice(queryStart).trim(),
    };
  });
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function pickSurveyExcerpt(survey) {
  const partyWall = survey.elements?.find((element) => element.id === 'W-001');
  const documentEvidence = survey.evidence_log?.find((item) => item.id === 'EV-001');
  return {
    schema_version: survey.meta?.schema_version,
    building: `${survey.building?.label} (${survey.building?.purpose_group})`,
    counts: {
      storeys: survey.storeys?.length ?? 0,
      spaces: survey.spaces?.length ?? 0,
      elements: survey.elements?.length ?? 0,
      risk_units: survey.risk_units?.length ?? 0,
      boundary_assumptions: survey.boundary_assumptions?.length ?? 0,
    },
    party_wall: partyWall
      ? {
          id: partyWall.id,
          type: partyWall.type,
          rei: partyWall.rei,
          is_external: partyWall.is_external,
          roles: partyWall.usage_roles,
        }
      : null,
    document_evidence: documentEvidence
      ? {
          id: documentEvidence.id,
          type: documentEvidence.type,
          document_title: documentEvidence.document_title,
        }
      : null,
  };
}

function informationAvailability(report) {
  return {
    availableQueries: report.queries.filter((query) => query.status === 'runnable').map((query) => query.query_id),
    unavailableQueries: report.queries
      .filter((query) => query.status === 'blocked')
      .map(({ query_id, missing_terms, suggestions }) => ({ queryId: query_id, missingTerms: missing_terms, suggestions })),
  };
}

function availabilitySummary(report) {
  return {
    total: report.summary.total,
    available: report.summary.runnable,
    unavailable: report.summary.blocked,
  };
}

function applyPresentationTerminology(markdown) {
  return markdown
    .replaceAll('TBox fingerprint', 'FiCR ontology reference')
    .replaceAll('FiCR whitelist', 'FiCR controlled vocabulary')
    .replaceAll('Readiness', 'Information availability')
    .replace(/\breadiness\b(?!_report)/g, 'information availability')
    .replaceAll('runnable', 'available')
    .replaceAll('blocked', 'unavailable');
}

export async function buildContent(root = DATA_ROOT) {
  const extractedSurvey = await readJson(root, 'memo/survey.json');
  const memoReadiness = await readJson(root, 'memo/readiness_report.json');
  const memoCqResults = await readJson(root, 'memo/cq_results.json');
  const memoReport = applyPresentationTerminology(await readFile(path.join(root, 'memo/survey-to-report.md'), 'utf8'));
  const ifcReadiness = await readJson(root, 'ifc/frozen_fixture/readiness_report.json');
  const ifcGate = await readJson(root, 'ifc/frozen_fixture/gate_report.json');

  return {
    home: {
      overview:
        'FiCR is an ontology for fire compliance and risk analysis in existing buildings. It connects building elements, fire-protection equipment, inspection findings and supporting evidence, so assessment results can be queried and traced to their sources.',
    },
    ontology: {
      iri: 'https://w3id.org/ficr/',
      widoco: 'https://raingo111.github.io/FiCR-ontology/',
    },
    skill: {
      lanes: ['Text memo or survey notes', 'FiCR ABox TTL', 'IFC via IFCtoFiCR'],
      gates: ['survey schema', 'FiCR controlled vocabulary', 'FiCR ontology reference', 'RDF parse', 'FiCR term closure'],
      sampleReport: {
        source: 'Frozen survey-to-report output from the memo session artifacts.',
        markdown: memoReport,
      },
      memo: {
        extractedSurvey: pickSurveyExcerpt(extractedSurvey),
        informationAvailability: availabilitySummary(memoReadiness),
        priorityScores: memoCqResults.queries.C4.rows.map((row) => ({ unit: row.unit, score: row.priorityScore })),
        ...informationAvailability(memoReadiness),
      },
      ifc: {
        fixture: 'data/ifc/frozen_fixture',
        informationAvailability: availabilitySummary(ifcReadiness),
        ...informationAvailability(ifcReadiness),
        gate: ifcGate,
      },
    },
    roadmap: {
      current: ['IFC-derived building identity and an editable inspection workbook', 'Three controlled information scenarios on one assessed date', 'OWL classification, 22 SPARQL queries and source-linked results', 'Complete typed reference comparison and reproducible builds'],
      nearTerm: ['Apply the workflow to additional buildings and inspection records', 'Evaluate evidence adequacy with independent field observations', 'Compare findings with established assessment practice'],
      vision: ['Link drawings, point clouds and RGBD observations to persistent building identities', 'Resolve evidence across sources and inspection dates', 'Study how evidence quality affects assessment decisions'],
    },
  };
}

async function main() {
  const catalog = await readJson(DATA_ROOT, 'query-catalog.json');
  const queries = parseQueries(await readFile(path.join(RESEARCH_ROOT, 'all_queries.rq'), 'utf8')).map(query => {
    if (!catalog[query.id]) throw new Error(`Missing description for ${query.id}`);
    return {...query, title: catalog[query.id][0], description: catalog[query.id][1]};
  });
  if (queries.length !== 22 || new Set(queries.map(q => q.id)).size !== 22) throw new Error('Expected 22 distinct canonical queries');
  const content = await buildContent(DATA_ROOT);
  const verification = await readJson(RESEARCH_ROOT, 'verification.json');
  const results = await readJson(RESEARCH_ROOT, 'results.json');
  if (!verification.summary.passed || !verification.summary.reproducible) throw new Error('Research results must pass verification and reproducibility');
  content.research = {
    revision: verification.environment.revision,
    assessedDate: verification.environment.assessed_date,
    summary: verification.summary,
    priorities: Object.fromEntries(Object.entries(results).map(([sid, frames]) => [sid, frames.C4.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, term]) => [key, term?.value ?? null])))])),
    equipment: Object.fromEntries(Object.entries(results.S1.E3.rows[0]).map(([key, term]) => [key, term?.value ?? null])),
  };
  const outDir = path.join(SITE_ROOT, 'src/generated');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'queries.json'), `${JSON.stringify(queries, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
