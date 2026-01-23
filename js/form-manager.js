/**
 * Form Manager Module - Form creation, validation, and event handling
 * Handles all kitten form creation, manipulation, and validation
 */

class FormManager {
    constructor(appState, doseCalculator) {
        this.appState = appState;
        this.doseCalculator = doseCalculator;
        this.currentPageIndex = 0;
        this.scrollTimeout = null;

        // Set up scroll listener for pagination on mobile
        this.setupScrollListener();
        this.setupDotsOverflowListeners();
    }

    // Pagination Methods
    setupScrollListener() {
        const container = document.getElementById('kittens-container');
        if (!container) return;

        container.addEventListener('scroll', () => {
            // Debounce scroll updates
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            this.scrollTimeout = setTimeout(() => {
                this.updateActiveDotFromScroll();
            }, 50);
        });
    }

    updatePaginationDots() {
        const dotsContainer = document.getElementById('pagination-dots');
        if (!dotsContainer) return;

        const kittenForms = document.querySelectorAll('.kitten-form');
        const formCount = kittenForms.length;

        // Clear existing dots
        dotsContainer.innerHTML = '';

        // Only show dots if there's more than one form
        if (formCount <= 1) {
            this.updateDotsOverflow();
            return;
        }

        // Create dots
        for (let i = 0; i < formCount; i++) {
            const dot = document.createElement('button');
            dot.className = 'pagination-dot';
            dot.setAttribute('aria-label', `Go to cat ${i + 1}`);
            dot.setAttribute('type', 'button');

            if (i === this.currentPageIndex) {
                dot.classList.add('active');
            }

            dot.addEventListener('click', () => {
                this.scrollToPage(i);
            });

            dotsContainer.appendChild(dot);
        }

        // Check for overflow after dots are added
        this.updateDotsOverflow();
    }

    updateDotsOverflow() {
        const navCenter = document.getElementById('nav-center');
        const dotsContainer = document.getElementById('pagination-dots');
        if (!navCenter || !dotsContainer) return;

        navCenter.classList.remove('overflow-left', 'overflow-right', 'overflow-both');

        const { scrollLeft, scrollWidth, clientWidth } = dotsContainer;
        const hasOverflow = scrollWidth > clientWidth;

        if (!hasOverflow) return;

        const atStart = scrollLeft <= 1;
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;

        if (atStart && !atEnd) {
            navCenter.classList.add('overflow-right');
        } else if (!atStart && atEnd) {
            navCenter.classList.add('overflow-left');
        } else if (!atStart && !atEnd) {
            navCenter.classList.add('overflow-both');
        }
    }

    setupDotsOverflowListeners() {
        const dotsContainer = document.getElementById('pagination-dots');
        if (!dotsContainer) return;

        dotsContainer.addEventListener('scroll', () => {
            this.updateDotsOverflow();
        });

        window.addEventListener('resize', () => {
            this.updateDotsOverflow();
        });
    }

