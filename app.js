// Application State
let kittens = [];
let kittenCounter = 0;

const outOfRangeString = 'Out of range'

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    addKitten(); // Add first kitten form by default
    updateHeaderButtons(); // Initialize button states
    
    // Hide results section initially
    document.getElementById('results-section').style.display = 'none';
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('add-kitten-btn').addEventListener('click', addKitten);
    
    // Header print buttons
    document.getElementById('print-checklist-btn').addEventListener('click', () => printSection('checklist'));
    document.getElementById('print-dosages-btn').addEventListener('click', () => printSection('dispense'));
}

// Kitten Management
function addKitten() {
    const container = document.getElementById('kittens-container');
    const kittenId = `kitten-${++kittenCounter}`;
    
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
                <div class="horizontal-label">
                    <label>Flea Med</label>
                    <div class="radio-group">
                        <input type="radio" name="${kittenId}-topical" value="none" id="${kittenId}-topical-none" checked>
                        <label for="${kittenId}-topical-none">None</label>
                        <input type="radio" name="${kittenId}-topical" value="advantage" id="${kittenId}-topical-advantage">
                        <label for="${kittenId}-topical-advantage">Advantage II</label>
                        <input type="radio" name="${kittenId}-topical" value="revolution" id="${kittenId}-topical-revolution">
                        <label for="${kittenId}-topical-revolution">Revolution</label>
                    </div>
                </div>
                
                <div class="checkbox-group bathed">
                    <label class="regular">
                        <input type="checkbox" id="${kittenId}-bathed" name="bathed">
                        <span>Bathed at intake <span>Delays flea meds for 2 days</span></span>
                    </label>
                </div>
            </div>
            
            <div class="form-group horizontal-label">
                <label>Panacur</label>
                <div class="radio-group">
                    <input type="radio" name="${kittenId}-panacur" value="3" id="${kittenId}-panacur-3" checked>
                    <label for="${kittenId}-panacur-3">3 days</label>
                    <input type="radio" name="${kittenId}-panacur" value="5" id="${kittenId}-panacur-5">
                    <label for="${kittenId}-panacur-5">5 days</label>
                </div>
            </div>
        
            <div class="form-group">
                <label>Doses Given</label>
                <div class="checkbox-group dayone">
                    <label>
                        <input type="checkbox" id="${kittenId}-panacur-day1" name="panacur-day1">
                        Panacur
                    </label>
                    <label>
                        <input type="checkbox" id="${kittenId}-ponazuril-day1" name="ponazuril-day1">
                        Ponazuril
                    </label>
                    <label>
                        <input type="checkbox" id="${kittenId}-drontal-day1" name="drontal-day1" checked>
                        Drontal
                    </label>
                </div>
            </div>
        </div>
        
        <div class="dose-display empty" id="${kittenId}-dose-display">
            <div class="dose-print-header" id="${kittenId}-dose-header">
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
    
    // Scroll to the new kitten form
    kittenForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add weight conversion and dose calculation listeners
    const weightInput = document.getElementById(`${kittenId}-weight`);
    
    // Filter input to allow only numbers and periods
    weightInput.addEventListener('input', function(e) {
        // Remove any characters that aren't digits or periods
        const filteredValue = e.target.value.replace(/[^0-9.]/g, '');
        
        // Ensure only one decimal point is allowed
        const parts = filteredValue.split('.');
        if (parts.length > 2) {
            e.target.value = parts[0] + '.' + parts.slice(1).join('');
        } else {
            e.target.value = filteredValue;
        }
        
        updateWeightDisplay(kittenId);
        updateDoseDisplay(kittenId);
        updateResultsAutomatically();
    });
    
    // Prevent pasting invalid characters
    weightInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const filteredPaste = paste.replace(/[^0-9.]/g, '');
        
        // Handle multiple decimal points in pasted content
        const parts = filteredPaste.split('.');
        const validPaste = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredPaste;
        
        e.target.value = validPaste;
        updateWeightDisplay(kittenId);
        updateDoseDisplay(kittenId);
        updateResultsAutomatically();
    });
    
    // Add real-time validation
    addValidationListeners(kittenId);
    
    // Add listeners for medication changes
    addMedicationListeners(kittenId);
    
}


