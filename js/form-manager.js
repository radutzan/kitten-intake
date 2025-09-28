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
    }

    // Kitten Management
    addKitten() {
        const container = document.getElementById('kittens-container');
        const kittenId = `kitten-${this.appState.incrementKittenCounter()}`;
        const kittenCounter = this.appState.getKittenCounter();
        
        const kittenForm = document.createElement('div');
        kittenForm.className = 'kitten-form';
        kittenForm.id = kittenId;
        
        kittenForm.innerHTML = `
            <div class="number">${kittenCounter}</div>
            <div class="kitten-form-content">
                ${kittenCounter > 1 ? `<button type="button" class="btn btn-danger remove" onclick="removeKitten('${kittenId}')">—</button>` : ''}
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
                
                <div class="form-group">
                    <div class="">
                        <label>Flea Med</label>
                        <div class="radio-group">
                            <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution" checked>
                            <label for="${kittenId}-topical-revolution">Revolution</label>
                            <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                            <label for="${kittenId}-topical-advantage">Advantage II</label>
                            <input type="radio" name="${kittenId}-topical" value="none" id="${kittenId}-topical-none">
                            <label for="${kittenId}-topical-none">Skip</label>
                        </div>
                    </div>
                    
                    <div class="radio-group-normal">
                        <label for="${kittenId}-flea-given">
                            <input type="radio" name="${kittenId}-flea-status" value="given" id="${kittenId}-flea-given">
                            Given
                        </label>
                        <label for="${kittenId}-flea-bathed" class="bathed">
                            <input type="radio" name="${kittenId}-flea-status" value="bathed" id="${kittenId}-flea-bathed" checked>
                            Delay: Bathed
                        </label>
                    </div>
                </div>
            
                <div class="form-group">
                    <label>Given at Intake</label>
                    <div class="checkbox-group dayone">
                        <label>
                            <input type="checkbox" id="${kittenId}-panacur-day1" name="panacur-day1" checked>
                            Panacur
                        </label>
                        <label>
                            <input type="checkbox" id="${kittenId}-ponazuril-day1" name="ponazuril-day1" checked>
                            Ponazuril
                        </label>
                        <label>
                            <input type="checkbox" id="${kittenId}-drontal-day1" name="drontal-day1" checked>
                            Drontal
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Panacur Treatment</label>
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-panacur" value="3" id="${kittenId}-panacur-3">
                        <label for="${kittenId}-panacur-3">3 days</label>
                        <input type="radio" name="${kittenId}-panacur" value="5" id="${kittenId}-panacur-5" checked>
                        <label for="${kittenId}-panacur-5">5 days</label>
                    </div>
                </div>
            </div>
            
            <div class="dose-display empty" id="${kittenId}-dose-display">
                <div class="dose-print-header print-only" id="${kittenId}-dose-header">
                    <h3 class="kitten-info"></h3>
                </div>
                <div class="dose-section-header">
                    <strong>Doses</strong>
                </div>
                <div class="dose-display-content" id="${kittenId}-dose-content">
                    <div class="dose-item">Enter weight to see calculated doses</div>
                </div>
            </div>
        `;
        
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
            this.updateDoseDisplay(kittenId);
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
            this.updateDoseDisplay(kittenId);
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
            display.textContent = `${grams}g = ${pounds.toFixed(2)} lb`;
            display.style.display = 'block';
        } else {
            display.style.display = 'none';
        }
    }

    updateDoseDisplay(kittenId) {
        const doseDisplay = document.getElementById(`${kittenId}-dose-display`);
        const doseContent = document.getElementById(`${kittenId}-dose-content`);
        const doseHeader = document.getElementById(`${kittenId}-dose-header`);
        
        const nameInput = document.getElementById(`${kittenId}-name`);
        const weightInput = document.getElementById(`${kittenId}-weight`);
        const grams = parseFloat(weightInput.value);
        
        // Update the print header with current name and weight
        const kittenName = nameInput.value.trim() || 'Unnamed Cat';
        const headerElement = doseHeader.querySelector('.kitten-info');
        if (grams > 0) {
            const weightLb = this.appState.constructor.convertToPounds(grams);
            headerElement.textContent = `${kittenName} - ${grams}g (${weightLb.toFixed(2)} lb)`;
        } else {
            headerElement.textContent = `${kittenName}`;
        }
        
        if (!grams || grams <= 0) {
            doseDisplay.classList.add('empty');
            doseContent.innerHTML = '<div class="dose-item">Enter weight to see calculated doses</div>';
            return;
        }
        
        const weightLb = this.appState.constructor.convertToPounds(grams);
        
        // Get selected topical
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        let topical = 'none';
        topicalRadios.forEach(radio => {
            if (radio.checked) topical = radio.value;
        });
        
        // Get flea status from radio buttons
        const fleaStatusRadios = document.querySelectorAll(`input[name="${kittenId}-flea-status"]`);
        let fleaStatus = 'neither';
        fleaStatusRadios.forEach(radio => {
            if (radio.checked) fleaStatus = radio.value;
        });
        
        const fleaGiven = fleaStatus === 'given';
        const bathed = fleaStatus === 'bathed';
        
        // Get panacur regimen
        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        let panacurDays = 3;
        panacurRadios.forEach(radio => {
            if (radio.checked) panacurDays = parseInt(radio.value);
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
            <div class="dose-item">
                <strong>Panacur</strong> ${panacurDose.toFixed(2)} mL/day × ${panacurDays} days
            </div>
            <div class="dose-item">
                <strong>Ponazuril</strong> ${ponazurilDose.toFixed(2)} mL/day × 3 days
            </div>
            <div class="dose-item">
                <strong>Drontal</strong> ${drontalDose === outOfRangeString ? drontalDose : drontalDose + ' tablet(s)'}
            </div>
        `;
        
        const bathDelayString = ' (delay 2d, bathed)';
        const timing = bathed ? bathDelayString : '';
        if (topical === 'none') {
            // Show both topical options when none is selected
            content += `
                <div class="dose-item">
                    <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : revolutionDose.toFixed(2) + ' mL'}${timing}
                </div>
                <div class="dose-item">
                    <strong>Advantage II</strong> ${advantageDose === outOfRangeString ? advantageDose : advantageDose.toFixed(2) + ' mL'}${timing}
                </div>
            `;
        } else if (topical === 'revolution') {
            content += `
                <div class="dose-item">
                    <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : revolutionDose.toFixed(2) + ' mL'}${timing}
                </div>
            `;
        } else if (topical === 'advantage') {
            content += `
                <div class="dose-item">
                    <strong>Advantage II</strong> ${advantageDose === outOfRangeString ? advantageDose : advantageDose.toFixed(2) + ' mL'}${timing}
                </div>
            `;
        }
        
        // Calculate remaining doses for foster care
        const panacurRemaining = panacurDay1Given ? (panacurDays - 1) : panacurDays;
        const ponazurilRemaining = ponazurilDay1Given ? 2 : 3;
        const panacurTotal = panacurDose * panacurRemaining;
        const ponazurilTotal = ponazurilDose * ponazurilRemaining;
        
        // Build "For Foster" section
        const remainsForFoster = [];
        
        if (!drontalDay1Given && drontalDose !== outOfRangeString) {
            remainsForFoster.push(`<strong>Drontal</strong> ${drontalDose + ' tablet(s)'}`);
        }
        
        if (panacurRemaining > 0) {
            remainsForFoster.push(`<strong>Panacur</strong> ${panacurRemaining} days × ${panacurDose.toFixed(2)} mL = ${panacurTotal.toFixed(2)} mL`);
        }
        
        if (ponazurilRemaining > 0) {
            remainsForFoster.push(`<strong>Ponazuril</strong> ${ponazurilRemaining} days × ${ponazurilDose.toFixed(2)} mL = ${ponazurilTotal.toFixed(2)} mL`);
        }
        
        // Handle topical medication for foster care
        if (topical !== 'none') {
            const topicalName = topical === 'revolution' ? 'Revolution' : 'Advantage II';
            const topicalDose = topical === 'revolution' ? revolutionDose : advantageDose;
            if (topicalDose !== outOfRangeString) {
                if (!fleaGiven) {
                    // Flea med not given at intake
                    if (bathed) {
                        // Cat was bathed - delay flea med by 2 days
                        remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose on Day +2 = ${topicalDose.toFixed(2) + ' mL'}`);
                    } else {
                        // Cat was not bathed - give flea med today
                        remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose today = ${topicalDose.toFixed(2) + ' mL'}`);
                    }
                }
                // If fleaGiven, nothing for foster (already given at intake)
            }
        }
        
        // Add "For Foster" section if there are any remaining medications
        if (remainsForFoster.length > 0) {
            content += `
                <div class="dose-section-header">
                    <strong>For Foster</strong>
                </div>
            `;
            remainsForFoster.forEach(item => {
                content += `<div class="dose-item foster-item">${item}</div>`;
            });
        } else {
            content += `
                <div class="dose-section-divider"></div>
                <div class="dose-section-header">
                    <strong>For Foster</strong>
                </div>
                <div class="dose-item foster-item">None</div>
            `;
        }
        
        doseDisplay.classList.remove('empty');
        doseContent.innerHTML = content;
    }

    addMedicationListeners(kittenId) {
        // Listen for topical medication changes
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        topicalRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateFleaCheckboxStates(kittenId);
                this.updateDoseDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
                this.autoSaveFormData();
            });
        });
        
        // Listen for flea status changes (radio buttons)
        const fleaStatusRadios = document.querySelectorAll(`input[name="${kittenId}-flea-status"]`);
        fleaStatusRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateDoseDisplay(kittenId);
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
                this.updateDoseDisplay(kittenId);
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
                    this.updateDoseDisplay(kittenId);
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
        const fleaStatusRadios = document.querySelectorAll(`input[name="${kittenId}-flea-status"]`);
        
        // Get the radio group container - add safety check
        if (fleaStatusRadios.length === 0) {
            console.error(`No flea status radios found for ${kittenId}`);
            return;
        }
        
        const radioGroup = fleaStatusRadios[0].closest('.radio-group-normal');
        if (!radioGroup) {
            console.error(`No radio group found for ${kittenId}`);
            return;
        }
        
        let selectedTopical = 'none';
        topicalRadios.forEach(radio => {
            if (radio.checked) selectedTopical = radio.value;
        });
        
        const isNoneSelected = selectedTopical === 'none';
        
        if (isNoneSelected) {
            // Hide flea status radio group when 'None' is selected
            radioGroup.style.display = 'none';
            
            // Reset to 'neither' when hidden
            const neitherRadio = document.getElementById(`${kittenId}-flea-neither`);
            if (neitherRadio && !neitherRadio.checked) {
                neitherRadio.checked = true;
                // Update results when we change the flea status
                this.updateDoseDisplay(kittenId);
                if (window.KittenApp && window.KittenApp.resultsDisplay) {
                    window.KittenApp.resultsDisplay.updateResultsAutomatically();
                }
            }
        } else {
            // Show flea status radio group when flea medication is selected
            radioGroup.style.display = 'flex';
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
            this.updateDoseDisplay(kittenId);
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