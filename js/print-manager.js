/**
 * Print Manager Module - Print functionality
 * Handles printing specific sections of the application
 */

class PrintManager {
    constructor(appState) {
        this.appState = appState;

        // Records print 3-up; wrap each row of cards in a block .print-row so the
        // page break lands between whole rows. The wrapper is a block box, which
        // WebKit/Safari honors break-inside on (it ignores break-inside on grid
        // items). Done only around printing so the live editing DOM stays flat.
        // PER_ROW must match the grid-template-columns count in styles.css.
        this.PER_ROW = 3;
        window.addEventListener('beforeprint', () => this.groupRecordRows());
        window.addEventListener('afterprint', () => this.ungroupRecordRows());

        // Also group when the print media query flips. DevTools "emulate print
        // media" toggles this (Chrome fires it; Safari may not) without firing
        // beforeprint, so this keeps the inspector preview accurate too. Grouping
        // is idempotent, so overlapping with beforeprint during real printing is fine.
        const printMq = window.matchMedia('print');
        printMq.addEventListener('change', e => e.matches ? this.groupRecordRows() : this.ungroupRecordRows());
    }

    /** Wrap flat .kitten-form cards into rows of PER_ROW for print. Idempotent. */
    groupRecordRows() {
        const container = document.getElementById('kittens-container');
        if (!container) return;
        this.ungroupRecordRows();
        const forms = Array.from(container.children).filter(el => el.classList.contains('kitten-form'));
        for (let i = 0; i < forms.length; i += this.PER_ROW) {
            const row = document.createElement('div');
            row.className = 'print-row';
            container.insertBefore(row, forms[i]);
            forms.slice(i, i + this.PER_ROW).forEach(f => row.appendChild(f));
        }
    }

    /** Unwrap .print-row, restoring the flat card order used for editing. */
    ungroupRecordRows() {
        const container = document.getElementById('kittens-container');
        if (!container) return;
        container.querySelectorAll('.print-row').forEach(row => {
            while (row.firstChild) container.insertBefore(row.firstChild, row);
            row.remove();
        });
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