function removeKitten(kittenId) {
    const element = document.getElementById(kittenId);
    if (element) {
        element.remove();
        updateResultsAutomatically();
    }
}

function updateWeightDisplay(kittenId) {
    const weightInput = document.getElementById(`${kittenId}-weight`);
    const display = document.getElementById(`${kittenId}-weight-display`);
    
    const grams = parseFloat(weightInput.value);
    if (grams > 0) {
        const pounds = convertToPounds(grams);
        display.textContent = `${grams}g = ${pounds.toFixed(2)} lb`;
        display.style.display = 'block';
    } else {
        display.style.display = 'none';
    }
}

function addMedicationListeners(kittenId) {
    // Listen for topical medication changes
    const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
    topicalRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateDoseDisplay(kittenId);
            updateResultsAutomatically();
        });
    });
    
    // Listen for bathing status changes
    const bathedCheckbox = document.getElementById(`${kittenId}-bathed`);
    bathedCheckbox.addEventListener('change', () => {
        updateDoseDisplay(kittenId);
        updateResultsAutomatically();
    });
    
    // Listen for panacur regimen changes
    const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
    panacurRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateDoseDisplay(kittenId);
            updateResultsAutomatically();
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
                updateDoseDisplay(kittenId);
                updateResultsAutomatically();
            });
        }
    });
}

