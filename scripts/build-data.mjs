import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(SITE_ROOT, 'data');

export function parseQueries(text) {
  const starts = [...text.matchAll(/^#\s+([A-Z][0-9][A-Za-z0-9_]*\.rq)\s*$/gm)].map((match) => match.index);
  return starts.map((start, index) => {
    const block = text.slice(start, starts[index + 1] ?? text.length).trim();
    const filename = block.match(/^#\s+([A-Z][0-9][A-Za-z0-9_]*\.rq)\s*$/m)?.[1] ?? '';
    const cq = block.match(/^# CQ:\s*([^|]+)\|\s*Module:\s*([^|]+)\|\s*Type:\s*([^\n]+)$/m);
    const inference = block.match(/^# Inference:\s*(yes|no)\s*\|/m)?.[1] ?? 'no';
    const queryStart = block.indexOf('PREFIX ');
    const beforeQuery = block.slice(0, queryStart);
    const description = beforeQuery
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('# '))
      .map((line) => line.slice(2).trim())
      .filter((line) => line && !line.startsWith('---') && !line.endsWith('.rq'))
      .filter((line) => !/^(CQ|Inference|Migrated-from):/.test(line))
      .at(-1);

    return {
      id: cq?.[1]?.trim() ?? filename.replace('.rq', ''),
      title: titleFromFilename(filename),
      group: (cq?.[1]?.trim() ?? filename).slice(0, 1),
      module: cq?.[2]?.trim() ?? '',
      type: cq?.[3]?.trim() ?? '',
      file: filename,
      inference,
      description: description ?? '',
      text: queryStart >= 0 ? block.slice(queryStart).trim() : '',
    };
  });
}

function titleFromFilename(filename) {
  const stem = filename.replace(/\.rq$/, '');
  const titlePart = stem.replace(/^[A-Z][0-9]_?/, '');
  return titlePart
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  const queryDefs = parseQueries(await readFile(path.join(root, 'all_queries.sparql'), 'utf8'));

  return {
    home: {
      overview:
        'FiCR, Fire Compliance Checking and Risk Analysis, is a fire-compartmentation-and-risk ontology for AEC/FM digital-twin records. It models building elements, compartment and risk-unit boundaries, fire-resistance evidence, boundary assumptions, regulatory requirements, compliance findings, and inspection workflow records for researchers and practitioners who need traceable fire-safety assessment data.',
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
      current: ['text / TTL / IFC input lanes', 'single building', 'single source per session', 'static site without live LLM or chatbot'],
      nearTerm: ['richer input-format handling for existing text and TTL lanes', 'saved query sets and repeatable endpoint checks'],
      vision: ['multimodal ingestion for point cloud, RGBD, and drawings via the same JSON/TTL contracts', 'cross-source entity resolution before merged assessment workflows'],
    },
  };
}

async function main() {
  const queries = parseQueries(await readFile(path.join(DATA_ROOT, 'all_queries.sparql'), 'utf8'));
  const content = await buildContent(DATA_ROOT);
  const outDir = path.join(SITE_ROOT, 'src/generated');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'queries.json'), `${JSON.stringify(queries, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
