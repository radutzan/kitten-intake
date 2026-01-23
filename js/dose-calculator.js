/**
 * Dose Calculator Module - All medication dose calculations
 * Handles dose calculations for all medications based on weight
 */

class DoseCalculator {
    // Memoization cache for calculateAllDoses
    static doseCache = new Map();
    static MAX_CACHE_SIZE = 50;

    /**
     * Clear the dose calculation cache
     * Call this if you need to force recalculation
     */
    static clearCache() {
        this.doseCache.clear();
    }

    static calculatePanacurDose(weightLb) {
        return weightLb * 0.2;
    }

    static calculatePonazurilDose(weightLb) {
        return weightLb * 0.23;
    }

    static calculateRevolutionDose(weightLb) {
        if (weightLb >= 1.1 && weightLb < 2.2) return 0.05;
        if (weightLb >= 2.2 && weightLb < 4.4) return 0.1;
        if (weightLb >= 4.4 && weightLb < 9) return 0.2;
        if (weightLb >= 9 && weightLb <= 19.9) return 0.45;
        return Constants.MESSAGES.OUT_OF_RANGE;
    }

    static calculateAdvantageIIDose(weightLb) {
        if (weightLb >= 0 && weightLb < 1) return 0.05;
        if (weightLb >= 1 && weightLb < 5) return 0.1;
        if (weightLb >= 5 && weightLb < 9) return 0.2;
        if (weightLb >= 9) return 0.45;
        return 0;
    }

    static calculateDrontalDose(weightLb) {
        if (weightLb >= 1.5 && weightLb < 2) return '¼';
        if (weightLb >= 2 && weightLb < 4) return '½';
        if (weightLb >= 4 && weightLb < 9) return '1';
        if (weightLb >= 9 && weightLb < 13) return '1½';
        if (weightLb >= 13 && weightLb <= 16) return '2';
        return Constants.MESSAGES.OUT_OF_RANGE;
    }

    static calculateCapstarDose(weightLb) {
        // Capstar (nitenpyram) - 1 tablet for cats 2-25 lbs
        if (weightLb >= 2 && weightLb <= 25) return '1';
        return Constants.MESSAGES.OUT_OF_RANGE;
    }

    /**
     * Calculate all doses for a kitten based on weight
     * Uses memoization to avoid redundant calculations
     * @param {number} weightLb - Weight in pounds
     * @returns {object} Object containing all calculated doses
     */
    static calculateAllDoses(weightLb) {
        // Round to 2 decimal places for cache key (avoids floating point issues)
        const cacheKey = Math.round(weightLb * 100) / 100;

        // Return cached result if available
        if (this.doseCache.has(cacheKey)) {
            return this.doseCache.get(cacheKey);
        }

        // Calculate fresh doses
        const doses = {
            panacur: this.calculatePanacurDose(weightLb),
            ponazuril: this.calculatePonazurilDose(weightLb),
            revolution: this.calculateRevolutionDose(weightLb),
            advantage: this.calculateAdvantageIIDose(weightLb),
            drontal: this.calculateDrontalDose(weightLb),
            capstar: this.calculateCapstarDose(weightLb)
        };

        // LRU-style eviction: remove oldest entry if cache is full
        if (this.doseCache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.doseCache.keys().next().value;
            this.doseCache.delete(oldestKey);
        }

        // Cache and return
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

        // Determine topical dose based on selected medication
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
                drontal: doses.drontal,
                capstar: doses.capstar
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