/**
 * App State Module - State management, utilities, and constants
 * Handles centralized application state and utility functions
 */

class AppState {
    constructor() {
        this.state = {
            kittens: [],
            kittenCounter: 0
        };

        // Track previous state values for change detection
        this._previousState = new Map();

        // Change listeners for pub/sub notifications
        this._changeListeners = [];

        // Legacy support - use Constants.MESSAGES.OUT_OF_RANGE instead
        this.constants = {
            outOfRangeString: Constants.MESSAGES.OUT_OF_RANGE
        };
    }

    // ==========================================
    // Change Detection & Notification System
    // ==========================================

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function(changedFields, kittenId)
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this._changeListeners.push(listener);
        return () => {
            const index = this._changeListeners.indexOf(listener);
            if (index > -1) {
                this._changeListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of state changes
     * @param {string[]} changedFields - Array of field names that changed
     * @param {string} kittenId - Optional kitten ID for kitten-specific changes
     */
    _notifyListeners(changedFields, kittenId = null) {
        this._changeListeners.forEach(listener => {
            try {
                listener(changedFields, kittenId);
            } catch (e) {
                console.error('State change listener error:', e);
            }
        });
    }

    /**
     * Check if a value has changed and update tracking
     * @param {string} key - Unique key for the value (e.g., "kitten-1-weightGrams")
     * @param {*} newValue - The new value to compare
     * @returns {boolean} True if value changed, false otherwise
     */
    hasChanged(key, newValue) {
        const previousValue = this._previousState.get(key);

        // Handle special cases for comparison
        if (previousValue === newValue) return false;
        if (typeof previousValue === 'number' && typeof newValue === 'number') {
            // Use epsilon comparison for floats
            if (Math.abs(previousValue - newValue) < 0.0001) return false;
        }

        // Value has changed - update tracking
        this._previousState.set(key, newValue);
        return true;
    }

    /**
     * Get the previous value for a key
     * @param {string} key - Unique key
     * @returns {*} Previous value or undefined
     */
    getPreviousValue(key) {
        return this._previousState.get(key);
    }

    /**
     * Clear change tracking for a specific kitten (useful when kitten is removed)
     * @param {string} kittenId - The kitten ID to clear
     */
    clearKittenTracking(kittenId) {
        const keysToDelete = [];
        for (const key of this._previousState.keys()) {
            if (key.startsWith(kittenId + '-')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this._previousState.delete(key));
    }

    // ==========================================
    // Kitten CRUD Methods (State as Source of Truth)
    // ==========================================

    /**
     * Add a new kitten to state
     * @param {Object} kittenData - Initial kitten data
     * @returns {Object} The added kitten with ID
     */
    addKitten(kittenData) {
        const kitten = {
            id: kittenData.id || `kitten-${this.incrementKittenCounter()}`,
            name: kittenData.name || '',
            weightGrams: kittenData.weightGrams || 0,
            weightLb: kittenData.weightLb || 0,
            topical: kittenData.topical || Constants.DEFAULTS.TOPICAL,
            panacurDays: kittenData.panacurDays ?? Constants.DEFAULTS.PANACUR_DAYS,
            ponazurilDays: kittenData.ponazurilDays ?? Constants.DEFAULTS.PONAZURIL_DAYS,
            ringwormStatus: kittenData.ringwormStatus || Constants.RINGWORM_STATUS.NOT_SCANNED,
            medicationStatus: kittenData.medicationStatus || {
                flea: Constants.STATUS.TODO,
                capstar: Constants.STATUS.TODO,
                panacur: Constants.STATUS.TODO,
                ponazuril: Constants.STATUS.TODO,
                drontal: Constants.STATUS.TODO
            },
            medicationEnabled: kittenData.medicationEnabled || {
                flea: true,
                capstar: true,
                panacur: true,
                ponazuril: true,
                drontal: true
            },
            ...kittenData
        };

        this.state.kittens.push(kitten);
        this._notifyListeners(['kittens', 'kittenAdded'], kitten.id);
        return kitten;
    }

    /**
     * Update a kitten's data with change detection
     * @param {string} kittenId - The kitten ID to update
     * @param {Object} updates - Object with fields to update
     * @returns {string[]} Array of field names that actually changed
     */
    updateKitten(kittenId, updates) {
        const kitten = this.getKitten(kittenId);
        if (!kitten) return [];

        const changedFields = [];

        for (const [field, value] of Object.entries(updates)) {
            const trackingKey = `${kittenId}-${field}`;

            if (this.hasChanged(trackingKey, value)) {
                kitten[field] = value;
                changedFields.push(field);
            }
        }

        if (changedFields.length > 0) {
            this._notifyListeners(changedFields, kittenId);
        }

        return changedFields;
    }

    /**
     * Remove a kitten from state
     * @param {string} kittenId - The kitten ID to remove
     * @returns {boolean} True if removed, false if not found
     */
    removeKitten(kittenId) {
        const index = this.state.kittens.findIndex(k => k.id === kittenId);
        if (index === -1) return false;

        this.state.kittens.splice(index, 1);
        this.clearKittenTracking(kittenId);
        this._notifyListeners(['kittens', 'kittenRemoved'], kittenId);
        return true;
    }

    /**
     * Get a kitten by ID
     * @param {string} kittenId - The kitten ID
     * @returns {Object|undefined} The kitten object or undefined
     */
    getKitten(kittenId) {
        return this.state.kittens.find(k => k.id === kittenId);
    }

    /**
     * Check if a kitten exists
     * @param {string} kittenId - The kitten ID
     * @returns {boolean} True if exists
     */
    hasKitten(kittenId) {
        return this.state.kittens.some(k => k.id === kittenId);
    }

    /**
     * Debounce utility - delays function execution until after wait ms have elapsed
     * since the last time the debounced function was invoked
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // State management
    getState() {
        return this.state;
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    getKittens() {
        return this.state.kittens;
    }

    setKittens(kittens) {
        this.state.kittens = kittens;
    }

    getKittenCounter() {
        return this.state.kittenCounter;
    }

    setKittenCounter(counter) {
        this.state.kittenCounter = counter;
    }

    incrementKittenCounter() {
        this.state.kittenCounter++;
        return this.state.kittenCounter;
    }

    // Constants
    getOutOfRangeString() {
        return this.constants.outOfRangeString;
    }

    // Utility Functions
    static convertToPounds(grams) {
        return grams / 453.59237;
    }

    /**
     * Format a number with thousands separators and optional decimal places
     * @param {number} num - The number to format
     * @param {number} decimals - Number of decimal places (default: 0 for integers)
     * @returns {string} Formatted number string
     */
    static formatNumber(num, decimals = 0) {
        if (typeof num !== 'number' || isNaN(num)) {
            return String(num);
        }
        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    static updateDateTime() {
        const now = new Date();
        
        // Format date parts
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const dayName = dayNames[now.getDay()];
        const monthName = monthNames[now.getMonth()];
        const day = now.getDate();
        const year = now.getFullYear();
        
        // Format time
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        
        // Build the formatted string: "Wednesday, August 27 2025 • 4:20 PM"
        const dateTimeString = `${dayName}, ${monthName} ${day} ${year} at ${hours}:${minutesStr} ${ampm}`;

        console.log(dateTimeString);
        
        // Update the h2 element
        const headerElement = document.querySelector('h2.print-only');
        if (headerElement) {
            headerElement.textContent = 'Cat Intake • ' + dateTimeString;
        }
    }

    static formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Format date for display (without year)
    static formatDateForDisplay(dateString) {
        const parts = dateString.split('/');
        return `${parts[0]}/${parts[1]}`;
    }

    // Helper to get medication status
    getMedicationStatus(kittenId, medType) {
        const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, medType));
        if (toggleCheckbox && !toggleCheckbox.checked) {
            return Constants.STATUS.SKIP;
        }

        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, medType)}"]`);
        let status = Constants.STATUS.TODO;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });
        return status;
    }

    // Data Collection
    collectKittenData() {
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        const collectedKittens = [];

        kittenForms.forEach(form => {
            const kittenId = form.id;
            const name = document.getElementById(Constants.ID.name(kittenId)).value.trim();
            const weightGrams = parseFloat(document.getElementById(Constants.ID.weight(kittenId)).value);
            const weightLb = AppState.convertToPounds(weightGrams);

            const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
            let topical = Constants.DEFAULTS.TOPICAL;
            topicalRadios.forEach(radio => {
                if (radio.checked) topical = radio.value;
            });

            // Get medication statuses using new system
            const fleaStatus = this.getMedicationStatus(kittenId, 'flea');
            const capstarStatus = this.getMedicationStatus(kittenId, 'capstar');
            const panacurStatus = this.getMedicationStatus(kittenId, 'panacur');
            const ponazurilStatus = this.getMedicationStatus(kittenId, 'ponazuril');
            const drontalStatus = this.getMedicationStatus(kittenId, 'drontal');

            // Convert status to boolean for backward compatibility
            const fleaGiven = fleaStatus === Constants.STATUS.DONE;

            const panacurRadios = document.querySelectorAll(`input[name="${Constants.ID.panacurName(kittenId)}"]`);
            let panacurDays = Constants.DEFAULTS.PANACUR_DAYS;
            panacurRadios.forEach(radio => {
                if (radio.checked) panacurDays = parseInt(radio.value);
            });

            const ponazurilRadios = document.querySelectorAll(`input[name="${Constants.ID.ponazurilName(kittenId)}"]`);
            let ponazurilDays = Constants.DEFAULTS.PONAZURIL_DAYS;
            ponazurilRadios.forEach(radio => {
                if (radio.checked) ponazurilDays = parseInt(radio.value);
            });

            // Convert status to boolean for backward compatibility with schedule system
            const panacurDay1Given = panacurStatus === Constants.STATUS.DONE;
            const ponazurilDay1Given = ponazurilStatus === Constants.STATUS.DONE;
            const drontalDay1Given = drontalStatus === Constants.STATUS.DONE;
            const capstarDay1Given = capstarStatus === Constants.STATUS.DONE;

            // Get ringworm data
            const ringwormRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);
            let ringwormStatus = Constants.RINGWORM_STATUS.NOT_SCANNED;
            ringwormRadios.forEach(radio => {
                if (radio.checked) ringwormStatus = radio.value;
            });

            const kitten = {
                id: kittenId,
                name,
                weightGrams,
                weightLb,
                topical: fleaStatus === Constants.STATUS.SKIP ? Constants.TOPICAL.NONE : topical,
                fleaGiven,
                panacurDays: panacurStatus === Constants.STATUS.SKIP ? 0 : panacurDays,
                ponazurilDays: ponazurilStatus === Constants.STATUS.SKIP ? 0 : ponazurilDays,
                ringwormStatus,
                day1Given: {
                    panacur: panacurDay1Given,
                    ponazuril: ponazurilDay1Given,
                    drontal: drontalDay1Given,
                    capstar: capstarDay1Given
                },
                // New medication status fields
                medicationStatus: {
                    flea: fleaStatus,
                    capstar: capstarStatus,
                    panacur: panacurStatus,
                    ponazuril: ponazurilStatus,
                    drontal: drontalStatus
                }
            };

            collectedKittens.push(kitten);
        });

        this.setKittens(collectedKittens);
        return collectedKittens;
    }
}

// Export to global namespace
window.AppState = AppState;