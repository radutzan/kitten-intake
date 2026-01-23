/**
 * Results Display Module - Foster checklist and dispense summary rendering
 * Separates data preparation from rendering for better testability
 *
 * Pattern:
 *   1. prepareXxxData() - Pure function, returns data object
 *   2. renderXxxHtml() - Pure function, returns HTML/DOM
 *   3. displayXxx() - Orchestrates above and updates DOM
 */

class ResultsDisplay {
    constructor(appState, scheduleManager, doseCalculator) {
        this.appState = appState;
        this.scheduleManager = scheduleManager;
        this.doseCalculator = doseCalculator;
    }

    // ==========================================
    // Main Entry Point
    // ==========================================

    updateResultsAutomatically() {
        // Check if we have any kittens with valid basic data
        const kittenForms = document.querySelectorAll('.kitten-form');

        if (kittenForms.length === 0) {
            this._hideResults();
            return;
        }

        // Check if at least one kitten has weight
        let hasValidKitten = false;
        kittenForms.forEach(form => {
            const kittenId = form.id;
            const weight = parseFloat(document.getElementById(`${kittenId}-weight`).value);
            if (weight > 0) {
                hasValidKitten = true;
            }
        });

        if (!hasValidKitten) {
            this._hideResults();
            return;
        }

        // We have at least one valid kitten, update results
        try {
            const kittens = this.appState.collectKittenData();

            // Add doses to kittens and filter out invalid ones
            const validKittens = kittens
                .map(kitten => this.doseCalculator.addDosesToKitten(kitten))
                .filter(kitten => kitten.weightGrams > 0);

            if (validKittens.length > 0) {
                const schedules = this.scheduleManager.generateSchedule(validKittens);
                this.displayFosterChecklist(validKittens, schedules);
                this.displayDispenseSummary(validKittens);

                document.getElementById(Constants.ELEMENTS.RESULTS_SECTION).style.display = 'block';
            } else {
                this._hideResults();
            }

            this.updateHeaderButtons();
        } catch (error) {
            console.error('Error updating results:', error);
            this._hideResults();
        }
    }

    _hideResults() {
        document.getElementById(Constants.ELEMENTS.RESULTS_SECTION).style.display = 'none';
        this.updateHeaderButtons();
    }

    // ==========================================
    // Dispense Summary - Data Preparation
    // ==========================================

    /**
     * Prepare dispense summary data from kittens
     * Pure function - no DOM access
     * @param {Array} kittens - Array of kitten objects with doses
     * @returns {Object} Totals object with medication amounts
     */
    prepareDispenseSummaryData(kittens) {
        const totals = {
            panacur: 0,
            ponazuril: 0,
            revolution: 0,
            advantage: 0,
            drontal: 0,
            capstar: 0
        };

        const outOfRangeString = Constants.MESSAGES.OUT_OF_RANGE;

        kittens.forEach(kitten => {
            const remaining = this.scheduleManager.calculateRemainingMedications(kitten);

            // Add to totals
            totals.panacur += remaining.panacur.total;
            totals.ponazuril += remaining.ponazuril.total;

            if (kitten.topical === Constants.TOPICAL.REVOLUTION && kitten.doses.topical !== outOfRangeString) {
                totals.revolution += remaining.topical.amount;
            }
            if (kitten.topical === Constants.TOPICAL.ADVANTAGE && kitten.doses.topical !== outOfRangeString) {
                totals.advantage += remaining.topical.amount;
            }
            if (kitten.doses.drontal !== outOfRangeString) {
                totals.drontal += remaining.drontal.amount;
            }
            if (remaining.capstar) {
                totals.capstar += remaining.capstar.amount;
            }
        });

        return totals;
    }

    // ==========================================
    // Dispense Summary - HTML Rendering
    // ==========================================

    /**
     * Render dispense summary HTML from prepared data
     * Pure function - returns HTML string
     * @param {Object} totals - Totals object from prepareDispenseSummaryData
     * @returns {string} HTML string
     */
    renderDispenseSummaryHtml(totals) {
        const items = [];

        if (totals.panacur > 0) {
            items.push(`
                <div class="total-item">
                    <span>Panacur</span>
                    <strong>${AppState.formatNumber(totals.panacur, 2)} mL</strong>
                </div>
            `);
        }

        if (totals.ponazuril > 0) {
            items.push(`
                <div class="total-item">
                    <span>Ponazuril</span>
                    <strong>${AppState.formatNumber(totals.ponazuril, 2)} mL</strong>
                </div>
            `);
        }

        if (totals.revolution > 0) {
            items.push(`
                <div class="total-item">
                    <span>Revolution</span>
                    <strong>${AppState.formatNumber(totals.revolution, 2)} mL</strong>
                </div>
            `);
        }

        if (totals.advantage > 0) {
            items.push(`
                <div class="total-item">
                    <span>Advantage II</span>
                    <strong>${AppState.formatNumber(totals.advantage, 2)} mL</strong>
                </div>
            `);
        }

        if (totals.drontal > 0) {
            items.push(`
                <div class="total-item">
                    <span>Drontal</span>
                    <strong>${totals.drontal} tablet(s)</strong>
                </div>
            `);
        }

        if (totals.capstar > 0) {
            items.push(`
                <div class="total-item">
                    <span>Capstar</span>
                    <strong>${totals.capstar} tablet(s)</strong>
                </div>
            `);
        }

        return items.join('');
    }

