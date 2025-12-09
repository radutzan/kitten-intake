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
        
        this.constants = {
            outOfRangeString: 'Out of range'
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
            day: '2-digit'
        });
    }

    // Data Collection
    collectKittenData() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        const collectedKittens = [];
        
        kittenForms.forEach(form => {
            const kittenId = form.id;
            const name = document.getElementById(`${kittenId}-name`).value.trim();
            const weightGrams = parseFloat(document.getElementById(`${kittenId}-weight`).value);
            const weightLb = AppState.convertToPounds(weightGrams);
            
            const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
            let topical = 'none';
            topicalRadios.forEach(radio => {
                if (radio.checked) topical = radio.value;
            });
            
            // Get flea status from radio buttons
            const fleaStatusRadios = document.querySelectorAll(`input[name="${kittenId}-flea-status"]`);
            let fleaStatus = 'neither';
            fleaStatusRadios.forEach(radio => {
                if (radio.checked) fleaStatus = radio.value;
            });
            
            const fleaGiven = fleaStatus === 'given';
            const bathed = fleaStatus === 'bathed';
            
            const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
            let panacurDays = 3;
            panacurRadios.forEach(radio => {
                if (radio.checked) panacurDays = parseInt(radio.value);
            });
            
            const panacurDay1Given = document.getElementById(`${kittenId}-panacur-day1`).checked;
            const ponazurilDay1Given = document.getElementById(`${kittenId}-ponazuril-day1`).checked;
            const drontalDay1Given = document.getElementById(`${kittenId}-drontal-day1`).checked;
            
            // Get ringworm data
            const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
            let ringwormStatus = 'not-scanned';
            ringwormRadios.forEach(radio => {
                if (radio.checked) ringwormStatus = radio.value;
            });

            const kitten = {
                id: kittenId,
                name,
                weightGrams,
                weightLb,
                topical,
                fleaGiven,
                bathed,
                panacurDays,
                ponazurilDays: 3,
                ringwormStatus,
                day1Given: {
                    panacur: panacurDay1Given,
                    ponazuril: ponazurilDay1Given,
                    drontal: drontalDay1Given
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