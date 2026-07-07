import queries from './generated/queries.json';
import content from './generated/content.json';
import './styles.css';

const SPARQL_ENDPOINT = 'https://api.triplydb.com/datasets/Raincheung111/FiCRquery/sparql';

const app = document.querySelector('#app');

const queryModules = [
  ['A', 'Inventory', 'Building, storey, space, element, and protection inventory.'],
  ['B', 'REI compliance', 'Fire-resistance comparison and inferred classifications; this module uses materialised ontology inference.'],
  ['C', 'Risk-unit boundaries', 'Risk units, boundary assumptions, evidence, and confidence.'],
  ['D', 'Workflow', 'Inspection, task, assessment, and finding workflow records.'],
];

function nav(active) {
  const pages = [
    ['home', 'Home'],
    ['ontology', 'Ontology'],
    ['queries', 'Queries'],
    ['skill', 'Skill'],
    ['roadmap', 'Roadmap'],
  ];
  return `
    <header class="site-header">
      <a class="brand" href="#/">FiCR</a>
      <nav>
        ${pages.map(([key, label]) => `<a href="#/${key === 'home' ? '' : key}" class="${active === key ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
    </header>
  `;
}

function sectionLabel(label) {
  return `<div class="section-label"><span></span><strong>${escapeHtml(label)}</strong><span></span></div>`;
}

function page(title, active, body, eyebrow = active) {
  return `${nav(active)}<main>${sectionLabel(eyebrow)}<h1>${title}</h1>${body}</main>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function compactList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderHome() {
  app.innerHTML = page(
    'FiCR',
    'home',
    `
      <p class="lede">${escapeHtml(content.home.overview)}</p>
      <div class="card-grid">
        <a class="card link-card" href="#/ontology"><span>Ontology</span><small>Core terms and published documentation.</small></a>
        <a class="card link-card" href="#/queries"><span>Queries</span><small>Ask structured questions against FiCR data.</small></a>
        <a class="card link-card" href="#/skill"><span>Skill</span><small>Turn source material into reportable graph evidence.</small></a>
        <a class="card link-card" href="#/roadmap"><span>Roadmap</span><small>Current scope and planned extensions.</small></a>
      </div>
    `,
    'overview',
  );
}

function renderOntology() {
  app.innerHTML = page(
    'Ontology',
    'ontology',
    `
      <p class="lede">The FiCR TBox defines the core vocabulary for fire-compartmentation and risk records: building elements, risk units, evidence, boundary assumptions, regulatory requirements, compliance findings, and workflow entities. The canonical identifier resolves to the current WIDOCO documentation.</p>
      <figure class="media-figure ontology-diagram">
        <img src="/ontology-diagram.png" alt="FiCR ontology structure diagram" width="4095" height="3895" loading="lazy">
      </figure>
      <p><a class="primary-link" href="${content.ontology.iri}" target="_blank" rel="noreferrer">FiCR ontology documentation: ${content.ontology.iri}</a></p>
    `,
    'tbox',
  );
}

function renderResultTable(result) {
  const vars = result?.head?.vars ?? [];
  const bindings = result?.results?.bindings ?? [];
  if (!vars.length || !bindings.length) {
    return '<p class="muted">The query returned no rows.</p>';
  }
  return `
    <table>
      <thead><tr>${vars.map((name) => `<th>${escapeHtml(name)}</th>`).join('')}</tr></thead>
      <tbody>
        ${bindings
          .map(
            (row) =>
              `<tr>${vars
                .map((name) => {
                  const cell = row[name];
                  return `<td>${escapeHtml(cell?.value ?? '')}</td>`;
                })
                .join('')}</tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function runQuery(queryId) {
  const query = queries.find((item) => item.id === queryId);
  const resultEl = document.querySelector(`[data-result="${queryId}"]`);
  resultEl.innerHTML = '<p class="muted">Running query...</p>';
  try {
    const response = await fetch(SPARQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        Accept: 'application/sparql-results+json',
      },
      body: query.text,
    });
    if (!response.ok) {
      throw new Error(`SPARQL endpoint returned ${response.status}`);
    }
    resultEl.innerHTML = renderResultTable(await response.json());
  } catch (error) {
    resultEl.innerHTML = `<p class="error">Query failed: ${escapeHtml(error.message)}</p>`;
  }
}

function groupedQueries() {
  return queryModules.map(([letter, title, description]) => ({
    letter,
    title,
    description,
    queries: queries.filter((query) => query.group === letter),
  }));
}

function renderModuleNav() {
  return `
    <aside class="module-nav" aria-label="Query module navigation">
      ${queryModules
        .map(
          ([letter, title, description]) => `
            <button type="button" class="module-anchor" data-scroll-group="${letter}">
              <strong>${letter}</strong>
              <span>${escapeHtml(title)}</span>
              <small>${escapeHtml(description)}</small>
            </button>
          `,
        )
        .join('')}
    </aside>
  `;
}

