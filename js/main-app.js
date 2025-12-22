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
        this.shelterLuvSync = new ShelterLuvSync(this.appState);

        // Store references in global namespace for easy access
        window.KittenApp = {
            appState: this.appState,
            doseCalculator: this.doseCalculator,
            formManager: this.formManager,
            scheduleManager: this.scheduleManager,
            resultsDisplay: this.resultsDisplay,
            printManager: this.printManager,
            urlStateManager: this.urlStateManager,
            shelterLuvSync: this.shelterLuvSync,
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
        AppState.updateDateTime(); // Set current date and time in header

        // Check for URL state first (shared link)
        if (this.urlStateManager.hasUrlState()) {
            const urlData = this.urlStateManager.loadTemporarily();
            if (urlData) {
                // Load URL state instead of localStorage
                localStorageManager.restoreFormData(urlData);
                this.showSharedUrlBanner();
                setTimeout(() => {
                    this.resultsDisplay.updateResultsAutomatically();
                    this.resultsDisplay.updateHeaderButtons();
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
            // Normal load from localStorage
            this.loadNormalState();
        }

        // Hide results section initially
        document.getElementById('results-section').style.display = 'none';

        // Initialize ShelterLuv UI if enabled
        this.initializeShelterLuv();

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

        document.getElementById('clear-all-btn').addEventListener('click', () => {
            window.clearAllData();
        });

        // Share button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.handleShare();
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

    async handleShare() {
        const shareBtn = document.getElementById('share-btn');
        const originalText = shareBtn.textContent;

        try {
            // URL is already up-to-date, just copy it
            await navigator.clipboard.writeText(window.location.href);
            shareBtn.textContent = 'Copied!';
            setTimeout(() => { shareBtn.textContent = originalText; }, 1500);
        } catch (e) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = window.location.href;
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);

            shareBtn.textContent = success ? 'Copied!' : 'Failed';
            setTimeout(() => { shareBtn.textContent = originalText; }, 1500);
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

            // Add fresh kitten form (this also updates URL)
            this.formManager.addKitten();

            // Update button states
            this.resultsDisplay.updateHeaderButtons();

            // Update date/time header
            AppState.updateDateTime();

            // Update URL to reflect cleared state
            this.urlStateManager.updateUrlNow();
        }
    }

    // ========================
    // ShelterLuv Integration
    // ========================

    initializeShelterLuv() {
        const panel = document.getElementById('shelterluv-panel');
        if (!panel) return;

        // Show panel if feature is enabled
        if (ShelterLuvSync.isEnabled()) {
            panel.style.display = 'block';
            this.setupShelterLuvEventListeners();
            this.loadShelterLuvConfig();
            this.updateShelterLuvSyncButton();
        }
    }

    setupShelterLuvEventListeners() {
        // Toggle settings panel
        const toggle = document.getElementById('shelterluv-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const settings = document.getElementById('shelterluv-settings');
                if (settings) {
                    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Save config button
        const saveBtn = document.getElementById('shelterluv-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveShelterLuvConfig());
        }

        // Clear config button
        const clearBtn = document.getElementById('shelterluv-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearShelterLuvConfig());
        }

        // Test connection button
        const testBtn = document.getElementById('shelterluv-test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testShelterLuvConnection());
        }

        // Sync button
        const syncBtn = document.getElementById('shelterluv-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncToShelterLuv());
        }
    }

    loadShelterLuvConfig() {
        const config = this.shelterLuvSync.getConfig();
        if (config) {
            const apiKeyInput = document.getElementById('shelterluv-api-key');
            const slugInput = document.getElementById('shelterluv-slug');

            if (apiKeyInput && config.apiKey) {
                apiKeyInput.value = config.apiKey;
            }
            if (slugInput && config.shelterSlug) {
                slugInput.value = config.shelterSlug;
            }

            this.updateShelterLuvStatusBadge(config.apiKey ? 'configured' : 'not-configured');
        } else {
            this.updateShelterLuvStatusBadge('not-configured');
        }
    }

    saveShelterLuvConfig() {
        const apiKey = document.getElementById('shelterluv-api-key')?.value || '';
        const slug = document.getElementById('shelterluv-slug')?.value || '';

        const success = this.shelterLuvSync.saveConfig({
            apiKey: apiKey,
            shelterSlug: slug,
            autoSync: false
        });

        if (success) {
            this.showShelterLuvMessage('Configuration saved', 'success');
            this.updateShelterLuvStatusBadge(apiKey ? 'configured' : 'not-configured');
            this.updateShelterLuvSyncButton();
        } else {
            this.showShelterLuvMessage('Failed to save configuration', 'error');
        }
    }

    clearShelterLuvConfig() {
        if (!confirm('Clear ShelterLuv configuration? This will remove your API key.')) {
            return;
        }

        this.shelterLuvSync.clearConfig();

        const apiKeyInput = document.getElementById('shelterluv-api-key');
        const slugInput = document.getElementById('shelterluv-slug');
        if (apiKeyInput) apiKeyInput.value = '';
        if (slugInput) slugInput.value = '';

        this.showShelterLuvMessage('Configuration cleared', 'success');
        this.updateShelterLuvStatusBadge('not-configured');
        this.updateShelterLuvSyncButton();
    }

    async testShelterLuvConnection() {
        const testBtn = document.getElementById('shelterluv-test-btn');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }

        // Save current config first
        this.saveShelterLuvConfig();

        try {
            const result = await this.shelterLuvSync.testConnection();

            if (result.success) {
                this.showShelterLuvMessage(result.message, 'success');
            } else {
                this.showShelterLuvMessage(result.message, 'error');
            }
        } catch (error) {
            this.showShelterLuvMessage('Connection test failed: ' + error.message, 'error');
        }

        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }
    }

    async syncToShelterLuv() {
        const syncBtn = document.getElementById('shelterluv-sync-btn');
        const statusEl = document.getElementById('shelterluv-sync-status');

        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.textContent = 'Syncing...';
        }
        if (statusEl) {
            statusEl.textContent = 'Syncing...';
            statusEl.className = 'shelterluv-sync-status syncing';
        }

        try {
            const result = await this.shelterLuvSync.syncAllKittens();

            if (result.success) {
                if (statusEl) {
                    statusEl.textContent = `Synced ${result.synced} cat(s)`;
                    statusEl.className = 'shelterluv-sync-status success';
                }
                this.showShelterLuvMessage(`Successfully synced ${result.synced} cat(s) to ShelterLuv`, 'success');
            } else {
                if (statusEl) {
                    statusEl.textContent = result.message || `Failed: ${result.failed} error(s)`;
                    statusEl.className = 'shelterluv-sync-status error';
                }
                this.showShelterLuvMessage(result.message || result.errors.join(', '), 'error');
            }
        } catch (error) {
            if (statusEl) {
                statusEl.textContent = 'Sync failed';
                statusEl.className = 'shelterluv-sync-status error';
            }
            this.showShelterLuvMessage('Sync failed: ' + error.message, 'error');
        }

        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.textContent = 'Sync to ShelterLuv';
        }

        // Clear status after 5 seconds
        setTimeout(() => {
            if (statusEl) {
                statusEl.textContent = '';
                statusEl.className = 'shelterluv-sync-status';
            }
        }, 5000);
    }

    updateShelterLuvStatusBadge(status) {
        const badge = document.getElementById('shelterluv-status-badge');
        if (!badge) return;

        if (status === 'configured') {
            badge.textContent = 'Configured';
            badge.className = 'shelterluv-status configured';
        } else {
            badge.textContent = 'Not Configured';
            badge.className = 'shelterluv-status not-configured';
        }
    }

    updateShelterLuvSyncButton() {
        const syncBtn = document.getElementById('shelterluv-sync-btn');
        if (!syncBtn) return;

        const hasApiKey = this.shelterLuvSync.hasApiKey();
        syncBtn.disabled = !hasApiKey;
        syncBtn.title = hasApiKey ? 'Sync all cats to ShelterLuv' : 'Configure API key first';
    }

    showShelterLuvMessage(message, type) {
        const messageEl = document.getElementById('shelterluv-message');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = 'shelterluv-message ' + type;

        // Clear message after 5 seconds
        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'shelterluv-message';
        }, 5000);
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