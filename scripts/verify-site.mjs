import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import queries from '../src/generated/queries.json' with { type: 'json' };
import content from '../src/generated/content.json' with { type: 'json' };

const endpoint = 'https://api.triplydb.com/datasets/Raincheung111/FiCRquery/sparql';
const siteRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(siteRoot, 'dist');

async function fileExists(filePath) {
  return (await stat(filePath)).isFile();
}

async function main() {
  assert.equal(await fileExists(path.join(distRoot, 'index.html')), true);
  const assets = await readdir(path.join(distRoot, 'assets'));
  const jsAsset = assets.find((name) => name.endsWith('.js'));
  assert.ok(jsAsset);
  const js = await readFile(path.join(distRoot, 'assets', jsAsset), 'utf8');
  for (const marker of ['FiCR', 'Ontology', 'Competency Queries', 'FiCR Assistant Skill', 'Roadmap']) {
    assert.ok(js.includes(marker), `bundle missing ${marker}`);
  }
  for (const marker of ['module-nav', 'Storey Inventory', 'pipeline-narrative', 'flow-stage', 'input-lanes-row', 'planned-lane', 'sample-report', 'report-markdown', 'Advisory Notes', 'Near-term', 'Vision']) {
    assert.ok(js.includes(marker), `bundle missing site marker ${marker}`);
  }
  assert.equal(js.includes('Inference:'), false);
  assert.equal(/<section class="card featured">\s*<h2>Current<\/h2>/.test(js), false);
  const forbiddenMarkers = [
    ['FiCR', 'Assistant'].join('_'),
    ['_', 'staging'].join(''),
    ['tests', 'session_artifacts'].join('/'),
    ['D:', 'CodingProjects'].join('\\'),
    ['skill', 'ficr-abox-builder'].join('/'),
  ];
  for (const marker of forbiddenMarkers) {
    assert.equal(js.includes(marker), false, `bundle includes external marker ${marker}`);
  }

  assert.equal(queries.length, 18);
  assert.equal(queries.find((item) => item.id === 'A2')?.title, 'Storey Inventory');
  assert.equal(queries.find((item) => item.id === 'B2')?.title, 'Element Rei Detail');
  assert.equal(content.home.overview.includes('LLM proposes'), false);
  assert.equal(queries.find((item) => item.id === 'A1')?.text.includes('SELECT ?buildingType ?purposeGroup'), true);
  assert.equal(queries.find((item) => item.id === 'B3')?.text.includes('hasPhysicalObjectFireSafetyRole'), true);
  assert.equal(queries.find((item) => item.id === 'B3')?.text.includes('GROUP BY'), false);
  assert.equal(content.skill.memo.informationAvailability.available, 15);
  assert.equal(content.skill.memo.informationAvailability.unavailable, 3);
  assert.deepEqual(content.skill.memo.priorityScores.map((item) => item.score), [7, 7]);
  assert.match(content.skill.sampleReport.markdown, /# FiCR Assistant . Session Report/);
  assert.match(content.skill.sampleReport.markdown, /Information availability.*15 of 18 available/);
  assert.match(content.skill.sampleReport.markdown, /FiCR controlled vocabulary/);
  assert.equal((content.skill.sampleReport.markdown.match(/^### \[P/gm) ?? []).length, 5);
  assert.match(content.skill.sampleReport.markdown, /BS EN 1366-3/);
  assert.equal(content.skill.ifc.informationAvailability.available, 6);
  assert.equal(content.skill.ifc.informationAvailability.unavailable, 12);
  assert.deepEqual(
    content.skill.ifc.unavailableQueries.find((query) => query.queryId === 'B3')?.missingTerms,
    ['hasPhysicalObjectFireSafetyRole'],
  );
  assert.equal(content.roadmap.nearTerm.length > 0, true);

  for (const id of ['A1', 'B2', 'B3', 'C1', 'D1']) {
    const query = queries.find((item) => item.id === id);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        Accept: 'application/sparql-results+json',
      },
      body: query.text,
    });
    assert.equal(response.ok, true, `${id} HTTP ${response.status}`);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const json = await response.json();
    const rows = json.results?.bindings?.length ?? 0;
    assert.ok(rows > 0, `${id} returned no rows`);
    if (id === 'A1') {
      assert.deepEqual(json.head.vars, ['buildingType', 'purposeGroup', 'storeys', 'spaces']);
      assert.deepEqual(
        json.results.bindings[0],
        {
          buildingType: { type: 'uri', value: 'https://w3id.org/ficr#MultiStoreyBuilding' },
          purposeGroup: { type: 'uri', value: 'https://w3id.org/ficr#PurposeGroup1b' },
          storeys: { datatype: 'http://www.w3.org/2001/XMLSchema#integer', type: 'literal', value: '4' },
          spaces: { datatype: 'http://www.w3.org/2001/XMLSchema#integer', type: 'literal', value: '21' },
        },
      );
    }
    if (id === 'B3') assert.equal(rows, 4);
    console.log(`${id} rows=${rows} vars=${json.head.vars.join(',')}`);
  }

  console.log('SITE_VERIFY_OK pages=5 queries=18 memo=15/18 priorities=7/7 ifc=6/18 B3=unavailable-for-roles');
}

await main();
