/**
 * Print Manager Module - Print functionality
 * Handles printing specific sections of the application
 */

class PrintManager {
    constructor(appState) {
        this.appState = appState;

        // Records print 3-up via a plain CSS grid on #kittens-container (styles.css) —
        // no DOM grouping, because iOS Safari fires neither beforeprint nor the
        // matchMedia('print') change event, so any print-time restructuring would
        // silently no-op there and cards would fall back to full-width rows.
        window.addEventListener('beforeprint', () => this.applyPrintTitle());
        window.addEventListener('afterprint', () => this.restoreTitle());
    }

    /** Mirror the print-only heading (date/time and all) into document.title so the
     *  browser's PDF header and default filename carry it. Restored on afterprint so
     *  the live tab title stays clean. */
    applyPrintTitle() {
        const heading = document.querySelector('h2.print-only');
        if (!heading) return;
        this._savedTitle = document.title;
        document.title = heading.textContent;
    }

    /** Restore the tab title saved before printing. */
    restoreTitle() {
        if (this._savedTitle != null) {
            document.title = this._savedTitle;
            this._savedTitle = null;
        }
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