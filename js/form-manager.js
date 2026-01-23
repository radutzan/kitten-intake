/**
 * Form Manager Module - Orchestrates form creation, validation, and event handling
 * Delegates to specialized modules: FormPagination, FormTemplate, FormRenderer, FormValidator
 */

class FormManager {
    /**
     * @param {AppState} appState - Reference to the app state
     * @param {DoseCalculator} doseCalculator - Reference to the dose calculator
     */
    constructor(appState, doseCalculator) {
        this.appState = appState;
        this.doseCalculator = doseCalculator;

        // Initialize sub-modules
        this.pagination = new FormPagination();
        this.renderer = new FormRenderer(appState, doseCalculator);
        this.validator = new FormValidator();

        // Initialize pagination (scroll listeners, etc.)
        this.pagination.init();
    }

    // ==========================================
    // Delegate Properties (for backward compatibility)
    // ==========================================

    get currentPageIndex() {
        return this.pagination.getCurrentPageIndex();
    }

    set currentPageIndex(value) {
        this.pagination.setCurrentPageIndex(value);
    }

    // ==========================================
    // Auto-save Methods
    // ==========================================

    /**
     * Auto-save form data immediately
     */
    autoSaveFormData() {
        if (window.localStorageManager) {
            localStorageManager.saveFormData();
        }
        // Update URL in real-time for instant sharing
        if (window.KittenApp && window.KittenApp.urlStateManager) {
            window.KittenApp.urlStateManager.updateUrlRealtime();
        }
    }

    /**
     * Debounced auto-save for input events (500ms delay)
     * Reduces localStorage writes during rapid typing
     */
    debouncedAutoSave() {
        if (window.localStorageManager) {
            localStorageManager.debouncedSave();
        }
    }

    // ==========================================
    // Pagination Delegates
    // ==========================================

    setupScrollListener() {
        this.pagination.setupScrollListener();
    }

    setupDotsOverflowListeners() {
        this.pagination.setupDotsOverflowListeners();
    }

    updatePaginationDots() {
        this.pagination.updatePaginationDots();
    }

    updateDotsOverflow() {
        this.pagination.updateDotsOverflow();
    }

    scrollToPage(index) {
        this.pagination.scrollToPage(index);
    }

    updateActiveDotFromScroll() {
        this.pagination.updateActiveDotFromScroll();
    }

    updateActiveDot() {
        this.pagination.updateActiveDot();
    }

    // ==========================================
    // Renderer Delegates
    // ==========================================

    updateWeightDisplay(kittenId) {
        this.renderer.updateWeightDisplay(kittenId);
    }

    updateMedicationRowState(kittenId, medType) {
        this.renderer.updateMedicationRowState(kittenId, medType);
    }

    updateStatusLight(kittenId, medType) {
        this.renderer.updateStatusLight(kittenId, medType);
    }

    updateRingwormStatusLight(kittenId) {
        this.renderer.updateRingwormStatusLight(kittenId);
    }

    updateAllStatusLights(kittenId) {
        this.renderer.updateAllStatusLights(kittenId);
    }

    getMedicationStatus(kittenId, medType) {
        return this.renderer.getMedicationStatus(kittenId, medType);
    }

    updateResultDisplay(kittenId) {
        this.renderer.updateResultDisplay(kittenId);
    }

    toggleResultDisplay(kittenId) {
        this.renderer.toggleResultDisplay(kittenId);
    }

    // ==========================================
    // Validator Delegates
    // ==========================================

    validateField(kittenId, fieldName) {
        return this.validator.validateField(kittenId, fieldName);
    }

    validateAllKittens() {
        return this.validator.validateAllKittens();
    }

    // ==========================================
    // Template Delegate
    // ==========================================

    generateKittenFormHTML(kittenId, kittenNumber) {
        return FormTemplate.generate(kittenId, kittenNumber);
    }

    // ==========================================
    // State Management (Data Flow Inversion)
    // ==========================================

    /**
     * Update a kitten's data in AppState from form input
     * This is the first step in "State → DOM" data flow
     * @param {string} kittenId - The kitten ID
     * @param {Object} updates - Field updates to apply
     */
    updateKittenState(kittenId, updates) {
        // Ensure kitten exists in state (create if needed)
        if (!this.appState.hasKitten(kittenId)) {
            this.appState.addKitten({ id: kittenId });
        }

        // Update state with new values
        const changedFields = this.appState.updateKitten(kittenId, updates);

        // Return changed fields for selective rendering
        return changedFields;
    }

