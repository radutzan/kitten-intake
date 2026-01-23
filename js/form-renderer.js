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
            display.textContent = `${AppState.formatNumber(grams)}g = ${AppState.formatNumber(pounds, 2)} lb`;
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
            const dose = DoseCalculator.calculateDrontalDose(weightLb);
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
        } else if (status === Constants.RINGWORM_STATUS.POSITIVE) {
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

        // Update the print header with current name and weight
        const kittenName = nameInput.value.trim() || 'Unnamed Cat';
        const headerElement = doseHeader.querySelector('.kitten-info');
        if (grams > 0) {
            const weightLb = AppState.convertToPounds(grams);
            headerElement.textContent = `${kittenName} - ${AppState.formatNumber(grams)}g (${AppState.formatNumber(weightLb, 2)} lb)`;
        } else {
            headerElement.textContent = `${kittenName}`;
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

        // Get medication statuses
        const fleaStatus = this.getMedicationStatus(kittenId, 'flea');
        const capstarStatus = this.getMedicationStatus(kittenId, 'capstar');
        const panacurStatus = this.getMedicationStatus(kittenId, 'panacur');
        const ponazurilStatus = this.getMedicationStatus(kittenId, 'ponazuril');
        const drontalStatus = this.getMedicationStatus(kittenId, 'drontal');

        // Get regimen days
        const panacurDays = this._getRegimenDays(kittenId, 'panacur', Constants.DEFAULTS.PANACUR_DAYS);
        const ponazurilDays = this._getRegimenDays(kittenId, 'ponazuril', Constants.DEFAULTS.PONAZURIL_DAYS);

        // Calculate doses
        const doses = this._calculateAllDoses(weightLb, topical);

        // Update inline dose displays
        this._updateInlineDoseDisplays(kittenId, doses, topical);

        // Build the result display content
        const content = this._buildResultDisplayContent(
            doses, topical, fleaStatus, capstarStatus, panacurStatus,
            ponazurilStatus, drontalStatus, panacurDays, ponazurilDays, kittenId
        );

        doseDisplay.classList.remove(Constants.CSS.EMPTY);
        doseContent.innerHTML = content;
    }

    /**
     * Toggle the result display expanded/collapsed state
     * @param {string} kittenId - The kitten ID
     */
    toggleResultDisplay(kittenId) {
        const resultDisplay = document.getElementById(`${kittenId}-result-display`);
        if (!resultDisplay) return;

        const isCollapsed = resultDisplay.classList.toggle(Constants.CSS.COLLAPSED);
        const toggleText = resultDisplay.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = isCollapsed ? 'Show All Doses' : 'Hide Doses';
        }
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
            revolution: this.doseCalculator.calculateRevolutionDose(weightLb),
            advantage: this.doseCalculator.calculateAdvantageIIDose(weightLb),
            capstar: this.doseCalculator.calculateCapstarDose ?
                this.doseCalculator.calculateCapstarDose(weightLb) : '1 tablet',
            outOfRange: Constants.MESSAGES.OUT_OF_RANGE
        };
    }

    /**
     * Update inline dose displays in medication rows
     * @param {string} kittenId - The kitten ID
     * @param {Object} doses - Calculated doses
     * @param {string} topical - Selected topical type
     */
    _updateInlineDoseDisplays(kittenId, doses, topical) {
        const outOfRange = doses.outOfRange;

        // Flea dose
        const fleaDoseEl = document.getElementById(`${kittenId}-flea-dose`);
        if (fleaDoseEl) {
            const dose = topical === Constants.TOPICAL.REVOLUTION ? doses.revolution : doses.advantage;
            fleaDoseEl.textContent = dose === outOfRange ? outOfRange : `${AppState.formatNumber(dose, 2)}ml`;
        }

        // Capstar dose
        const capstarDoseEl = document.getElementById(`${kittenId}-capstar-dose`);
        if (capstarDoseEl) {
            capstarDoseEl.textContent = '1 tablet';
        }

        // Panacur dose
        const panacurDoseEl = document.getElementById(`${kittenId}-panacur-dose`);
        if (panacurDoseEl) {
            panacurDoseEl.textContent = `${AppState.formatNumber(doses.panacur, 2)}ml/day`;
        }

        // Ponazuril dose
        const ponazurilDoseEl = document.getElementById(`${kittenId}-ponazuril-dose`);
        if (ponazurilDoseEl) {
            ponazurilDoseEl.textContent = `${AppState.formatNumber(doses.ponazuril, 2)}ml/day`;
        }

        // Drontal dose
        const drontalDoseEl = document.getElementById(`${kittenId}-drontal-dose`);
        if (drontalDoseEl) {
            drontalDoseEl.textContent = doses.drontal === outOfRange ? outOfRange : `${doses.drontal} tablet(s)`;
        }
    }

    /**
     * Build the complete result display HTML content
     * @returns {string} HTML content
     */
    _buildResultDisplayContent(doses, topical, fleaStatus, capstarStatus, panacurStatus,
                               ponazurilStatus, drontalStatus, panacurDays, ponazurilDays, kittenId) {
        const outOfRange = doses.outOfRange;
        let content = '';

        // Doses section
        content += this._buildDosesSection(doses, topical, fleaStatus, capstarStatus,
                                           panacurStatus, ponazurilStatus, drontalStatus,
                                           panacurDays, ponazurilDays);

        // For Foster section
        content += this._buildFosterSection(doses, topical, fleaStatus, capstarStatus,
                                            panacurStatus, ponazurilStatus, drontalStatus,
                                            panacurDays, ponazurilDays);

        // Other section (ringworm)
        content += this._buildOtherSection(kittenId);

        return content;
    }

    /**
     * Build the Doses section HTML
     */
    _buildDosesSection(doses, topical, fleaStatus, capstarStatus, panacurStatus,
                       ponazurilStatus, drontalStatus, panacurDays, ponazurilDays) {
        const outOfRange = doses.outOfRange;
        let content = `
            <div class="collapsible-section">
                <div class="dose-section-header">
                    <strong>Doses</strong>
                </div>
                <div class="result-display-content">
        `;

        if (panacurStatus !== Constants.STATUS.SKIP) {
            content += `
                <div class="result-item">
                    <strong>Panacur</strong> ${AppState.formatNumber(doses.panacur, 2)} mL/day × ${panacurDays} days
                </div>
            `;
        }
        if (ponazurilStatus !== Constants.STATUS.SKIP) {
            content += `
                <div class="result-item">
                    <strong>Ponazuril</strong> ${AppState.formatNumber(doses.ponazuril, 2)} mL/day × ${ponazurilDays} days
                </div>
            `;
        }
        if (drontalStatus !== Constants.STATUS.SKIP) {
            content += `
                <div class="result-item">
                    <strong>Drontal</strong> ${doses.drontal === outOfRange ? outOfRange : doses.drontal + ' tablet(s)'}
                </div>
            `;
        }
        if (capstarStatus !== Constants.STATUS.SKIP) {
            content += `
                <div class="result-item">
                    <strong>Capstar</strong> 1 tablet
                </div>
            `;
        }
        if (fleaStatus !== Constants.STATUS.SKIP) {
            const topicalName = topical === Constants.TOPICAL.REVOLUTION ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === Constants.TOPICAL.REVOLUTION ? doses.revolution : doses.advantage;
            content += `
                <div class="result-item">
                    <strong>${topicalName}</strong> ${topicalDose === outOfRange ? outOfRange : AppState.formatNumber(topicalDose, 2) + ' mL'}
                </div>
            `;
        }

        content += `
                </div>
            </div>
        `;

        return content;
    }

    /**
     * Build the For Foster section HTML
     */
    _buildFosterSection(doses, topical, fleaStatus, capstarStatus, panacurStatus,
                        ponazurilStatus, drontalStatus, panacurDays, ponazurilDays) {
        const outOfRange = doses.outOfRange;

        // Determine what was given at intake
        const panacurDay1Given = panacurStatus === Constants.STATUS.DONE;
        const ponazurilDay1Given = ponazurilStatus === Constants.STATUS.DONE;
        const drontalDay1Given = drontalStatus === Constants.STATUS.DONE;
        const capstarDay1Given = capstarStatus === Constants.STATUS.DONE;
        const fleaGiven = fleaStatus === Constants.STATUS.DONE;

        // Calculate remaining
        const panacurRemaining = panacurStatus === Constants.STATUS.SKIP ? 0 : (panacurDay1Given ? (panacurDays - 1) : panacurDays);
        const ponazurilRemaining = ponazurilStatus === Constants.STATUS.SKIP ? 0 : (ponazurilDay1Given ? (ponazurilDays - 1) : ponazurilDays);
        const panacurTotal = doses.panacur * panacurRemaining;
        const ponazurilTotal = doses.ponazuril * ponazurilRemaining;

        const remainsForFoster = [];

        if (drontalStatus !== Constants.STATUS.SKIP && !drontalDay1Given && doses.drontal !== outOfRange) {
            remainsForFoster.push(`<strong>Drontal</strong> ${doses.drontal + ' tablet(s)'}`);
        }

        if (capstarStatus !== Constants.STATUS.SKIP && !capstarDay1Given) {
            remainsForFoster.push(`<strong>Capstar</strong> 1 tablet`);
        }

        if (panacurRemaining > 0) {
            remainsForFoster.push(`<strong>Panacur</strong> ${panacurRemaining} days × ${AppState.formatNumber(doses.panacur, 2)} mL = ${AppState.formatNumber(panacurTotal, 2)} mL`);
        }

        if (ponazurilRemaining > 0) {
            remainsForFoster.push(`<strong>Ponazuril</strong> ${ponazurilRemaining} days × ${AppState.formatNumber(doses.ponazuril, 2)} mL = ${AppState.formatNumber(ponazurilTotal, 2)} mL`);
        }

        // Topical for foster
        if (fleaStatus !== Constants.STATUS.SKIP) {
            const topicalName = topical === Constants.TOPICAL.REVOLUTION ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === Constants.TOPICAL.REVOLUTION ? doses.revolution : doses.advantage;
            if (topicalDose !== outOfRange && !fleaGiven) {
                remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose = ${AppState.formatNumber(topicalDose, 2)} mL`);
            }
        }

        let content = `
            <div class="foster-section">
                <div class="dose-section-header">
                    <strong>For Foster</strong>
                </div>
                <div class="result-display-content${remainsForFoster.length > 0 ? ' foster' : ''}">
        `;

        if (remainsForFoster.length > 0) {
            remainsForFoster.forEach(item => {
                content += `<div class="result-item">${item}</div>`;
            });
        } else {
            content += `<div class="result-item">None</div>`;
        }

        content += `
                </div>
            </div>
        `;

        return content;
    }

    /**
     * Build the Other section HTML (ringworm status)
     */
    _buildOtherSection(kittenId) {
        // Get ringworm status
        const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
        let ringwormStatus = Constants.RINGWORM_STATUS.NOT_SCANNED;
        ringwormRadios.forEach(radio => {
            if (radio.checked) ringwormStatus = radio.value;
        });

        const ringwormStatusText = {
            'not-scanned': 'Not scanned',
            'negative': 'Negative',
            'positive': 'Positive'
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
                </div>
            </div>
        `;
    }
}

// Export to global namespace
window.FormRenderer = FormRenderer;
