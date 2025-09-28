/**
 * Results Display Module - Foster checklist and dispense summary rendering
 * Handles rendering and updating of results sections
 */

class ResultsDisplay {
    constructor(appState, scheduleManager, doseCalculator) {
        this.appState = appState;
        this.scheduleManager = scheduleManager;
        this.doseCalculator = doseCalculator;
    }

    updateResultsAutomatically() {
        // Check if we have any kittens with valid basic data
        const kittenForms = document.querySelectorAll('.kitten-form');
        
        if (kittenForms.length === 0) {
            // No kittens, hide results
            document.getElementById('results-section').style.display = 'none';
            this.updateHeaderButtons();
            return;
        }
        
        // Check if at least one kitten has weight
        let hasValidKitten = false;
        kittenForms.forEach(form => {
            const kittenId = form.id;
            const weight = parseFloat(document.getElementById(`${kittenId}-weight`).value);
            
            if (weight > 0) {
                hasValidKitten = true;
            }
        });
        
        if (!hasValidKitten) {
            // No valid kittens, hide results
            document.getElementById('results-section').style.display = 'none';
            this.updateHeaderButtons();
            return;
        }
        
        // We have at least one valid kitten, update results
        try {
            const kittens = this.appState.collectKittenData();
            
            // Add doses to kittens and filter out invalid ones
            const validKittens = kittens
                .map(kitten => this.doseCalculator.addDosesToKitten(kitten))
                .filter(kitten => kitten.weightGrams > 0);
            
            if (validKittens.length > 0) {
                const schedules = this.scheduleManager.generateSchedule(validKittens);
                this.displayFosterChecklist(validKittens, schedules);
                this.displayDispenseSummary(validKittens);
                
                document.getElementById('results-section').style.display = 'block';
            } else {
                document.getElementById('results-section').style.display = 'none';
            }
            
            this.updateHeaderButtons();
        } catch (error) {
            // If there's an error in calculations, hide results
            console.error('Error updating results:', error);
            document.getElementById('results-section').style.display = 'none';
            this.updateHeaderButtons();
        }
    }

    displayFosterChecklist(kittens, schedules) {
        const container = document.getElementById('foster-checklist-content');
        
        // Get all unique dates across all schedules
        const allDays = this.scheduleManager.getAllScheduleDays(schedules);
        
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
                const displayName = kitten.name || 'Unnamed Kitten';
                kittenHeader.innerHTML = `${displayName}<br><small>${kitten.weightGrams}g (${kitten.weightLb.toFixed(2)} lb)</small>`;
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
                        doseDisplay = `${medData.dose} tablet(s)`;
                    }
                    else if (medType === 'topical') {
                        medName = medData.type === 'revolution' ? 'Revolution' : 'Advantage II';
                        doseDisplay = `${medData.dose.toFixed(2)} mL`;
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
            
            // Medication cells - only show cells for kittens that have medications
            kittens.forEach(kitten => {
                const schedule = schedules.find(s => s.kittenId === kitten.id);
                const medCount = Object.keys(schedule.medications).length;
                
                // Only add cells if this kitten has medications
                if (medCount > 0) {
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
                }
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);
    }

    displayDispenseSummary(kittens) {
        const container = document.getElementById('dispense-summary-content');
        container.innerHTML = '';
        
        const totals = {
            panacur: 0,
            ponazuril: 0,
            revolution: 0,
            advantage: 0,
            drontal: 0
        };
        
        const outOfRangeString = this.appState.getOutOfRangeString();
        
        kittens.forEach(kitten => {
            const remaining = this.scheduleManager.calculateRemainingMedications(kitten);
            
            // Add to totals
            totals.panacur += remaining.panacur.total;
            totals.ponazuril += remaining.ponazuril.total;
            
            if (kitten.topical === 'revolution' && kitten.doses.topical !== outOfRangeString) {
                totals.revolution += remaining.topical.amount;
            }
            if (kitten.topical === 'advantage' && kitten.doses.topical !== outOfRangeString) {
                totals.advantage += remaining.topical.amount;
            }
            if (kitten.doses.drontal !== outOfRangeString) {
                totals.drontal += remaining.drontal.amount;
            }
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

    updateHeaderButtons() {
        const resultsSection = document.getElementById('results-section');
        const kittens = this.appState.getKittens();
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

    /**
     * Legacy function - kept for compatibility but no longer used
     * Results now update automatically via updateResultsAutomatically()
     */
    calculateAndDisplay() {
        this.updateResultsAutomatically();
    }
}

// Export to global namespace
window.ResultsDisplay = ResultsDisplay;