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
            drontal: 0,   // tablet dose count
            droncit: 0,   // mL
            nexgard: 0,   // mL
            capstar: 0,
            pyrantel: 0
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
                if (kitten.drontalType === 'drontal') {
                    totals.drontal += remaining.drontal.amount;
                } else {
                    totals.droncit += remaining.drontal.amount * kitten.doses.drontal;
                }
            }
            if (remaining.nexgard) {
                totals.nexgard += remaining.nexgard.amount;
            }
            if (remaining.capstar) {
                totals.capstar += remaining.capstar.amount;
            }
            if (remaining.pyrantel) {
                totals.pyrantel += remaining.pyrantel.amount;
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

        // Render in Constants.MEDICATIONS order (matches form)
        Constants.MEDICATIONS.forEach(med => {
            if (med === 'flea') {
                // Flea has two sub-types: revolution and advantage
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
            } else if (med === 'capstar') {
                if (totals.capstar > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>Capstar</span>
                            <strong>${totals.capstar} tablet(s)</strong>
                        </div>
                    `);
                }
            } else if (med === 'panacur') {
                if (totals.panacur > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>Panacur</span>
                            <strong>${AppState.formatNumber(totals.panacur, 2)} mL</strong>
                        </div>
                    `);
                }
            } else if (med === 'ponazuril') {
                if (totals.ponazuril > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>Ponazuril</span>
                            <strong>${AppState.formatNumber(totals.ponazuril, 2)} mL</strong>
                        </div>
                    `);
                }
            } else if (med === 'drontal') {
                // Droncit/Drontal split by selected form per kitten
                if (totals.droncit > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>Droncit</span>
                            <strong>${AppState.formatNumber(totals.droncit, 2)} mL</strong>
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
            } else if (med === 'nexgard') {
                if (totals.nexgard > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>NexGard Combo</span>
                            <strong>${AppState.formatNumber(totals.nexgard, 2)} mL</strong>
                        </div>
                    `);
                }
            } else if (med === 'pyrantel') {
                if (totals.pyrantel > 0) {
                    items.push(`
                        <div class="total-item">
                            <span>Pyrantel</span>
                            <strong>${AppState.formatNumber(totals.pyrantel, 2)} mL</strong>
                        </div>
                    `);
                }
            }
        });

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

                const sexDisplay = kitten.sex === 'female' ? 'F' : kitten.sex === 'male' ? 'M' : '';
                const displayName = kitten.name || 'Unnamed Kitten';
                const nameWithSex = sexDisplay ? `${displayName} (${sexDisplay})` : displayName;

                return {
                    id: kitten.id,
                    name: nameWithSex,
                    microchip: kitten.microchip || '',
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
        if (medType === 'topical') {
            return medData.type === 'revolution' ? 'Revolution' : 'Advantage II';
        }
        if (medType === 'drontal') {
            return medData.type === 'drontal' ? 'Drontal' : 'Droncit';
        }
        const names = {
            panacur: 'Panacur',
            ponazuril: 'Ponazuril',
            nexgard: 'NexGard Combo',
            capstar: 'Capstar',
            pyrantel: 'Pyrantel'
        };
        return names[medType] || medType;
    }

    /**
     * Get dose display string for medication
     */
    _getMedicationDoseDisplay(medType, medData) {
        if (medType === 'pyrantel' || medType === 'nexgard') {
            return `${AppState.formatNumber(medData.dose, 2)} mL`;
        }
        if (medType === 'panacur' || medType === 'ponazuril') {
            return `${AppState.formatNumber(medData.dose, 2)} mL`;
        }
        if (medType === 'drontal') {
            return medData.type === 'drontal'
                ? `${medData.dose} tablet(s)`
                : `${AppState.formatNumber(medData.dose, 2)} mL`;
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

        // Split cats into chunks that fit a landscape page so the checklist
        // wraps onto additional tables/pages instead of clipping past the edge.
        // ponytail: 15 cols ≈ the 5 three-med cats that print fully on landscape today; tune if printer margins differ.
        const MAX_MED_COLS_PER_TABLE = 15;
        const chunks = [];
        let current = [];
        let cols = 0;
        checklistData.kittenHeaders.forEach(kitten => {
            const need = kitten.medications.length;
            if (current.length && cols + need > MAX_MED_COLS_PER_TABLE) {
                chunks.push(current);
                current = [];
                cols = 0;
            }
            current.push(kitten);
            cols += need;
        });
        if (current.length) chunks.push(current);

        if (chunks.length === 1) {
            return this._buildChecklistTable(checklistData.kittenHeaders, checklistData.rows);
        }

        const wrapper = document.createElement('div');
        chunks.forEach(chunk => {
            const ids = new Set(chunk.map(k => k.id));
            const rows = checklistData.rows.map(row => ({
                ...row,
                cells: row.cells.filter(cell => ids.has(cell.kittenId))
            }));
            wrapper.appendChild(this._buildChecklistTable(chunk, rows));
        });
        return wrapper;
    }

    /**
     * Build a single checklist table for a subset of cats.
     * @param {Array} kittenHeaders - Kittens to render as column groups
     * @param {Array} rows - Row data with cells already filtered to these kittens
     * @returns {HTMLElement} Table element
     */
    _buildChecklistTable(kittenHeaders, rows) {
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
        kittenHeaders.forEach(kitten => {
            const kittenHeader = document.createElement('th');
            kittenHeader.colSpan = kitten.medications.length;
            kittenHeader.className = 'kitten-header';
            const mcHtml = kitten.microchip ? `<br><small class="microchip-display">MC ${kitten.microchip}</small>` : '';
            kittenHeader.innerHTML = `<strong>${kitten.name}</strong> <span>${AppState.formatNumber(kitten.weightGrams)} g (${AppState.formatNumber(kitten.weightLb, 2)} lb)</span>${mcHtml}`;
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
        rows.forEach(row => {
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
