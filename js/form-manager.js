/**
 * Form Manager Module - Form creation, validation, and event handling
 * Handles all kitten form creation, manipulation, and validation
 */

class FormManager {
    constructor(appState, doseCalculator) {
        this.appState = appState;
        this.doseCalculator = doseCalculator;
    }

    // Auto-save helper function
    autoSaveFormData() {
        if (window.localStorageManager) {
            localStorageManager.saveFormData();
        }
        // Update URL in real-time for instant sharing
        if (window.KittenApp && window.KittenApp.urlStateManager) {
            window.KittenApp.urlStateManager.updateUrlRealtime();
        }
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
                
                <table class="medication-table">
                    <thead>
                        <tr>
                            <th>Medication</th>
                            <th>Given</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <label>Flea Med</label>
                                <div class="radio-group">
                                    <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution" checked>
                                    <label for="${kittenId}-topical-revolution">Revolution</label>
                                    <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                                    <label for="${kittenId}-topical-advantage">Advantage II</label>
                                    <input type="radio" name="${kittenId}-topical" value="none" id="${kittenId}-topical-none">
                                    <label for="${kittenId}-topical-none">Skip</label>
                                </div>
                            </td>
                            <td class="given-cell">
                                <input type="checkbox" id="${kittenId}-flea-given" name="flea-given">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label>Panacur</label>
                                <div class="radio-group">
                                    <input type="radio" name="${kittenId}-panacur" value="1" id="${kittenId}-panacur-1">
                                    <label for="${kittenId}-panacur-1">1 day</label>
                                    <input type="radio" name="${kittenId}-panacur" value="3" id="${kittenId}-panacur-3">
                                    <label for="${kittenId}-panacur-3">3 days</label>
                                    <input type="radio" name="${kittenId}-panacur" value="5" id="${kittenId}-panacur-5" checked>
                                    <label for="${kittenId}-panacur-5">5 days</label>
                                </div>
                            </td>
                            <td class="given-cell">
                                <input type="checkbox" id="${kittenId}-panacur-day1" name="panacur-day1" checked>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label>Ponazuril</label>
                                <div class="radio-group">
                                    <input type="radio" name="${kittenId}-ponazuril" value="1" id="${kittenId}-ponazuril-1">
                                    <label for="${kittenId}-ponazuril-1">1 day</label>
                                    <input type="radio" name="${kittenId}-ponazuril" value="3" id="${kittenId}-ponazuril-3" checked>
                                    <label for="${kittenId}-ponazuril-3">3 days</label>
                                </div>
                            </td>
                            <td class="given-cell">
                                <input type="checkbox" id="${kittenId}-ponazuril-day1" name="ponazuril-day1" checked>
                            </td>
                        </tr>
                        <tr>
                            <td class="drontal-cell">
                                <label>Drontal</label>
                            </td>
                            <td class="given-cell">
                                <input type="checkbox" id="${kittenId}-drontal-day1" name="drontal-day1" checked>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="form-group ringworm-section">
                    <label>Ringworm</label>
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-ringworm-status" value="not-scanned" id="${kittenId}-ringworm-not-scanned" checked>
                        <label for="${kittenId}-ringworm-not-scanned">Not scanned</label>
                        <input type="radio" name="${kittenId}-ringworm-status" value="negative" id="${kittenId}-ringworm-negative">
                        <label for="${kittenId}-ringworm-negative">Negative</label>
                        <input type="radio" name="${kittenId}-ringworm-status" value="positive" id="${kittenId}-ringworm-positive">
                        <label for="${kittenId}-ringworm-positive">Positive</label>
                    </div>
                </div>
            </div>
            
            <div class="result-display empty" id="${kittenId}-result-display">
                <div class="dose-print-header print-only" id="${kittenId}-result-header">
                    <h3 class="kitten-info"></h3>
                </div>
                <div class="dose-section-header">
                    <strong>Doses</strong>
                </div>
                <div id="${kittenId}-result-content">
                    <div class="result-display-content">
                        <div class="result-item">Enter weight to see calculated doses</div>
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
        
        // Only scroll to the new kitten form if it's not the first one
        if (kittenCounter > 1) {
            // Scroll to the new kitten form, accounting for sticky nav height
            const nav = document.querySelector('nav');
            const navHeight = nav ? nav.offsetHeight : 0;
            
            // Get the position of the new form
            const formRect = kittenForm.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Calculate the target scroll position (form top minus nav height)
            const targetScrollPosition = formRect.top + scrollTop - navHeight;
            
            // Smooth scroll to the adjusted position
            window.scrollTo({
                top: targetScrollPosition,
                behavior: 'smooth'
            });
        }
        
        // Add weight conversion and dose calculation listeners
        const weightInput = document.getElementById(`${kittenId}-weight`);
        
        // Filter input to allow only numbers and periods
        weightInput.addEventListener('input', (e) => {
            // Remove any characters that aren't digits or periods
            const filteredValue = e.target.value.replace(/[^0-9.]/g, '');
            
            // Ensure only one decimal point is allowed
            const parts = filteredValue.split('.');
            if (parts.length > 2) {
                e.target.value = parts[0] + '.' + parts.slice(1).join('');
            } else {
                e.target.value = filteredValue;
            }
            
            this.updateWeightDisplay(kittenId);
            this.updateResultDisplay(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
        
        // Prevent pasting invalid characters
        weightInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const filteredPaste = paste.replace(/[^0-9.]/g, '');
            
            // Handle multiple decimal points in pasted content
            const parts = filteredPaste.split('.');
            const validPaste = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredPaste;
            
            e.target.value = validPaste;
            this.updateWeightDisplay(kittenId);
            this.updateResultDisplay(kittenId);
            if (window.KittenApp && window.KittenApp.resultsDisplay) {
                window.KittenApp.resultsDisplay.updateResultsAutomatically();
            }
            this.autoSaveFormData();
        });
        
        // Add real-time validation
        this.addValidationListeners(kittenId);
        
        // Add listeners for medication changes
        this.addMedicationListeners(kittenId);
        
        // Set initial checkbox states (None is selected by default)
        this.updateFleaCheckboxStates(kittenId);

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
        // Copy Topical
        const sourceTopical = document.querySelector(`input[name="${sourceId}-topical"]:checked`);
        if (sourceTopical) {
            const targetTopical = document.getElementById(`${targetId}-topical-${sourceTopical.value}`);
            if (targetTopical) targetTopical.checked = true;
        }

        // Copy Flea Given
        const sourceFleaGiven = document.getElementById(`${sourceId}-flea-given`);
        const targetFleaGiven = document.getElementById(`${targetId}-flea-given`);
        if (sourceFleaGiven && targetFleaGiven) {
            targetFleaGiven.checked = sourceFleaGiven.checked;
        }

        // Copy Day 1 Meds
        const meds = ['panacur', 'ponazuril', 'drontal'];
        meds.forEach(med => {
            const sourceCheckbox = document.getElementById(`${sourceId}-${med}-day1`);
            const targetCheckbox = document.getElementById(`${targetId}-${med}-day1`);
            if (sourceCheckbox && targetCheckbox) {
                targetCheckbox.checked = sourceCheckbox.checked;
            }
        });

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
            if (targetRingworm) targetRingworm.checked = true;
        }

        // Update UI
        this.updateFleaCheckboxStates(targetId);
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
        if (window.KittenApp && window.KittenApp.resultsDisplay) {
            window.KittenApp.resultsDisplay.updateResultsAutomatically();
        }
        this.autoSaveFormData();
    }