    scrollToPage(index) {
        const container = document.getElementById('kittens-container');
        const kittenForms = document.querySelectorAll('.kitten-form');

        if (!container || index < 0 || index >= kittenForms.length) return;

        const targetForm = kittenForms[index];
        const scrollLeft = targetForm.offsetLeft;

        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });

        this.currentPageIndex = index;
        this.updateActiveDot();
    }

    updateActiveDotFromScroll() {
        const container = document.getElementById('kittens-container');
        const kittenForms = document.querySelectorAll('.kitten-form');

        if (!container || kittenForms.length === 0) return;

        const scrollLeft = container.scrollLeft;
        const containerWidth = container.offsetWidth;

        // Find which form is most visible
        let newIndex = 0;
        let minDistance = Infinity;

        kittenForms.forEach((form, index) => {
            const formCenter = form.offsetLeft + (form.offsetWidth / 2);
            const viewCenter = scrollLeft + (containerWidth / 2);
            const distance = Math.abs(formCenter - viewCenter);

            if (distance < minDistance) {
                minDistance = distance;
                newIndex = index;
            }
        });

        if (newIndex !== this.currentPageIndex) {
            this.currentPageIndex = newIndex;
            this.updateActiveDot();
        }
    }

    updateActiveDot() {
        const dots = document.querySelectorAll('.pagination-dot');
        dots.forEach((dot, index) => {
            if (index === this.currentPageIndex) {
                dot.classList.add('active');
                // Scroll active dot into view
                dot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } else {
                dot.classList.remove('active');
            }
        });
        // Update overflow state after scroll
        setTimeout(() => this.updateDotsOverflow(), 300);
    }

    // Auto-save helper function (immediate save)
    autoSaveFormData() {
        if (window.localStorageManager) {
            localStorageManager.saveFormData();
        }
        // Update URL in real-time for instant sharing
        if (window.KittenApp && window.KittenApp.urlStateManager) {
            window.KittenApp.urlStateManager.updateUrlRealtime();
        }
    }

    // Debounced auto-save for input events (500ms delay)
    // Reduces localStorage writes during rapid typing
    debouncedAutoSave() {
        if (window.localStorageManager) {
            localStorageManager.debouncedSave();
        }
        // URL update is also debounced via localStorage's save
    }

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
    }

    // Weight input events (filtering, display updates)
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

            this.updateWeightDisplay(kittenId);
            this.updateResultDisplay(kittenId);
            this.updateAllStatusLights(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.debouncedAutoSave(); // Use debounced save for rapid typing
        });

        // Prevent pasting invalid characters
        weightInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const filteredPaste = paste.replace(/[^0-9.]/g, '');
            const parts = filteredPaste.split('.');
            const validPaste = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredPaste;

            e.target.value = validPaste;
            this.updateWeightDisplay(kittenId);
            this.updateResultDisplay(kittenId);
            this.updateAllStatusLights(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData(); // Immediate save after paste
        });

        // Validation on blur
        weightInput.addEventListener('blur', () => {
            this.validateField(kittenId, 'weight');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData(); // Immediate save on blur
        });
    }

    // Medication toggle switch events (enable/disable)
    bindMedicationToggleEvents(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, med));
            if (toggleCheckbox) {
                toggleCheckbox.addEventListener('change', () => {
                    this.updateMedicationRowState(kittenId, med);
                    this.updateStatusLight(kittenId, med);
                    this.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            }
        });
    }

    // Medication status radio events (To Do / Delay / Done)
    bindMedicationStatusEvents(kittenId) {
        Constants.MEDICATIONS.forEach(med => {
            const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, med)}"]`);
            statusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateStatusLight(kittenId, med);
                    this.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            });
        });
    }

    // Topical type events (Revolution / Advantage)
    bindTopicalEvents(kittenId) {
        const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
                this.updateStatusLight(kittenId, 'flea');
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    // Regimen events (Panacur/Ponazuril days)
    bindRegimenEvents(kittenId) {
        // Panacur regimen
        const panacurRadios = document.querySelectorAll(`input[name="${Constants.ID.panacurName(kittenId)}"]`);
        panacurRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
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
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    // Ringworm status events
    bindRingwormEvents(kittenId) {
        const ringwormRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);
        ringwormRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateRingwormStatusLight(kittenId);
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    // Name input events
    bindNameEvents(kittenId) {
        const nameInput = document.getElementById(Constants.ID.name(kittenId));
        if (!nameInput) return;

        nameInput.addEventListener('input', () => {
            this.updateResultDisplay(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.debouncedAutoSave(); // Use debounced save for rapid typing
        });

        nameInput.addEventListener('blur', () => {
            this.validateField(kittenId, 'name');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData(); // Immediate save on blur
        });
    }

    // Generate HTML template for a kitten form (single source of truth)
    generateKittenFormHTML(kittenId, kittenNumber) {
        return `
            ${kittenNumber > 1 ? `<button type="button" class="btn btn-danger remove" onclick="removeKitten('${kittenId}')">—</button>` : ''}
            <div class="number">${kittenNumber}</div>
            <div class="kitten-form-content">
                <div class="form-grid top">
                    <div class="form-group">
                        <label for="${kittenId}-name">Name</label>
                        <input type="text" id="${kittenId}-name" name="name" placeholder="Name" required>
                        <div class="error" id="${kittenId}-name-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="${kittenId}-weight">Weight (grams)</label>
                        <input type="text" inputmode="decimal" pattern="[0-9.]*" id="${kittenId}-weight" placeholder="Weight (grams)" name="weight" min="1" step="0.1" required>
                        <div class="error" id="${kittenId}-weight-error"></div>
                        <div class="weight-display" id="${kittenId}-weight-display" style="display: none;"></div>
                    </div>
                </div>

                <div class="medication-grid">
                    <!-- Flea Med Row -->
                    <div class="medication-row" id="${kittenId}-flea-row">
                        <div class="medication-labels">
                            <div class="left">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${kittenId}-flea-enabled" checked>
                                    <span class="slider"></span>
                                </label>
                                <span class="med-name">Flea Med</span>
                            </div>
                            <div class="right">
                                <span class="status-light hidden" id="${kittenId}-flea-status-light"></span>
                                <span class="dose-display" id="${kittenId}-flea-dose"></span>
                            </div>
                        </div>
                        <div class="medication-choices">
                            <div class="radio-group">
                                <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution" checked>
                                <label for="${kittenId}-topical-revolution">Rev</label>
                                <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                                <label for="${kittenId}-topical-advantage">Adv II</label>
                            </div>
                            <div class="radio-group status-control">
                                <input type="radio" name="${kittenId}-flea-status" value="todo" id="${kittenId}-flea-status-todo" checked>
                                <label for="${kittenId}-flea-status-todo">To Do</label>
                                <input type="radio" name="${kittenId}-flea-status" value="delay" id="${kittenId}-flea-status-delay">
                                <label for="${kittenId}-flea-status-delay">Delay</label>
                                <input type="radio" name="${kittenId}-flea-status" value="done" id="${kittenId}-flea-status-done">
                                <label for="${kittenId}-flea-status-done">Done</label>
                            </div>
                        </div>
                    </div>

                    <!-- Capstar Row -->
                    <div class="medication-row" id="${kittenId}-capstar-row">
                        <div class="medication-labels">
                            <div class="left">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${kittenId}-capstar-enabled" checked>
                                    <span class="slider"></span>
                                </label>
                                <span class="med-name">Capstar</span>
                            </div>
                            <div class="right">
                                <span class="status-light hidden" id="${kittenId}-capstar-status-light"></span>
                                <span class="dose-display" id="${kittenId}-capstar-dose"></span>
                            </div>
                        </div>
                        <div class="medication-choices">
                            <div class="single-option">
                                <span class="option-label">Single Dose</span>
                            </div>
                            <div class="radio-group status-control">
                                <input type="radio" name="${kittenId}-capstar-status" value="todo" id="${kittenId}-capstar-status-todo" checked>
                                <label for="${kittenId}-capstar-status-todo">To Do</label>
                                <input type="radio" name="${kittenId}-capstar-status" value="done" id="${kittenId}-capstar-status-done">
                                <label for="${kittenId}-capstar-status-done">Done</label>
                            </div>
                        </div>
                    </div>

                    <!-- Panacur Row -->
                    <div class="medication-row" id="${kittenId}-panacur-row">
                        <div class="medication-labels">
                            <div class="left">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${kittenId}-panacur-enabled" checked>
                                    <span class="slider"></span>
                                </label>
                                <span class="med-name">Panacur</span>
                            </div>
                            <div class="right">
                                <span class="status-light hidden" id="${kittenId}-panacur-status-light"></span>
                                <span class="dose-display" id="${kittenId}-panacur-dose"></span>
                            </div>
                        </div>
                        <div class="medication-choices">
                            <div class="radio-group">
                                <input type="radio" name="${kittenId}-panacur" value="1" id="${kittenId}-panacur-1">
                                <label for="${kittenId}-panacur-1">1d</label>
                                <input type="radio" name="${kittenId}-panacur" value="3" id="${kittenId}-panacur-3" checked>
                                <label for="${kittenId}-panacur-3">3d</label>
                                <input type="radio" name="${kittenId}-panacur" value="5" id="${kittenId}-panacur-5">
                                <label for="${kittenId}-panacur-5">5d</label>
                            </div>
                            <div class="radio-group status-control">
                                <input type="radio" name="${kittenId}-panacur-status" value="todo" id="${kittenId}-panacur-status-todo">
                                <label for="${kittenId}-panacur-status-todo">To Do</label>
                                <input type="radio" name="${kittenId}-panacur-status" value="done" id="${kittenId}-panacur-status-done" checked>
                                <label for="${kittenId}-panacur-status-done">Done</label>
                            </div>
                        </div>
                    </div>

                    <!-- Ponazuril Row -->
                    <div class="medication-row" id="${kittenId}-ponazuril-row">
                        <div class="medication-labels">
                            <div class="left">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${kittenId}-ponazuril-enabled" checked>
                                    <span class="slider"></span>
                                </label>
                                <span class="med-name">Ponazuril</span>
                            </div>
                            <div class="right">
                                <span class="status-light hidden" id="${kittenId}-ponazuril-status-light"></span>
                                <span class="dose-display" id="${kittenId}-ponazuril-dose"></span>
                            </div>
                        </div>
                        <div class="medication-choices">
                            <div class="radio-group">
                                <input type="radio" name="${kittenId}-ponazuril" value="1" id="${kittenId}-ponazuril-1">
                                <label for="${kittenId}-ponazuril-1">1d</label>
                                <input type="radio" name="${kittenId}-ponazuril" value="3" id="${kittenId}-ponazuril-3" checked>
                                <label for="${kittenId}-ponazuril-3">3d</label>
                            </div>
                            <div class="radio-group status-control">
                                <input type="radio" name="${kittenId}-ponazuril-status" value="todo" id="${kittenId}-ponazuril-status-todo">
                                <label for="${kittenId}-ponazuril-status-todo">To Do</label>
                                <input type="radio" name="${kittenId}-ponazuril-status" value="done" id="${kittenId}-ponazuril-status-done" checked>
                                <label for="${kittenId}-ponazuril-status-done">Done</label>
                            </div>
                        </div>
                    </div>

                    <!-- Drontal Row -->
                    <div class="medication-row" id="${kittenId}-drontal-row">
                        <div class="medication-labels">
                            <div class="left">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${kittenId}-drontal-enabled" checked>
                                    <span class="slider"></span>
                                </label>
                                <span class="med-name">Drontal</span>
                            </div>
                            <div class="right">
                                <span class="status-light hidden" id="${kittenId}-drontal-status-light"></span>
                                <span class="dose-display" id="${kittenId}-drontal-dose"></span>
                            </div>
                        </div>
                        <div class="medication-choices">
                            <div class="single-option">
                                <span class="option-label">Single Dose</span>
                            </div>
                            <div class="radio-group status-control">
                                <input type="radio" name="${kittenId}-drontal-status" value="todo" id="${kittenId}-drontal-status-todo" checked>
                                <label for="${kittenId}-drontal-status-todo">To Do</label>
                                <input type="radio" name="${kittenId}-drontal-status" value="done" id="${kittenId}-drontal-status-done">
                                <label for="${kittenId}-drontal-status-done">Done</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="medication-separator"></div>

                <div class="form-group ringworm-section">
                    <div class="medication-labels">
                        <div class="left">
                            <span class="status-light hidden" id="${kittenId}-ringworm-status-light"></span>
                            <span class="med-name">Ringworm</span>
                        </div>
                    </div>
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-ringworm-status" value="not-scanned" id="${kittenId}-ringworm-not-scanned" checked>
                        <label for="${kittenId}-ringworm-not-scanned">Not Scanned</label>
                        <input type="radio" name="${kittenId}-ringworm-status" value="positive" id="${kittenId}-ringworm-positive">
                        <label for="${kittenId}-ringworm-positive">Positive</label>
                        <input type="radio" name="${kittenId}-ringworm-status" value="negative" id="${kittenId}-ringworm-negative">
                        <label for="${kittenId}-ringworm-negative">Negative</label>
                    </div>
                </div>
            </div>

            <div class="result-display empty collapsed" id="${kittenId}-result-display">
                <div class="dose-print-header print-only" id="${kittenId}-result-header">
                    <h3 class="kitten-info"></h3>
                </div>
                <button type="button" class="result-toggle" onclick="window.KittenApp.formManager.toggleResultDisplay('${kittenId}')">
                    <span class="toggle-text">Show All Doses</span>
                </button>
                <div id="${kittenId}-result-content">
                    <div class="collapsible-section">
                        <div class="result-display-content">
                            <div class="result-item">Enter weight to see calculated doses</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Kitten Management
    addKitten() {
        const container = document.getElementById('kittens-container');
        const kittenId = `kitten-${this.appState.incrementKittenCounter()}`;
        const kittenCounter = this.appState.getKittenCounter();
        
        const kittenForm = document.createElement('div');
        kittenForm.className = 'kitten-form';
        kittenForm.id = kittenId;
        
        kittenForm.innerHTML = this.generateKittenFormHTML(kittenId, kittenCounter);
        
        container.appendChild(kittenForm);

        // Update pagination dots
        this.updatePaginationDots();

        // Only scroll to the new kitten form if it's not the first one
        if (kittenCounter > 1) {
            // Check if we're on mobile (pagination dots visible)
            const isMobile = window.matchMedia('(max-width: 768px)').matches;

            if (isMobile) {
                // On mobile, use horizontal scroll pagination
                const newIndex = document.querySelectorAll('.kitten-form').length - 1;
                // Use setTimeout to ensure the DOM has updated
                setTimeout(() => {
                    this.scrollToPage(newIndex);
                }, 50);
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
            this.updateStatusLight(kittenId, med);
        });
        this.updateRingwormStatusLight(kittenId);

        // Copy settings from the first kitten if available
        const allKittens = document.querySelectorAll('.kitten-form');
        if (allKittens.length > 1) {
            const firstKittenId = allKittens[0].id;
            if (firstKittenId !== kittenId) {
                this.copySettingsFromKitten(firstKittenId, kittenId);
            }
        }
    }

    copySettingsFromKitten(sourceId, targetId) {
        // Copy medication toggle states (enabled/disabled)
        Constants.MEDICATIONS.forEach(med => {
            const sourceToggle = document.getElementById(`${sourceId}-${med}-enabled`);
            const targetToggle = document.getElementById(`${targetId}-${med}-enabled`);
            if (sourceToggle && targetToggle) {
                targetToggle.checked = sourceToggle.checked;
                this.updateMedicationRowState(targetId, med);
            }
        });

        // Copy medication status (To Do / Delay / Done)
        Constants.MEDICATIONS.forEach(med => {
            const sourceStatus = document.querySelector(`input[name="${sourceId}-${med}-status"]:checked`);
            if (sourceStatus) {
                const targetStatus = document.getElementById(`${targetId}-${med}-status-${sourceStatus.value}`);
                if (targetStatus) {
                    targetStatus.checked = true;
                    this.updateStatusLight(targetId, med);
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
                this.updateRingwormStatusLight(targetId);
            }
        }

        // Update UI
        this.updateResultDisplay(targetId);
    }

    removeKitten(kittenId) {
        const element = document.getElementById(kittenId);
        if (!element) return;
        
        // Simple confirmation for removing a kitten form
        const confirmed = confirm('Are you sure you want to remove this cat form?');
        if (!confirmed) {
            return; // User cancelled, don't remove
        }
        
        element.remove();

        // Update pagination dots
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        if (this.currentPageIndex >= kittenForms.length) {
            this.currentPageIndex = Math.max(0, kittenForms.length - 1);
        }
        this.updatePaginationDots();

        if (window.KittenApp && window.KittenApp.resultsDisplay) {
            window.KittenApp.resultsDisplay.updateResultsAutomatically();
        }
        this.autoSaveFormData();
    }

    updateWeightDisplay(kittenId) {
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const display = document.getElementById(Constants.ID.weightDisplay(kittenId));

        const grams = parseFloat(weightInput.value);
        if (grams > 0) {
            const pounds = this.appState.constructor.convertToPounds(grams);
            display.textContent = `${AppState.formatNumber(grams)}g = ${AppState.formatNumber(pounds, 2)} lb`;
            display.style.display = 'block';
        } else {
            display.style.display = 'none';
        }
    }

    updateResultDisplay(kittenId) {
        const doseDisplay = document.getElementById(Constants.ID.resultDisplay(kittenId));
        const doseContent = document.getElementById(Constants.ID.resultContent(kittenId));
        const doseHeader = document.getElementById(Constants.ID.resultHeader(kittenId));

        const nameInput = document.getElementById(Constants.ID.name(kittenId));
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = parseFloat(weightInput.value);

        // Update the print header with current name and weight
        const kittenName = nameInput.value.trim() || 'Unnamed Cat';
        const headerElement = doseHeader.querySelector('.kitten-info');
        if (grams > 0) {
            const weightLb = this.appState.constructor.convertToPounds(grams);
            headerElement.textContent = `${kittenName} - ${AppState.formatNumber(grams)}g (${AppState.formatNumber(weightLb, 2)} lb)`;
        } else {
            headerElement.textContent = `${kittenName}`;
        }

        if (!grams || grams <= 0) {
            doseDisplay.classList.add('empty');
            doseContent.innerHTML = '<div class="collapsible-section"><div class="result-display-content"><div class="result-item">Enter weight to see calculated doses</div></div></div>';
            // Clear inline dose displays
            const fleaDoseEl = document.getElementById(`${kittenId}-flea-dose`);
            const capstarDoseEl = document.getElementById(`${kittenId}-capstar-dose`);
            const panacurDoseEl = document.getElementById(`${kittenId}-panacur-dose`);
            const ponazurilDoseEl = document.getElementById(`${kittenId}-ponazuril-dose`);
            const drontalDoseEl = document.getElementById(`${kittenId}-drontal-dose`);
            if (fleaDoseEl) fleaDoseEl.textContent = '';
            if (capstarDoseEl) capstarDoseEl.textContent = '';
            if (panacurDoseEl) panacurDoseEl.textContent = '';
            if (ponazurilDoseEl) ponazurilDoseEl.textContent = '';
            if (drontalDoseEl) drontalDoseEl.textContent = '';
            return;
        }

        const weightLb = this.appState.constructor.convertToPounds(grams);

        // Get selected topical type (Revolution or Advantage)
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        let topical = 'revolution';
        topicalRadios.forEach(radio => {
            if (radio.checked) topical = radio.value;
        });

        // Get medication statuses using new system
        const fleaStatus = this.getMedicationStatus(kittenId, 'flea');
        const capstarStatus = this.getMedicationStatus(kittenId, 'capstar');
        const panacurStatus = this.getMedicationStatus(kittenId, 'panacur');
        const ponazurilStatus = this.getMedicationStatus(kittenId, 'ponazuril');
        const drontalStatus = this.getMedicationStatus(kittenId, 'drontal');

        // Get panacur regimen
        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        let panacurDays = 3;
        panacurRadios.forEach(radio => {
            if (radio.checked) panacurDays = parseInt(radio.value);
        });

        // Get ponazuril regimen
        const ponazurilRadios = document.querySelectorAll(`input[name="${kittenId}-ponazuril"]`);
        let ponazurilDays = 3;
        ponazurilRadios.forEach(radio => {
            if (radio.checked) ponazurilDays = parseInt(radio.value);
        });

        // Calculate doses
        const panacurDose = this.doseCalculator.calculatePanacurDose(weightLb);
        const ponazurilDose = this.doseCalculator.calculatePonazurilDose(weightLb);
        const drontalDose = this.doseCalculator.calculateDrontalDose(weightLb);
        const revolutionDose = this.doseCalculator.calculateRevolutionDose(weightLb);
        const advantageDose = this.doseCalculator.calculateAdvantageIIDose(weightLb);
        const capstarDose = this.doseCalculator.calculateCapstarDose ? this.doseCalculator.calculateCapstarDose(weightLb) : '1 tablet';

        const outOfRangeString = this.appState.getOutOfRangeString();

        // Update inline dose displays
        const fleaDoseEl = document.getElementById(`${kittenId}-flea-dose`);
        const capstarDoseEl = document.getElementById(`${kittenId}-capstar-dose`);
        const panacurDoseEl = document.getElementById(`${kittenId}-panacur-dose`);
        const ponazurilDoseEl = document.getElementById(`${kittenId}-ponazuril-dose`);
        const drontalDoseEl = document.getElementById(`${kittenId}-drontal-dose`);

        // Update inline dose displays (always show dose even when disabled)
        if (fleaDoseEl) {
            if (topical === 'revolution') {
                fleaDoseEl.textContent = revolutionDose === outOfRangeString ? outOfRangeString : `${AppState.formatNumber(revolutionDose, 2)}ml`;
            } else if (topical === 'advantage') {
                fleaDoseEl.textContent = advantageDose === outOfRangeString ? outOfRangeString : `${AppState.formatNumber(advantageDose, 2)}ml`;
            }
        }
        if (capstarDoseEl) {
            capstarDoseEl.textContent = '1 tablet';
        }
        if (panacurDoseEl) {
            panacurDoseEl.textContent = `${AppState.formatNumber(panacurDose, 2)}ml/day`;
        }
        if (ponazurilDoseEl) {
            ponazurilDoseEl.textContent = `${AppState.formatNumber(ponazurilDose, 2)}ml/day`;
        }
        if (drontalDoseEl) {
            drontalDoseEl.textContent = drontalDose === outOfRangeString ? outOfRangeString : `${drontalDose} tablet(s)`;
        }

        // Build dose display content
        let content = `
        <div class="collapsible-section">
            <div class="dose-section-header">
                <strong>Doses</strong>
            </div>
            <div class="result-display-content">
        `;

        // Show enabled medications
        if (panacurStatus !== 'skip') {
            content += `
                <div class="result-item">
                    <strong>Panacur</strong> ${AppState.formatNumber(panacurDose, 2)} mL/day × ${panacurDays} days
                </div>
            `;
        }
        if (ponazurilStatus !== 'skip') {
            content += `
                <div class="result-item">
                    <strong>Ponazuril</strong> ${AppState.formatNumber(ponazurilDose, 2)} mL/day × ${ponazurilDays} days
                </div>
            `;
        }
        if (drontalStatus !== 'skip') {
            content += `
                <div class="result-item">
                    <strong>Drontal</strong> ${drontalDose === outOfRangeString ? drontalDose : drontalDose + ' tablet(s)'}
                </div>
            `;
        }
        if (capstarStatus !== 'skip') {
            content += `
                <div class="result-item">
                    <strong>Capstar</strong> 1 tablet
                </div>
            `;
        }
        if (fleaStatus !== 'skip') {
            const topicalName = topical === 'revolution' ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === 'revolution' ? revolutionDose : advantageDose;
            content += `
                <div class="result-item">
                    <strong>${topicalName}</strong> ${topicalDose === outOfRangeString ? topicalDose : AppState.formatNumber(topicalDose, 2) + ' mL'}
                </div>
            `;
        }

        content += `
            </div>
        </div>
        `;

        // Calculate remaining doses for foster care based on new status system
        // Status "done" = given at intake, "todo" or "delay" = for foster
        const panacurDay1Given = panacurStatus === 'done';
        const ponazurilDay1Given = ponazurilStatus === 'done';
        const drontalDay1Given = drontalStatus === 'done';
        const capstarDay1Given = capstarStatus === 'done';
        const fleaGiven = fleaStatus === 'done';

        const panacurRemaining = panacurStatus === 'skip' ? 0 : (panacurDay1Given ? (panacurDays - 1) : panacurDays);
        const ponazurilRemaining = ponazurilStatus === 'skip' ? 0 : (ponazurilDay1Given ? (ponazurilDays - 1) : ponazurilDays);
        const panacurTotal = panacurDose * panacurRemaining;
        const ponazurilTotal = ponazurilDose * ponazurilRemaining;

        // Build "For Foster" section
        const remainsForFoster = [];

        if (drontalStatus !== 'skip' && !drontalDay1Given && drontalDose !== outOfRangeString) {
            remainsForFoster.push(`<strong>Drontal</strong> ${drontalDose + ' tablet(s)'}`);
        }

        if (capstarStatus !== 'skip' && !capstarDay1Given) {
            remainsForFoster.push(`<strong>Capstar</strong> 1 tablet`);
        }

        if (panacurRemaining > 0) {
            remainsForFoster.push(`<strong>Panacur</strong> ${panacurRemaining} days × ${AppState.formatNumber(panacurDose, 2)} mL = ${AppState.formatNumber(panacurTotal, 2)} mL`);
        }

        if (ponazurilRemaining > 0) {
            remainsForFoster.push(`<strong>Ponazuril</strong> ${ponazurilRemaining} days × ${AppState.formatNumber(ponazurilDose, 2)} mL = ${AppState.formatNumber(ponazurilTotal, 2)} mL`);
        }

        // Handle topical medication for foster care
        if (fleaStatus !== 'skip') {
            const topicalName = topical === 'revolution' ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === 'revolution' ? revolutionDose : advantageDose;
            if (topicalDose !== outOfRangeString && !fleaGiven) {
                // Flea med not given at intake - foster needs to give it
                remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose = ${AppState.formatNumber(topicalDose, 2)} mL`);
            }
        }

        // Add "For Foster" section (always visible, not collapsible)
        if (remainsForFoster.length > 0) {
            content += `
                <div class="foster-section">
                    <div class="dose-section-header">
                        <strong>For Foster</strong>
                    </div>
                    <div class="result-display-content foster">
            `;
            remainsForFoster.forEach(item => {
                content += `<div class="result-item">${item}</div>`;
            });
            content += `
                    </div>
                </div>
            `;
        } else {
            content += `
                <div class="foster-section">
                    <div class="dose-section-header">
                        <strong>For Foster</strong>
                    </div>
                    <div class="result-display-content">
                        <div class="result-item">None</div>
                    </div>
                </div>
            `;
        }

        // Get ringworm status
        const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
        let ringwormStatus = 'not-scanned';
        ringwormRadios.forEach(radio => {
            if (radio.checked) ringwormStatus = radio.value;
        });

        // Map status to display text
        const ringwormStatusText = {
            'not-scanned': 'Not scanned',
            'negative': 'Negative',
            'positive': 'Positive'
        };

        // Add "Other" section (collapsible)
        content += `
            <div class="collapsible-section">
                <div class="dose-section-header">
                    <strong>Other</strong>
                </div>
                <div class="result-display-content">
                    <div class="result-item">
                        <strong>Ringworm</strong> ${ringwormStatusText[ringwormStatus] || ringwormStatus}
                    </div>
                </div>
            </div>
        `;

        doseDisplay.classList.remove('empty');
        doseContent.innerHTML = content;
    }

    toggleResultDisplay(kittenId) {
        const resultDisplay = document.getElementById(`${kittenId}-result-display`);
        if (!resultDisplay) return;

        const isCollapsed = resultDisplay.classList.toggle('collapsed');
        const toggleText = resultDisplay.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = isCollapsed ? 'Show All Doses' : 'Hide Doses';
        }
    }

    addMedicationListeners(kittenId) {
        // Listen for toggle switch changes (enable/disable medication)
        Constants.MEDICATIONS.forEach(med => {
            const toggleCheckbox = document.getElementById(`${kittenId}-${med}-enabled`);
            if (toggleCheckbox) {
                toggleCheckbox.addEventListener('change', () => {
                    this.updateMedicationRowState(kittenId, med);
                    this.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            }
        });

        // Listen for status control changes (To Do / Delay / Done)
        Constants.MEDICATIONS.forEach(med => {
            const statusRadios = document.querySelectorAll(`input[name="${kittenId}-${med}-status"]`);
            statusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.updateStatusLight(kittenId, med);
                    this.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            });
        });

        // Listen for topical medication type changes (Revolution / Advantage)
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
                // Update flea status light (out-of-range may change between Revolution and Advantage)
                this.updateStatusLight(kittenId, 'flea');
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });

        // Listen for panacur regimen changes
        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        panacurRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });

        // Listen for ponazuril regimen changes
        const ponazurilRadios = document.querySelectorAll(`input[name="${kittenId}-ponazuril"]`);
        ponazurilRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });

        // Listen for ringworm status changes
        const ringwormRadios = document.querySelectorAll(`input[name="${kittenId}-ringworm-status"]`);
        ringwormRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateRingwormStatusLight(kittenId);
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
    }

    // Update medication row visual state based on toggle
    updateMedicationRowState(kittenId, medType) {
        const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, medType));
        const row = document.getElementById(Constants.ID.medRow(kittenId, medType));

        if (!toggleCheckbox || !row) return;

        if (toggleCheckbox.checked) {
            row.classList.remove(Constants.CSS.DISABLED);
        } else {
            row.classList.add(Constants.CSS.DISABLED);
        }
    }

    // Update status light color based on status selection
    updateStatusLight(kittenId, medType) {
        const statusLight = document.getElementById(Constants.ID.medStatusLight(kittenId, medType));
        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.medStatusName(kittenId, medType)}"]`);
        const toggleCheckbox = document.getElementById(Constants.ID.medEnabled(kittenId, medType));

        if (!statusLight) return;

        // Check if there's a valid weight
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = weightInput ? parseFloat(weightInput.value) : 0;

        // If no weight, hide the status light
        if (!grams || grams <= 0) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.HIDDEN}`;
            return;
        }

        // Check if this medication is out of range
        const weightLb = this.appState.constructor.convertToPounds(grams);
        const outOfRangeString = Constants.MESSAGES.OUT_OF_RANGE;
        let isOutOfRange = false;

        if (medType === 'flea') {
            // Check both Revolution and Advantage based on selection
            const topicalRadios = document.querySelectorAll(`input[name="${Constants.ID.topicalName(kittenId)}"]`);
            let topical = Constants.TOPICAL.REVOLUTION;
            topicalRadios.forEach(radio => {
                if (radio.checked) topical = radio.value;
            });
            const dose = topical === Constants.TOPICAL.REVOLUTION
                ? DoseCalculator.calculateRevolutionDose(weightLb)
                : DoseCalculator.calculateAdvantageIIDose(weightLb);
            isOutOfRange = dose === outOfRangeString || dose === 0;
        } else if (medType === 'drontal') {
            const dose = DoseCalculator.calculateDrontalDose(weightLb);
            isOutOfRange = dose === outOfRangeString;
        } else if (medType === 'capstar') {
            const dose = DoseCalculator.calculateCapstarDose(weightLb);
            isOutOfRange = dose === outOfRangeString;
        }

        // If out of range, show gray
        if (isOutOfRange) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.OUT_OF_RANGE}`;
            return;
        }

        // If medication is disabled, show skip color
        if (toggleCheckbox && !toggleCheckbox.checked) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.STATUS.SKIP}`;
            return;
        }

        let status = Constants.STATUS.TODO;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });

        statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${status}`;
    }

    // Update ringworm status light
    updateRingwormStatusLight(kittenId) {
        const statusLight = document.getElementById(Constants.ID.ringwormStatusLight(kittenId));
        const statusRadios = document.querySelectorAll(`input[name="${Constants.ID.ringwormName(kittenId)}"]`);

        if (!statusLight) return;

        // Check if there's a valid weight
        const weightInput = document.getElementById(Constants.ID.weight(kittenId));
        const grams = weightInput ? parseFloat(weightInput.value) : 0;

        // If no weight, hide the status light
        if (!grams || grams <= 0) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.CSS.HIDDEN}`;
            return;
        }

        let status = Constants.RINGWORM_STATUS.NOT_SCANNED;
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });

        // Map ringworm status to light color
        if (status === Constants.RINGWORM_STATUS.NEGATIVE) {
            statusLight.className = `${Constants.CSS.STATUS_LIGHT} ${Constants.STATUS.DONE}`;
        } else if (status === Constants.RINGWORM_STATUS.POSITIVE) {
            statusLight.className = 'status-light delay'; // amber/warning color
        } else {
            statusLight.className = 'status-light todo';
        }
    }

    // Update all status lights for a kitten (called when weight changes)
    updateAllStatusLights(kittenId) {
        const medications = ['flea', 'capstar', 'panacur', 'ponazuril', 'drontal'];
        medications.forEach(med => {
            this.updateStatusLight(kittenId, med);
        });
        this.updateRingwormStatusLight(kittenId);
    }

    // Get medication status (todo, delay, done) - replaces checkbox logic
    getMedicationStatus(kittenId, medType) {
        const toggleCheckbox = document.getElementById(`${kittenId}-${medType}-enabled`);
        if (toggleCheckbox && !toggleCheckbox.checked) {
            return 'skip';
        }

        const statusRadios = document.querySelectorAll(`input[name="${kittenId}-${medType}-status"]`);
        let status = 'todo';
        statusRadios.forEach(radio => {
            if (radio.checked) status = radio.value;
        });
        return status;
    }

    updateFleaCheckboxStates(kittenId) {
        // Legacy method - now handled by updateMedicationRowState and toggle switches
        // Keeping for backwards compatibility during transition
    }

    // Validation
    addValidationListeners(kittenId) {
        const nameInput = document.getElementById(`${kittenId}-name`);
        const weightInput = document.getElementById(`${kittenId}-weight`);
        
        nameInput.addEventListener('blur', () => {
            this.validateField(kittenId, 'name');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
        nameInput.addEventListener('input', () => {
            this.updateResultDisplay(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
        weightInput.addEventListener('blur', () => {
            this.validateField(kittenId, 'weight');
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
    }

    validateField(kittenId, fieldName) {
        const input = document.getElementById(`${kittenId}-${fieldName}`);
        const errorDiv = document.getElementById(`${kittenId}-${fieldName}-error`);
        const formGroup = input.closest('.form-group');
        
        let isValid = true;
        let errorMessage = '';
        
        if (fieldName === 'name') {
            if (!input.value.trim()) {
                isValid = false;
                errorMessage = 'Name is required';
            }
        } else if (fieldName === 'weight') {
            const weight = parseFloat(input.value);
            if (!weight || weight <= 0) {
                isValid = false;
                errorMessage = 'Weight must be greater than 0';
            }
        }
        
        if (isValid) {
            formGroup.classList.remove('has-error');
            errorDiv.textContent = '';
        } else {
            formGroup.classList.add('has-error');
            errorDiv.textContent = errorMessage;
        }
        
        return isValid;
    }

    validateAllKittens() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        let allValid = true;
        
        kittenForms.forEach(form => {
            const kittenId = form.id;
            const nameValid = this.validateField(kittenId, 'name');
            const weightValid = this.validateField(kittenId, 'weight');
            
            if (!nameValid || !weightValid) {
                allValid = false;
            }
        });
        
        return allValid;
    }
}

// Export to global namespace
window.FormManager = FormManager;