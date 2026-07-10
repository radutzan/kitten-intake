/**
 * Dose Calculator Module - Per-medication dose calculations.
 *
 * Public API is unchanged. Each per-med method now delegates to
 * MedCalculator against the MedsData catalog (the single source of truth).
 * Caching behavior is preserved.
 *
 * Quirk preserved for backwards compatibility: calculateAdvantageIIDose
 * returns 0 (not OUT_OF_RANGE) when the engine reports out-of-range —
 * the previous implementation returned 0 for negative weights. In
 * practice weight is always positive so this never triggers, but
 * Stage 1b is meant to be behaviour-preserving.
 */

class DoseCalculator {
    static doseCache = new Map();
    static MAX_CACHE_SIZE = 50;

    static clearCache() {
        this.doseCache.clear();
    }

    static _value(medId, weightLb) {
        return MedCalculator.compute(MedsData.byId(medId), weightLb).value;
    }

    static calculatePanacurDose(weightLb)    { return this._value('panacur',    weightLb); }
    static calculatePonazurilDose(weightLb)  { return this._value('ponazuril',  weightLb); }
    static calculatePyrantelDose(weightLb)   { return this._value('pyrantel',   weightLb); }
    static calculateRevolutionDose(weightLb) { return this._value('revolution', weightLb); }
    static calculateDrontalDose(weightLb)    { return this._value('drontal',    weightLb); }
    static calculateDroncitDose(weightLb)    { return this._value('droncit',    weightLb); }
    static calculateNexgardDose(weightLb)    { return this._value('nexgard-combo', weightLb); }
    static calculateCapstarDose(weightLb)    { return this._value('capstar',    weightLb); }

    static calculateAdvantageIIDose(weightLb) {
        const result = MedCalculator.compute(MedsData.byId('advantage-ii'), weightLb);
        return result.isOutOfRange ? 0 : result.value;
    }

    /**
     * Calculate all doses for a kitten based on weight
     * Uses memoization to avoid redundant calculations
     * @param {number} weightLb - Weight in pounds
     * @returns {object} Object containing all calculated doses
     */
    static calculateAllDoses(weightLb) {
        const cacheKey = Math.round(weightLb * 100) / 100;

        if (this.doseCache.has(cacheKey)) {
            return this.doseCache.get(cacheKey);
        }

        const doses = {
            panacur:    this.calculatePanacurDose(weightLb),
            ponazuril:  this.calculatePonazurilDose(weightLb),
            revolution: this.calculateRevolutionDose(weightLb),
            advantage:  this.calculateAdvantageIIDose(weightLb),
            drontal:    this.calculateDrontalDose(weightLb),
            droncit:    this.calculateDroncitDose(weightLb),
            nexgard:    this.calculateNexgardDose(weightLb),
            capstar:    this.calculateCapstarDose(weightLb),
            pyrantel:   this.calculatePyrantelDose(weightLb)
        };

        if (this.doseCache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.doseCache.keys().next().value;
            this.doseCache.delete(oldestKey);
        }

        this.doseCache.set(cacheKey, doses);
        return doses;
    }

    /**
     * Add calculated doses to a kitten object
     * @param {object} kitten - Kitten object with weightLb property
     * @returns {object} Kitten object with doses property added
     */
    static addDosesToKitten(kitten) {
        const doses = this.calculateAllDoses(kitten.weightLb);

        let topicalDose = 0;
        if (kitten.topical === 'revolution') {
            topicalDose = doses.revolution;
        } else if (kitten.topical === 'advantage') {
            topicalDose = doses.advantage;
        }

        return {
            ...kitten,
            doses: {
                panacur: doses.panacur,
                ponazuril: doses.ponazuril,
                topical: topicalDose,
                // Resolved to the selected dewormer form: tablets for Drontal,
                // mL for Droncit (the default)
                drontal: kitten.drontalType === 'drontal' ? doses.drontal : doses.droncit,
                nexgard: doses.nexgard,
                capstar: doses.capstar,
                pyrantel: doses.pyrantel
            }
        };
    }

    /**
     * Check if a dose value is valid (not out of range)
     * @param {*} dose - Dose value to check
     * @returns {boolean} True if dose is valid, false if out of range
     */
    static isDoseValid(dose) {
        return dose !== Constants.MESSAGES.OUT_OF_RANGE && dose !== null && dose !== undefined;
    }
}

// Export to global namespace
window.DoseCalculator = DoseCalculator;