    updateWeightDisplay(kittenId) {
        const weightInput = document.getElementById(`${kittenId}-weight`);
        const display = document.getElementById(`${kittenId}-weight-display`);
        
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
        const doseDisplay = document.getElementById(`${kittenId}-result-display`);
        const doseContent = document.getElementById(`${kittenId}-result-content`);
        const doseHeader = document.getElementById(`${kittenId}-result-header`);
        
        const nameInput = document.getElementById(`${kittenId}-name`);
        const weightInput = document.getElementById(`${kittenId}-weight`);
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
            doseContent.innerHTML = ' <div class="result-display-content"><div class="result-item">Enter weight to see calculated doses</div></div>';
            return;
        }
        
        const weightLb = this.appState.constructor.convertToPounds(grams);
        
        // Get selected topical
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        let topical = 'none';
        topicalRadios.forEach(radio => {
            if (radio.checked) topical = radio.value;
        });
        
        // Get flea status from checkbox
        const fleaGivenCheckbox = document.getElementById(`${kittenId}-flea-given`);
        const fleaGiven = fleaGivenCheckbox && fleaGivenCheckbox.checked;
        
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

        // Get day 1 given status
        const panacurDay1Given = document.getElementById(`${kittenId}-panacur-day1`).checked;
        const ponazurilDay1Given = document.getElementById(`${kittenId}-ponazuril-day1`).checked;
        const drontalDay1Given = document.getElementById(`${kittenId}-drontal-day1`).checked;
        
