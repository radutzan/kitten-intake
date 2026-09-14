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
        this.urlStateManager = new UrlStateManager();
        this.pageZoomManager = new PageZoomManager();

        // Store references in global namespace for easy access
        window.KittenApp = {
            appState: this.appState,
            doseCalculator: this.doseCalculator,
            formManager: this.formManager,
            scheduleManager: this.scheduleManager,
            resultsDisplay: this.resultsDisplay,
            printManager: this.printManager,
            urlStateManager: this.urlStateManager,
            pageZoomManager: this.pageZoomManager,
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
            this.urlStateManager.updateUrlNow();
        };
        
        window.removeKitten = (kittenId) => {
            this.formManager.removeKitten(kittenId);
            this.urlStateManager.updateUrlNow();
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
        AppState.setIntakeDate(AppState.todayISO()); // Default; restored sessions override it

        // Check for URL state first (shared link)
        if (this.urlStateManager.isSharedLink()) {
            // This is a genuinely shared link - load it temporarily
            const urlData = this.urlStateManager.loadTemporarily();
            if (urlData) {
                // Load URL state instead of localStorage
                localStorageManager.restoreFormData(urlData);
                this.showSharedUrlBanner();
                setTimeout(() => {
                    this.resultsDisplay.updateResultsAutomatically();
                    this.resultsDisplay.updateHeaderButtons();
                    // Update pagination dots for mobile
                    this.formManager.updatePaginationDots();
                }, 100);
            } else {
                // URL state was invalid, fall back to normal flow
                this.loadNormalState();
            }
        } else if (this.urlStateManager.isTemporaryStateLoaded()) {
            // We were viewing a shared form but URL was cleared - show banner
            this.showSharedUrlBanner();
            this.loadNormalState();
        } else {
            // Normal load from localStorage (includes reload with matching URL)
            this.loadNormalState();
        }

        // Hide results section initially
        document.getElementById('results-section').style.display = 'none';

        // Touch event for mobile devices
        document.addEventListener("touchstart", function(){}, true);
    }

    loadNormalState() {
        // Try to restore saved data from localStorage
        const savedData = localStorageManager.loadFormData();
        if (savedData) {
            // Restore saved forms
            localStorageManager.restoreFormData(savedData);
            // Update all calculations and displays
            setTimeout(() => {
                this.resultsDisplay.updateResultsAutomatically();
                this.resultsDisplay.updateHeaderButtons();
                // Update pagination dots for mobile
                this.formManager.updatePaginationDots();
                // Update URL to reflect restored state
                this.urlStateManager.updateUrlNow();
            }, 100);
        } else {
            // No saved data, create default first kitten form
            this.formManager.addKitten();
            this.resultsDisplay.updateHeaderButtons();
            // Update URL for empty form
            this.urlStateManager.updateUrlNow();
        }
    }

    showSharedUrlBanner() {
        const banner = document.getElementById('shared-url-banner');
        if (banner) {
            banner.style.display = 'block';

            // Update message with backup info if available
            const backupInfo = this.urlStateManager.getBackupInfo();
            const messageSpan = banner.querySelector('.shared-url-message');
            if (messageSpan && backupInfo && backupInfo.kittenCount > 0) {
                messageSpan.textContent = `Viewing shared form (your ${backupInfo.kittenCount} cat${backupInfo.kittenCount > 1 ? 's' : ''} backed up)`;
            }
        }
    }

    hideSharedUrlBanner() {
        const banner = document.getElementById('shared-url-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Global event listeners
        document.getElementById('add-kitten-btn').addEventListener('click', () => {
            window.addKitten();
        });

        // Intake date applies to every cat in the session
        const intakeDateInput = document.getElementById('intake-date');

        // The input is invisible over the pill; open the picker on any click
        // (desktop browsers otherwise only open it from the calendar icon)
        intakeDateInput.addEventListener('click', () => {
            try { intakeDateInput.showPicker(); } catch (e) { /* native tap handling */ }
        });

        intakeDateInput.addEventListener('change', (e) => {
            if (!e.target.value) e.target.value = AppState.todayISO();
            AppState.updateDateTime();
            this.resultsDisplay.updateResultsAutomatically();
            this.autoSaveFormData();
        });

        // Nav menu dropdown
        const menuBtn = document.getElementById('nav-menu-btn');
        const menuDropdown = document.getElementById('nav-menu-dropdown');

        menuBtn.addEventListener('click', () => {
            menuDropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-menu-container')) {
                menuDropdown.classList.remove('open');
            }
        });

        // Handle menu actions
        menuDropdown.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            menuDropdown.classList.remove('open');

            switch (action) {
                case 'clear':
                    window.clearAllData();
                    break;
                case 'share':
                    this.handleShare();
                    break;
                case 'print':
                    this.handlePrint();
                    break;
                case 'zoom':
                    this.pageZoomManager.open();
                    break;
            }
        });

        // Eject button (restore backed up data)
        document.getElementById('eject-btn').addEventListener('click', () => {
            this.urlStateManager.ejectAndRestore();
        });

        // Keep button (accept shared data as own)
        document.getElementById('keep-btn').addEventListener('click', () => {
            this.urlStateManager.keepUrlState();
            this.hideSharedUrlBanner();
        });

        // Header print buttons
        // document.getElementById('print-checklist-btn').addEventListener('click', () => {
        //     window.printSection('checklist');
        // });

        // document.getElementById('print-dosages-btn').addEventListener('click', () => {
        //     window.printSection('dispense');
        // });
    }

    /**
     * iOS 27 silently ignores window.print() in home-screen web apps (it works in
     * Safari tabs). The OS version in the UA is frozen at 18_x since iOS 26, but
     * the Version/NN token is accurate in both Safari and standalone mode.
     */
    isPrintBlockedInStandalone() {
        if (window.navigator.standalone !== true) return false;
        const match = navigator.userAgent.match(/Version\/(\d+)/);
        return match !== null && parseInt(match[1], 10) >= 27;
    }

    handlePrint() {
        if (!this.isPrintBlockedInStandalone()) {
            window.print();
            return;
        }

        const openInSafari = confirm(
            'Printing doesn\'t work from the Home Screen app on this version of iOS.\n\n' +
            'Open this intake in Safari to print?'
        );
        if (!openInSafari) return;

        // Home-screen apps don't share storage with Safari, so carry the data over
        // in the share URL. Copy it first so there's a fallback if the redirect fails.
        this.urlStateManager.updateUrlNow();
        const url = window.location.href;
        const copied = this.copyTextSync(url);

        // x-safari- forces Safari even for in-scope URLs, but only accepts https
        // (plain-http local testing gets "address is invalid").
        if (window.location.protocol === 'https:') {
            window.location.href = `x-safari-${url}`;
        } else {
            alert(copied
                ? 'Link copied. Paste it into Safari to print.'
                : 'Couldn\'t copy the link. Use Share Link, then open it in Safari.');
        }
    }

    /** Synchronous copy via a hidden textarea — works outside secure contexts
     *  (navigator.clipboard is undefined on plain http) and within the tap gesture. */
    copyTextSync(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }

    async handleShare() {
        const menuBtn = document.getElementById('nav-menu-btn');
        const originalText = menuBtn.textContent;

        const showFeedback = (message) => {
            menuBtn.textContent = message;
            setTimeout(() => { menuBtn.textContent = originalText; }, 1500);
        };

        try {
            // URL is already up-to-date, just copy it
            await navigator.clipboard.writeText(window.location.href);
            showFeedback('Copied!');
        } catch (e) {
            // Fallback for older browsers
            showFeedback(this.copyTextSync(window.location.href) ? 'Copied!' : 'Failed');
        }
    }

    // Auto-save helper function
    autoSaveFormData() {
        if (window.localStorageManager) {
            localStorageManager.saveFormData();
        }
        // Update URL in real-time for instant sharing
        if (this.urlStateManager) {
            this.urlStateManager.updateUrlRealtime();
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

            // Clear temporary shared state if viewing one
            if (this.urlStateManager.isTemporaryStateLoaded()) {
                try {
                    sessionStorage.removeItem(this.urlStateManager.backupStorageKey);
                    sessionStorage.removeItem(this.urlStateManager.loadedStateKey);
                } catch (e) { /* ignore */ }
                this.hideSharedUrlBanner();
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

            // Reset intake date to today (also updates the print header)
            AppState.setIntakeDate(AppState.todayISO());

            // Add fresh kitten form (this also updates URL)
            this.formManager.addKitten();

            // Update button states
            this.resultsDisplay.updateHeaderButtons();

            // Update URL to reflect cleared state
            this.urlStateManager.updateUrlNow();
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