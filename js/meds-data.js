/**
 * Medications Catalog — single source of truth for dosage data.
 *
 * Source: meds.csv (rescue center reference) + Capstar (added).
 *
 * Each med has:
 *   id              — stable kebab-case key (used by state, URL, lookups)
 *   name            — display name
 *   concentration   — verbatim concentration string from the source
 *   calculationText — verbatim calculation column (multi-line preserved with \n)
 *   unit            — 'mL' | 'tablet' | 'mg'
 *   calc            — typed spec consumed by MedCalculator
 *   notes           — optional, shown subtly
 *   warning         — optional, surfaces a caution
 *
 * Calc spec shapes (all `type: 'linear' | 'weightTable' | 'outputRange'`):
 *
 *   { type: 'linear', mlPerLb, [min], [roundDown] }
 *   { type: 'linear', mgPerKg }                          // direct mg result
 *   { type: 'linear', mgPerKg, concMgPerMl }             // mg → mL via concentration
 *   { type: 'weightTable', rows: [{ minLb, maxLb, value }] }
 *     - rows sorted ascending by minLb; engine returns the row whose minLb
 *       is the largest one ≤ weight, provided weight ≤ that row's maxLb.
 *       maxLb may be Infinity for an unbounded last row.
 *   { type: 'outputRange', mlPerLbMin, mlPerLbMax }
 *
 * Weight-table rows for built-in meds (Revolution, Advantage II, Drontal,
 * Capstar) intentionally preserve the EXISTING DoseCalculator boundaries,
 * not necessarily the literal CSV ranges, so Stage 1b behavior is identical.
 * The CSV's surface ranges show in `calculationText` for /calc/ readability.
 */