        // Calculate doses
        const panacurDose = this.doseCalculator.calculatePanacurDose(weightLb);
        const ponazurilDose = this.doseCalculator.calculatePonazurilDose(weightLb);
        const drontalDose = this.doseCalculator.calculateDrontalDose(weightLb);
        const revolutionDose = this.doseCalculator.calculateRevolutionDose(weightLb);
        const advantageDose = this.doseCalculator.calculateAdvantageIIDose(weightLb);
        
        const outOfRangeString = this.appState.getOutOfRangeString();
        
        // Build dose display content
        let content = `
        <div class="result-display-content">
            <div class="result-item">
                <strong>Panacur</strong> ${AppState.formatNumber(panacurDose, 2)} mL/day × ${panacurDays} days
            </div>
            <div class="result-item">
                <strong>Ponazuril</strong> ${AppState.formatNumber(ponazurilDose, 2)} mL/day × ${ponazurilDays} days
            </div>
            <div class="result-item">
                <strong>Drontal</strong> ${drontalDose === outOfRangeString ? drontalDose : drontalDose + ' tablet(s)'}
            </div>
        `;
        
        if (topical === 'none') {
            // Show both topical options when none is selected
            content += `
                <div class="result-item">
                    <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : AppState.formatNumber(revolutionDose, 2) + ' mL'}
                </div>
                <div class="result-item">
                    <strong>Advantage II</strong> ${advantageDose === outOfRangeString ? advantageDose : AppState.formatNumber(advantageDose, 2) + ' mL'}
                </div>
            `;
        } else if (topical === 'revolution') {
            content += `
                <div class="result-item">
                    <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : AppState.formatNumber(revolutionDose, 2) + ' mL'}
                </div>
            `;
        } else if (topical === 'advantage') {
            content += `
                <div class="result-item">
                    <strong>Advantage II</strong> ${advantageDose === outOfRangeString ? advantageDose : AppState.formatNumber(advantageDose, 2) + ' mL'}
                </div>
            `;
        }
        content += `
        </div>
        `;
        
        // Calculate remaining doses for foster care
        const panacurRemaining = panacurDay1Given ? (panacurDays - 1) : panacurDays;
        const ponazurilRemaining = ponazurilDay1Given ? (ponazurilDays - 1) : ponazurilDays;
        const panacurTotal = panacurDose * panacurRemaining;
        const ponazurilTotal = ponazurilDose * ponazurilRemaining;
        
        // Build "For Foster" section
        const remainsForFoster = [];
        
