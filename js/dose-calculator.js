/**
 * Dose Calculator Module - All medication dose calculations
 * Handles dose calculations for all medications based on weight
 */

class DoseCalculator {
    
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
        return 'Out of range';
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
        return 'Out of range';
    }

    /**
     * Calculate all doses for a kitten based on weight
     * @param {number} weightLb - Weight in pounds
     * @returns {object} Object containing all calculated doses
     */
    static calculateAllDoses(weightLb) {
        return {
            panacur: this.calculatePanacurDose(weightLb),
            ponazuril: this.calculatePonazurilDose(weightLb),
            revolution: this.calculateRevolutionDose(weightLb),
            advantage: this.calculateAdvantageIIDose(weightLb),
            drontal: this.calculateDrontalDose(weightLb)
        };
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
                drontal: doses.drontal
            }
        };
    }

    /**
     * Check if a dose value is valid (not out of range)
     * @param {*} dose - Dose value to check
     * @returns {boolean} True if dose is valid, false if out of range
     */
    static isDoseValid(dose) {
        return dose !== 'Out of range' && dose !== null && dose !== undefined;
    }
}

// Export to global namespace
window.DoseCalculator = DoseCalculator;