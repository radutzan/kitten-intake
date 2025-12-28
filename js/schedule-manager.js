/**
 * Schedule Manager Module - Medication schedule generation
 * Handles generation and management of medication schedules for foster care
 */

class ScheduleManager {
    constructor(appState) {
        this.appState = appState;
    }

    generateSchedule(kittens) {
        const schedules = [];
        
        kittens.forEach(kitten => {
            const schedule = {
                kittenId: kitten.id,
                kittenName: kitten.name,
                medications: {}
            };
            
            // ALL medications start tomorrow (simplified approach)
            const standardStartOffset = 1;
            
            // Panacur schedule
            const panacurRemainingDays = kitten.day1Given.panacur ?
                (kitten.panacurDays - 1) : kitten.panacurDays;
            
            if (panacurRemainingDays > 0) {
                schedule.medications.panacur = {
                    dose: kitten.doses.panacur,
                    days: this.generateDaysFromToday(panacurRemainingDays, standardStartOffset)
                };
            }
            
            // Ponazuril schedule
            const ponazurilRemainingDays = kitten.day1Given.ponazuril ?
                (kitten.ponazurilDays - 1) : kitten.ponazurilDays;
            
            if (ponazurilRemainingDays > 0) {
                schedule.medications.ponazuril = {
                    dose: kitten.doses.ponazuril,
                    days: this.generateDaysFromToday(ponazurilRemainingDays, standardStartOffset)
                };
            }
            
            // Drontal schedule (only if not given at center and dose is not out of range)
            const outOfRangeString = this.appState.getOutOfRangeString();
            if (!kitten.day1Given.drontal && kitten.doses.drontal !== outOfRangeString) {
                schedule.medications.drontal = {
                    dose: kitten.doses.drontal,
                    days: this.generateDaysFromToday(1, standardStartOffset)
                };
            }
            
            // Topical schedule logic
            if (kitten.topical !== 'none' && kitten.doses.topical !== outOfRangeString && kitten.doses.topical > 0) {
                if (!kitten.fleaGiven) {
                    // Flea med not given at intake - delay by 2 days
                    const fleaDelayOffset = 2;
                    schedule.medications.topical = {
                        type: kitten.topical,
                        dose: kitten.doses.topical,
                        days: this.generateDaysFromToday(1, fleaDelayOffset)
                    };
                }
                // If fleaGiven, no schedule entry (med already given at intake)
            }
            
            schedules.push(schedule);
        });
        
        return schedules;
    }

    generateDaysFromToday(numDays, startOffset = 0) {
        const today = new Date();
        const days = [];
        
        for (let i = 0; i < numDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + startOffset + i);
            days.push(this.appState.constructor.formatDate(date));
        }
        
        return days;
    }

    getAllScheduleDays(schedules) {
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

    /**
     * Calculate remaining medication amounts for foster care
     * @param {object} kitten - Kitten object with medication info
     * @returns {object} Object containing remaining amounts for each medication
     */
    calculateRemainingMedications(kitten) {
        const panacurRemaining = kitten.day1Given.panacur ?
            (kitten.panacurDays - 1) : kitten.panacurDays;
        const ponazurilRemaining = kitten.day1Given.ponazuril ?
            (kitten.ponazurilDays - 1) : kitten.ponazurilDays;
        
        const panacurTotal = kitten.doses.panacur * panacurRemaining;
        const ponazurilTotal = kitten.doses.ponazuril * ponazurilRemaining;
        
        let topicalAmount = 0;
        if (kitten.topical !== 'none' && !kitten.fleaGiven) {
            // Only count topical medication if it wasn't given at intake
            const outOfRangeString = this.appState.getOutOfRangeString();
            topicalAmount = kitten.doses.topical === outOfRangeString ? 0 : kitten.doses.topical;
        }
        
        const drontalAmount = kitten.day1Given.drontal ? 0 : 1; // 1 dose if not given at center
        
        return {
            panacur: {
                remaining: panacurRemaining,
                total: panacurTotal
            },
            ponazuril: {
                remaining: ponazurilRemaining,
                total: ponazurilTotal
            },
            topical: {
                amount: topicalAmount,
                type: kitten.topical
            },
            drontal: {
                amount: drontalAmount
            }
        };
    }

    /**
     * Get schedule summary for a specific kitten
     * @param {object} kitten - Kitten object
     * @returns {array} Array of medication schedule items
     */
    getKittenScheduleSummary(kitten) {
        const remaining = this.calculateRemainingMedications(kitten);
        const summary = [];
        
        if (remaining.panacur.remaining > 0) {
            summary.push({
                medication: 'Panacur',
                dose: AppState.formatNumber(kitten.doses.panacur, 2) + ' mL',
                days: remaining.panacur.remaining,
                total: AppState.formatNumber(remaining.panacur.total, 2) + ' mL total'
            });
        }

        if (remaining.ponazuril.remaining > 0) {
            summary.push({
                medication: 'Ponazuril',
                dose: AppState.formatNumber(kitten.doses.ponazuril, 2) + ' mL',
                days: remaining.ponazuril.remaining,
                total: AppState.formatNumber(remaining.ponazuril.total, 2) + ' mL total'
            });
        }
        
        const outOfRangeString = this.appState.getOutOfRangeString();
        if (remaining.drontal.amount > 0 && kitten.doses.drontal !== outOfRangeString) {
            summary.push({
                medication: 'Drontal',
                dose: kitten.doses.drontal + ' tablet(s)',
                days: 1,
                total: kitten.doses.drontal + ' tablet(s)'
            });
        }
        
        if (remaining.topical.amount > 0) {
            const topicalName = remaining.topical.type === 'revolution' ? 'Revolution' : 'Advantage II';
            summary.push({
                medication: topicalName,
                dose: AppState.formatNumber(remaining.topical.amount, 2) + ' mL',
                days: 1
            });
        }
        
        return summary;
    }
}

// Export to global namespace
window.ScheduleManager = ScheduleManager;