        if (!drontalDay1Given && drontalDose !== outOfRangeString) {
            remainsForFoster.push(`<strong>Drontal</strong> ${drontalDose + ' tablet(s)'}`);
        }
        
        if (panacurRemaining > 0) {
            remainsForFoster.push(`<strong>Panacur</strong> ${panacurRemaining} days × ${AppState.formatNumber(panacurDose, 2)} mL = ${AppState.formatNumber(panacurTotal, 2)} mL`);
        }

        if (ponazurilRemaining > 0) {
            remainsForFoster.push(`<strong>Ponazuril</strong> ${ponazurilRemaining} days × ${AppState.formatNumber(ponazurilDose, 2)} mL = ${AppState.formatNumber(ponazurilTotal, 2)} mL`);
        }
        
        // Handle topical medication for foster care
        if (topical !== 'none') {
            const topicalName = topical === 'revolution' ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === 'revolution' ? revolutionDose : advantageDose;
            if (topicalDose !== outOfRangeString && !fleaGiven) {
                // Flea med not given at intake - foster needs to give it
                remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose = ${AppState.formatNumber(topicalDose, 2)} mL`);
            }
        }
        
        // Add "For Foster" section if there are any remaining medications
        if (remainsForFoster.length > 0) {
            content += `
                <div class="dose-section-header">
                    <strong>For Foster</strong>
                </div>
                <div class="result-display-content foster">
            `;
            remainsForFoster.forEach(item => {
                content += `<div class="result-item">${item}</div>`;
            });
        } else {
            content += `
                <div class="dose-section-header">
                    <strong>For Foster</strong>
                </div>
                <div class="result-display-content">
                    <div class="result-item">None</div>
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
        
        // Add "Other" section
        content += `
                </div>
                <div class="dose-section-header">
                    <strong>Other</strong>
                </div>
                <div class="result-display-content">
                    <div class="result-item">
                        <strong>Ringworm</strong> ${ringwormStatusText[ringwormStatus] || ringwormStatus}
                    </div>
                </div>
        `;
        
        doseDisplay.classList.remove('empty');
        doseContent.innerHTML = content;
    }

    addMedicationListeners(kittenId) {
        // Listen for topical medication changes
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateFleaCheckboxStates(kittenId);
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
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
        
        // Listen for flea given checkbox changes
        const fleaGivenCheckbox = document.getElementById(`${kittenId}-flea-given`);
        if (fleaGivenCheckbox) {
            fleaGivenCheckbox.addEventListener('change', () => {
                this.updateResultDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        }
        
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

        // Listen for day 1 medication checkbox changes
        const day1Checkboxes = [
            document.getElementById(`${kittenId}-panacur-day1`),
            document.getElementById(`${kittenId}-ponazuril-day1`),
            document.getElementById(`${kittenId}-drontal-day1`)
        ];
        day1Checkboxes.forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updateResultDisplay(kittenId);
                    if (window.KittenApp && window.KittenApp.resultsDisplay) {
                        window.KittenApp.resultsDisplay.updateResultsAutomatically();
                    }
                    this.autoSaveFormData();
                });
            }
        });
    }

    updateFleaCheckboxStates(kittenId) {
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        const fleaGivenCheckbox = document.getElementById(`${kittenId}-flea-given`);

        if (!fleaGivenCheckbox) {
            console.error(`No flea given checkbox found for ${kittenId}`);
            return;
        }

        let selectedTopical = 'none';
        topicalRadios.forEach(radio => {
            if (radio.checked) selectedTopical = radio.value;
        });

        const isNoneSelected = selectedTopical === 'none';

        if (isNoneSelected) {
            // Disable and uncheck flea given checkbox when 'Skip' is selected
            fleaGivenCheckbox.disabled = true;
            fleaGivenCheckbox.checked = false;
        } else {
            // Enable flea given checkbox when flea medication is selected
            fleaGivenCheckbox.disabled = false;
        }
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