/**
 * Main App Module - Application initialization and coordination
 * Coordinates all modules and provides legacy function wrappers
 */

class MainApp {
    constructor() {
        this.initializeModules();
        this.setupGlobalFunctions();
        this.setupGlobalVariables();
        this.init();
    }

    initializeModules() {
        // Initialize core modules
        this.appState = new AppState();
        this.doseCalculator = DoseCalculator;
        
        // Initialize feature modules with dependencies
        this.formManager = new FormManager(this.appState, this.doseCalculator);
        this.scheduleManager = new ScheduleManager(this.appState);
        this.resultsDisplay = new ResultsDisplay(this.appState, this.scheduleManager, this.doseCalculator);
        this.printManager = new PrintManager(this.appState);
        
        // Store references in global namespace for easy access
        window.KittenApp = {
            appState: this.appState,
            doseCalculator: this.doseCalculator,
            formManager: this.formManager,
            scheduleManager: this.scheduleManager,
            resultsDisplay: this.resultsDisplay,
            printManager: this.printManager,
            mainApp: this
        };
    }

    setupGlobalVariables() {
        // Legacy global variables for localStorage compatibility
        window.kittens = [];
        window.kittenCounter = 0;
        
        // Sync global variables with app state
        Object.defineProperty(window, 'kittens', {
            get: () => this.appState.getKittens(),
            set: (value) => this.appState.setKittens(value)
        });
        
        Object.defineProperty(window, 'kittenCounter', {
            get: () => this.appState.getKittenCounter(),
            set: (value) => this.appState.setKittenCounter(value)
        });
    }

    setupGlobalFunctions() {
        // Legacy function wrappers for HTML event handlers
        window.addKitten = () => {
            this.formManager.addKitten();
            this.resultsDisplay.updateResultsAutomatically();
            this.resultsDisplay.updateHeaderButtons();
        };
        
        window.removeKitten = (kittenId) => {
            this.formManager.removeKitten(kittenId);
        };
        
        window.printSection = (section) => {
            this.printManager.printSection(section);
        };
        
        window.clearAllData = () => {
            this.clearAllData();
        };
        
        window.calculateAndDisplay = () => {
            this.resultsDisplay.updateResultsAutomatically();
        };
        
        window.updateResultsAutomatically = () => {
            this.resultsDisplay.updateResultsAutomatically();
        };
        
        window.updateWeightDisplay = (kittenId) => {
            this.formManager.updateWeightDisplay(kittenId);
        };
        
        window.updateResultDisplay = (kittenId) => {
            this.formManager.updateResultDisplay(kittenId);
        };
        
        window.updateFleaCheckboxStates = (kittenId) => {
            this.formManager.updateFleaCheckboxStates(kittenId);
        };
        
        window.validateField = (kittenId, fieldName) => {
            return this.formManager.validateField(kittenId, fieldName);
        };
        
        window.validateAllKittens = () => {
            return this.formManager.validateAllKittens();
        };
        
        // Utility functions
        window.convertToPounds = (grams) => {
            return AppState.convertToPounds(grams);
        };
        
        window.updateDateTime = () => {
            AppState.updateDateTime();
        };
    }

    init() {
        this.setupEventListeners();
        AppState.updateDateTime(); // Set current date and time in header
        
        // Try to restore saved data first
        const savedData = localStorageManager.loadFormData();
        if (savedData) {
            // Restore saved forms
            localStorageManager.restoreFormData(savedData);
            // Update all calculations and displays
            setTimeout(() => {
                this.resultsDisplay.updateResultsAutomatically();
                this.resultsDisplay.updateHeaderButtons();
            }, 100);
        } else {
            // No saved data, create default first kitten form
            this.formManager.addKitten();
            this.resultsDisplay.updateHeaderButtons();
        }
        
        // Hide results section initially
        document.getElementById('results-section').style.display = 'none';

        // Touch event for mobile devices
        document.addEventListener("touchstart", function(){}, true);
    }

    setupEventListeners() {
        // Global event listeners
        document.getElementById('add-kitten-btn').addEventListener('click', () => {
            window.addKitten();
        });
        
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            window.clearAllData();
        });
        
        // Header print buttons
        // document.getElementById('print-checklist-btn').addEventListener('click', () => {
        //     window.printSection('checklist');
        // });
        
        // document.getElementById('print-dosages-btn').addEventListener('click', () => {
        //     window.printSection('dispense');
        // });
    }

    // Auto-save helper function
    autoSaveFormData() {
        if (window.localStorageManager) {
            localStorageManager.saveFormData();
        }
    }

    // Clear all data function with confirmation
    clearAllData() {
        const hasData = document.querySelectorAll('.kitten-form').length > 0;
        
        if (!hasData) {
            alert('No data to clear.');
            return;
        }
        
        const confirmed = confirm(
            'Are you sure you want to clear all cat data?\n\n' +
            'This cannot be undone.'
        );
        
        if (confirmed) {
            // Clear localStorage
            if (window.localStorageManager) {
                localStorageManager.clearFormData();
            }
            
            // Clear all forms from DOM
            const container = document.getElementById('kittens-container');
            if (container) {
                container.innerHTML = '';
            }
            
            // Reset application state
            this.appState.setKittens([]);
            this.appState.setKittenCounter(0);
            
            // Hide results section
            document.getElementById('results-section').style.display = 'none';
            
            // Add fresh kitten form
            this.formManager.addKitten();
            
            // Update button states
            this.resultsDisplay.updateHeaderButtons();
            
            // Update date/time header
            AppState.updateDateTime();
        }
    }

    /**
     * Get current application state
     * @returns {object} Current application state
     */
    getState() {
        return this.appState.getState();
    }

    /**
     * Reset the application to initial state
     */
    reset() {
        this.appState.setKittens([]);
        this.appState.setKittenCounter(0);
        
        const container = document.getElementById('kittens-container');
        if (container) {
            container.innerHTML = '';
        }
        
        document.getElementById('results-section').style.display = 'none';
        this.formManager.addKitten();
        this.resultsDisplay.updateHeaderButtons();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MainApp();
});

// Export to global namespace
window.MainApp = MainApp;