function renderQueryCard(query) {
  return `
    <article class="query-card">
      <div class="query-heading">
        <div>
          <span class="query-id">${escapeHtml(query.id)}</span>
          <h3>${escapeHtml(query.title)}</h3>
        </div>
      </div>
      <p>${escapeHtml(query.description)}</p>
      <details>
        <summary>Query text</summary>
        <pre>${escapeHtml(query.text)}</pre>
      </details>
      <button class="primary-button" type="button" data-run="${escapeHtml(query.id)}">Run</button>
      <div class="result" data-result="${escapeHtml(query.id)}"></div>
    </article>
  `;
}

function renderQueries() {
  app.innerHTML = page(
    'Competency Queries',
    'queries',
    `
      <p class="lede">The competency queries are bundled from the local showcase data at build time. Run sends the selected query text directly to the TriplyDB SPARQL endpoint from the browser.</p>
      ${renderModuleNav()}
      <div class="query-groups">
        ${groupedQueries()
          .map(
            (group) => `
              <section class="query-group" id="group-${group.letter}">
                ${sectionLabel(`module ${group.letter}`)}
                <div class="group-heading">
                  <h2>${escapeHtml(group.title)}</h2>
                  <p>${escapeHtml(group.description)}</p>
                </div>
                <div class="query-list">${group.queries.map(renderQueryCard).join('')}</div>
              </section>
            `,
          )
          .join('')}
      </div>
    `,
    'query suite',
  );
  document.querySelectorAll('[data-run]').forEach((button) => {
    button.addEventListener('click', () => runQuery(button.dataset.run));
  });
  document.querySelectorAll('[data-scroll-group]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(`#group-${button.dataset.scrollGroup}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
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

function renderReportGroup(label, lines) {
  return `
    <section class="report-group">
      <h3>${escapeHtml(label)}</h3>
      <ol>
        ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ol>
    </section>
  `;
}

function renderAdvisoryNote(note) {
  return `
    <article class="advisory-card">
      <h3>${escapeHtml(note.finding)}</h3>
      <dl>
        <dt>Risk mechanism</dt>
        <dd>${escapeHtml(note.riskMechanism)}</dd>
        <dt>Remedial measure</dt>
        <dd>${escapeHtml(note.remedialMeasure)}</dd>
        <dt>Priority / sequence</dt>
        <dd>${escapeHtml(note.priority)}</dd>
      </dl>
    </article>
  `;
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
    'ficr-abox-builder Skill',
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
            <h2>${escapeHtml(report.title)}</h2>
          </header>
          <section class="report-part">
            <h2>Part 1. CQ Results Summary</h2>
            <div class="report-modules">
              ${renderReportGroup('A. Inventory', report.cqSummary.A)}
              ${renderReportGroup('B. REI compliance via inference', report.cqSummary.B)}
              ${renderReportGroup('C. Risk-unit boundaries', report.cqSummary.C)}
              ${renderReportGroup('D. Workflow', report.cqSummary.D)}
            </div>
          </section>
          <section class="report-part">
            <h2>Part 2. Findings to Actions</h2>
            <ol class="action-list">
              ${report.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
            </ol>
          </section>
          <section class="report-part advisory-notes">
            <h2>Part 3. Advisory Notes</h2>
            <div class="advisory-grid">
              ${report.advisoryNotes.map(renderAdvisoryNote).join('')}
            </div>
          </section>
        </article>
      </section>
    `,
    'skill overview',
  );
}

function renderRoadmap() {
  app.innerHTML = page(
    'Roadmap',
    'roadmap',
    `
      <figure class="media-figure roadmap-image">
        <img src="/roadmap-image.png" alt="FiCR roadmap atmospheric overview" width="3630" height="1026" loading="lazy">
      </figure>
      <div class="roadmap-tiers">
        <section class="card">
          <h2>Current</h2>
          ${compactList(content.roadmap.current.map((item) => `Implemented: ${item}`))}
        </section>
        <section class="card">
          <h2>Near-term</h2>
          ${compactList(content.roadmap.nearTerm.map((item) => `Planned: ${item}`))}
        </section>
        <section class="card">
          <h2>Vision</h2>
          ${compactList(content.roadmap.vision.map((item) => `Planned: ${item}`))}
        </section>
      </div>
    `,
    'scope',
  );
}

function render() {
  const route = location.hash.replace(/^#\/?/, '') || 'home';
  if (route === 'ontology') renderOntology();
  else if (route === 'queries') renderQueries();
  else if (route === 'skill') renderSkill();
  else if (route === 'roadmap') renderRoadmap();
  else renderHome();
}

window.addEventListener('hashchange', render);
render();
