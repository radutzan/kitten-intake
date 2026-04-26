# Meds Catalog & `/calc/` Sub-App — Design

Date: 2026-04-25
Status: Approved, Stage 1–2 to be implemented; Stage 3 deferred.

## Goal

Establish a single medication catalog as the source of truth for dosage calculations, build a spartan `/calc/` sub-app for quick lookups against any medication, and (later) let main-app users add catalog medications to a kitten's form.

## Source data

`/Users/radutzan/Downloads/meds.csv` — 15 medications. Capstar (currently hardcoded in the main app) is added to the catalog so it is complete.

## Architecture

```
js/meds-data.js       — catalog. Array of med objects with typed `calc` specs.
js/med-calculator.js  — generic engine: (med, weightLb) → { value, displayValue, isOutOfRange, warning }
js/dose-calculator.js — refactored to delegate to MedCalculator. Public API unchanged.
calc/index.html       — sub-app. Loads constants.js, meds-data.js, med-calculator.js.
calc/calc-app.js      — controller (~80 lines).
```

Layering keeps Stage 1 invisible (no behavior change), Stage 2 user-visible (new page), Stage 3 invasive (touches form, state, results, persistence, URL).

## Data model

```js
{
  id: 'ponazuril',
  name: 'Ponazuril',
  concentration: '100 mg/mL',
  calculationText: '23 mg/lb\n50 mg/kg',  // verbatim CSV
  unit: 'mL',                              // 'mL' | 'tablet' | 'unit'
  calc: { ... },                          // typed spec
  notes: 'Round down',                     // optional
  warning: 'Use with caution …',           // optional
}
```

Calc spec is one of:

```js
{ type: 'linear', mlPerLb: 0.23 }
{ type: 'linear', mlPerLb: 0.1, min: 0.1 }                  // B12
{ type: 'linear', mlPerLb: 0.05, roundDown: true }          // Metronidazole
{ type: 'linear', mgPerKg: 0.5, concMgPerMl: 2 }            // Ondansetron Inj.

{ type: 'weightTable', rows: [
  { minLb: 1.5, maxLb: 1.99, value: '¼' },
  ...
]}

{ type: 'outputRange', mlPerLbMin: 5.9, mlPerLbMax: 9 }      // SQ Fluids
```

Canonical computation unit is whatever's most useful (`mlPerLb` for most). The verbatim `calculationText` covers display of mg-level intermediates. We never compute in mg.

## `/calc/` sub-app

Self-contained page sharing `../styles.css`.

1. Header: title + "← Back".
2. Weight input (grams) with live lb conversion. Persisted via own localStorage key (`calc-weight`).
3. Table — five columns:

   | Medication | Concentration | Calculation | Dose | Notes |

   - Medication: name, plus warning icon/tooltip if present.
   - Concentration: verbatim.
   - Calculation: verbatim `calculationText` (multi-line preserved).
   - Dose: live result; empty when no weight; "Out of range" subtle for table misses; ranges shown as `5.9–9 mL`.
   - Notes: `notes` if present.

4. `input` event re-renders only the Dose column. No buttons, no modals.
5. Mobile: <600px collapses Concentration + Calculation under the med name; Dose stays prominent on the right.
6. **No footer needed** in `/calc/`.

## Main app integration (Stage 3, deferred)

- "+ Add medication" button below kitten med rows; reveals an inline picker of catalog meds not already on this kitten. Tap to add.
- Added rows are structurally identical to single-dose built-ins (status segments, dose value), with an "×" to remove. Default status: To do.
- Added meds with status ≠ Done flow into Foster Checklist and Dispense Summary like built-ins.
- State: `kitten.addedMeds: [{ medId, status }]`. Dose computed on render.
- localStorage `STORAGE.VERSION` bumps to `2.1`; migration adds empty `addedMeds`.
- URL state encodes `addedMeds` compactly. Med IDs must avoid `~` (the v2 separator).
- Cerenia warning surfaces under its row (informational, not blocking).

## Stages of development

### Stage 1 — Catalog + engine *(invisible)*
- `js/meds-data.js` with all 16 meds.
- `js/med-calculator.js` with `compute(med, weightLb)`.
- Test page asserting MedCalculator matches current DoseCalculator outputs at sample weights for all built-in meds.
- Commit: *Add meds catalog and generic dose engine*.

### Stage 1b — Refactor DoseCalculator to delegate *(invisible)*
- Each DoseCalculator method becomes a 1-line delegate to MedCalculator.
- Public API and cache behavior unchanged.
- Tests pass; spot-check main app.
- Commit: *Delegate DoseCalculator to MedCalculator*.

### Stage 2 — `/calc/` sub-app *(user-visible)*
- `calc/index.html`, `calc/calc-app.js`.
- Add "Dose Calculator" link to main app header menu (`#nav-menu-dropdown`).
- Add back link from `/calc/` to `/`.
- No footer in `/calc/`; `update-footer.js` need not touch it.
- Commit: *Add /calc/ dose lookup sub-app*.

→ Ship and use before starting Stage 3.

### Stage 3 — "Add medication" in main app *(deferred)*
Per Section 4 above. Worth its own design pass after using `/calc/` for a while.

## Risks

1. **CSV transcription errors.** Stage 1 test page guards regressions on existing built-in meds; new meds (Clavamox, Cerenia, Metronidazole, etc.) lack a reference. Spot-check a few against a known-good source before Stage 2 ships.
2. **`update-footer.js`.** Only modifies the main `index.html` footer; `/calc/` has no footer, so no change needed. Verify the script doesn't trip on the new `calc/index.html`.
3. **URL state for added meds (Stage 3).** Med IDs must not contain `~`.
