/**
 * Medication Calculator — generic dose engine.
 *
 * Consumes typed `calc` specs from MedsData (see meds-data.js) and computes
 * a per-weight result. Replaces the per-medication functions previously
 * hand-coded in DoseCalculator.
 *
 * Public surface:
 *   MedCalculator.compute(med, weightLb) → {
 *     value,          // raw computed value (number, string for tablet
 *                     // fractions, or [min, max] for outputRange),
 *                     // or Constants.MESSAGES.OUT_OF_RANGE.
 *     displayValue,   // formatted string for direct display in /calc/
 *     isOutOfRange,   // bool
 *     warning         // string | null (passed through from med definition)
 *   }
 */

const MedCalculator = (() => {
    const KG_PER_LB = 0.45359237;
    const OUT_OF_RANGE = (typeof Constants !== 'undefined' && Constants.MESSAGES)
        ? Constants.MESSAGES.OUT_OF_RANGE
        : 'Out of range';

    function roundDownTo(value, step) {
        return Math.floor(value / step) * step;
    }

    function format2(n) {
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function formatMl(n)  { return `${format2(n)} mL`; }
    function formatMg(n)  { return `${format2(n)} mg`; }
    function formatTab(v) { return `${v} tab`; }

    function computeLinear(spec, weightLb) {
        const weightKg = weightLb * KG_PER_LB;

        // mlPerLb path (most common)
        if (typeof spec.mlPerLb === 'number') {
            let raw = weightLb * spec.mlPerLb;
            if (spec.roundDown) {
                raw = roundDownTo(raw, 0.01);
            }
            if (typeof spec.min === 'number' && raw < spec.min) {
                raw = spec.min;
            }
            return { kind: 'mL', value: raw };
        }

        // mg path: result is mg, optionally converted to mL via concentration.
        if (typeof spec.mgPerKg === 'number') {
            const mg = weightKg * spec.mgPerKg;
            if (typeof spec.concMgPerMl === 'number') {
                return { kind: 'mL', value: mg / spec.concMgPerMl };
            }
            return { kind: 'mg', value: mg };
        }

        throw new Error(`Unsupported linear spec: ${JSON.stringify(spec)}`);
    }

    function computeWeightTable(spec, weightLb) {
        const rows = spec.rows;
        if (!rows || rows.length === 0) {
            return { isOutOfRange: true, value: OUT_OF_RANGE };
        }

        // Below the first row's lower bound → out of range.
        if (weightLb < rows[0].minLb) {
            return { isOutOfRange: true, value: OUT_OF_RANGE };
        }

        // Find the row with the largest minLb that is ≤ weight.
        let match = null;
        for (const row of rows) {
            if (weightLb >= row.minLb) match = row;
            else break;
        }
        if (!match) {
            return { isOutOfRange: true, value: OUT_OF_RANGE };
        }

        // Verify against this row's upper bound.
        const withinUpper = match.maxInclusive
            ? weightLb <= match.maxLb
            : weightLb <  match.maxLb;
        if (!withinUpper) {
            return { isOutOfRange: true, value: OUT_OF_RANGE };
        }

        return { value: match.value };
    }

    function computeOutputRange(spec, weightLb) {
        const min = weightLb * spec.mlPerLbMin;
        const max = weightLb * spec.mlPerLbMax;
        return { value: [min, max] };
    }

    function formatDisplay(med, computed) {
        if (computed.isOutOfRange) return OUT_OF_RANGE;

        const v = computed.value;

        if (med.calc.type === 'outputRange') {
            const [lo, hi] = v;
            return `${format2(lo)}–${format2(hi)} mL`;
        }

        if (med.unit === 'mL') {
            // For linear paths, computeLinear returns { kind, value }; for
            // weightTable, value is the raw mL number.
            const num = (computed.kind === undefined) ? v : v;
            return formatMl(num);
        }
        if (med.unit === 'mg') return formatMg(v);
        if (med.unit === 'tablet') return formatTab(v);

        return String(v);
    }

    function compute(med, weightLb) {
        if (!med || typeof weightLb !== 'number' || !isFinite(weightLb)) {
            return {
                value: OUT_OF_RANGE,
                displayValue: '',
                isOutOfRange: true,
                warning: med ? (med.warning || null) : null
            };
        }

        let result;
        switch (med.calc.type) {
            case 'linear': {
                const r = computeLinear(med.calc, weightLb);
                // r.kind tracks whether linear produced mL or mg, which the
                // formatter uses to pick the right unit suffix when the med's
                // declared unit doesn't already disambiguate.
                result = { value: r.value, kind: r.kind };
                break;
            }
            case 'weightTable':
                result = computeWeightTable(med.calc, weightLb);
                break;
            case 'outputRange':
                result = computeOutputRange(med.calc, weightLb);
                break;
            default:
                throw new Error(`Unknown calc type: ${med.calc.type}`);
        }

        const isOOR = result.isOutOfRange === true;
        const value = isOOR ? OUT_OF_RANGE : result.value;
        const displayValue = (weightLb <= 0)
            ? ''
            : formatDisplay(med, { ...result, isOutOfRange: isOOR, value });

        return {
            value,
            displayValue,
            isOutOfRange: isOOR,
            warning: med.warning || null
        };
    }

    return Object.freeze({ compute });
})();

window.MedCalculator = MedCalculator;