    /**
     * Read current form values and sync to state
     * Used to initialize state from existing DOM (e.g., localStorage restore)
     * @param {string} kittenId - The kitten ID
     */
    syncFormToState(kittenId) {
        const nameInput = document.getElementById(Constants.ID.name(kittenId));
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));

        const updates = {
            name: nameInput ? nameInput.value.trim() : '',
            weightGrams: weightInput ? parseFloat(weightInput.value) || 0 : 0
        };

        // Get topical selection
        const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
        topicalRadios.forEach(radio => {
            if (radio.checked) updates.topical = radio.value;
        });

        // Get regimen days
        const panacurRadios = document.querySelectorAll(`input[name="${Constants.ID.panacurName(kittenId)}"]`);
        panacurRadios.forEach(radio => {
            if (radio.checked) updates.panacurDays = parseInt(radio.value);
        });

        const ponazurilRadios = document.querySelectorAll(`input[name="${Constants.ID.ponazurilName(kittenId)}"]`);
        ponazurilRadios.forEach(radio => {
            if (radio.checked) updates.ponazurilDays = parseInt(radio.value);
        });

        // Get ringworm status
        const ringwormRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);
        ringwormRadios.forEach(radio => {
            if (radio.checked) updates.ringwormStatus = radio.value;
        });

        // Get medication enabled states
        const medicationEnabled = {};
        Constants.MEDICATIONS.forEach(med => {
            const toggle = document.getElementById(Constants.ID.medEnabled(kittenId, med));
            medicationEnabled[med] = toggle ? toggle.checked : true;
        });
        updates.medicationEnabled = medicationEnabled;

        // Get medication statuses
        const medicationStatus = {};
        Constants.MEDICATIONS.forEach(med => {
            const toggle = document.getElementById(Constants.ID.medEnabled(kittenId, med));
            if (toggle && !toggle.checked) {
                medicationStatus[med] = Constants.STATUS.SKIP;
            } else {
                const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, med)}"]`);
                statusRadios.forEach(radio => {
                    if (radio.checked) medicationStatus[med] = radio.value;
                });
            }
        });
        updates.medicationStatus = medicationStatus;

        this.updateKittenState(kittenId, updates);
    }

    // ==========================================
    // Event Binding (Unified)
    // ==========================================

    /**
     * Bind all event listeners for a kitten form
     * This is the SINGLE SOURCE OF TRUTH for event binding
     * Called by both addKitten() and localStorage restore
     * @param {string} kittenId - The kitten form ID
     */
    bindKittenFormEvents(kittenId) {
        this.bindWeightEvents(kittenId);
        this.bindMedicationToggleEvents(kittenId);
        this.bindMedicationStatusEvents(kittenId);
        this.bindTopicalEvents(kittenId);
        this.bindRegimenEvents(kittenId);
        this.bindRingwormEvents(kittenId);
        this.bindNameEvents(kittenId);

        // Initialize state from current form values
        this.syncFormToState(kittenId);
    }

    /**
     * Weight input events (filtering, display updates)
     * Data flow: Input → Filter → State → Render
     */
    bindWeightEvents(kittenId) {
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        if (!weightInput) return;

        // Filter input to allow only numbers and periods
        weightInput.addEventListener('input', (e) => {
            const filteredValue = e.target.value.replace(/[^0-9.]/g, '');
            const parts = filteredValue.split('.');
            if (parts.length > 2) {
                e.target.value = parts[0] + '.' + parts.slice(1).join('');
            } else {
                e.target.value = filteredValue;
            }

            // Update state first (State as source of truth)
            const weightGrams = parseFloat(e.target.value) || 0;
            this.updateKittenState(kittenId, {
                weightGrams,
                weightLb: AppState.convertToPounds(weightGrams)
            });

            // Then render from state
            this.renderer.updateWeightDisplay(kittenId);
            this.renderer.updateResultDisplay(kittenId);
            this.renderer.updateAllStatusLights(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.debouncedAutoSave();
        });

        // Prevent pasting invalid characters
        weightInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const filteredPaste = paste.replace(/[^0-9.]/g, '');
            const parts = filteredPaste.split('.');
            const validPaste = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredPaste;

            e.target.value = validPaste;

            // Update state first
            const weightGrams = parseFloat(validPaste) || 0;
            this.updateKittenState(kittenId, {
                weightGrams,
                weightLb: AppState.convertToPounds(weightGrams)
            });

            this.renderer.updateWeightDisplay(kittenId);
            this.renderer.updateResultDisplay(kittenId);
            this.renderer.updateAllStatusLights(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });

        // Validation on blur
        weightInput.addEventListener('blur', () => {
            this.validator.validateField(kittenId, 'weight');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
    }

    /**
     * Medication toggle switch events (enable/disable)
     * Data flow: Toggle → State → Render
     */
    bindMedicationToggleEvents(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, med));
            if (toggleCheckbox) {
                toggleCheckbox.addEventListener('change', () => {
                    // Update state first - get current enabled states and medication status
                    const kitten = this.appState.getKitten(kittenId) || {};
                    const medicationEnabled = { ...(kitten.medicationEnabled || {}) };
                    const medicationStatus = { ...(kitten.medicationStatus || {}) };

                    medicationEnabled[med] = toggleCheckbox.checked;
                    medicationStatus[med] = toggleCheckbox.checked
                        ? (medicationStatus[med] === Constants.STATUS.SKIP ? Constants.STATUS.TODO : medicationStatus[med])
                        : Constants.STATUS.SKIP;

                    this.updateKittenState(kittenId, { medicationEnabled, medicationStatus });

                    // Then render
                    this.renderer.updateMedicationRowState(kittenId, med);
                    this.renderer.updateStatusLight(kittenId, med);
                    this.renderer.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            }
        });
    }

    /**
     * Medication status radio events (To Do / Delay / Done)
     * Data flow: Radio → State → Render
     */
    bindMedicationStatusEvents(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, med)}"]`);
            statusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    // Update state first
                    const kitten = this.appState.getKitten(kittenId) || {};
                    const medicationStatus = { ...(kitten.medicationStatus || {}) };
                    medicationStatus[med] = radio.value;

                    this.updateKittenState(kittenId, { medicationStatus });

                    // Then render
                    this.renderer.updateStatusLight(kittenId, med);
                    this.renderer.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            });
        });
    }

    /**
     * Topical type events (Revolution / Advantage)
     * Data flow: Radio → State → Render
     */
    bindTopicalEvents(kittenId) {
        const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update state first
                this.updateKittenState(kittenId, { topical: radio.value });

                // Then render
                this.renderer.updateResultDisplay(kittenId);
                this.renderer.updateStatusLight(kittenId, 'flea');
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    /**
     * Regimen events (Panacur/Ponazuril days)
     * Data flow: Radio → State → Render
     */
    bindRegimenEvents(kittenId) {
        // Panacur regimen
        const panacurRadios = document.querySelectorAll(`input[name="${Constants.ID.panacurName(kittenId)}"]`);
        panacurRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update state first
                this.updateKittenState(kittenId, { panacurDays: parseInt(radio.value) });

                // Then render
                this.renderer.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });

        // Ponazuril regimen
        const ponazurilRadios = document.querySelectorAll(`input[name="${Constants.ID.ponazurilName(kittenId)}"]`);
        ponazurilRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update state first
                this.updateKittenState(kittenId, { ponazurilDays: parseInt(radio.value) });

                // Then render
                this.renderer.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    /**
     * Ringworm status events
     * Data flow: Radio → State → Render
     */
    bindRingwormEvents(kittenId) {
        const ringwormRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);
        ringwormRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update state first
                this.updateKittenState(kittenId, { ringwormStatus: radio.value });

                // Then render
                this.renderer.updateRingwormStatusLight(kittenId);
                this.renderer.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    /**
     * Name input events
     * Data flow: Input → State → Render
     */
    bindNameEvents(kittenId) {
        const nameInput = document.getElementById(Constants.ID.name(kittenId));
        if (!nameInput) return;

        nameInput.addEventListener('input', () => {
            // Update state first
            this.updateKittenState(kittenId, { name: nameInput.value.trim() });

            // Then render
            this.renderer.updateResultDisplay(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.debouncedAutoSave();
        });

        nameInput.addEventListener('blur', () => {
            this.validator.validateField(kittenId, 'name');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
    }

    // ==========================================
    // Kitten Management
    // ==========================================

    /**
     * Add a new kitten form
     */
    addKitten() {
        const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
        const kittenId = `kitten-${this.appState.incrementKittenCounter()}`;
        const kittenCounter = this.appState.getKittenCounter();

        const kittenForm = document.createElement('div');
        kittenForm.className = Constants.CSS.KITTEN_FORM;
        kittenForm.id = kittenId;

        kittenForm.innerHTML = FormTemplate.generate(kittenId, kittenCounter);

        container.appendChild(kittenForm);

        // Update pagination dots
        this.pagination.updatePaginationDots();

        // Scroll to new kitten on mobile, or vertically on desktop
        if (kittenCounter > 1) {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;

            if (isMobile) {
                this.pagination.scrollToNewKitten(kittenCounter);
            } else {
                // On desktop, scroll vertically to the new form
                const nav = document.querySelector('nav');
                const navHeight = nav ? nav.offsetHeight : 0;

                const formRect = kittenForm.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                const targetScrollPosition = formRect.top + scrollTop - navHeight;

                window.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                });
            }
        }

        // Bind all event listeners using unified method
        this.bindKittenFormEvents(kittenId);

        // Initialize status lights
        Constants.MEDICATIONS.forEach(med => {
            this.renderer.updateStatusLight(kittenId, med);
        });
        this.renderer.updateRingwormStatusLight(kittenId);

        // Copy settings from the first kitten if available
        const allKittens = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        if (allKittens.length > 1) {
            const firstKittenId = allKittens[0].id;
            if (firstKittenId !== kittenId) {
                this.copySettingsFromKitten(firstKittenId, kittenId);
            }
        }
    }

    /**
     * Copy medication settings from one kitten to another
     * @param {string} sourceId - Source kitten ID
     * @param {string} targetId - Target kitten ID
     */
    copySettingsFromKitten(sourceId, targetId) {
        // Copy medication toggle states (enabled/disabled)
        Constants.MEDICATIONS.forEach(med => {
            const sourceToggle = document.getElementById(`${sourceId}-${med}-enabled`);
            const targetToggle = document.getElementById(`${targetId}-${med}-enabled`);
            if (sourceToggle && targetToggle) {
                targetToggle.checked = sourceToggle.checked;
                this.renderer.updateMedicationRowState(targetId, med);
            }
        });

        // Copy medication status (To Do / Delay / Done)
        Constants.MEDICATIONS.forEach(med => {
            const sourceStatus = document.querySelector(`input[name="${sourceId}-${med}-status"]:checked`);
            if (sourceStatus) {
                const targetStatus = document.getElementById(`${targetId}-${med}-status-${sourceStatus.value}`);
                if (targetStatus) {
                    targetStatus.checked = true;
                    this.renderer.updateStatusLight(targetId, med);
                }
            }
        });

        // Copy Topical type (Revolution / Advantage)
        const sourceTopical = document.querySelector(`input[name="${sourceId}-topical"]:checked`);
        if (sourceTopical) {
            const targetTopical = document.getElementById(`${targetId}-topical-${sourceTopical.value}`);
            if (targetTopical) targetTopical.checked = true;
        }

        // Copy Panacur Duration
        const sourcePanacur = document.querySelector(`input[name="${sourceId}-panacur"]:checked`);
        if (sourcePanacur) {
            const targetPanacur = document.getElementById(`${targetId}-panacur-${sourcePanacur.value}`);
            if (targetPanacur) targetPanacur.checked = true;
        }

        // Copy Ponazuril Duration
        const sourcePonazuril = document.querySelector(`input[name="${sourceId}-ponazuril"]:checked`);
        if (sourcePonazuril) {
            const targetPonazuril = document.getElementById(`${targetId}-ponazuril-${sourcePonazuril.value}`);
            if (targetPonazuril) targetPonazuril.checked = true;
        }

        // Copy Ringworm Settings
        const sourceRingworm = document.querySelector(`input[name="${sourceId}-ringworm-status"]:checked`);
        if (sourceRingworm) {
            const targetRingworm = document.getElementById(`${targetId}-ringworm-${sourceRingworm.value}`);
            if (targetRingworm) {
                targetRingworm.checked = true;
                this.renderer.updateRingwormStatusLight(targetId);
            }
        }

        // Sync state from copied DOM values (State as source of truth)
        this.syncFormToState(targetId);

        // Update UI
        this.renderer.updateResultDisplay(targetId);
    }

    /**
     * Remove a kitten form
     * @param {string} kittenId - The kitten ID to remove
     */
    removeKitten(kittenId) {
        const element = document.getElementById(kittenId);
        if (!element) return;

        // Simple confirmation for removing a kitten form
        const confirmed = confirm('Are you sure you want to remove this cat form?');
        if (!confirmed) {
            return;
        }

        // Remove from DOM
        element.remove();

        // Remove from state (State as source of truth)
        this.appState.removeKitten(kittenId);

        // Update pagination
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        this.pagination.adjustForRemovedKitten(kittenForms.length);

        if (window.KittenApp && window.KittenApp.resultsDisplay) {
            window.KittenApp.resultsDisplay.updateResultsAutomatically();
        }
        this.autoSaveFormData();
    }

    // ==========================================
    // Legacy Methods (for backward compatibility)
    // ==========================================

    /**
     * @deprecated Use bindKittenFormEvents instead
     */
    addMedicationListeners(kittenId) {
        // Delegates to the new unified event binding
        this.bindMedicationToggleEvents(kittenId);
        this.bindMedicationStatusEvents(kittenId);
        this.bindTopicalEvents(kittenId);
        this.bindRegimenEvents(kittenId);
        this.bindRingwormEvents(kittenId);
    }

    /**
     * @deprecated Now handled by updateMedicationRowState
     */
    updateFleaCheckboxStates(kittenId) {
        // Legacy method - now handled by updateMedicationRowState and toggle switches
    }

    /**
     * @deprecated Use bindKittenFormEvents instead
     */
    addValidationListeners(kittenId) {
        // Now handled by bindNameEvents and bindWeightEvents
    }
}

// Export to global namespace
window.FormManager = FormManager;
