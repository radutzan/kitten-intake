/**
 * Print Manager Module - Print functionality
 * Handles printing specific sections of the application and the cat picker
 * used to print records, totals and checklist for a subset of cats
 */

class PrintManager {
    constructor(appState, resultsDisplay) {
        this.appState = appState;
        this.resultsDisplay = resultsDisplay;

        // Set by MainApp: called with (Set of kitten ids, 1-based card positions)
        this.onPrint = null;

        this.sheet = document.getElementById('print-sheet');
        this.backdrop = document.getElementById('print-sheet-backdrop');
        this.list = document.getElementById('print-sheet-list');
        this.toggleAllBtn = document.getElementById('print-sheet-toggle-all');
        this.printBtn = document.getElementById('print-sheet-print');
        this.setupPickerListeners();

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

    // ==========================================
    // Cat Picker
    // ==========================================

    setupPickerListeners() {
        this.list.addEventListener('change', () => this.updatePickerControls());

        this.toggleAllBtn.addEventListener('click', () => {
            const checkboxes = this.getPickerCheckboxes();
            const allChecked = checkboxes.every(checkbox => checkbox.checked);
            checkboxes.forEach(checkbox => { checkbox.checked = !allChecked; });
            this.updatePickerControls();
        });

        this.printBtn.addEventListener('click', () => {
            const checkboxes = this.getPickerCheckboxes();
            const kittenIds = new Set();
            const positions = [];
            checkboxes.forEach((checkbox, index) => {
                if (!checkbox.checked) return;
                kittenIds.add(checkbox.value);
                positions.push(index + 1);
            });

            this.closePicker();
            if (this.onPrint) this.onPrint(kittenIds, positions);
        });

        this.backdrop.addEventListener('click', () => this.closePicker());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sheet.classList.contains('open')) this.closePicker();
        });
    }

    /**
     * Open the cat picker
     * @param {number[]} [preselectPositions] - 1-based card positions to check (all when omitted)
     */
    openPicker(preselectPositions = null) {
        this.clearSelection();
        this.list.innerHTML = '';

        document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`).forEach((form, index) => {
            const name = document.getElementById(Constants.ID.name(form.id))?.value.trim();
            const weight = parseFloat(document.getElementById(Constants.ID.weight(form.id))?.value);
            const number = form.querySelector('.number')?.textContent || index + 1;

            const label = document.createElement('label');
            label.className = 'print-sheet-cat';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = form.id;
            checkbox.checked = !preselectPositions || preselectPositions.includes(index + 1);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = name || `Cat ${number}`;
            label.append(checkbox, nameSpan);

            if (weight > 0) {
                const weightText = document.createElement('small');
                weightText.textContent = `${AppState.formatNumber(weight)} g`;
                label.append(weightText);
            }

            this.list.appendChild(label);
        });

        this.updatePickerControls();
        this.sheet.classList.add('open');
        this.backdrop.classList.add('open');
    }

    closePicker() {
        this.sheet.classList.remove('open');
        this.backdrop.classList.remove('open');
    }

    getPickerCheckboxes() {
        return Array.from(this.list.querySelectorAll('input[type="checkbox"]'));
    }

    updatePickerControls() {
        const checkboxes = this.getPickerCheckboxes();
        const count = checkboxes.filter(checkbox => checkbox.checked).length;
        const allChecked = count === checkboxes.length;

        this.toggleAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
        this.printBtn.disabled = count === 0;
        this.printBtn.textContent = allChecked ? 'Export All'
            : count === 0 ? 'Export'
            : `Export ${count} Cat${count === 1 ? '' : 's'}`;
    }

    /**
     * Limit the next printout to these cats: hide the others' records and swap in
     * totals and checklist computed for the subset. A no-op (cleared) when every cat
     * is selected. Applied before window.print() since iOS never fires beforeprint.
     * @param {Set<string>} kittenIds - Cats to print
     */
    applySelection(kittenIds) {
        this.clearSelection();

        const forms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        if (Array.from(forms).every(form => kittenIds.has(form.id))) return;

        forms.forEach(form => form.classList.toggle('print-excluded', !kittenIds.has(form.id)));
        this.resultsDisplay.renderPrintSubset(kittenIds);
        document.body.classList.add('print-subset');

        // Reset on the next tap or key rather than afterprint: Safari can fire
        // afterprint before it lays out the PDF, which would print every cat
        // (or a half-reset page). The print sheet itself is native, so it never
        // triggers these. Deferred so the Export tap that got us here doesn't count.
        setTimeout(() => {
            this._clearOnInteraction = () => this.clearSelection();
            document.addEventListener('pointerdown', this._clearOnInteraction, { capture: true, once: true });
            document.addEventListener('keydown', this._clearOnInteraction, { capture: true, once: true });
        }, 0);
    }

    /** Return printing to all cats. */
    clearSelection() {
        if (this._clearOnInteraction) {
            document.removeEventListener('pointerdown', this._clearOnInteraction, { capture: true });
            document.removeEventListener('keydown', this._clearOnInteraction, { capture: true });
            this._clearOnInteraction = null;
        }
        document.body.classList.remove('print-subset');
        document.querySelectorAll('.print-excluded').forEach(form => form.classList.remove('print-excluded'));
    }

    // ==========================================
    // Section Printing
    // ==========================================

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