    // ==========================================
    // Dispense Summary - DOM Update
    // ==========================================

    /**
     * Display dispense summary - orchestrates data prep, rendering, and DOM update
     * @param {Array} kittens - Array of kitten objects
     */
    displayDispenseSummary(kittens) {
        const container = document.getElementById(Constants.ELEMENTS.DISPENSE_SUMMARY_CONTENT);

        // Step 1: Prepare data
        const totals = this.prepareDispenseSummaryData(kittens);

        // Step 2: Render HTML
        const html = this.renderDispenseSummaryHtml(totals);

        // Step 3: Update DOM
        container.innerHTML = '';
        const aggregateSection = document.createElement('div');
        aggregateSection.className = 'med-totals';
        aggregateSection.innerHTML = html;
        container.appendChild(aggregateSection);
    }

    // ==========================================
    // Foster Checklist - Data Preparation
    // ==========================================

    /**
     * Prepare foster checklist data
     * Pure function - no DOM access
     * @param {Array} kittens - Array of kitten objects
     * @param {Array} schedules - Array of schedule objects
     * @returns {Object} Checklist data structure
     */
    prepareFosterChecklistData(kittens, schedules) {
        // Get all unique dates across all schedules
        const allDays = this.scheduleManager.getAllScheduleDays(schedules);

        // Optimize Drontal scheduling
        this._optimizeDrontalScheduling(kittens, schedules, allDays);

        // Recalculate days after optimization
        const updatedAllDays = this.scheduleManager.getAllScheduleDays(schedules);

        // Build kitten header data
        const kittenHeaders = kittens
            .map(kitten => {
                const schedule = schedules.find(s => s.kittenId === kitten.id);
                const medications = Object.entries(schedule.medications).map(([medType, medData]) => ({
                    type: medType,
                    name: this._getMedicationDisplayName(medType, medData),
                    dose: this._getMedicationDoseDisplay(medType, medData)
                }));

                return {
                    id: kitten.id,
                    name: kitten.name || 'Unnamed Kitten',
                    weightGrams: kitten.weightGrams,
                    weightLb: kitten.weightLb,
                    medications,
                    hasMedications: medications.length > 0
                };
            })
            .filter(k => k.hasMedications);

        // Build row data
        const rows = updatedAllDays.map(day => ({
            date: day,
            displayDate: AppState.formatDateForDisplay(day),
            cells: kittenHeaders.flatMap(kitten => {
                const schedule = schedules.find(s => s.kittenId === kitten.id);
                return Object.entries(schedule.medications).map(([medType, medData], index) => ({
                    kittenId: kitten.id,
                    medType,
                    hasCheckbox: medData.days.includes(day),
                    isFirstCol: index === 0
                }));
            })
        }));

        return {
            days: updatedAllDays,
            kittenHeaders,
            rows,
            isEmpty: updatedAllDays.length === 0
        };
    }

    /**
     * Get display name for medication type
     */
    _getMedicationDisplayName(medType, medData) {
        const names = {
            panacur: 'Panacur',
            ponazuril: 'Ponazuril',
            drontal: 'Drontal',
            capstar: 'Capstar',
            topical: medData.type === 'revolution' ? 'Revolution' : 'Advantage II'
        };
        return names[medType] || medType;
    }

    /**
     * Get dose display string for medication
     */
    _getMedicationDoseDisplay(medType, medData) {
        if (medType === 'panacur' || medType === 'ponazuril') {
            return `${AppState.formatNumber(medData.dose, 2)} mL`;
        }
        if (medType === 'drontal') {
            return `${medData.dose} tablet(s)`;
        }
        if (medType === 'capstar') {
            return medData.dose;
        }
        if (medType === 'topical') {
            return `${AppState.formatNumber(medData.dose, 2)} mL`;
        }
        return '';
    }

    /**
     * Optimize Drontal scheduling to first available day
     */
    _optimizeDrontalScheduling(kittens, schedules, allDays) {
        if (allDays.length === 0) return;

        kittens.forEach(kitten => {
            const schedule = schedules.find(s => s.kittenId === kitten.id);
            if (!schedule || !schedule.medications.drontal) return;
            schedule.medications.drontal.days = [allDays[0]];
        });
    }

