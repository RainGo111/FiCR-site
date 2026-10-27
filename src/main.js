import queries from './generated/queries.json';
import content from './generated/content.json';
import './styles.css';
import './research.css';

const SPARQL_ENDPOINT = 'https://api.triplydb.com/datasets/Raincheung111/FiCR-Query-S1/sparql';
const app = document.querySelector('#app');
const modules = [
  ['A', 'Building inventory'], ['B', 'REI compliance'], ['C', 'Risk-unit boundaries'],
  ['D', 'Assessment workflow'], ['E', 'Equipment inspection'],
];
const scenarios = {
  S1: {title: 'Baseline evidence', description: 'A mixed record of supported judgements and unresolved boundary conditions.', links: 4},
  S2: {title: 'Reduced documentary support', description: 'Selected boundary documents are unavailable. Observed cavity-barrier evidence and equipment records remain.', links: 1},
  S3: {title: 'Additional evidence', description: 'Further support resolves unknowns and confirms both effective and compromised conditions.', links: 8},
};
let resultPromise;
let liveController;
let queryVersion = 0;

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function nav(active) {
  const pages = [['home','Overview'],['ontology','Ontology'],['study','Case study'],['queries','Queries'],['skill','Skill'],['roadmap','Outlook']];
  return `<a class="skip-link" href="#main-content">Skip to content</a><header class="site-header">
    <a class="brand" href="#/" aria-label="FiCR home"><span class="brand-mark" aria-hidden="true">F</span>FiCR<span class="brand-caption">Fire Compliance &amp; Risk Analysis</span></a>
    <nav aria-label="Main navigation">${pages.map(([key,label])=>`<a href="#/${key==='home'?'':key}" ${active===key?'class="active" aria-current="page"':''}>${label}</a>`).join('')}</nav>
  </header>`;
}
function sectionLabel(label) { return `<div class="section-label"><span></span><strong>${escapeHtml(label)}</strong><span></span></div>`; }
function footer() {
  return `<footer class="site-footer"><div><strong>FiCR</strong><span>Fire Compliance and Risk Analysis Ontology</span></div><div><a href="https://w3id.org/ficr/" target="_blank" rel="noreferrer">Ontology reference ↗</a><a href="https://github.com/RainGo111/FiCR-site" target="_blank" rel="noreferrer">Repository ↗</a></div></footer>`;
}
function page(title,active,body,eyebrow=active) {
  return `${nav(active)}<main id="main-content" tabindex="-1" class="research-page${active==='skill'?' skill-page':''}">${sectionLabel(eyebrow)}<h1>${title}</h1>${body}</main>${footer()}`;
}
function compactList(items) { return `<ul>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`; }
function sectionHeading(index,title,note='') {
  return `<div class="section-heading"><span class="index-label">${index}</span><div><h2>${title}</h2>${note?`<p>${note}</p>`:''}</div></div>`;
}
function renderHome() {
  app.innerHTML = `${nav('home')}<main id="main-content" tabindex="-1" class="research-page home-page">
    <div class="home-intro"><p class="eyebrow">Buildings, spaces and fire safety</p><h1>Fire compliance checking<br><em>&amp; risk analysis.</em></h1><p class="lede">${escapeHtml(content.home.overview)}</p></div>
    <section class="resource-grid" aria-label="Explore FiCR"><a href="#/ontology"><span class="index-label">ONTOLOGY</span><h2>Explore the vocabulary</h2><p>Building elements, fire-safety roles, findings and evidence.</p><span aria-hidden="true">↗</span></a><a href="#/study"><span class="index-label">CASE STUDY</span><h2>Follow the evidence</h2><p>One building, three information scenarios and traceable assessment records.</p><span aria-hidden="true">↗</span></a><a href="#/queries"><span class="index-label">QUERY EXPLORER</span><h2>Inspect the results</h2><p>22 competency queries with verified results and public query access.</p><span aria-hidden="true">↗</span></a></section>
  </main>${footer()}`;
}
function renderOntology() {
  app.innerHTML=page('A common vocabulary<br>for fire-safety records.','ontology',`
    <p class="lede">FiCR represents physical objects, functional roles, performance requirements, assessment findings and their supporting evidence. It provides a semantic basis for compliance assessment, fire-risk analysis and inspection in existing buildings.</p>
    <div class="actions"><a class="action primary" href="${content.ontology.iri}" target="_blank" rel="noreferrer">Open ontology documentation ↗</a><a class="text-link" href="/ontology-diagram.png" target="_blank" rel="noreferrer">View full-size diagram</a></div>
    <figure class="media-figure ontology-diagram"><img src="/ontology-diagram.png" alt="FiCR classes and relations connecting physical objects, roles, requirements, findings, evidence and workflows" width="10460" height="5715" loading="lazy"></figure>
    <div class="concept-grid">${[['Physical context','Buildings, spaces, elements and fire-protection equipment retain their source identities.'],['Function and performance','A physical element can carry a fire-safety role and be assessed against a stated requirement.'],['Evidence and findings','Observations, compliance findings and risk-related records preserve their supporting sources.'],['Assessment workflow','Events, tasks and assessments connect the work performed with the results recorded.']].map(([t,d])=>`<article><h2>${t}</h2><p>${d}</p></article>`).join('')}</div>
    <section class="note-panel"><h2>What is inferred?</h2><p>OWL classifies objects and relationships. Application code evaluates service deadlines and inspection outcomes. SPARQL retrieves and aggregates the resulting records. These responsibilities remain separate in the case study.</p></section>`, 'Ontology / semantic model');
}
function priorityRows(sid) {
  return [...content.research.priorities[sid]].sort((a,b)=>a.unit.localeCompare(b.unit));
}
function renderStudy() {
  app.innerHTML=page('A controlled study<br>of evidence and assessment.','study',`
    <p class="lede">Duplex A combines an IFC-derived building graph with an independent inspection workbook. Three information configurations share the same building, REI checks, equipment records and assessed date: <strong>17 March 2025</strong>.</p>
    <div class="study-meta"><span>Revision ${content.research.revision}</span><span>21 spaces</span><span>8 devices</span><span>Simulated inspection records</span></div>
    <section>${sectionHeading('01','Three information scenarios','Each scenario contains eight boundary records. S2 removes only selected documentary support; S3 adds support that can confirm compromised conditions.')}
    <div class="scenario-grid">${Object.entries(scenarios).map(([id,s])=>`<article class="scenario-card"><span class="scenario-id">${id}</span><h3>${s.title}</h3><p>${s.description}</p><div class="scenario-measure"><strong>${s.links}/8</strong><span>Boundary records with evidence</span></div><a class="text-link" href="#/queries?scenario=${id}&query=C3">Inspect boundary records ↗</a></article>`).join('')}</div></section>
    <section>${sectionHeading('02','How evidence changes information priority','P = U + C + G. U counts unknown conditions, C compromised conditions, and G unknown conditions without an evidence link. G is a subset of U.')}
    <div class="table-scroll" tabindex="0" role="region" aria-label="Scenario priority comparison"><table class="priority-table"><caption>Unit-level priority from query C4</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Unit</th><th scope="col">Unknown / U</th><th scope="col">Compromised / C</th><th scope="col">Evidence gap / G</th><th scope="col">Priority / P</th></tr></thead><tbody>${Object.keys(scenarios).flatMap(sid=>priorityRows(sid).map(r=>`<tr><th scope="row">${sid}</th><td>Unit ${r.unit.split('_').at(-1)}</td><td>${r.unknownCount}</td><td>${r.compromisedCount}</td><td>${r.evidenceGapCount}</td><td><span class="priority-value">${r.priorityScore}</span><span class="priority-bar" style="--score:${Number(r.priorityScore)/8}" aria-hidden="true"></span></td></tr>`)).join('')}</tbody></table></div><p class="figure-note">This is an illustrative information-priority score, not a calibrated fire-risk probability. The scenarios are controlled configurations on one date, not three inspection visits.</p></section>
    <section>${sectionHeading('03','Two distinct assessment views','Equipment inspection and element fire-resistance comparison use separate denominators.')}
      <div class="result-pair"><article><p class="eyebrow">Equipment inspection · E3</p><h3>20 selected checks</h3><div class="result-counts"><span><strong>17</strong>Passed</span><span><strong>3</strong>Deficient</span><span><strong>0</strong>Unresolved</span></div><p>Eight devices include normal, overdue-only, damage-only and alarm function-test cases. Three distinct devices have a deficiency. An obstructed door is recorded separately.</p><a class="text-link" href="#/queries?query=E1">View equipment detail ↗</a></article><article><p class="eyebrow">REI compliance · B1</p><h3>44 selected element checks</h3><div class="result-counts"><span><strong>28</strong>Compliant</span><span><strong>15</strong>Noncompliant</span><span><strong>1</strong>Undetermined</span></div><p>Assessed fire resistance is compared with authored requirements. A missing actual REI remains unbound; equipment findings do not enter this denominator.</p><a class="text-link" href="#/queries?query=B4">Trace requirements and findings ↗</a></article></div>
    </section>
    <section>${sectionHeading('04','Inspect the records','The workbook is the editable observation source. Its PDF is a review copy. Query results preserve full IRIs, datatypes and unbound values.')}
    <div class="download-list">${[['Inspection workbook','XLSX','inspection_records.xlsx'],['Inspection review copy','PDF','inspection_records.pdf'],['Canonical query bundle','RQ','all_queries.rq'],['All scenario results','JSON','results.json'],['Build verification','JSON','verification.json']].map(([name,type,file])=>`<a href="/research/${file}" download><span>${name}</span><span>${type} ↓</span></a>`).join('')}</div>
    <details class="graph-downloads"><summary>Scenario graphs and provenance</summary><div class="download-list">${Object.keys(scenarios).flatMap(sid=>[['Asserted graph',`graphs/${sid}_asserted.ttl`],['Materialised graph',`graphs/${sid}_materialised.ttl`],['Added-triple provenance',`provenance/${sid}.json`]].map(([name,file])=>`<a href="/research/${file}" download><span>${sid} · ${name}</span><span>↓</span></a>`)).join('')}</div></details></section>
    <aside class="note-panel"><h2>Scope of the evidence</h2><p>The study verifies a deterministic implementation against specification-derived reference answers: 66 query runs and 1,313 typed result rows, with reproducible graphs and provenance. Inspections and evidence are simulated. The results do not establish field validity, current regulatory applicability or a calibrated risk model.</p></aside>`, 'Case study / Duplex A');
}
async function loadResults() {
  if (!resultPromise) resultPromise=Promise.all(['results.json','binding_contract.json'].map(async file=>{
    const response=await fetch(`/research/${file}`);
    if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
    return response.json();
  })).catch(error=>{resultPromise=undefined;throw error;});
  return resultPromise;
}
function compactTerm(value) {
  for (const [prefix,namespace] of [['ficr:','https://w3id.org/ficr#'],['inst:','https://lbd.example.com/'],['outcome:','urn:ficr:inspection-outcome:'],['criterion:','urn:ficr:inspection-policy:']]) {
    if (value.startsWith(namespace)) return prefix+value.slice(namespace.length);
  }
  return value;
}
function renderResultTable(columns,rows,caption) {
  if (!rows.length) return `<p class="empty-state">No matching records. For C5, this means no boundary consistency issues were detected.</p>`;
  return `<div class="table-scroll query-table" role="region" aria-label="Query result table" tabindex="0"><table><caption>${escapeHtml(caption)}</caption><thead><tr>${columns.map(c=>`<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>{
    const term=row[column];
    if (!term) return '<td><span class="unbound">UNBOUND</span></td>';
    const detail=[term.value,term.datatype,term.language].filter(Boolean).join('\n');
    return `<td><span title="${escapeHtml(detail)}" class="${term.kind==='IRI'?'iri-cell':''}">${escapeHtml(term.kind==='IRI'?compactTerm(term.value):term.value)}</span></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function publicRow(row,columns) {
  return Object.fromEntries(columns.map(column=>{const t=row[column];return [column,!t?null:t.type==='uri'?{kind:'IRI',value:t.value}:{kind:t.type==='bnode'?'blank':'literal',value:t.value,datatype:t.datatype??null,language:t['xml:lang']??null}];}));
}
async function showQuery(id,sid) {
  const version=++queryVersion;
  liveController?.abort();
  const query=queries.find(q=>q.id===id);
  const panel=document.querySelector('#query-panel');
  history.replaceState(null,'',`#/queries?query=${id}&scenario=${sid}`);
  document.querySelectorAll('[data-query]').forEach(button=>{
    button.classList.toggle('selected',button.dataset.query===id);
    button.setAttribute('aria-pressed',String(button.dataset.query===id));
  });
  panel.innerHTML=`<div class="query-detail-heading"><span class="query-tag">${id}</span><div><h2>${query.title}</h2><p>${query.description}</p></div></div>
    <div class="query-context"><span>${sid} · ${scenarios[sid].title}</span><span>Assessed ${content.research.assessedDate}</span></div>
    <details class="query-source"><summary>SPARQL source</summary><pre><code>${escapeHtml(query.text)}</code></pre><button type="button" class="action secondary" id="copy-query">Copy query</button><span id="copy-status" role="status"></span></details>
    <div class="result-heading"><h3>Verified result</h3><span class="result-badge" id="row-count">Loading</span></div><p class="figure-note">Saved results from the materialised ${sid} graph, compared field by field with the reference answers. Full terms and datatypes are retained in the JSON download.</p>
    <div id="saved-result" aria-live="polite"><p class="muted">Loading result records…</p></div>
    <div class="query-actions"><button class="action secondary" type="button" id="download-result" disabled>Download result JSON</button><button class="action primary" type="button" id="run-live" ${sid!=='S1'?'disabled':''}>Run public query ↗</button></div>
    <p class="figure-note">Public execution uses <a href="https://triplydb.com/Raincheung111/FiCR-Query-S1/sparql" target="_blank" rel="noreferrer">FiCR-Query-S1 on TriplyDB</a>. S2 and S3 are available as verified results and downloadable graphs.</p><div id="live-result" aria-live="polite"></div>`;
  panel.querySelector('#copy-query').addEventListener('click',async()=>{
    try { await navigator.clipboard.writeText(query.text);panel.querySelector('#copy-status').textContent='Copied.'; }
    catch { panel.querySelector('#copy-status').textContent='Copy unavailable. Select the query text above.'; }
  });
  panel.querySelector('#run-live').addEventListener('click',async event=>{
    const button=event.currentTarget, result=panel.querySelector('#live-result');
    button.disabled=true;button.textContent='Running…';
    result.innerHTML='<p class="muted">Querying the public dataset…</p>';
    liveController=new AbortController();
    const timeout=setTimeout(()=>liveController?.abort(),30000);
    try {
      const response=await fetch(SPARQL_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/sparql-query',Accept:'application/sparql-results+json'},body:query.text,signal:liveController.signal});
      if (!response.ok) throw new Error(`Public endpoint returned ${response.status}`);
      const data=await response.json();
      if (version!==queryVersion) return;
      if (!Array.isArray(data.head?.vars)||!Array.isArray(data.results?.bindings)) throw new Error('The endpoint returned an unexpected result format');
      result.innerHTML=`<div class="result-heading"><h3>Public dataset result</h3><span class="result-badge">${data.results.bindings.length} rows</span></div>${renderResultTable(data.head.vars,data.results.bindings.map(r=>publicRow(r,data.head.vars)),'Live TriplyDB result')}`;
    } catch(error) {
      if (version===queryVersion) result.innerHTML=`<p class="error">${escapeHtml(error.name==='AbortError'?'The public query timed out. Try again.':error.message)} The verified result above remains available.</p>`;
    } finally {clearTimeout(timeout);if(version===queryVersion){button.disabled=false;button.textContent='Run public query ↗';}}
  });
  try {
    const [results,contracts]=await loadResults();
    if(version!==queryVersion)return;
    const result=results[sid][id];
    panel.querySelector('#saved-result').innerHTML=renderResultTable(contracts[id].columns,result.rows,`${sid} · ${id} · Verified result`);
    panel.querySelector('#row-count').textContent=`${result.actual_count} ${result.actual_count===1?'row':'rows'} · Verified`;
    const download=panel.querySelector('#download-result');download.disabled=false;
    download.addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify({scenario:sid,query:id,columns:contracts[id].columns,...result},null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`FiCR_${sid}_${id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  } catch(error) {
    if(version===queryVersion){panel.querySelector('#saved-result').innerHTML=`<p class="error">${escapeHtml(error.message)}. Reload this page to retry.</p>`;panel.querySelector('#row-count').textContent='Unavailable';}
  }
}
function renderQueries(params) {
  let sid=scenarios[params.get('scenario')]?params.get('scenario'):'S1';
  let id=queries.some(q=>q.id===params.get('query'))?params.get('query'):'A1';
  app.innerHTML=page('Competency queries.','queries',`
    <p class="lede">Explore building inventory, compliance, boundary evidence, workflow and equipment inspection. Choose a scenario to inspect its verified results, or run a query against the public baseline dataset.</p>
    <div class="query-toolbar"><label for="scenario-select">Information scenario<select id="scenario-select">${Object.entries(scenarios).map(([key,s])=>`<option value="${key}" ${key===sid?'selected':''}>${key} · ${s.title}</option>`).join('')}</select></label><label for="query-search">Find a query<input id="query-search" type="search" placeholder="ID, topic or record type"></label><a class="text-link" href="/research/all_queries.rq" download>Download all 22 queries ↓</a></div>
    <div class="query-layout"><aside class="query-browser" aria-label="Query selection">${modules.map(([letter,title])=>`<div class="query-module"><h2>${letter} / ${title}</h2>${queries.filter(q=>q.group===letter).map(q=>`<button type="button" data-query="${q.id}" aria-pressed="false"><span>${q.id}</span>${q.title}</button>`).join('')}</div>`).join('')}<p id="no-query-match" hidden>No queries match your search.</p></aside><section id="query-panel" aria-label="Selected query"></section></div>`, 'Query explorer / 22 queries');
  document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{id=button.dataset.query;showQuery(id,sid);}));
  document.querySelector('#scenario-select').addEventListener('change',event=>{sid=event.target.value;showQuery(id,sid);});
  document.querySelector('#query-search').addEventListener('input',event=>{
    const term=event.target.value.toLowerCase().trim();let matches=0;
    document.querySelectorAll('[data-query]').forEach(button=>{
      const q=queries.find(q=>q.id===button.dataset.query);button.hidden=!`${q.id} ${q.title} ${q.description}`.toLowerCase().includes(term);if(!button.hidden)matches++;
    });
    document.querySelectorAll('.query-module').forEach(group=>{group.hidden=![...group.querySelectorAll('button')].some(button=>!button.hidden);});
    document.querySelector('#no-query-match').hidden=matches>0;
  });
  showQuery(id,sid);
}

function renderLaneCard(lane) {
  return `
    <li class="${lane.planned ? 'planned-lane' : ''}">
      <strong>${escapeHtml(lane.title)}</strong>
      <span>${escapeHtml(lane.summary)}</span>
      <details>
        <summary>IN -> OUT</summary>
        <p class="contract">${escapeHtml(lane.contract)}</p>
      </details>
      ${lane.planned ? '<a href="#/roadmap">Planned roadmap branch</a>' : ''}
    </li>
  `;
}

function renderFlowStage(stage, index) {
  return `
    <article class="flow-stage">
      <span class="stage-index">${String(index + 1).padStart(2, '0')}</span>
      <h2>${escapeHtml(stage.title)}</h2>
      <p>${escapeHtml(stage.summary)}</p>
    </article>
  `;
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderReportMarkdown(markdown) {
  const lines = markdown.trim().split(/\r?\n/);
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      index += 1;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line === '---') {
      html.push('<hr>');
      index += 1;
      continue;
    }
    if (line.startsWith('|') && /^\|\s*:?-{3,}/.test(lines[index + 1] ?? '')) {
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].startsWith('|')) rows.push(tableCells(lines[index++]));
      html.push(`<div class="report-table"><table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*-\s+/, ''));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith('```') && !/^(#{1,3})\s+/.test(lines[index]) && lines[index] !== '---' && !lines[index].startsWith('|') && !/^\s*-\s+/.test(lines[index])) {
      paragraph.push(lines[index++]);
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
  }
  return html.join('');
}

function renderSkill() {
  const report = content.skill.sampleReport;
  const lanes = [
    {
      title: 'Text',
      summary: 'Inspection notes or memo prose are normalised into the survey contract.',
      contract: 'Inspection text -> survey JSON',
    },
    {
      title: 'TTL',
      summary: 'Existing FiCR ABox data can enter as graph material directly.',
      contract: 'FiCR ABox TTL -> validated graph',
    },
    {
      title: 'IFC',
      summary: 'Building model data is translated through the external converter.',
      contract: '.ifc -> identity-layer TTL',
    },
    {
      title: 'Point cloud, RGBD, drawings',
      summary: 'Future input lanes should feed the same JSON or TTL contracts.',
      contract: 'Planned source -> same contracts',
      planned: true,
    },
  ];
  const stages = [
    {
      title: 'Input',
      summary: 'Source material enters through a typed lane and converges on the same contracts.',
    },
    {
      title: 'Gates',
      summary: 'Deterministic checks reject data that does not fit the ontology contract.',
    },
    {
      title: 'Queries',
      summary: 'Ontology-backed questions turn graph facts into structured observations.',
    },
    {
      title: 'Report',
      summary: 'Results become a human-readable report with advisory notes kept separate.',
    },
  ];
  app.innerHTML = page(
    'FiCR Assistant Skill',
    'skill',
    `
      <section class="pipeline-narrative featured-panel">
        <p class="framing">LLM proposes, ontology disposes.</p>
        <p class="lede">The skill aligns heterogeneous building evidence into a FiCR ABox and reports on what the ontology-backed graph can support. The language model drafts structured observations and human-readable wording; validation, term closure, ontology queries, and gap checks decide what is accepted.</p>
        <ul class="rationale-list">
          <li>It accepts text, FiCR TTL, and IFC-derived graph input without treating them as equivalent evidence.</li>
          <li>It preserves source uncertainty, evidence gaps, and missing assessment records instead of smoothing them into narrative certainty.</li>
          <li>It can produce a reader-facing report while keeping advisory suggestions separate from verified ontology output.</li>
        </ul>
      </section>

      <section class="pipeline-lanes">
        ${sectionLabel('linear pipeline')}
        <div class="pipeline-flow">
          ${stages.map(renderFlowStage).join('')}
        </div>
        <div class="input-lanes-row">
          <h2>Input lanes</h2>
          <ul class="lane-stack">
            ${lanes.map(renderLaneCard).join('')}
          </ul>
        </div>
      </section>

      <section class="sample-report">
        ${sectionLabel('sample report')}
        <article class="report-shell">
          <header>
            <p class="muted">${escapeHtml(report.source)}</p>
            <h2>Duplex A survey-to-report output</h2>
          </header>
          <div class="report-markdown">${renderReportMarkdown(report.markdown)}</div>
        </article>
      </section>
    `,
    'skill overview',
  );
}

function renderRoadmap() {
  app.innerHTML=page('Research outlook.','roadmap',`
    <p class="lede">The current case establishes a reproducible connection between building records, evidence and assessment results. Further work concerns validation across buildings, evidence sources and inspection settings.</p>
    <div class="outlook-list">${[['01','Current implementation',content.roadmap.current],['02','Next research questions',content.roadmap.nearTerm],['03','Longer-term directions',content.roadmap.vision]].map(([n,t,items])=>`<section><span class="index-label">${n}</span><h2>${t}</h2>${compactList(items)}</section>`).join('')}</div>
    <p class="figure-note">Future directions are research objectives, not implemented capabilities.</p>`, 'Outlook / research scope');
}
function render() {
  liveController?.abort();queryVersion++;
  const [path,search='']=location.hash.replace(/^#\/?/,'').split('?');
  const route=['ontology','study','queries','skill','roadmap'].includes(path)?path:'home';
  document.body.dataset.page=route;
  if(route==='ontology')renderOntology();
  else if(route==='study')renderStudy();
  else if(route==='queries')renderQueries(new URLSearchParams(search));
  else if(route==='skill')renderSkill();
  else if(route==='roadmap')renderRoadmap();
  else renderHome();
  document.title=route==='home'?'FiCR | Fire Compliance and Risk Analysis':`FiCR | ${{ontology:'Ontology',study:'Case study',queries:'Competency queries',skill:'Assistant Skill',roadmap:'Research outlook'}[route]}`;
  window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('main')?.focus({preventScroll:true});
  document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('main').focus();});
}
window.addEventListener('hashchange',render);
render();
