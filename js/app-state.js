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

        // Legacy support - use Constants.MESSAGES.OUT_OF_RANGE instead
        this.constants = {
            outOfRangeString: Constants.MESSAGES.OUT_OF_RANGE
        };
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