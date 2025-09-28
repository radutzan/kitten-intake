/**
 * Print Manager Module - Print functionality
 * Handles printing specific sections of the application
 */

class PrintManager {
    constructor(appState) {
        this.appState = appState;
    }

    printSection(section) {
        // Update date/time before printing
        this.appState.constructor.updateDateTime();

        const body = document.body;
        
        // Remove any existing print classes
        body.classList.remove('print-checklist-only', 'print-dispense-only');
        
        // Add appropriate print class
        if (section === 'checklist') {
            body.classList.add('print-checklist-only');
        } else if (section === 'dispense') {
            body.classList.add('print-dispense-only');
        }
        
        // Print
        window.print();
    }

    /**
     * Setup print-specific CSS classes for a section
     * @param {string} section - Section to print ('checklist' or 'dispense')
     */
    setupPrintClasses(section) {
        const body = document.body;
        
        // Remove any existing print classes
        body.classList.remove('print-checklist-only', 'print-dispense-only');
        
        // Add appropriate print class
        if (section === 'checklist') {
            body.classList.add('print-checklist-only');
        } else if (section === 'dispense') {
            body.classList.add('print-dispense-only');
        }
    }

    /**
     * Clear all print-specific CSS classes
     */
    clearPrintClasses() {
        const body = document.body;
        body.classList.remove('print-checklist-only', 'print-dispense-only');
    }
}

// Export to global namespace
window.PrintManager = PrintManager;