function updateDoseDisplay(kittenId) {
    const doseDisplay = document.getElementById(`${kittenId}-dose-display`);
    const doseContent = document.getElementById(`${kittenId}-dose-content`);
    const doseHeader = document.getElementById(`${kittenId}-dose-header`);
    
    const nameInput = document.getElementById(`${kittenId}-name`);
    const weightInput = document.getElementById(`${kittenId}-weight`);
    const grams = parseFloat(weightInput.value);
    
    // Update the print header with current name and weight
    const kittenName = nameInput.value.trim() || 'Unnamed Kitten';
    const headerElement = doseHeader.querySelector('.kitten-info');
    if (grams > 0) {
        const weightLb = convertToPounds(grams);
        headerElement.textContent = `${kittenName} - ${grams}g (${weightLb.toFixed(2)} lb)`;
    } else {
        headerElement.textContent = `${kittenName}`;
    }
    
    if (!grams || grams <= 0) {
        doseDisplay.classList.add('empty');
        doseContent.innerHTML = '<div class="dose-item">Enter weight to see calculated doses</div>';
        return;
    }
    
    const weightLb = convertToPounds(grams);
    
    // Get selected topical
    const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
    let topical = 'none';
    topicalRadios.forEach(radio => {
        if (radio.checked) topical = radio.value;
    });
    
    // Get bathing status
    const bathed = document.getElementById(`${kittenId}-bathed`).checked;
    
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
    const panacurDose = calculatePanacurDose(weightLb);
    const ponazurilDose = calculatePonazurilDose(weightLb);
    const drontalDose = calculateDrontalDose(weightLb);
    const revolutionDose = calculateRevolutionDose(weightLb);
    const advantageDose = calculateAdvantageIIDose(weightLb);
    
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
    
    if (topical === 'none') {
        // Show both topical options when none is selected
        const timing = bathed ? ' (delayed 2 days if bathed)' : '';
        content += `
            <div class="dose-item">
                <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : revolutionDose.toFixed(2) + ' mL'}${timing}
            </div>
            <div class="dose-item">
                <strong>Advantage II</strong> ${advantageDose === outOfRangeString ? advantageDose : advantageDose.toFixed(2) + ' mL'}${timing}
            </div>
        `;
    } else if (topical === 'revolution') {
        const timing = bathed ? ' (delayed 2 days if bathed)' : '';
        content += `
            <div class="dose-item">
                <strong>Revolution</strong> ${revolutionDose === outOfRangeString ? revolutionDose : revolutionDose.toFixed(2) + ' mL'}${timing}
            </div>
        `;
    } else if (topical === 'advantage') {
        const timing = bathed ? ' (delayed 2 days if bathed)' : '';
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
        remainsForFoster.push(`<strong>Panacur</strong> ${panacurRemaining} days × ${panacurDose.toFixed(2)} mL = ${panacurTotal.toFixed(2)} mL total`);
    }
    
    if (ponazurilRemaining > 0) {
        remainsForFoster.push(`<strong>Ponazuril</strong> ${ponazurilRemaining} days × ${ponazurilDose.toFixed(2)} mL = ${ponazurilTotal.toFixed(2)} mL total`);
    }
    
    if (bathed && topical !== 'none') {
        const topicalName = topical === 'revolution' ? 'Revolution' : 'Advantage II';
        const topicalDose = topical === 'revolution' ? revolutionDose : advantageDose;
        if (topicalDose !== outOfRangeString) {
            remainsForFoster.push(`<strong>${topicalName}</strong> 1 dose on Day +2 = ${topicalDose.toFixed(2) + ' mL'}`);
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

// Validation
function addValidationListeners(kittenId) {
    const nameInput = document.getElementById(`${kittenId}-name`);
    const weightInput = document.getElementById(`${kittenId}-weight`);
    
    nameInput.addEventListener('blur', () => {
        validateField(kittenId, 'name');
        updateResultsAutomatically();
    });
    nameInput.addEventListener('input', () => {
        updateDoseDisplay(kittenId);
        updateResultsAutomatically();
    });
    weightInput.addEventListener('blur', () => {
        validateField(kittenId, 'weight');
        updateResultsAutomatically();
    });
}

function validateField(kittenId, fieldName) {
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

function validateAllKittens() {
    const kittenForms = document.querySelectorAll('.kitten-form');
    let allValid = true;
    
    kittenForms.forEach(form => {
        const kittenId = form.id;
        const nameValid = validateField(kittenId, 'name');
        const weightValid = validateField(kittenId, 'weight');
        
        if (!nameValid || !weightValid) {
            allValid = false;
        }
    });
    
    return allValid;
}

// Weight and Dose Calculations
function convertToPounds(grams) {
    return grams / 453.59237;
}

function calculatePanacurDose(weightLb) {
    return weightLb * 0.2;
}

function calculatePonazurilDose(weightLb) {
    return weightLb * 0.23;
}

function calculateRevolutionDose(weightLb) {
    if (weightLb >= 1.1 && weightLb < 2.2) return 0.05;
    if (weightLb >= 2.2 && weightLb < 4.4) return 0.1;
    if (weightLb >= 4.4 && weightLb < 9) return 0.2;
    if (weightLb >= 9 && weightLb <= 19.9) return 0.45;
    return outOfRangeString;
}

function calculateAdvantageIIDose(weightLb) {
    if (weightLb >= 0 && weightLb < 1) return 0.05;
    if (weightLb >= 1 && weightLb < 5) return 0.1;
    if (weightLb >= 5 && weightLb < 9) return 0.2;
    if (weightLb >= 9) return 0.45;
    return 0;
}

function calculateDrontalDose(weightLb) {
    if (weightLb >= 1.5 && weightLb < 2) return '¼';
    if (weightLb >= 2 && weightLb < 4) return '½';
    if (weightLb >= 4 && weightLb < 9) return '1';
    if (weightLb >= 9 && weightLb < 13) return '1½';
    if (weightLb >= 13 && weightLb <= 16) return '2';
    return outOfRangeString;
}

// Data Collection and Processing
function collectKittenData() {
    const kittenForms = document.querySelectorAll('.kitten-form');
    const collectedKittens = [];
    
    kittenForms.forEach(form => {
        const kittenId = form.id;
        const name = document.getElementById(`${kittenId}-name`).value.trim();
        const weightGrams = parseFloat(document.getElementById(`${kittenId}-weight`).value);
        const weightLb = convertToPounds(weightGrams);
        
        const topicalRadios = document.querySelectorAll(`input[name="${kittenId}-topical"]`);
        let topical = 'none';
        topicalRadios.forEach(radio => {
            if (radio.checked) topical = radio.value;
        });
        
        const bathed = document.getElementById(`${kittenId}-bathed`).checked;
        
        const panacurRadios = document.querySelectorAll(`input[name="${kittenId}-panacur"]`);
        let panacurDays = 3;
        panacurRadios.forEach(radio => {
            if (radio.checked) panacurDays = parseInt(radio.value);
        });
        
        const panacurDay1Given = document.getElementById(`${kittenId}-panacur-day1`).checked;
        const ponazurilDay1Given = document.getElementById(`${kittenId}-ponazuril-day1`).checked;
        const drontalDay1Given = document.getElementById(`${kittenId}-drontal-day1`).checked;
        
        // Calculate doses
        const panacurDose = calculatePanacurDose(weightLb);
        const ponazurilDose = calculatePonazurilDose(weightLb);
        const drontalDose = calculateDrontalDose(weightLb);
        
        let topicalDose = 0;
        if (topical === 'revolution') {
            topicalDose = calculateRevolutionDose(weightLb);
        } else if (topical === 'advantage') {
            topicalDose = calculateAdvantageIIDose(weightLb);
        }
        
        const kitten = {
            id: kittenId,
            name,
            weightGrams,
            weightLb,
            topical,
            bathed,
            panacurDays,
            ponazurilDays: 3,
            day1Given: {
                panacur: panacurDay1Given,
                ponazuril: ponazurilDay1Given,
                drontal: drontalDay1Given
            },
            doses: {
                panacur: panacurDose,
                ponazuril: ponazurilDose,
                topical: topicalDose,
                drontal: drontalDose
            }
        };
        
        collectedKittens.push(kitten);
    });
    
    return collectedKittens;
}

// Automatic Results Update Function
function updateResultsAutomatically() {
    // Check if we have any kittens with valid basic data
    const kittenForms = document.querySelectorAll('.kitten-form');
    
    if (kittenForms.length === 0) {
        // No kittens, hide results
        document.getElementById('results-section').style.display = 'none';
        updateHeaderButtons();
        return;
    }
    
    // Check if at least one kitten has name and weight
    let hasValidKitten = false;
    kittenForms.forEach(form => {
        const kittenId = form.id;
        const name = document.getElementById(`${kittenId}-name`).value.trim();
        const weight = parseFloat(document.getElementById(`${kittenId}-weight`).value);
        
        if (name && weight > 0) {
            hasValidKitten = true;
        }
    });
    
    if (!hasValidKitten) {
        // No valid kittens, hide results
        document.getElementById('results-section').style.display = 'none';
        updateHeaderButtons();
        return;
    }
    
    // We have at least one valid kitten, update results
    try {
        kittens = collectKittenData();
        
        // Filter out invalid kittens for the results
        const validKittens = kittens.filter(kitten =>
            kitten.name && kitten.weightGrams > 0
        );
        
        if (validKittens.length > 0) {
            const schedules = generateSchedule(validKittens);
            displayFosterChecklist(validKittens, schedules);
            displayDispenseSummary(validKittens);
            
            document.getElementById('results-section').style.display = 'block';
        } else {
            document.getElementById('results-section').style.display = 'none';
        }
        
        updateHeaderButtons();
    } catch (error) {
        // If there's an error in calculations, hide results
        console.error('Error updating results:', error);
        document.getElementById('results-section').style.display = 'none';
        updateHeaderButtons();
    }
}

// Schedule Generation
function generateSchedule(kittens) {
    const today = new Date();
    const schedules = [];
    
    kittens.forEach(kitten => {
        const schedule = {
            kittenId: kitten.id,
            kittenName: kitten.name,
            medications: {}
        };
        
        // Panacur schedule
        const panacurRemainingDays = kitten.day1Given.panacur ? 
            (kitten.panacurDays - 1) : kitten.panacurDays;
        
        if (panacurRemainingDays > 0) {
            schedule.medications.panacur = {
                dose: kitten.doses.panacur,
                days: generateDaysFromToday(panacurRemainingDays)
            };
        }
        
        // Ponazuril schedule
        const ponazurilRemainingDays = kitten.day1Given.ponazuril ? 2 : 3;
        
        if (ponazurilRemainingDays > 0) {
            schedule.medications.ponazuril = {
                dose: kitten.doses.ponazuril,
                days: generateDaysFromToday(ponazurilRemainingDays)
            };
        }
        
        // Drontal schedule (only if not given at center)
        if (!kitten.day1Given.drontal) {
            schedule.medications.drontal = {
                dose: kitten.doses.drontal,
                days: [formatDate(today)]
            };
        }
        
        // Topical schedule (only if bathed at intake)
        if (kitten.bathed && kitten.topical !== 'none' && kitten.doses.topical !== outOfRangeString && kitten.doses.topical > 0) {
            const topicalDay = new Date(today);
            topicalDay.setDate(today.getDate() + 2);
            
            schedule.medications.topical = {
                type: kitten.topical,
                dose: kitten.doses.topical,
                days: [formatDate(topicalDay)]
            };
        }
        
        schedules.push(schedule);
    });
    
    return schedules;
}

function generateDaysFromToday(numDays) {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push(formatDate(date));
    }
    
    return days;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
}

function getAllScheduleDays(schedules) {
    const allDays = new Set();
    
    schedules.forEach(schedule => {
        Object.values(schedule.medications).forEach(med => {
            med.days.forEach(day => allDays.add(day));
        });
    });
    
    const sortedDays = Array.from(allDays).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    return sortedDays;
}

// Legacy function - kept for compatibility but no longer used
// Results now update automatically via updateResultsAutomatically()
function calculateAndDisplay() {
    updateResultsAutomatically();
}

// Display Functions

function displayFosterChecklist(kittens, schedules) {
    const container = document.getElementById('foster-checklist-content');
    
    // Get all unique dates across all schedules
    const allDays = getAllScheduleDays(schedules);
    
    if (allDays.length === 0) {
        container.innerHTML = '<p>No medications needed for foster care.</p>';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'checklist-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow1 = document.createElement('tr');
    const headerRow2 = document.createElement('tr');
    
    // Date column
    const dateHeader = document.createElement('th');
    dateHeader.textContent = 'Date';
    dateHeader.rowSpan = 2;
    dateHeader.className = 'date-col';
    headerRow1.appendChild(dateHeader);
    
    // Kitten columns
    kittens.forEach(kitten => {
        const schedule = schedules.find(s => s.kittenId === kitten.id);
        const medCount = Object.keys(schedule.medications).length;
        
        if (medCount > 0) {
            const kittenHeader = document.createElement('th');
            kittenHeader.colSpan = medCount;
            kittenHeader.className = 'kitten-header';
            kittenHeader.innerHTML = `${kitten.name}<br><small>${kitten.weightGrams}g (${kitten.weightLb.toFixed(2)} lb)</small>`;
            headerRow1.appendChild(kittenHeader);
            
            // Medication sub-headers
            Object.entries(schedule.medications).forEach(([medType, medData]) => {
                const medHeader = document.createElement('th');
                medHeader.className = 'med-header';
                
                let medName = '';
                let doseDisplay = '';
                if (medType === 'panacur') {
                    medName = 'Panacur';
                    doseDisplay = `${medData.dose.toFixed(2)} mL`;
                }
                else if (medType === 'ponazuril') {
                    medName = 'Ponazuril';
                    doseDisplay = `${medData.dose.toFixed(2)} mL`;
                }
                else if (medType === 'drontal') {
                    medName = 'Drontal';
                    doseDisplay = medData.dose === outOfRangeString ? medData.dose : `${medData.dose} tablet(s)`;
                }
                else if (medType === 'topical') {
                    medName = medData.type === 'revolution' ? 'Revolution' : 'Advantage II';
                    doseDisplay = medData.dose === outOfRangeString ? medData.dose : `${medData.dose.toFixed(2)} mL`;
                }
                
                medHeader.innerHTML = `${medName}<br><small>${doseDisplay}</small>`;
                headerRow2.appendChild(medHeader);
            });
        }
    });
    
    thead.appendChild(headerRow1);
    thead.appendChild(headerRow2);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    allDays.forEach(day => {
        const row = document.createElement('tr');
        
        // Date cell
        const dateCell = document.createElement('td');
        dateCell.className = 'date-col';
        dateCell.textContent = day;
        row.appendChild(dateCell);
        
        // Medication cells
        kittens.forEach(kitten => {
            const schedule = schedules.find(s => s.kittenId === kitten.id);
            
            Object.entries(schedule.medications).forEach(([medType, medData]) => {
                const cell = document.createElement('td');
                
                if (medData.days.includes(day)) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = `${kitten.id}-${medType}-${day}`;
                    cell.appendChild(checkbox);
                } else {
                    cell.innerHTML = '—';
                }
                
                row.appendChild(cell);
            });
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}

function displayDispenseSummary(kittens) {
    const container = document.getElementById('dispense-summary-content');
    container.innerHTML = '';
    
    const totals = {
        panacur: 0,
        ponazuril: 0,
        revolution: 0,
        advantage: 0,
        drontal: 0
    };
    
    kittens.forEach(kitten => {
        const panacurRemaining = kitten.day1Given.panacur ?
            (kitten.panacurDays - 1) : kitten.panacurDays;
        const ponazurilRemaining = kitten.day1Given.ponazuril ? 2 : 3;
        
        const panacurTotal = kitten.doses.panacur * panacurRemaining;
        const ponazurilTotal = kitten.doses.ponazuril * ponazurilRemaining;
        
        let topicalAmount = 0;
        if (kitten.bathed && kitten.topical !== 'none') {
            topicalAmount = kitten.doses.topical === outOfRangeString ? 0 : kitten.doses.topical;
        }
        
        const drontalAmount = kitten.day1Given.drontal ? 0 : 1; // 1 dose if not given at center
        
        // Add to totals
        totals.panacur += panacurTotal;
        totals.ponazuril += ponazurilTotal;
        if (kitten.topical === 'revolution' && kitten.doses.topical !== outOfRangeString) totals.revolution += topicalAmount;
        if (kitten.topical === 'advantage' && kitten.doses.topical !== outOfRangeString) totals.advantage += topicalAmount;
        if (kitten.doses.drontal !== outOfRangeString) totals.drontal += drontalAmount;
    });
    
    // Aggregate totals only
    const aggregateSection = document.createElement('div');
    aggregateSection.className = 'med-totals';
    aggregateSection.innerHTML = `
        <div class="total-item">
            <span>Panacur</span>
            <strong>${totals.panacur.toFixed(2)} mL</strong>
        </div>
        <div class="total-item">
            <span>Ponazuril</span>
            <strong>${totals.ponazuril.toFixed(2)} mL</strong>
        </div>
        ${totals.revolution > 0 ? `
        <div class="total-item">
            <span>Revolution</span>
            <strong>${totals.revolution.toFixed(2)} mL</strong>
        </div>
        ` : ''}
        ${totals.advantage > 0 ? `
        <div class="total-item">
            <span>Advantage II</span>
            <strong>${totals.advantage.toFixed(2)} mL</strong>
        </div>
        ` : ''}
        ${totals.drontal > 0 ? `
        <div class="total-item">
            <span>Drontal</span>
            <strong>${totals.drontal} tablet(s)</strong>
        </div>
        ` : ''}
    `;
    
    container.appendChild(aggregateSection);
}

// Print Functions
function printSection(section) {
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

// Header Button Management
function updateHeaderButtons() {
    const resultsSection = document.getElementById('results-section');
    const hasResults = resultsSection && resultsSection.style.display !== 'none' && kittens.length > 0;
    
    const printChecklistBtn = document.getElementById('print-checklist-btn');
    const printDosagesBtn = document.getElementById('print-dosages-btn');
    
    if (printChecklistBtn) {
        printChecklistBtn.disabled = !hasResults;
        printChecklistBtn.style.opacity = hasResults ? '1' : '0.5';
    }
    
    if (printDosagesBtn) {
        printDosagesBtn.disabled = !hasResults;
        printDosagesBtn.style.opacity = hasResults ? '1' : '0.5';
    }
}