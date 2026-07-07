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
  const documentEvidence = survey.evidence_log?.find((item) => item.id === 'EV-OM-REI');
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

function queryStatusLists(report) {
  return {
    runnableQueries: report.queries.filter((query) => query.status === 'runnable').map((query) => query.query_id),
    blockedQueries: report.queries.filter((query) => query.status === 'blocked'),
  };
}

function formatCount(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function rowsByState(rows) {
  return rows.map((row) => `${row.unit}: ${row.conditionState} ${row.count}`).join(', ');
}

function queryLine(query, result) {
  const rows = result.rows ?? [];
  const rowCount = result.row_count;
  const prefix = `${query.id} ${query.title}: ${formatCount(rowCount, 'result')}`;
  if (query.id === 'A1' && rows[0]) return `${prefix}; building ${rows[0].building}, ${rows[0].storeys} storeys, ${rows[0].spaces} spaces.`;
  if (query.id === 'A2') return `${prefix}; storeys listed: ${rows.map((row) => row.label).join(', ')}.`;
  if (query.id === 'A3') return `${prefix}; space ledger includes named room and roof spaces.`;
  if (query.id === 'A4') return `${prefix}; usage categories: ${rows.map((row) => `${row.usage} ${row.count}`).join(', ')}.`;
  if (query.id === 'A5') return `${prefix}; element inventory: ${rows.map((row) => `${row.elementType} ${row.count}`).join(', ')}.`;
  if (query.id === 'A6') return `${prefix}; fire-protection item recorded in ${rows[0]?.spaceLabel ?? 'the graph'}.`;
  if (query.id === 'B1') return `${prefix}; no compliance health-score rows because no compliance assessment records are present.`;
  if (query.id === 'B2') return `${prefix}; no REI requirement comparison rows because no regulatory requirement records are present.`;
  if (query.id === 'B3') return `${prefix}; inferred class summary reports ${rows.map((row) => `${row.definedClass} ${row.count}`).join(', ')}.`;
  if (query.id === 'B4') return `${prefix}; no finding traceability rows because no compliance findings are present.`;
  if (query.id === 'C1') return `${prefix}; risk units: ${rows.map((row) => `${row.label} covers ${row.coveredSpaces} spaces`).join('; ')}.`;
  if (query.id === 'C2') return `${prefix}; boundary states by unit: ${rowsByState(rows)}.`;
  if (query.id === 'C3') {
    const gaps = rows.filter((row) => row.gap === 'EVIDENCE GAP').length;
    return `${prefix}; ${formatCount(gaps, 'evidence gap')} and ${formatCount(rowCount - gaps, 'supported assumption')}.`;
  }
  if (query.id === 'C4') return `${prefix}; risk priority rows: ${rows.map((row) => `${row.unit} score ${row.priorityScore}`).join(', ')}.`;
  if (query.id === 'C5') return `${prefix}; no contradictory gap-consistency rows.`;
  if (query.id === 'C6') return `${prefix}; no risk-finding traceability rows because findings are absent.`;
  if (query.id === 'D1') return `${prefix}; workflow task: ${rows[0]?.taskLabel ?? 'none returned'}.`;
  if (query.id === 'D2') return `${prefix}; no assessment-result rows because assessment records are absent.`;
  return `${prefix}.`;
}

function buildCqSummary(queryDefs, results) {
  const grouped = { A: [], B: [], C: [], D: [] };
  for (const query of queryDefs) {
    const result = results.queries[query.id];
    grouped[query.group].push(queryLine(query, result));
  }
  return grouped;
}

function buildSampleReport(queryDefs, results, readiness, survey) {
  const pipeEvidence = survey.evidence_log?.find((item) => item.id === 'EV-PIPE-PENETRATION');
  const blocked = readiness.queries.find((query) => query.query_id === 'D2');
  const c3Rows = results.queries.C3.rows;
  const evidenceGapCount = c3Rows.filter((row) => row.gap === 'EVIDENCE GAP').length;
  const compromisedUnits = results.queries.C2.rows.filter((row) => row.conditionState === 'Compromised').map((row) => row.unit);
  return {
    title: 'Duplex A memo sample report',
    source: 'Generated from the memo-derived ABox, CQ results, and gap check.',
    cqSummary: buildCqSummary(queryDefs, results),
    actions: [
      `${pipeEvidence.label} is linked to compromised compartmentation for ${compromisedUnits.join(' and ')}; treat the party-wall penetration as a firestopping action item before relying on the compartment boundary.`,
      `${formatCount(evidenceGapCount, 'boundary assumption')} returned an evidence gap; supplement the record with inspection evidence for unknown cavity-barrier, external-spread, and structural-stability assumptions.`,
      `D2 is unanswerable because ${blocked.missing_terms.join(' and ')} are missing; add assessment records linked to compliance outputs before reporting assessment results.`,
      'B2 and B4 return no rows; add regulatory requirement and compliance finding records before presenting REI comparison or finding traceability as an ontology-backed judgment.',
    ],
    advisoryTitle: 'Advisory Notes',
    advisoryNotes: [
      {
        finding: 'Observed party-wall penetration',
        riskMechanism:
          'The demo records a compromised compartmentation assumption for both risk units, supported by the observed unsealed pipe penetration through the party wall. If the service opening is not sealed to the wall resistance, fire and smoke can bypass the separating construction.',
        remedialMeasure:
          'Inspect the penetration, identify the pipe/service type and aperture size, and install a tested proprietary fire-stopping system or an ADB-compatible pipe penetration treatment that maintains the fire resistance of the separating element. Capture before/after photographs and product/test evidence.',
        priority:
          'Priority 1: arrange firestopping verification and remedial works before relying on the Unit A / Unit B boundary as intact compartmentation.',
      },
      {
        finding: 'Unknown boundary and roof-access evidence',
        riskMechanism:
          'The CQ output carries evidence gaps for unknown cavity-barrier, external-spread, and structural-stability assumptions. The memo also states that roof access was not obtained, so the roof/external-spread evidence remains incomplete rather than verified.',
        remedialMeasure:
          'Schedule a follow-up inspection with roof access and targeted checks to collect photographs, notes, and document references for the unknown assumptions. Keep each evidence item linked to the specific boundary assumption it supports.',
        priority:
          'Priority 2: resolve missing evidence after the party-wall penetration is controlled, then update Unknown assumptions only where the new evidence supports a clear state.',
      },
      {
        finding: 'Missing regulatory and assessment records',
        riskMechanism:
          'The demo has no regulatory requirement records, no compliance assessments, and no produced findings, so REI comparison and assessment-result questions cannot produce ontology-backed compliance conclusions.',
        remedialMeasure:
          'Select the applicable regulatory basis, add requirement records for the relevant separating elements, and record compliance assessments that produce findings. Where using England guidance, reference the current GOV.UK Approved Document B route and any accepted project-specific fire-engineered alternative.',
        priority:
          'Priority 3: complete the regulatory and assessment layer after field evidence is updated, so later reports can separate evidence gaps from formal compliance findings.',
      },
    ],
  };
}

export async function buildContent(root = DATA_ROOT) {
  const extractedSurvey = await readJson(root, 'memo/extracted_survey.json');
  const memoReadiness = await readJson(root, 'memo/readiness_report.json');
  const memoCqResults = await readJson(root, 'memo/cq_results.json');
  const ifcReadiness = await readJson(root, 'ifc/frozen_fixture/readiness_report.json');
  const ifcGate = await readJson(root, 'ifc/frozen_fixture/gate_report.json');
  const queryDefs = parseQueries(await readFile(path.join(root, 'all_queries.sparql'), 'utf8'));

  return {
    home: {
      overview:
        'FiCR is a fire-compartmentation-and-risk ontology for AEC/FM digital-twin records. It models building elements, compartment and risk-unit boundaries, fire-resistance evidence, boundary assumptions, regulatory requirements, compliance findings, and inspection workflow records for researchers and practitioners who need traceable fire-safety assessment data.',
    },
    ontology: {
      iri: 'https://w3id.org/ficr/',
      widoco: 'https://raingo111.github.io/FiCR-ontology/',
    },
    skill: {
      lanes: ['Text memo or survey notes', 'FiCR ABox TTL', 'IFC via IFCtoFiCR'],
      gates: ['survey schema', 'vocabulary whitelist', 'TBox fingerprint', 'RDF parse', 'FiCR term closure'],
      sampleReport: buildSampleReport(queryDefs, memoCqResults, memoReadiness, extractedSurvey),
      memo: {
        extractedSurvey: pickSurveyExcerpt(extractedSurvey),
        readiness: memoReadiness.summary,
        ...queryStatusLists(memoReadiness),
      },
      ifc: {
        fixture: 'data/ifc/frozen_fixture',
        readiness: ifcReadiness.summary,
        ...queryStatusLists(ifcReadiness),
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
