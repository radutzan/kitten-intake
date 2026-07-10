/**
 * Form Template Module - HTML generation for kitten forms
 * Pure functions with no DOM dependencies (except template literals)
 * Extracted from FormManager to improve modularity
 */

const FormTemplate = {
    /**
     * Generate the complete HTML for a kitten form
     * @param {string} kittenId - The unique kitten ID (e.g., "kitten-1")
     * @param {number} kittenNumber - The display number for the form
     * @returns {string} HTML string for the kitten form
     */
    generate(kittenId, kittenNumber) {
        return `
            ${kittenNumber > 1 ? `<button type="button" class="btn btn-danger remove" onclick="removeKitten('${kittenId}')">—</button>` : ''}
            <div class="number">${kittenNumber}</div>
            <div class="kitten-form-content">
                ${this.generateTopSection(kittenId)}
                ${this.generateMedicationGrid(kittenId)}
                <div class="medication-separator"></div>
                ${this.generateRingwormSection(kittenId)}
                ${this.generateFvrcpSection(kittenId)}
            </div>
            ${this.generateResultDisplay(kittenId)}
        `;
    },

    /**
     * Generate the top section with name and weight inputs
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateTopSection(kittenId) {
        return `
            <div class="form-grid top">
                <div class="form-group">
                    <label for="${kittenId}-name">Name</label>
                    <input type="text" id="${kittenId}-name" name="name" placeholder="Name" required>
                    <div class="error" id="${kittenId}-name-error"></div>
                </div>

                <div class="form-group weight-sex-row">
                    <div class="weight-input-wrapper">
                        <label for="${kittenId}-weight">Weight (grams)</label>
                        <input type="text" inputmode="decimal" pattern="[0-9.]*" id="${kittenId}-weight" placeholder="Weight (grams)" name="weight" min="1" step="0.1" required>
                        <div class="error" id="${kittenId}-weight-error"></div>
                        <div class="weight-display" id="${kittenId}-weight-display" style="display: none;"></div>
                    </div>
                    <div class="radio-group sex-selector">
                        <input type="radio" name="${kittenId}-sex" value="unknown" id="${kittenId}-sex-unknown" checked>
                        <label for="${kittenId}-sex-unknown">–</label>
                        <input type="radio" name="${kittenId}-sex" value="female" id="${kittenId}-sex-female">
                        <label for="${kittenId}-sex-female">F</label>
                        <input type="radio" name="${kittenId}-sex" value="male" id="${kittenId}-sex-male">
                        <label for="${kittenId}-sex-male">M</label>
                    </div>
                </div>

                <div class="form-group microchip-row">
                    <label for="${kittenId}-microchip">Microchip</label>
                    <div class="microchip-input-wrapper">
                        <input type="text" id="${kittenId}-microchip" name="microchip" placeholder="Microchip" inputmode="numeric" pattern="[0-9]*" maxlength="15" autocomplete="off">
                        <button type="button" class="microchip-scan-btn" id="${kittenId}-microchip-scan" aria-label="Scan microchip barcode">Scan</button>
                        <input type="file" id="${kittenId}-microchip-file" accept="image/*" capture="environment" class="microchip-file-input">
                    </div>
                    <div class="microchip-feedback" id="${kittenId}-microchip-feedback"></div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the medication grid with all medication rows
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateMedicationGrid(kittenId) {
        return `
            <div class="medication-grid">
                ${this.generateFleaMedRow(kittenId)}
                ${this.generateCapstarRow(kittenId)}
                ${this.generateDrontalRow(kittenId)}
                ${this.generateNexgardRow(kittenId)}
                ${this.generatePonazurilRow(kittenId)}
                ${this.generatePanacurRow(kittenId)}
                ${this.generatePyrantelRow(kittenId)}
            </div>
        `;
    },

    /**
     * Generate the flea medication row (Revolution/Advantage selection)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateFleaMedRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-flea-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-flea-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Flea Med</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-flea-status-light"></span>
                        <span class="dose-display" id="${kittenId}-flea-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution" checked>
                        <label for="${kittenId}-topical-revolution">Rev</label>
                        <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                        <label for="${kittenId}-topical-advantage">Adv II</label>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-flea-status" value="todo" id="${kittenId}-flea-status-todo" checked>
                        <label for="${kittenId}-flea-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-flea-status" value="delay" id="${kittenId}-flea-status-delay">
                        <label for="${kittenId}-flea-status-delay">Delay</label>
                        <input type="radio" name="${kittenId}-flea-status" value="done" id="${kittenId}-flea-status-done">
                        <label for="${kittenId}-flea-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the Capstar row (single dose)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateCapstarRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-capstar-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-capstar-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Capstar</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-capstar-status-light"></span>
                        <span class="dose-display" id="${kittenId}-capstar-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="single-option">
                        <span class="option-label">Single Dose</span>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-capstar-status" value="todo" id="${kittenId}-capstar-status-todo" checked>
                        <label for="${kittenId}-capstar-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-capstar-status" value="done" id="${kittenId}-capstar-status-done">
                        <label for="${kittenId}-capstar-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the Panacur row (5-day regimen)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generatePanacurRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-panacur-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-panacur-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Panacur</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-panacur-status-light"></span>
                        <span class="dose-display" id="${kittenId}-panacur-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="single-option">
                        <span class="option-label">5 Days</span>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-panacur-status" value="todo" id="${kittenId}-panacur-status-todo" checked>
                        <label for="${kittenId}-panacur-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-panacur-status" value="done" id="${kittenId}-panacur-status-done">
                        <label for="${kittenId}-panacur-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the Ponazuril row (1/3 day regimen)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generatePonazurilRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-ponazuril-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-ponazuril-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Ponazuril</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-ponazuril-status-light"></span>
                        <span class="dose-display" id="${kittenId}-ponazuril-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-ponazuril" value="1" id="${kittenId}-ponazuril-1">
                        <label for="${kittenId}-ponazuril-1">1d</label>
                        <input type="radio" name="${kittenId}-ponazuril" value="3" id="${kittenId}-ponazuril-3" checked>
                        <label for="${kittenId}-ponazuril-3">3d</label>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-ponazuril-status" value="todo" id="${kittenId}-ponazuril-status-todo" checked>
                        <label for="${kittenId}-ponazuril-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-ponazuril-status" value="done" id="${kittenId}-ponazuril-status-done">
                        <label for="${kittenId}-ponazuril-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the Droncit/Drontal row (single dose, injectable or tablet)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateDrontalRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-drontal-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-drontal-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Dewormer</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-drontal-status-light"></span>
                        <span class="dose-display" id="${kittenId}-drontal-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-drontal-type" value="droncit" id="${kittenId}-drontal-type-droncit" checked>
                        <label for="${kittenId}-drontal-type-droncit">Droncit</label>
                        <input type="radio" name="${kittenId}-drontal-type" value="drontal" id="${kittenId}-drontal-type-drontal">
                        <label for="${kittenId}-drontal-type-drontal">Drontal</label>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-drontal-status" value="todo" id="${kittenId}-drontal-status-todo" checked>
                        <label for="${kittenId}-drontal-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-drontal-status" value="done" id="${kittenId}-drontal-status-done">
                        <label for="${kittenId}-drontal-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the NexGard Combo row (single dose)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateNexgardRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-nexgard-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-nexgard-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">NexGard Combo</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-nexgard-status-light"></span>
                        <span class="dose-display" id="${kittenId}-nexgard-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="single-option">
                        <span class="option-label">Single Dose</span>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-nexgard-status" value="todo" id="${kittenId}-nexgard-status-todo" checked>
                        <label for="${kittenId}-nexgard-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-nexgard-status" value="done" id="${kittenId}-nexgard-status-done">
                        <label for="${kittenId}-nexgard-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the Pyrantel row (single dose, liquid)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generatePyrantelRow(kittenId) {
        return `
            <div class="medication-row" id="${kittenId}-pyrantel-row">
                <div class="medication-labels">
                    <div class="left">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${kittenId}-pyrantel-enabled">
                            <span class="slider"></span>
                        </label>
                        <span class="med-name">Pyrantel</span>
                    </div>
                    <div class="right">
                        <span class="status-light hidden" id="${kittenId}-pyrantel-status-light"></span>
                        <span class="dose-display" id="${kittenId}-pyrantel-dose"></span>
                    </div>
                </div>
                <div class="medication-choices">
                    <div class="single-option">
                        <span class="option-label">Single Dose</span>
                    </div>
                    <div class="radio-group status-control">
                        <input type="radio" name="${kittenId}-pyrantel-status" value="todo" id="${kittenId}-pyrantel-status-todo" checked>
                        <label for="${kittenId}-pyrantel-status-todo">To Do</label>
                        <input type="radio" name="${kittenId}-pyrantel-status" value="done" id="${kittenId}-pyrantel-status-done">
                        <label for="${kittenId}-pyrantel-status-done">Done</label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate the ringworm section
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateRingwormSection(kittenId) {
        return `
            <div class="form-group ringworm-section">
                <div class="medication-labels">
                    <div class="left">
                        <span class="status-light hidden" id="${kittenId}-ringworm-status-light"></span>
                        <span class="med-name">Ringworm</span>
                    </div>
                </div>
                <div class="radio-group">
                    <input type="radio" name="${kittenId}-ringworm-status" value="not-scanned" id="${kittenId}-ringworm-not-scanned" checked>
                    <label for="${kittenId}-ringworm-not-scanned">Unknown</label>
                    <input type="radio" name="${kittenId}-ringworm-status" value="positive" id="${kittenId}-ringworm-positive">
                    <label for="${kittenId}-ringworm-positive">Positive</label>
                    <input type="radio" name="${kittenId}-ringworm-status" value="negative" id="${kittenId}-ringworm-negative">
                    <label for="${kittenId}-ringworm-negative">Negative</label>
                </div>
            </div>
        `;
    },

    /**
     * Generate the FVRCP vaccine section
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateFvrcpSection(kittenId) {
        return `
            <div class="form-group ringworm-section">
                <div class="medication-labels">
                    <div class="left">
                        <span class="status-light hidden" id="${kittenId}-fvrcp-status-light"></span>
                        <span class="med-name">FVRCP Vaccine</span>
                    </div>
                </div>
                <div class="radio-group">
                    <input type="radio" name="${kittenId}-fvrcp-status" value="unknown" id="${kittenId}-fvrcp-unknown" checked>
                    <label for="${kittenId}-fvrcp-unknown">Unknown</label>
                    <input type="radio" name="${kittenId}-fvrcp-status" value="not-vaccinated" id="${kittenId}-fvrcp-not-vaccinated">
                    <label for="${kittenId}-fvrcp-not-vaccinated">Not Vaccinated</label>
                    <input type="radio" name="${kittenId}-fvrcp-status" value="vaccinated" id="${kittenId}-fvrcp-vaccinated">
                    <label for="${kittenId}-fvrcp-vaccinated">Vaccinated</label>
                </div>
            </div>
        `;
    },

    /**
     * Generate the result display section (collapsible doses)
     * @param {string} kittenId - The kitten ID
     * @returns {string} HTML string
     */
    generateResultDisplay(kittenId) {
        return `
            <div class="result-display empty" id="${kittenId}-result-display">
                <div class="dose-print-header print-only" id="${kittenId}-result-header">
                    <h3 class="kitten-info"></h3>
                </div>
                <div id="${kittenId}-result-content">
                    <div class="collapsible-section">
                        <div class="result-display-content">
                            <div class="result-item">Enter weight to see calculated doses</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Freeze to prevent modifications
Object.freeze(FormTemplate);

// Export to global namespace
window.FormTemplate = FormTemplate;
