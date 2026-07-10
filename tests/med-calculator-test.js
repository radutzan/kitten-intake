/**
 * Node-runnable mirror of tests/med-calculator-test.html.
 *
 * Run: node tests/med-calculator-test.js
 *
 * Loads constants.js, dose-calculator.js, meds-data.js, med-calculator.js
 * with a minimal `window` shim, then asserts that MedCalculator.compute
 * produces the same raw value as DoseCalculator for every built-in med
 * across sample weights.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
    'js/constants.js',
    'js/dose-calculator.js',
    'js/meds-data.js',
    'js/med-calculator.js',
];

const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const rel of files) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
}

const { Constants, DoseCalculator, MedsData, MedCalculator } = sandbox.window;

const cases = [
    { medId: 'panacur',      method: 'calculatePanacurDose',     weights: [0.5, 1, 2, 4.4, 9, 16, 25] },
    { medId: 'ponazuril',    method: 'calculatePonazurilDose',   weights: [0.5, 1, 2, 4.4, 9, 16, 25] },
    { medId: 'pyrantel',     method: 'calculatePyrantelDose',    weights: [0.5, 1, 2, 4.4, 9, 16, 25] },
    { medId: 'revolution',   method: 'calculateRevolutionDose',  weights: [0.5, 1.0, 1.1, 1.5, 2.1, 2.2, 4.3, 4.4, 8.9, 9, 19.9, 20, 25] },
    { medId: 'advantage-ii', method: 'calculateAdvantageIIDose', weights: [0, 0.5, 0.99, 1, 4.99, 5, 8.99, 9, 100] },
    { medId: 'drontal',      method: 'calculateDrontalDose',     weights: [1, 1.49, 1.5, 1.99, 2, 3.99, 4, 8.99, 9, 12.99, 13, 16, 16.01, 17] },
    { medId: 'droncit',      method: 'calculateDroncitDose',     weights: [1, 1.49, 1.5, 4.99, 5, 10.99, 11, 20, 20.01] },
    { medId: 'nexgard-combo', method: 'calculateNexgardDose',    weights: [1, 1.79, 1.8, 5.5, 5.59, 5.6, 16.5, 16.51, 20] },
    { medId: 'capstar',      method: 'calculateCapstarDose',     weights: [1, 1.99, 2, 10, 25, 25.01, 30] },
];

function normalise(v) {
    if (v === Constants.MESSAGES.OUT_OF_RANGE) return 'OOR';
    if (typeof v === 'number') return Math.round(v * 1e9) / 1e9;
    return v;
}

let pass = 0, fail = 0;
const failures = [];

for (const { medId, method, weights } of cases) {
    const med = MedsData.byId(medId);
    if (!med) {
        console.error(`No med found for id "${medId}"`);
        process.exit(1);
    }
    for (const w of weights) {
        const expected = DoseCalculator[method](w);
        const actual = MedCalculator.compute(med, w).value;
        if (normalise(expected) === normalise(actual)) {
            pass++;
        } else {
            fail++;
            failures.push({ medId, w, expected, actual });
        }
    }
}

console.log(`${pass} passing, ${fail} failing`);
if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
        console.log(`  ${f.medId} @ ${f.w} lb — expected ${f.expected} (${typeof f.expected}), got ${f.actual} (${typeof f.actual})`);
    }
    process.exit(1);
}
