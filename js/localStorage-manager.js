/**
 * Local Storage Manager for Cat Intake Application
 * Handles silent, automatic persistence of form data for mobile browsers
 */

class LocalStorageManager {
    constructor() {
        this.storageKey = 'cat-intake-form-data';
        this.version = '1.0';
        this.isAvailable = this.checkStorageAvailability();
    }

    /**
     * Check if localStorage is available and working
     */
    checkStorageAvailability() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('LocalStorage not available:', e);
            return false;
        }
    }

    /**
     * Save current form data to localStorage
     * Called automatically on every form change
     */
    saveFormData() {
        if (!this.isAvailable) return false;

        try {
            const data = this.collectCurrentFormData();
            const payload = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: data
            };

            localStorage.setItem(this.storageKey, JSON.stringify(payload));
            return true;
        } catch (e) {
            // Handle quota exceeded or other errors silently
            console.warn('Failed to save form data:', e);
            
            // If quota exceeded, try to clear old data and retry once
            if (e.name === 'QuotaExceededError') {
                this.clearFormData();
                try {
                    const data = this.collectCurrentFormData();
                    const payload = {
                        version: this.version,
                        timestamp: new Date().toISOString(),
                        data: data
                    };
                    localStorage.setItem(this.storageKey, JSON.stringify(payload));
                    return true;
                } catch (retryError) {
                    console.warn('Retry save failed:', retryError);
                }
            }
            return false;
        }
    }

    /**
     * Load saved form data from localStorage
     * Returns null if no data exists or data is corrupted
     */
    loadFormData() {
        if (!this.isAvailable) return null;

        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return null;

            const payload = JSON.parse(saved);
            
            // Validate data structure
            if (!payload.data || !payload.version) {
                console.warn('Invalid saved data structure');
                this.clearFormData();
                return null;
            }

            // Handle version compatibility (for future versions)
            if (payload.version !== this.version) {
                console.warn('Version mismatch, clearing old data');
                this.clearFormData();
                return null;
            }

            return payload.data;
        } catch (e) {
            console.warn('Failed to load form data:', e);
            this.clearFormData(); // Clear corrupted data
            return null;
        }
    }

    /**
     * Collect current form data from the DOM
     */
    collectCurrentFormData() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        const formData = {
            appState: {
                kittenCounter: window.kittenCounter || 0,
                activeKittens: []
            },
            kittens: {}
        };

        kittenForms.forEach(form => {
            const kittenId = form.id;
            formData.appState.activeKittens.push(kittenId);

            // Collect all form data for this kitten
            const kittenData = {
                name: this.getInputValue(`${kittenId}-name`),
                weight: this.getInputValue(`${kittenId}-weight`),
                topical: this.getRadioValue(`${kittenId}-topical`),
                fleaStatus: this.getRadioValue(`${kittenId}-flea-status`),
                panacur: this.getRadioValue(`${kittenId}-panacur`),
                day1Given: {
                    panacur: this.getCheckboxValue(`${kittenId}-panacur-day1`),
                    ponazuril: this.getCheckboxValue(`${kittenId}-ponazuril-day1`),
                    drontal: this.getCheckboxValue(`${kittenId}-drontal-day1`)
                }
            };

            formData.kittens[kittenId] = kittenData;
        });

        return formData;
    }

    /**
     * Restore form data to the DOM
     */
    restoreFormData(data) {
        if (!data || !data.appState || !data.kittens) return false;

        try {
            // Clear existing forms first
            const container = document.getElementById('kittens-container');
            if (container) {
                container.innerHTML = '';
            }

            // Restore application state
            if (window.kittenCounter !== undefined) {
                window.kittenCounter = 0; // Reset to start fresh
            }

            // Sort kitten IDs to restore in proper order
            const sortedKittenIds = data.appState.activeKittens.sort((a, b) => {
                const numA = parseInt(a.split('-')[1]);
                const numB = parseInt(b.split('-')[1]);
                return numA - numB;
            });

            // Restore each kitten form in order
            sortedKittenIds.forEach((kittenId, index) => {
                const kittenData = data.kittens[kittenId];
                if (kittenData) {
                    this.restoreKittenForm(kittenId, kittenData, index === 0);
                }
            });

            // Set final counter state
            if (window.kittenCounter !== undefined) {
                window.kittenCounter = data.appState.kittenCounter || sortedKittenIds.length;
            }

            return true;
        } catch (e) {
            console.warn('Failed to restore form data:', e);
            return false;
        }
    }

    /**
     * Restore a single kitten form
     */
    restoreKittenForm(kittenId, kittenData, isFirst = false) {
        // Extract kitten number from ID for display and counter management
        const kittenNumber = parseInt(kittenId.split('-')[1]);
        
        // Update global counter to this kitten's number (important for subsequent operations)
        if (window.kittenCounter < kittenNumber) {
            window.kittenCounter = kittenNumber;
        }

        // Create form directly with correct ID - no more ID reassignment needed
        const container = document.getElementById('kittens-container');
        const kittenForm = document.createElement('div');
        kittenForm.className = 'kitten-form';
        kittenForm.id = kittenId; // Set correct ID from the start
        
        kittenForm.innerHTML = `
            <div class="number">${kittenNumber}</div>
            <div class="kitten-form-content">
                ${kittenNumber > 1 ? `<button type="button" class="btn btn-danger remove" onclick="removeKitten('${kittenId}')">—</button>` : ''}
                <div class="form-grid top">
                    <div class="form-group">
                        <label for="${kittenId}-name">Name</label>
                        <input type="text" id="${kittenId}-name" name="name" placeholder="Name" required>
                        <div class="error" id="${kittenId}-name-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="${kittenId}-weight">Weight (grams)</label>
                        <input type="text" inputmode="decimal" pattern="[0-9.]*" id="${kittenId}-weight" placeholder="Weight (grams)" name="weight" min="1" step="0.1" required>
                        <div class="error" id="${kittenId}-weight-error"></div>
                        <div class="weight-display" id="${kittenId}-weight-display" style="display: none;"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="">
                        <label>Flea Med</label>
                        <div class="radio-group">
                            <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution" checked>
                            <label for="${kittenId}-topical-revolution">Revolution</label>
                            <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                            <label for="${kittenId}-topical-advantage">Advantage II</label>
                            <input type="radio" name="${kittenId}-topical" value="none" id="${kittenId}-topical-none">
                            <label for="${kittenId}-topical-none">Skip</label>
                        </div>
                    </div>
                    
                    <div class="radio-group-normal">
                        <label for="${kittenId}-flea-given">
                            <input type="radio" name="${kittenId}-flea-status" value="given" id="${kittenId}-flea-given">
                            Given
                        </label>
                        <label for="${kittenId}-flea-bathed" class="bathed">
                            <input type="radio" name="${kittenId}-flea-status" value="bathed" id="${kittenId}-flea-bathed" checked>
                            Delay: Bathed
                        </label>
                    </div>
                </div>
            
                <div class="form-group">
                    <label>Given at Intake</label>
                    <div class="checkbox-group dayone">
                        <label>
                            <input type="checkbox" id="${kittenId}-panacur-day1" name="panacur-day1" checked>
                            Panacur
                        </label>
                        <label>
                            <input type="checkbox" id="${kittenId}-ponazuril-day1" name="ponazuril-day1" checked>
                            Ponazuril
                        </label>
                        <label>
                            <input type="checkbox" id="${kittenId}-drontal-day1" name="drontal-day1" checked>
                            Drontal
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Panacur Treatment</label>
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-panacur" value="3" id="${kittenId}-panacur-3">
                        <label for="${kittenId}-panacur-3">3 days</label>
                        <input type="radio" name="${kittenId}-panacur" value="5" id="${kittenId}-panacur-5" checked>
                        <label for="${kittenId}-panacur-5">5 days</label>
                    </div>
                </div>
            </div>
            
            <div class="dose-display empty" id="${kittenId}-dose-display">
                <div class="dose-print-header print-only" id="${kittenId}-dose-header">
                    <h3 class="kitten-info"></h3>
                </div>
                <div class="dose-section-header">
                    <strong>Doses</strong>
                </div>
                <div class="dose-display-content" id="${kittenId}-dose-content">
                    <div class="dose-item">Enter weight to see calculated doses</div>
                </div>
            </div>
        `;
        
        container.appendChild(kittenForm);

        // Add event listeners like the original addKitten function would
        this.addFormEventListeners(kittenId);

        // Set the saved values immediately - no setTimeout needed
        this.setInputValue(`${kittenId}-name`, kittenData.name);
        this.setInputValue(`${kittenId}-weight`, kittenData.weight);
        this.setRadioValue(`${kittenId}-topical`, kittenData.topical);
        this.setRadioValue(`${kittenId}-flea-status`, kittenData.fleaStatus);
        this.setRadioValue(`${kittenId}-panacur`, kittenData.panacur);
        this.setCheckboxValue(`${kittenId}-panacur-day1`, kittenData.day1Given.panacur);
        this.setCheckboxValue(`${kittenId}-ponazuril-day1`, kittenData.day1Given.ponazuril);
        this.setCheckboxValue(`${kittenId}-drontal-day1`, kittenData.day1Given.drontal);

        // Trigger updates for this kitten
        if (typeof window.updateWeightDisplay === 'function') {
            window.updateWeightDisplay(kittenId);
        }
        if (typeof window.updateDoseDisplay === 'function') {
            window.updateDoseDisplay(kittenId);
        }
        if (typeof window.updateFleaCheckboxStates === 'function') {
            window.updateFleaCheckboxStates(kittenId);
        }
    }

    /**
     * Add event listeners to a restored form (replaces FormManager.addValidationListeners + addMedicationListeners)
     */
    addFormEventListeners(kittenId) {
        // Add weight input filtering and validation
        const weightInput = document.getElementById(`${kittenId}-weight`);
        if (weightInput) {
            // Filter input to allow only numbers and periods
            weightInput.addEventListener('input', (e) => {
                const filteredValue = e.target.value.replace(/[^0-9.]/g, '');
                const parts = filteredValue.split('.');
                if (parts.length > 2) {
                    e.target.value = parts[0] + '.' + parts.slice(1).join('');
                } else {
                    e.target.value = filteredValue;
                }
                
                if (typeof window.updateWeightDisplay === 'function') {
                    window.updateWeightDisplay(kittenId);
                }
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });

            // Prevent pasting invalid characters
            weightInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const filteredPaste = paste.replace(/[^0-9.]/g, '');
                const parts = filteredPaste.split('.');
                const validPaste = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredPaste;
                
                e.target.value = validPaste;
                if (typeof window.updateWeightDisplay === 'function') {
                    window.updateWeightDisplay(kittenId);
                }
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        }

        // Add medication change listeners
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (typeof window.updateFleaCheckboxStates === 'function') {
                    window.updateFleaCheckboxStates(kittenId);
                }
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        // Add other change listeners for flea status, panacur, day1 checkboxes
        const fleaStatusRadios = document.querySelectorAll(`input[name="${kittenId}-flea-status"]`);
        fleaStatusRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        panacurRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        const day1Checkboxes = [
            document.getElementById(`${kittenId}-panacur-day1`),
            document.getElementById(`${kittenId}-ponazuril-day1`),
            document.getElementById(`${kittenId}-drontal-day1`)
        ];
        day1Checkboxes.forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (typeof window.updateDoseDisplay === 'function') {
                        window.updateDoseDisplay(kittenId);
                    }
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    if (window.localStorageManager) {
                        window.localStorageManager.saveFormData();
                    }
                });
            }
        });

        // Add name validation listeners
        const nameInput = document.getElementById(`${kittenId}-name`);
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (typeof window.updateDoseDisplay === 'function') {
                    window.updateDoseDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        }
    }

    /**
     * Update form element IDs to match the restored kitten ID
     */
    updateFormElementIds(form, kittenId) {
        // Update all elements that reference the old kitten ID
        const elementsWithIds = form.querySelectorAll('[id], [name], [for]');
        const kittenNumber = kittenId.split('-')[1];
        
        elementsWithIds.forEach(element => {
            // Update IDs
            if (element.id && element.id.includes('kitten-')) {
                const newId = element.id.replace(/kitten-\d+/, kittenId);
                element.id = newId;
            }
            
            // Update names
            if (element.name && element.name.includes('kitten-')) {
                const newName = element.name.replace(/kitten-\d+/, kittenId);
                element.name = newName;
            }
            
            // Update for attributes (labels)
            if (element.getAttribute('for') && element.getAttribute('for').includes('kitten-')) {
                const newFor = element.getAttribute('for').replace(/kitten-\d+/, kittenId);
                element.setAttribute('for', newFor);
            }
            
            // Update onclick attributes (remove buttons)
            if (element.onclick && element.onclick.toString().includes('removeKitten')) {
                element.setAttribute('onclick', `removeKitten('${kittenId}')`);
            }
        });
        
        // Update the number display
        const numberDiv = form.querySelector('.number');
        if (numberDiv) {
            numberDiv.textContent = kittenNumber;
        }
    }

    /**
     * Helper methods for DOM manipulation
     */
    getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }

    getRadioValue(name) {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : '';
    }

    getCheckboxValue(id) {
        const element = document.getElementById(id);
        return element ? element.checked : false;
    }

    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.value = value;
        }
    }

    setRadioValue(name, value) {
        if (value) {
            const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
            }
        }
    }

    setCheckboxValue(id, checked) {
        const element = document.getElementById(id);
        if (element && checked !== undefined) {
            element.checked = checked;
        }
    }

    /**
     * Clear all saved form data
     */
    clearFormData() {
        if (!this.isAvailable) return false;
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.warn('Failed to clear form data:', e);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        if (!this.isAvailable) return null;

        try {
            const data = localStorage.getItem(this.storageKey);
            return {
                hasData: !!data,
                dataSize: data ? new Blob([data]).size : 0,
                timestamp: data ? JSON.parse(data).timestamp : null
            };
        } catch (e) {
            return null;
        }
    }
}

// Create global instance
window.localStorageManager = new LocalStorageManager();