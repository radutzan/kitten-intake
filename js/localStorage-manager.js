/**
 * Local Storage Manager for Cat Intake Application
 * Handles silent, automatic persistence of form data for mobile browsers
 */

class LocalStorageManager {
    constructor() {
        this.storageKey = Constants.STORAGE.FORM_DATA;
        this.version = Constants.STORAGE.VERSION;
        this.isAvailable = this.checkStorageAvailability();

        // Debounced save for input events (500ms delay)
        // Initialized lazily after AppState is available
        this._debouncedSave = null;
    }

    /**
     * Get or create the debounced save function
     * Lazy initialization to ensure AppState is available
     */
    get debouncedSave() {
        if (!this._debouncedSave) {
            this._debouncedSave = AppState.debounce(() => this.saveFormData(), 500);
        }
        return this._debouncedSave;
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

            // Update URL in real-time for instant sharing
            if (window.KittenApp && window.KittenApp.urlStateManager) {
                window.KittenApp.urlStateManager.updateUrlRealtime();
            }

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
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
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

            // Collect all form data for this kitten (new v2.0 format)
            const kittenData = {
                name: this.getInputValue(Constants.ID.name(kittenId)),
                weight: this.getInputValue(Constants.ID.weight(kittenId)),
                topical: this.getRadioValue(Constants.ID.topicalName(kittenId)),
                panacurDays: this.getRadioValue(Constants.ID.panacurName(kittenId)),
                ponazurilDays: this.getRadioValue(Constants.ID.ponazurilName(kittenId)),
                ringwormStatus: this.getRadioValue(Constants.ID.ringwormName(kittenId)),
                // Medication enabled states and statuses
                medications: {}
            };

            // Collect medication data using Constants.MEDICATIONS
            Constants.MEDICATIONS.forEach(med => {
                kittenData.medications[med] = {
                    enabled: this.getCheckboxValue(Constants.ID.medEnabled(kittenId, med)),
                    status: this.getRadioValue(Constants.ID.medStatusName(kittenId, med))
                };
            });

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
            const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
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

        // Create form directly with correct ID - using FormManager's template method for consistency
        const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
        const kittenForm = document.createElement('div');
        kittenForm.className = Constants.CSS.KITTEN_FORM;
        kittenForm.id = kittenId;

        // Use FormManager's HTML template generator (single source of truth)
        if (window.KittenApp && window.KittenApp.formManager) {
            kittenForm.innerHTML = window.KittenApp.formManager.generateKittenFormHTML(kittenId, kittenNumber);
        } else {
            console.error('FormManager not available, cannot restore kitten form');
            return;
        }

        container.appendChild(kittenForm);

        // Use FormManager's unified event binding (single source of truth)
        if (window.KittenApp && window.KittenApp.formManager) {
            window.KittenApp.formManager.bindKittenFormEvents(kittenId);
        }

        // Set the saved values immediately
        this.setInputValue(Constants.ID.name(kittenId), kittenData.name);
        this.setInputValue(Constants.ID.weight(kittenId), kittenData.weight);
        this.setRadioValue(Constants.ID.topicalName(kittenId), kittenData.topical);
        this.setRadioValue(Constants.ID.panacurName(kittenId), kittenData.panacurDays || String(Constants.DEFAULTS.PANACUR_DAYS));
        this.setRadioValue(Constants.ID.ponazurilName(kittenId), kittenData.ponazurilDays || String(Constants.DEFAULTS.PONAZURIL_DAYS));
        this.setRadioValue(Constants.ID.ringwormName(kittenId), kittenData.ringwormStatus || Constants.RINGWORM_STATUS.NOT_SCANNED);

        // Restore medication enabled states and statuses (v2.0 format)
        if (kittenData.medications) {
            Constants.MEDICATIONS.forEach(med => {
                const medData = kittenData.medications[med];
                if (medData) {
                    this.setCheckboxValue(Constants.ID.medEnabled(kittenId, med), medData.enabled !== false);
                    this.setRadioValue(Constants.ID.medStatusName(kittenId, med), medData.status || Constants.STATUS.TODO);
                }
            });
        }

        // Trigger updates for this kitten
        if (window.KittenApp && window.KittenApp.formManager) {
            window.KittenApp.formManager.updateWeightDisplay(kittenId);
            window.KittenApp.formManager.updateResultDisplay(kittenId);

            // Update medication row states and status lights
            Constants.MEDICATIONS.forEach(med => {
                window.KittenApp.formManager.updateMedicationRowState(kittenId, med);
                window.KittenApp.formManager.updateStatusLight(kittenId, med);
            });
            window.KittenApp.formManager.updateRingwormStatusLight(kittenId);
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