/**
 * Form Renderer Module - Handles all "state to DOM" rendering
 * Updates weight display, dose displays, status lights, and result sections
 * Extracted from FormManager to improve modularity
 */

class FormRenderer {
    /**
     * @param {AppState} appState - Reference to the app state
     * @param {DoseCalculator} doseCalculator - Reference to the dose calculator
     */
    constructor(appState, doseCalculator) {
        this.appState = appState;
        this.doseCalculator = doseCalculator;
    }

    /**
     * Update the weight display for a kitten (shows grams → pounds conversion)
     * @param {string} kittenId - The kitten ID
     */
    updateWeightDisplay(kittenId) {
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const display = document.getElementById(Constants.ID.weightDisplay(kittenId));

        if (!weightInput || !display) return;

        const grams = parseFloat(weightInput.value);
        if (grams > 0) {
            const pounds = AppState.convertToPounds(grams);
            display.textContent = `${AppState.formatNumber(grams)} g = ${AppState.formatNumber(pounds, 2)} lb`;
            display.style.display = 'block';
        } else {
            display.style.display = 'none';
        }
    }

    /**
     * Update the medication row visual state based on toggle
     * @param {string} kittenId - The kitten ID
     * @param {string} medType - The medication type
     */
    updateMedicationRowState(kittenId, medType) {
        const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, medType));
        const row = document.getElementById(Constants.ID.medRow(kittenId, medType));

        if (!toggleCheckbox || !row) return;

        if (toggleCheckbox.checked) {
            row.classList.remove(Constants.CSS.DISABLED);
        } else {
            row.classList.add(Constants.CSS.DISABLED);
        }
    }

    /**
     * Update status light color based on status selection
     * @param {string} kittenId - The kitten ID
     * @param {string} medType - The medication type
     */
    updateStatusLight(kittenId, medType) {
        const statusLight = document.getElementById(Constants.ID.medStatusLight(kittenId, medType));
        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, medType)}"]`);
        const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, medType));

        if (!statusLight) return;

        // Check if there's a valid weight
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = weightInput ? parseFloat(weightInput.value) : 0;

        // If no weight, hide the status light
        if (!grams || grams <= 0) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.HIDDEN}`;
            return;
        }

        // Check if this medication is out of range
        const weightLb = AppState.convertToPounds(grams);
        const outOfRangeString = Constants.MESSAGES.OUT_OF_RANGE;
        let isOutOfRange = false;

        if (medType === 'flea') {
            // Check both Revolution and Advantage based on selection
            const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
            let topical = Constants.TOPICAL.REVOLUTION;
            topicalRadios.forEach(radio => {
                if (radio.checked) topical = radio.value;
            });
            const dose = topical === Constants.TOPICAL.REVOLUTION
                ? DoseCalculator.calculateRevolutionDose(weightLb)
                : DoseCalculator.calculateAdvantageIIDose(weightLb);
            isOutOfRange = dose === outOfRangeString || dose === 0;
        } else if (medType === 'drontal') {
            const drontalType = this._getDrontalType(kittenId);
            const dose = drontalType === Constants.DRONTAL_TYPE.DRONTAL
                ? DoseCalculator.calculateDrontalDose(weightLb)
                : DoseCalculator.calculateDroncitDose(weightLb);
            isOutOfRange = dose === outOfRangeString;
        } else if (medType === 'nexgard') {
            const dose = DoseCalculator.calculateNexgardDose(weightLb);
            isOutOfRange = dose === outOfRangeString;
        } else if (medType === 'capstar') {
            const dose = DoseCalculator.calculateCapstarDose(weightLb);
            isOutOfRange = dose === outOfRangeString;
        }

        // If out of range, show gray
        if (isOutOfRange) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.OUT_OF_RANGE}`;
            return;
        }

        // If medication is disabled, show skip color
        if (toggleCheckbox && !toggleCheckbox.checked) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.STATUS.SKIP}`;
            return;
        }

        let status = Constants.STATUS.TODO;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });

        statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${status}`;
    }

    /**
     * Update ringworm status light
     * @param {string} kittenId - The kitten ID
     */
    updateRingwormStatusLight(kittenId) {
        const statusLight = document.getElementById(Constants.ID.ringwormStatusLight(kittenId));
        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);

        if (!statusLight) return;

        // Check if there's a valid weight
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = weightInput ? parseFloat(weightInput.value) : 0;

        // If no weight, hide the status light
        if (!grams || grams <= 0) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.HIDDEN}`;
            return;
        }

        let status = Constants.RINGWORM_STATUS.NOT_SCANNED;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });

        // Map ringworm status to light color
        if (status === Constants.RINGWORM_STATUS.NEGATIVE) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.STATUS.DONE}`;
        } else if (status === Constants.RINGWORM_STATUS.POSITIVE || status === Constants.RINGWORM_STATUS.INCONCLUSIVE) {
            statusLight.className = 'status-light delay'; // amber/warning color
        } else {
            statusLight.className = 'status-light todo';
        }
    }

    /**
     * Update FVRCP status light
     * @param {string} kittenId - The kitten ID
     */
    updateFvrcpStatusLight(kittenId) {
        const statusLight = document.getElementById(Constants.ID.fvrcpStatusLight(kittenId));
        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.fvrcpName(kittenId)}"]`);

        if (!statusLight) return;

        // Check if there's a valid weight
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = weightInput ? parseFloat(weightInput.value) : 0;

        // If no weight, hide the status light
        if (!grams || grams <= 0) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.HIDDEN}`;
            return;
        }

        let status = Constants.FVRCP_STATUS.UNKNOWN;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });

        // Map FVRCP status to light color
        if (status === Constants.FVRCP_STATUS.VACCINATED) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.STATUS.DONE}`;
        } else if (status === Constants.FVRCP_STATUS.NOT_VACCINATED) {
            statusLight.className = 'status-light delay'; // amber/warning color
        } else {
            statusLight.className = 'status-light todo';
        }
    }

    /**
     * Update all status lights for a kitten (called when weight changes)
     * @param {string} kittenId - The kitten ID
     */
    updateAllStatusLights(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            this.updateStatusLight(kittenId, med);
        });
        this.updateRingwormStatusLight(kittenId);
        this.updateFvrcpStatusLight(kittenId);
    }

    /**
     * Get medication status (todo, delay, done) from DOM
     * @param {string} kittenId - The kitten ID
     * @param {string} medType - The medication type
     * @returns {string} Status value
     */
    getMedicationStatus(kittenId, medType) {
        const toggleCheckbox = document.getElementById(`${kittenId}-${medType}-enabled`);
        if (toggleCheckbox && !toggleCheckbox.checked) {
            return Constants.STATUS.SKIP;
        }

        const statusRadios = document.querySelectorAll(`input[name="${kittenId}-${medType}-status"]`);
        let status = Constants.STATUS.TODO;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });
        return status;
    }

    /**
     * Update the result display for a kitten (all dose information)
     * @param {string} kittenId - The kitten ID
     */
    updateResultDisplay(kittenId) {
        const doseDisplay = document.getElementById(Constants.ID.resultDisplay(kittenId));
        const doseContent = document.getElementById(Constants.ID.resultContent(kittenId));
        const doseHeader = document.getElementById(Constants.ID.resultHeader(kittenId));

        const nameInput = document.getElementById(Constants.ID.name(kittenId));
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = parseFloat(weightInput.value);

        // Update the print header with current name, sex, and weight
        const kittenName = nameInput.value.trim() || 'Unnamed Cat';
        const sexRadios = document.querySelectorAll(`input[name="${Constants.ID.sexName(kittenId)}"]`);
        let sex = Constants.DEFAULTS.SEX;
        sexRadios.forEach(radio => {
            if (radio.checked) sex = radio.value;
        });
        const sexDisplay = sex === 'female' ? 'F' : sex === 'male' ? 'M' : '';
        const nameWithSex = sexDisplay ? `${kittenName} (${sexDisplay})` : kittenName;
        const microchipInput = document.getElementById(Constants.ID.microchip(kittenId));
        const microchip = microchipInput ? microchipInput.value.trim() : '';
        const mcSuffix = microchip ? ` \u00B7 MC ${microchip}` : '';
        const headerElement = doseHeader.querySelector('.kitten-info');
        if (grams > 0) {
            const weightLb = AppState.convertToPounds(grams);
            headerElement.textContent = `${nameWithSex} - ${AppState.formatNumber(grams)} g (${AppState.formatNumber(weightLb, 2)} lb)${mcSuffix}`;
        } else {
            headerElement.textContent = `${nameWithSex}${mcSuffix}`;
        }

        if (!grams || grams <= 0) {
            doseDisplay.classList.add(Constants.CSS.EMPTY);
            doseContent.innerHTML = '<div class="collapsible-section"><div class="result-display-content"><div class="result-item">Enter weight to see calculated doses</div></div></div>';
            this._clearInlineDoseDisplays(kittenId);
            return;
        }

        const weightLb = AppState.convertToPounds(grams);

        // Get selected topical type (Revolution or Advantage)
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        let topical = Constants.TOPICAL.REVOLUTION;
        topicalRadios.forEach(radio => {
            if (radio.checked) topical = radio.value;
        });

        // Get selected dewormer type (Droncit injectable or Drontal tablet)
        const drontalType = this._getDrontalType(kittenId);

        // Get medication statuses
        const statuses = {};
        Constants.MEDICATIONS.forEach(med => {
            statuses[med] = this.getMedicationStatus(kittenId, med);
        });

        // Get regimen days
        const panacurDays = this._getRegimenDays(kittenId, 'panacur', Constants.DEFAULTS.PANACUR_DAYS);
        const ponazurilDays = this._getRegimenDays(kittenId, 'ponazuril', Constants.DEFAULTS.PONAZURIL_DAYS);

        // Calculate doses
        const doses = this._calculateAllDoses(weightLb, topical);

        // Update inline dose displays
        this._updateInlineDoseDisplays(kittenId, doses, topical, drontalType);

        // Build the result display content
        const content = this._buildDosesSection(doses, topical, drontalType, statuses, panacurDays, ponazurilDays)
            + this._buildOtherSection(kittenId);

        doseDisplay.classList.remove(Constants.CSS.EMPTY);
        doseContent.innerHTML = content;
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    /**
     * Clear all inline dose displays for a kitten
     * @param {string} kittenId - The kitten ID
     */
    _clearInlineDoseDisplays(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            const doseEl = document.getElementById(`${kittenId}-${med}-dose`);
            if (doseEl) doseEl.textContent = '';
        });
    }

    /**
     * Get the selected dewormer type for the Droncit/Drontal row
     * @param {string} kittenId - The kitten ID
     * @returns {string} 'droncit' (injectable) or 'drontal' (tablet)
     */
    _getDrontalType(kittenId) {
        const checked = document.querySelector(`input[name="${Constants.ID.drontalTypeName(kittenId)}"]:checked`);
        return checked ? checked.value : Constants.DRONTAL_TYPE.DRONCIT;
    }

    /**
     * Get regimen days from radio buttons
     * @param {string} kittenId - The kitten ID
     * @param {string} medType - The medication type
     * @param {number} defaultDays - Default value if not found
     * @returns {number} Number of days
     */
    _getRegimenDays(kittenId, medType, defaultDays) {
        const radios = document.querySelectorAll(`input[name="${kittenId}-${medType}"]`);
        let days = defaultDays;
        radios.forEach(radio => {
            if (radio.checked) days = parseInt(radio.value);
        });
        return days;
    }

    /**
     * Calculate all medication doses
     * @param {number} weightLb - Weight in pounds
     * @param {string} topical - Topical type (revolution/advantage)
     * @returns {Object} Object with all calculated doses
     */
    _calculateAllDoses(weightLb, topical) {
        return {
            panacur: this.doseCalculator.calculatePanacurDose(weightLb),
            ponazuril: this.doseCalculator.calculatePonazurilDose(weightLb),
            drontal: this.doseCalculator.calculateDrontalDose(weightLb),
            droncit: this.doseCalculator.calculateDroncitDose(weightLb),
            nexgard: this.doseCalculator.calculateNexgardDose(weightLb),
            revolution: this.doseCalculator.calculateRevolutionDose(weightLb),
            advantage: this.doseCalculator.calculateAdvantageIIDose(weightLb),
            capstar: this.doseCalculator.calculateCapstarDose ?
                this.doseCalculator.calculateCapstarDose(weightLb) : '1 tablet',
            pyrantel: this.doseCalculator.calculatePyrantelDose(weightLb),
            outOfRange: Constants.MESSAGES.OUT_OF_RANGE
        };
    }

    /**
     * Update inline dose displays in medication rows
     * @param {string} kittenId - The kitten ID
     * @param {Object} doses - Calculated doses
     * @param {string} topical - Selected topical type
     */
    _updateInlineDoseDisplays(kittenId, doses, topical, drontalType) {
        const outOfRange = doses.outOfRange;

        // Flea dose
        const fleaDoseEl = document.getElementById(`${kittenId}-flea-dose`);
        if (fleaDoseEl) {
            const dose = topical === Constants.TOPICAL.REVOLUTION ? doses.revolution : doses.advantage;
            fleaDoseEl.textContent = dose === outOfRange ? outOfRange : `${AppState.formatNumber(dose, 2)} mL`;
        }

        // Capstar dose
        const capstarDoseEl = document.getElementById(`${kittenId}-capstar-dose`);
        if (capstarDoseEl) {
            capstarDoseEl.textContent = '1 tablet';
        }

        // Panacur dose
        const panacurDoseEl = document.getElementById(`${kittenId}-panacur-dose`);
        if (panacurDoseEl) {
            panacurDoseEl.textContent = `${AppState.formatNumber(doses.panacur, 2)} mL/day`;
        }

        // Ponazuril dose
        const ponazurilDoseEl = document.getElementById(`${kittenId}-ponazuril-dose`);
        if (ponazurilDoseEl) {
            ponazurilDoseEl.textContent = `${AppState.formatNumber(doses.ponazuril, 2)} mL/day`;
        }

        // Droncit/Drontal dose (tablet or injectable based on type)
        const drontalDoseEl = document.getElementById(`${kittenId}-drontal-dose`);
        if (drontalDoseEl) {
            if (drontalType === Constants.DRONTAL_TYPE.DRONTAL) {
                drontalDoseEl.textContent = doses.drontal === outOfRange ? outOfRange : `${doses.drontal} tablet(s)`;
            } else {
                drontalDoseEl.textContent = doses.droncit === outOfRange ? outOfRange : `${AppState.formatNumber(doses.droncit, 2)} mL`;
            }
        }

        // NexGard Combo dose
        const nexgardDoseEl = document.getElementById(`${kittenId}-nexgard-dose`);
        if (nexgardDoseEl) {
            nexgardDoseEl.textContent = doses.nexgard === outOfRange ? outOfRange : `${AppState.formatNumber(doses.nexgard, 2)} mL`;
        }

        // Pyrantel dose
        const pyrantelDoseEl = document.getElementById(`${kittenId}-pyrantel-dose`);
        if (pyrantelDoseEl) {
            pyrantelDoseEl.textContent = `${AppState.formatNumber(doses.pyrantel, 2)} mL`;
        }
    }

    /**
     * Build the Doses section HTML
     * @param {Object} statuses - Medication statuses keyed by med type
     */
    _buildDosesSection(doses, topical, drontalType, statuses, panacurDays, ponazurilDays) {
        const outOfRange = doses.outOfRange;
        let content = `
            <div class="collapsible-section">
                <div class="dose-section-header">
                    <strong>Doses</strong>
                </div>
                <div class="result-display-content">
        `;

        // Render in Constants.MEDICATIONS order (matches form)
        Constants.MEDICATIONS.forEach(med => {
            const status = statuses[med];
            if (status === Constants.STATUS.SKIP) return;

            const statusBadge = this._renderStatusBadge(status);

            if (med === 'flea') {
                const topicalName = topical === Constants.TOPICAL.REVOLUTION ? 'Revolution' : 'Advantage II';
                const topicalDose = topical === Constants.TOPICAL.REVOLUTION ? doses.revolution : doses.advantage;
                content += `
                    <div class="result-item">
                        <strong>${topicalName}</strong> <span class="result-item-dose">${topicalDose === outOfRange ? outOfRange : AppState.formatNumber(topicalDose, 2) + ' mL'}</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'capstar') {
                content += `
                    <div class="result-item">
                        <strong>Capstar</strong> <span class="result-item-dose">1 tablet</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'panacur') {
                content += `
                    <div class="result-item">
                        <strong>Panacur</strong> <span class="result-item-dose">${AppState.formatNumber(doses.panacur, 2)} mL/day × ${panacurDays} days</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'ponazuril') {
                content += `
                    <div class="result-item">
                        <strong>Ponazuril</strong> <span class="result-item-dose">${AppState.formatNumber(doses.ponazuril, 2)} mL/day × ${ponazurilDays} days</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'drontal') {
                const isTablet = drontalType === Constants.DRONTAL_TYPE.DRONTAL;
                const drontalName = isTablet ? 'Drontal' : 'Droncit';
                const drontalDose = isTablet ? doses.drontal : doses.droncit;
                const drontalDoseStr = drontalDose === outOfRange ? outOfRange
                    : (isTablet ? drontalDose + ' tablet(s)' : AppState.formatNumber(drontalDose, 2) + ' mL');
                content += `
                    <div class="result-item">
                        <strong>${drontalName}</strong> <span class="result-item-dose">${drontalDoseStr}</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'nexgard') {
                content += `
                    <div class="result-item">
                        <strong>NexGard Combo</strong> <span class="result-item-dose">${doses.nexgard === outOfRange ? outOfRange : AppState.formatNumber(doses.nexgard, 2) + ' mL'}</span>${statusBadge}
                    </div>
                `;
            } else if (med === 'pyrantel') {
                content += `
                    <div class="result-item">
                        <strong>Pyrantel</strong> <span class="result-item-dose">${AppState.formatNumber(doses.pyrantel, 2)} mL</span>${statusBadge}
                    </div>
                `;
            }
        });

        content += `
                </div>
            </div>
        `;

        return content;
    }

    /**
     * Render a status badge for a medication row
     * @param {string} status - One of Constants.STATUS values
     * @returns {string} HTML for the badge (empty string if no badge)
     */
    _renderStatusBadge(status) {
        const labels = {
            [Constants.STATUS.TODO]: 'To Do',
            [Constants.STATUS.DONE]: 'Done',
            [Constants.STATUS.DELAY]: 'Delay'
        };
        const label = labels[status];
        if (!label) return '';
        return `<span class="med-status med-status-${status}">${label}</span>`;
    }

    /**
     * Build the Other section HTML (ringworm + FVRCP status)
     */
    _buildOtherSection(kittenId) {
        // Get ringworm status
        const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
        let ringwormStatus = Constants.RINGWORM_STATUS.NOT_SCANNED;
        ringwormRadios.forEach(radio => {
            if (radio.checked) ringwormStatus = radio.value;
        });

        const ringwormStatusText = {
            'not-scanned': 'Unknown',
            'negative': 'Negative',
            'positive': 'Positive',
            'inconclusive': 'Inconclusive'
        };

        // Get FVRCP status
        const fvrcpRadios = document.querySelectorAll(`input[name="${kittenId}-fvrcp-status"]`);
        let fvrcpStatus = Constants.FVRCP_STATUS.UNKNOWN;
        fvrcpRadios.forEach(radio => {
            if (radio.checked) fvrcpStatus = radio.value;
        });

        const fvrcpStatusText = {
            'unknown': 'Unknown',
            'vaccinated': 'Vaccinated',
            'not-vaccinated': 'Not vaccinated'
        };

        return `
            <div class="collapsible-section">
                <div class="dose-section-header">
                    <strong>Other</strong>
                </div>
                <div class="result-display-content">
                    <div class="result-item">
                        <strong>Ringworm</strong> ${ringwormStatusText[ringwormStatus] || ringwormStatus}
                    </div>
                    <div class="result-item">
                        <strong>FVRCP Vaccine</strong> ${fvrcpStatusText[fvrcpStatus] || fvrcpStatus}
                    </div>
                </div>
            </div>
        `;
    }
}

// Export to global namespace
window.FormRenderer = FormRenderer;
