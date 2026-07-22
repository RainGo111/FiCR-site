# FiCR Assistant — Session Report (survey text lane)

**Input:** O&M walkthrough memo, two-unit residential duplex (rain-limited visit, no roof access, Unit B ground floor only)
**Route:** host-model extraction to survey-v1 JSON -> schema and vocabulary validation -> RDF generation -> CQ execution (asserted lane) -> readiness report
**Session artifacts:** `survey.json`, `abox.ttl`, `cq_results.json`, `readiness_report.json` (this directory). Case facts carry source tags; guidance content is attributed to its external source.

## 1. Deterministic checks

| Check | Status | Detail |
|---|:---:|---|
| Survey schema validation | VALID | after two extraction fixes (omitted unstated elevations, dropped null element references) |
| Vocabulary control | PASS | every term inside the derived FiCR whitelist |
| RDF generation | PASS | 171 triples |

## 2. Result overview

**Readiness** — 15 of 18 runnable:

```
A building & spaces   ●●●●●●   6/6 runnable
B compliance          ●●○●     3/4 ready (B3 blocked: no role assignments)
C condition & risk    ●●●●●●   6/6 runnable
D workflow            ○○       0/2 blocked (no event, task or assessment records)
```

The 14 asserted-lane queries executed; the three inference-marked B queries belong to the materialised assessment stage and are not part of this lane.

**Extracted structure** (survey layer): 1 building (`PurposeGroup1b`) · 3 storeys · 12 spaces · 3 elements · 2 risk units · 8 boundary assumptions · 2 evidence items.

**Space use** (A4) — Unit B rooms keep no usage claim (only door plates were seen):

```
HabitableRoom   5  █████
Bathroom        2  ██
EntranceHall    1  █
Kitchen         1  █
ServiceUsage    1  █
unclassified    2  (B101, B102)
```

**Boundary conditions** — risk units x aspects (C3):

| Risk unit | Compartmentation | Cavity barriers | External spread | Structural stability |
|---|:---:|:---:|:---:|:---:|
| Unit A | ✖ observed breach | ◌ gap | ◌ gap | ◌ gap |
| Unit B | ✖ observed breach | ◌ gap | ◌ gap | ◌ gap |

Legend: ✖ Compromised, observed evidence · ◌ Unknown, no supporting evidence. The shared party-wall penetration compromises the compartmentation aspect of both dwellings.

**Inspection priority** (C4):

```
Unit A  ███████  7   (3 unknown · 1 compromised · 3 gaps)
Unit B  ███████  7   (3 unknown · 1 compromised · 3 gaps)
```

Equal scores: the defect sits on the shared boundary and the access limits affected both units, so follow-up applies to the whole building.

**Integrity check** (C5): 0 rows — no contradiction between evidence status and recorded evidence.

## 3. CQ results

A1 1 · A2 3 · A3 12 · A4 5 · A5 3 · A6 1 · C1 2 · C2 4 · C3 8 · C4 2 · C5 0 · C6 0 · D1 0 · D2 0. Key values: the building is `PurposeGroup1b` with 3 storey records and 12 spaces (A1); the party wall carries the O&M-documented REI 60 (survey layer, EV-001); C6 returns no rows because no formal risk-analysis record exists yet.

## 4. Advisory Notes

### [P1] Firestop the party-wall pipe penetration

- **Finding:** an unsealed pipe penetration through the party wall above the kitchen area, Level 2, is recorded as observed evidence and compromises the compartmentation assumption of both dwellings.
- **Why it matters:** the party wall is the separating line between the two homes and its documented REI 60 is defeated at the penetration; fire and smoke can pass between units through the opening.
- **Do next:**
  - proceed with the contractor firestopping already agreed in the memo and treat it as the top action;
  - seal with a proprietary penetration system tested to BS EN 1366-3, matched to the pipe type and aperture, maintaining the wall's 60-minute performance;
  - capture before/after photographs and the product evidence, and link them to the two compartmentation assumptions.
- **Sources:** case facts C2, C3, C4, EV-002 · guidance: ADB Vol. 1 fire-stopping provisions; BS EN 1366-3 penetration seals.

### [P2] Obtain or commission fire-door evidence for the Unit B entrance door

- **Finding:** the door appears to be a fire door but no certificate was found on site or in the handover folder; its rating is recorded as null rather than assumed.
- **Why it matters:** an uncertified door on a dwelling entrance cannot be credited in any later compliance check, and dwelling entrance doors are a standard point of fire-safety failure.
- **Do next:**
  - search the O&M records for the doorset certificate;
  - failing that, commission an inspection by a competent fire-door inspector to establish the doorset's rating and condition.
- **Sources:** case facts survey element D-001 · guidance: fire doorset certification practice (third-party certification schemes); BS 8214 for timber doorset maintenance.

### [P2] Complete the interrupted survey scope

- **Finding:** six of eight boundary assumptions are Unknown with no supporting evidence, matching the memo's stated limits (no roof access, Unit B ground floor only, weather-shortened external check).
- **Why it matters:** unknowns without evidence keep both units at maximum priority and cannot be told apart from concealed defects.
- **Do next:**
  - schedule one follow-up visit with roof access and full Unit B access arranged in advance;
  - collect evidence per assumption (cavity barriers, external spread, structural stability for both units) and link each item to the assumption it supports;
  - obtain or reconstruct the Unit B room schedule so B101/B102 receive usage records.
- **Sources:** case facts C3, C4 · guidance: PAS 79-1:2020 evidence-based FRA practice.

### [P3] Verify detection coverage beyond the entrance hall

- **Finding:** one smoke detector is recorded in the Unit A entrance hall; other rooms were not checked during this walkthrough.
- **Why it matters:** a single confirmed detector does not establish a dwelling-wide detection grade, and Unit B has no detection record at all.
- **Do next:**
  - survey detection in both dwellings and record each device;
  - assess coverage against the dwelling detection standard and record the resulting grade/category.
- **Sources:** case facts A5, A6 · guidance: BS 5839-6 for detection in dwellings.

### [P3] Add the regulatory and workflow layers to unlock the remaining questions

- **Finding:** B3 is blocked (no role assignments), the inference-marked B queries await the materialised assessment stage, and D1/D2 are blocked (no event, task or assessment records).
- **Why it matters:** without requirement records and a recorded checking run, the documented REI 60 cannot become a compliance finding, and the agreed follow-up has no auditable workflow trail.
- **Do next:**
  - record the requirement basis for the party wall (insurer or statutory REI values for Purpose Group 1(b));
  - assign `FireSeparatingRole` to the party wall once its separating function is confirmed with the maintainer;
  - log the agreed firestopping follow-up as an event-task chain so the next assessment lands in the workflow record.
- **Sources:** case facts readiness B3, D1, D2 · guidance: RISCAuthority BDM02; ADB Vol. 1.

## 5. Interpretation

The memo's informal observations became a validated, queryable record in one pass: the extraction layer refused to invent what the memo did not state (null ratings, unclassified Unit B rooms, no workflow records), the deterministic layer turned the stated facts into eight boundary assumptions with evidence links, and the queries surfaced the shared party-wall breach as the driver of both units' priority. What is missing is exactly as visible as what is known, which is the property the interface is designed to preserve.