    // ==========================================
    // Foster Checklist - HTML Rendering
    // ==========================================

    /**
     * Render foster checklist table from prepared data
     * @param {Object} checklistData - Data from prepareFosterChecklistData
     * @returns {HTMLElement} Table element
     */
    renderFosterChecklistTable(checklistData) {
        if (checklistData.isEmpty) {
            const p = document.createElement('p');
            p.textContent = 'No medications needed for foster care.';
            return p;
        }

        const table = document.createElement('table');
        table.className = 'checklist-table';

        // Build header
        const thead = document.createElement('thead');
        const headerRow1 = document.createElement('tr');
        const headerRow2 = document.createElement('tr');

        // Date column header
        const dateHeader = document.createElement('th');
        dateHeader.rowSpan = 2;
        dateHeader.className = 'date-col';
        headerRow1.appendChild(dateHeader);

        // Kitten headers
        checklistData.kittenHeaders.forEach(kitten => {
            const kittenHeader = document.createElement('th');
            kittenHeader.colSpan = kitten.medications.length;
            kittenHeader.className = 'kitten-header';
            kittenHeader.innerHTML = `<strong>${kitten.name}</strong> <span>${AppState.formatNumber(kitten.weightGrams)}g (${AppState.formatNumber(kitten.weightLb, 2)} lb)</span>`;
            headerRow1.appendChild(kittenHeader);

            // Medication sub-headers
            kitten.medications.forEach((med, index) => {
                const medHeader = document.createElement('th');
                medHeader.className = index === 0 ? 'med-header first-kitten-col' : 'med-header';
                medHeader.innerHTML = `${med.name}<br><small>${med.dose}</small>`;
                headerRow2.appendChild(medHeader);
            });
        });

        thead.appendChild(headerRow1);
        thead.appendChild(headerRow2);
        table.appendChild(thead);

        // Build body
        const tbody = document.createElement('tbody');
        checklistData.rows.forEach(row => {
            const tr = document.createElement('tr');

            // Date cell
            const dateCell = document.createElement('td');
            dateCell.className = 'date-col';
            dateCell.textContent = row.displayDate;
            tr.appendChild(dateCell);

            // Medication cells
            row.cells.forEach(cell => {
                const td = document.createElement('td');
                if (cell.isFirstCol) {
                    td.className = 'first-kitten-col';
                }

                if (cell.hasCheckbox) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = `${cell.kittenId}-${cell.medType}-${row.date}`;
                    td.appendChild(checkbox);
                } else {
                    td.innerHTML = '—';
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    }

    // ==========================================
    // Foster Checklist - DOM Update
    // ==========================================

    /**
     * Display foster checklist - orchestrates data prep, rendering, and DOM update
     * @param {Array} kittens - Array of kitten objects
     * @param {Array} schedules - Array of schedule objects
     */
    displayFosterChecklist(kittens, schedules) {
        const container = document.getElementById(Constants.ELEMENTS.FOSTER_CHECKLIST_CONTENT);

        // Step 1: Prepare data
        const checklistData = this.prepareFosterChecklistData(kittens, schedules);

        // Step 2: Render table
        const table = this.renderFosterChecklistTable(checklistData);

        // Step 3: Update DOM
        container.innerHTML = '';
        container.appendChild(table);
    }

    // ==========================================
    // Header Buttons
    // ==========================================

    updateHeaderButtons() {
        const resultsSection = document.getElementById(Constants.ELEMENTS.RESULTS_SECTION);
        const kittens = this.appState.getKittens();
        const hasResults = resultsSection && resultsSection.style.display !== 'none' && kittens.length > 0;

        const printChecklistBtn = document.getElementById('print-checklist-btn');
        const printDosagesBtn = document.getElementById('print-dosages-btn');

        if (printChecklistBtn) {
            printChecklistBtn.disabled = !hasResults;
            printChecklistBtn.style.opacity = hasResults ? '1' : '0.5';
        }

        if (printDosagesBtn) {
            printDosagesBtn.disabled = !hasResults;
            printDosagesBtn.style.opacity = hasResults ? '1' : '0.5';
        }
    }

    // ==========================================
    // Legacy / Compatibility
    // ==========================================

    /**
     * @deprecated Use optimizeDrontalScheduling prefix convention
     */
    optimizeDrontalScheduling(kittens, schedules, allDays) {
        this._optimizeDrontalScheduling(kittens, schedules, allDays);
    }

    /**
     * Legacy function - kept for compatibility
     */
    calculateAndDisplay() {
        this.updateResultsAutomatically();
    }
}

// Export to global namespace
window.ResultsDisplay = ResultsDisplay;
