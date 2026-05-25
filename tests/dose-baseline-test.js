/**
 * Hardcoded baseline of DoseCalculator outputs as they were before the
 * Stage 1b refactor. These values were captured by running the previous
 * (independent) implementation and freezing the results here.
 *
 * If this test fails, either:
 *   - the engine drifted (likely a bug), or
 *   - a baseline value is genuinely out of date (update with care after
 *     verifying the change is intentional).
 *
 * Run: node tests/dose-baseline-test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
    'js/constants.js',
    'js/meds-data.js',
    'js/med-calculator.js',
    'js/dose-calculator.js',
];

const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const rel of files) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}
const { Constants, DoseCalculator } = sandbox.window;
const OOR = Constants.MESSAGES.OUT_OF_RANGE;

const baseline = [
    // [method, weightLb, expected]
    ['calculatePanacurDose',     1,    0.2],
    ['calculatePanacurDose',     2.5,  0.5],
    ['calculatePanacurDose',     5,    1.0],
    ['calculatePonazurilDose',   1,    0.23],
    ['calculatePonazurilDose',   2.5,  0.575],
    ['calculatePonazurilDose',   5,    1.15],
    ['calculatePyrantelDose',    1,    0.1],
    ['calculatePyrantelDose',    5,    0.5],

    ['calculateRevolutionDose',  0.5,  OOR],
    ['calculateRevolutionDose',  1.1,  0.05],
    ['calculateRevolutionDose',  2.1,  0.05],
    ['calculateRevolutionDose',  2.2,  0.1],
    ['calculateRevolutionDose',  4.4,  0.2],
    ['calculateRevolutionDose',  9,    0.45],
    ['calculateRevolutionDose',  19.9, 0.45],
    ['calculateRevolutionDose',  20,   OOR],

    ['calculateAdvantageIIDose', 0.5,  0.05],
    ['calculateAdvantageIIDose', 1,    0.05],
    ['calculateAdvantageIIDose', 2,    0.23],
    ['calculateAdvantageIIDose', 5,    0.4],
    ['calculateAdvantageIIDose', 9,    0.8],
    ['calculateAdvantageIIDose', 100,  0.8],

    ['calculateDrontalDose',     1.5,  '¼'],
    ['calculateDrontalDose',     2,    '½'],
    ['calculateDrontalDose',     4,    '1'],
    ['calculateDrontalDose',     9,    '1½'],
    ['calculateDrontalDose',     16,   '2'],
    ['calculateDrontalDose',     17,   OOR],
    ['calculateDrontalDose',     1,    OOR],

    ['calculateCapstarDose',     2,    '1'],
    ['calculateCapstarDose',     25,   '1'],
    ['calculateCapstarDose',     1,    OOR],
    ['calculateCapstarDose',     26,   OOR],
];

let pass = 0, fail = 0;
const failures = [];
for (const [method, weight, expected] of baseline) {
    const actual = DoseCalculator[method](weight);
    const ok = (typeof expected === 'number')
        ? Math.abs(actual - expected) < 1e-9
        : actual === expected;
    if (ok) pass++;
    else { fail++; failures.push({ method, weight, expected, actual }); }
}

console.log(`${pass} passing, ${fail} failing (baseline)`);
if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
        console.log(`  ${f.method}(${f.weight}) — expected ${f.expected}, got ${f.actual}`);
    }
    process.exit(1);
}
