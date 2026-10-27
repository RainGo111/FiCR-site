import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseQueries } from './build-data.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const queries = await readJson('src/generated/queries.json');
const content = await readJson('src/generated/content.json');
const results = await readJson('public/research/results.json');
const contracts = await readJson('public/research/binding_contract.json');
const verification = await readJson('public/research/verification.json');
const raw = await readFile(path.join(root, 'public/research/all_queries.rq'), 'utf8');
const parsed = parseQueries(raw);
assert.equal(queries.length, 22);
assert.deepEqual(queries.map(q => q.id), Object.keys(contracts));
assert.deepEqual(parsed.map(q => q.text), queries.map(q => q.text));
assert.equal(new Set(queries.map(q => q.id)).size, 22);
assert.ok(queries.every(q => q.title && q.description && q.text.startsWith('PREFIX ') && !q.text.includes('BEGIN QUERY')));
assert.deepEqual([...new Set(queries.map(q => q.group))], ['A','B','C','D','E']);
let frames = 0, rows = 0;
for (const sid of ['S1','S2','S3']) {
  assert.deepEqual(Object.keys(results[sid]), queries.map(q => q.id));
  for (const query of queries) {
    const result = results[sid][query.id];
    assert.equal(result.passed, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.actual_count, result.rows.length);
    assert.equal(result.actual_count, result.expected_count);
    for (const row of result.rows) {
      assert.deepEqual(Object.keys(row), contracts[query.id].columns);
      for (const [column, term] of Object.entries(row)) {
        const contract = contracts[query.id].bindings[column];
        if (term === null) { assert.equal(contract.nullable_in_main, true); continue; }
        assert.equal(term.kind, contract.term_kind);
        if (term.kind === 'literal') { assert.equal(term.datatype, contract.datatype); assert.equal(term.language, contract.language); }
      }
    }
    frames++; rows += result.rows.length;
  }
  assert.ok(Object.values(verification.reproducibility[sid]).every(Boolean));
}
assert.equal(frames, 66); assert.equal(rows, 1313);
assert.deepEqual(verification.summary, {passed:true,scenarios:3,queries_per_scenario:22,query_frames:frames,typed_rows:rows,reproducible:true});
assert.equal(content.research.revision, 'B1');
assert.equal(content.research.assessedDate, '2025-03-17');
assert.deepEqual(Object.values(content.research.priorities).map(list => [...list].sort((a,b)=>a.unit.localeCompare(b.unit)).map(r=>Number(r.priorityScore))), [[4,5],[8,7],[0,3]]);
assert.deepEqual(['devices','checks','passedChecks','deficientChecks','unresolvedChecks','devicesWithDeficiency'].map(k=>Number(content.research.equipment[k])), [8,20,17,3,0,3]);
assert.deepEqual([content.skill.memo.informationAvailability.available,content.skill.memo.informationAvailability.unavailable], [15,3]);
assert.deepEqual(content.skill.memo.priorityScores.map(r=>r.score), [7,7]);
assert.deepEqual([content.skill.ifc.informationAvailability.available,content.skill.ifc.informationAvailability.unavailable], [6,12]);
assert.match(content.skill.sampleReport.markdown, /Information availability.*15 of 18 available/);
const required = ['all_queries.rq','inspection_records.xlsx','inspection_records.pdf','results.json','verification.json','binding_contract.json', ...['S1','S2','S3'].flatMap(s=>[`graphs/${s}_asserted.ttl`,`graphs/${s}_materialised.ttl`,`provenance/${s}.json`])];
for (const file of required) {
  assert.ok((await stat(path.join(root,'dist/research',file))).size > 0, `Missing download ${file}`);
  assert.deepEqual(await readFile(path.join(root,'dist/research',file)), await readFile(path.join(root,'public/research',file)));
}
const assets = await readdir(path.join(root,'dist/assets'));
const js = (await Promise.all(assets.filter(n=>n.endsWith('.js')).map(n=>readFile(path.join(root,'dist/assets',n),'utf8')))).join('\n');
for (const marker of ['Fire safety records','Case study','Competency queries','FiCR Assistant Skill','Research outlook','Run public query','UNBOUND']) assert.ok(js.includes(marker), `Missing page marker: ${marker}`);
for (const marker of ['D:\\CodingProjects','fire-compartmentation-and-risk ontology','live competency-query interface']) assert.equal(js.includes(marker),false);

function canonicalTerm(term) {
  if (!term) return null;
  const kind=term.kind ?? (term.type==='uri'?'IRI':term.type==='bnode'?'blank':'literal');
  if (kind==='IRI') return [kind,term.value];
  const language=term.language ?? term['xml:lang'] ?? null;
  const datatype=term.datatype ?? (language?'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString':'http://www.w3.org/2001/XMLSchema#string');
  let value=term.value;
  if (datatype.endsWith('#integer')) value=BigInt(value).toString();
  if (datatype.endsWith('#decimal')) value=String(Number(value));
  if (datatype.endsWith('#boolean')) value=(value==='true'||value==='1')?'true':'false';
  return [kind,value,datatype,language];
}
function signatures(list,columns,ordered=false) {
  const values=list.map(row=>JSON.stringify(columns.map(c=>canonicalTerm(row[c]))));
  return ordered?values:values.sort();
}
if (process.argv.includes('--live')) {
  for (const query of queries) {
    const response=await fetch('https://api.triplydb.com/datasets/Raincheung111/FiCRquery/sparql', {method:'POST',headers:{'Content-Type':'application/sparql-query',Accept:'application/sparql-results+json'},body:query.text,signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,`${query.id}: HTTP ${response.status}`);
    assert.equal(response.headers.get('access-control-allow-origin'),'*');
    const data=await response.json();
    const columns=contracts[query.id].columns;
    assert.deepEqual(data.head.vars,columns,`${query.id}: projected columns differ`);
    assert.deepEqual(signatures(data.results.bindings,columns,query.id==='C4'),signatures(results.S1[query.id].rows,columns,query.id==='C4'),`${query.id}: public dataset differs from verified S1`);
    console.log(`LIVE ${query.id}: ${data.results.bindings.length} rows match S1`);
  }
}
console.log(`SITE_VERIFY_OK queries=22 scenarios=3 frames=${frames} typed_rows=${rows} downloads=${required.length} skill=unchanged live=${process.argv.includes('--live')}`);