const MedsData = (() => {
    const meds = [
        {
            id: 'ponazuril',
            name: 'Ponazuril',
            concentration: '100 mg/mL',
            calculationText: '23 mg/lb\n50 mg/kg',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.23 }
        },
        {
            id: 'panacur',
            name: 'Panacur',
            concentration: '100 mg/mL',
            calculationText: '20 mg/lb\n44 mg/kg',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.2 }
        },
        {
            id: 'pyrantel',
            name: 'Pyrantel',
            concentration: '50 mg/mL',
            calculationText: '5 mg/lb',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.1 }
        },
        {
            id: 'b12',
            name: 'B12',
            concentration: '',
            calculationText: '0.1 mL/lb (min of 0.1 mL)',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.1, min: 0.1 }
        },
        {
            id: 'penicillin-g-procaine',
            name: 'Penicillin G Procaine',
            concentration: '300,000 units/mL',
            calculationText: '30,000 units/kg',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.045 }
        },
        {
            id: 'sq-fluids',
            name: 'SQ Fluids',
            concentration: '',
            calculationText: '13–20 mL/kg\n5.9–9 mL/lb\n(1 mL per 50–75 g)',
            unit: 'mL',
            notes: 'Range depends on dehydration',
            calc: { type: 'outputRange', mlPerLbMin: 5.9, mlPerLbMax: 9 }
        },
        {
            id: 'metronidazole',
            name: 'Metronidazole (Ayradia)',
            concentration: '125 mg/mL',
            calculationText: '6 mg/lb',
            unit: 'mL',
            notes: 'Round down',
            calc: { type: 'linear', mlPerLb: 0.05, roundDown: true }
        },
        {
            id: 'clavamox',
            name: 'Clavamox',
            concentration: '62.5 mg/mL',
            calculationText: '6.25 mg/lb',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.1 }
        },
        {
            id: 'cerenia',
            name: 'Cerenia (Maropitant)',
            concentration: '16 mg tablets',
            calculationText: '1 mg/kg every 24h',
            unit: 'mg',
            notes: 'Can dissolve one 16mg tablet in 8mL water to create 1mg/0.5mL suspension.',
            warning: 'Use with caution in kittens under 11 weeks. Can cause bone marrow hypoplasia.',
            calc: { type: 'linear', mgPerKg: 1 }
        },
        {
            id: 'ondansetron-tablets',
            name: 'Ondansetron (Tablets)',
            concentration: '4 mg tablets',
            calculationText: '0.5 mg/kg every 8h',
            unit: 'mg',
            calc: { type: 'linear', mgPerKg: 0.5 }
        },
        {
            id: 'ondansetron-injectable',
            name: 'Ondansetron (Injectable)',
            concentration: '2 mg/mL',
            calculationText: '0.5 mg/kg every 8h',
            unit: 'mL',
            calc: { type: 'linear', mgPerKg: 0.5, concMgPerMl: 2 }
        },
        {
            id: 'azithromycin',
            name: 'Azithromycin',
            concentration: '200 mg/5 mL',
            calculationText: '4 mg/lb',
            unit: 'mL',
            calc: { type: 'linear', mlPerLb: 0.1 }
        },
        {
            id: 'drontal',
            name: 'Drontal',
            concentration: 'Praziquantel 18.2 mg + Pyrantel Pamoate 72.6 mg per tablet',
            calculationText: '1.5–1.9 lb: ¼ tab\n2–3.9 lb: ½ tab\n4–8.9 lb: 1 tab\n9–12.9 lb: 1½ tabs\n13–16 lb: 2 tabs',
            unit: 'tablet',
            calc: {
                type: 'weightTable',
                rows: [
                    { minLb: 1.5, maxLb: 2,    value: '¼' },
                    { minLb: 2,   maxLb: 4,    value: '½' },
                    { minLb: 4,   maxLb: 9,    value: '1' },
                    { minLb: 9,   maxLb: 13,   value: '1½' },
                    { minLb: 13,  maxLb: 16,   value: '2', maxInclusive: true }
                ]
            }
        },
        {
            id: 'droncit',
            name: 'Injectable Droncit',
            concentration: '56.8 mg/mL',
            calculationText: '<5 lb: 0.2 mL\n5–11 lb: 0.4 mL\n>11 lb: 0.6 mL',
            unit: 'mL',
            calc: {
                type: 'weightTable',
                rows: [
                    { minLb: 0, maxLb: 5,  value: 0.2 },
                    { minLb: 5, maxLb: 11,  value: 0.4 },
                    { minLb: 11, maxLb: 20, value: 0.6, maxInclusive: true }
                ]
            }
        },
        {
            id: 'revolution',
            name: 'Revolution',
            concentration: '',
            calculationText: '1.1–2.1 lbs: 0.05 mL\n2.2–4.4 lbs: 0.1 mL\n4.5–8.9 lbs: 0.2 mL\n9.0–19.9 lbs: 0.45 mL',
            unit: 'mL',
            calc: {
                type: 'weightTable',
                rows: [
                    { minLb: 1.1, maxLb: 2.2,  value: 0.05 },
                    { minLb: 2.2, maxLb: 4.4,  value: 0.1 },
                    { minLb: 4.4, maxLb: 9,    value: 0.2 },
                    { minLb: 9,   maxLb: 19.9, value: 0.45, maxInclusive: true }
                ]
            }
        },
        {
            id: 'advantage-ii',
            name: 'Advantage II',
            concentration: '',
            calculationText: '0–1.9 lbs: 0.05 mL\n2–4.9 lbs: 0.23 mL\n5–9 lbs: 0.4 mL\n>9 lbs: 0.8 mL',
            unit: 'mL',
            calc: {
                type: 'weightTable',
                rows: [
                    { minLb: 0, maxLb: 2,        value: 0.05 },
                    { minLb: 2, maxLb: 5,        value: 0.23 },
                    { minLb: 5, maxLb: 9,        value: 0.4 },
                    { minLb: 9, maxLb: Infinity, value: 0.8, maxInclusive: true }
                ]
            }
        },
        {
            id: 'capstar',
            name: 'Capstar',
            concentration: '',
            calculationText: '1 tablet for cats 2–25 lb',
            unit: 'tablet',
            calc: {
                type: 'weightTable',
                rows: [
                    { minLb: 2, maxLb: 25, value: '1', maxInclusive: true }
                ]
            }
        }
    ];

    const byId = new Map(meds.map(m => [m.id, m]));

    return Object.freeze({
        all: () => meds,
        byId: (id) => byId.get(id) || null
    });
})();

window.MedsData = MedsData;
