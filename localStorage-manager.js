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
        // Call the existing addKitten function to create the form structure
        if (typeof window.addKitten === 'function') {
            window.addKitten();
        }

        // Wait for DOM to update, then restore values
        setTimeout(() => {
            // Find the most recently created form (should have the highest counter)
            const allForms = document.querySelectorAll('.kitten-form');
            const lastForm = allForms[allForms.length - 1];
            
            if (lastForm && lastForm.id !== kittenId) {
                // Update the form ID to match the saved data
                lastForm.id = kittenId;
                
                // Update all the input IDs and names within this form
                this.updateFormElementIds(lastForm, kittenId);
            }

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
        }, 50 * (parseInt(kittenId.split('-')[1]))); // Stagger the updates
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