/**
 * Local Storage Manager for Cat Intake Application
 * Handles silent, automatic persistence of form data for mobile browsers
 */

class LocalStorageManager {
    constructor() {
        this.storageKey = 'cat-intake-form-data';
        this.version = '2.0'; // Bumped for new medication status system
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

            // Collect all form data for this kitten (new v2.0 format)
            const kittenData = {
                name: this.getInputValue(`${kittenId}-name`),
                weight: this.getInputValue(`${kittenId}-weight`),
                topical: this.getRadioValue(`${kittenId}-topical`),
                panacurDays: this.getRadioValue(`${kittenId}-panacur`),
                ponazurilDays: this.getRadioValue(`${kittenId}-ponazuril`),
                ringwormStatus: this.getRadioValue(`${kittenId}-ringworm-status`),
                // New medication enabled states
                medications: {
                    flea: {
                        enabled: this.getCheckboxValue(`${kittenId}-flea-enabled`),
                        status: this.getRadioValue(`${kittenId}-flea-status`)
                    },
                    capstar: {
                        enabled: this.getCheckboxValue(`${kittenId}-capstar-enabled`),
                        status: this.getRadioValue(`${kittenId}-capstar-status`)
                    },
                    panacur: {
                        enabled: this.getCheckboxValue(`${kittenId}-panacur-enabled`),
                        status: this.getRadioValue(`${kittenId}-panacur-status`)
                    },
                    ponazuril: {
                        enabled: this.getCheckboxValue(`${kittenId}-ponazuril-enabled`),
                        status: this.getRadioValue(`${kittenId}-ponazuril-status`)
                    },
                    drontal: {
                        enabled: this.getCheckboxValue(`${kittenId}-drontal-enabled`),
                        status: this.getRadioValue(`${kittenId}-drontal-status`)
                    }
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

        // Create form directly with correct ID - using FormManager's template method for consistency
        const container = document.getElementById('kittens-container');
        const kittenForm = document.createElement('div');
        kittenForm.className = 'kitten-form';
        kittenForm.id = kittenId;

        // Use FormManager's HTML template generator (single source of truth)
        if (window.KittenApp && window.KittenApp.formManager) {
            kittenForm.innerHTML = window.KittenApp.formManager.generateKittenFormHTML(kittenId, kittenNumber);
        } else {
            console.error('FormManager not available, cannot restore kitten form');
            return;
        }

        container.appendChild(kittenForm);

        // Add event listeners like the original addKitten function would
        this.addFormEventListeners(kittenId);

        // Set the saved values immediately
        this.setInputValue(`${kittenId}-name`, kittenData.name);
        this.setInputValue(`${kittenId}-weight`, kittenData.weight);
        this.setRadioValue(`${kittenId}-topical`, kittenData.topical);
        this.setRadioValue(`${kittenId}-panacur`, kittenData.panacurDays || '3');
        this.setRadioValue(`${kittenId}-ponazuril`, kittenData.ponazurilDays || '3');
        this.setRadioValue(`${kittenId}-ringworm-status`, kittenData.ringwormStatus || 'not-scanned');

        // Restore medication enabled states and statuses (v2.0 format)
        if (kittenData.medications) {
            const medications = ['flea', 'capstar', 'panacur', 'ponazuril', 'drontal'];
            medications.forEach(med => {
                const medData = kittenData.medications[med];
                if (medData) {
                    this.setCheckboxValue(`${kittenId}-${med}-enabled`, medData.enabled !== false);
                    this.setRadioValue(`${kittenId}-${med}-status`, medData.status || 'todo');
                }
            });
        }

        // Trigger updates for this kitten
        if (window.KittenApp && window.KittenApp.formManager) {
            window.KittenApp.formManager.updateWeightDisplay(kittenId);
            window.KittenApp.formManager.updateResultDisplay(kittenId);

            // Update medication row states and status lights
            const medications = ['flea', 'capstar', 'panacur', 'ponazuril', 'drontal'];
            medications.forEach(med => {
                window.KittenApp.formManager.updateMedicationRowState(kittenId, med);
                window.KittenApp.formManager.updateStatusLight(kittenId, med);
            });
            window.KittenApp.formManager.updateRingwormStatusLight(kittenId);
        }
    }

    /**
     * Add event listeners to a restored form (replaces FormManager.addValidationListeners + addMedicationListeners)
     */
    addFormEventListeners(kittenId) {
        const formManager = window.KittenApp && window.KittenApp.formManager;

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

                if (formManager) {
                    formManager.updateWeightDisplay(kittenId);
                    formManager.updateResultDisplay(kittenId);
                    formManager.updateAllStatusLights(kittenId);
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
                if (formManager) {
                    formManager.updateWeightDisplay(kittenId);
                    formManager.updateResultDisplay(kittenId);
                    formManager.updateAllStatusLights(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        }

        // Add medication toggle switch listeners
        const medications = ['flea', 'capstar', 'panacur', 'ponazuril', 'drontal'];
        medications.forEach(med => {
            const toggleCheckbox = document.getElementById(`${kittenId}-${med}-enabled`);
            if (toggleCheckbox) {
                toggleCheckbox.addEventListener('change', () => {
                    if (formManager) {
                        formManager.updateMedicationRowState(kittenId, med);
                        formManager.updateStatusLight(kittenId, med);
                        formManager.updateResultDisplay(kittenId);
                    }
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    if (window.localStorageManager) {
                        window.localStorageManager.saveFormData();
                    }
                });
            }

            // Add status control listeners
            const statusRadios = document.querySelectorAll(`input[name="${kittenId}-${med}-status"]`);
            statusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (formManager) {
                        formManager.updateStatusLight(kittenId, med);
                        formManager.updateResultDisplay(kittenId);
                    }
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    if (window.localStorageManager) {
                        window.localStorageManager.saveFormData();
                    }
                });
            });
        });

        // Add topical type change listeners (Revolution / Advantage)
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (formManager) {
                    formManager.updateResultDisplay(kittenId);
                    formManager.updateStatusLight(kittenId, 'flea');
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        // Add panacur regimen listeners
        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        panacurRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (formManager) {
                    formManager.updateResultDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        // Add ponazuril regimen listeners
        const ponazurilRadios = document.querySelectorAll(`input[name="${kittenId}-ponazuril"]`);
        ponazurilRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (formManager) {
                    formManager.updateResultDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        // Add ringworm listeners
        const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
        ringwormRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (formManager) {
                    formManager.updateRingwormStatusLight(kittenId);
                    formManager.updateResultDisplay(kittenId);
                }
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                if (window.localStorageManager) {
                    window.localStorageManager.saveFormData();
                }
            });
        });

        // Add name validation listeners
        const nameInput = document.getElementById(`${kittenId}-name`);
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (formManager) {
                    formManager.updateResultDisplay(kittenId);
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