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

            // Medications start tomorrow if given at intake, today if not given
            const givenStartOffset = 1;  // Start tomorrow if given at intake
            const notGivenStartOffset = 0;  // Start today if not given at intake

            // Helper to check if medication is skipped (disabled)
            const medStatus = kitten.medicationStatus || {};
            const isSkipped = (med) => medStatus[med] === Constants.STATUS.SKIP;

            // Panacur schedule (skip if disabled)
            if (!isSkipped('panacur')) {
                const panacurRemainingDays = kitten.day1Given.panacur ?
                    (kitten.panacurDays - 1) : kitten.panacurDays;
                const panacurOffset = kitten.day1Given.panacur ? givenStartOffset : notGivenStartOffset;

                if (panacurRemainingDays > 0) {
                    schedule.medications.panacur = {
                        dose: kitten.doses.panacur,
                        days: this.generateDaysFromToday(panacurRemainingDays, panacurOffset)
                    };
                }
            }

            // Ponazuril schedule (skip if disabled)
            if (!isSkipped('ponazuril')) {
                const ponazurilRemainingDays = kitten.day1Given.ponazuril ?
                    (kitten.ponazurilDays - 1) : kitten.ponazurilDays;
                const ponazurilOffset = kitten.day1Given.ponazuril ? givenStartOffset : notGivenStartOffset;

                if (ponazurilRemainingDays > 0) {
                    schedule.medications.ponazuril = {
                        dose: kitten.doses.ponazuril,
                        days: this.generateDaysFromToday(ponazurilRemainingDays, ponazurilOffset)
                    };
                }
            }

            // Drontal schedule (only if not skipped, not given at center, and dose is not out of range)
            const outOfRangeString = this.appState.getOutOfRangeString();
            if (!isSkipped('drontal') && !kitten.day1Given.drontal && kitten.doses.drontal !== outOfRangeString) {
                schedule.medications.drontal = {
                    dose: kitten.doses.drontal,
                    days: this.generateDaysFromToday(1, notGivenStartOffset)
                };
            }

            // Capstar schedule (only if not skipped and not given at center)
            if (!isSkipped('capstar') && kitten.day1Given && kitten.day1Given.capstar === false) {
                schedule.medications.capstar = {
                    dose: '1 tablet',
                    days: this.generateDaysFromToday(1, notGivenStartOffset)
                };
            }

            // Topical schedule logic
            if (kitten.topical !== 'none' && kitten.doses.topical !== outOfRangeString && kitten.doses.topical > 0) {
                const fleaStatus = kitten.medicationStatus ? kitten.medicationStatus.flea : (kitten.fleaGiven ? 'done' : 'todo');

                if (fleaStatus === 'delay') {
                    // "Delay" status - delay by 2 days
                    const fleaDelayOffset = 2;
                    schedule.medications.topical = {
                        type: kitten.topical,
                        dose: kitten.doses.topical,
                        days: this.generateDaysFromToday(1, fleaDelayOffset)
                    };
                } else if (fleaStatus === 'todo') {
                    // "To Do" status - start today
                    schedule.medications.topical = {
                        type: kitten.topical,
                        dose: kitten.doses.topical,
                        days: this.generateDaysFromToday(1, notGivenStartOffset)
                    };
                }
                // If fleaStatus === 'done' or 'skip', no schedule entry
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
        // Helper to check if medication is skipped (disabled)
        const medStatus = kitten.medicationStatus || {};
        const isSkipped = (med) => medStatus[med] === Constants.STATUS.SKIP;

        // Panacur: 0 if skipped, otherwise calculate remaining
        const panacurRemaining = isSkipped('panacur') ? 0 :
            (kitten.day1Given.panacur ? (kitten.panacurDays - 1) : kitten.panacurDays);

        // Ponazuril: 0 if skipped, otherwise calculate remaining
        const ponazurilRemaining = isSkipped('ponazuril') ? 0 :
            (kitten.day1Given.ponazuril ? (kitten.ponazurilDays - 1) : kitten.ponazurilDays);

        const panacurTotal = kitten.doses.panacur * panacurRemaining;
        const ponazurilTotal = kitten.doses.ponazuril * ponazurilRemaining;

        // Topical: 0 if skipped, otherwise calculate if not given at intake
        let topicalAmount = 0;
        if (!isSkipped('flea') && kitten.topical !== 'none' && !kitten.fleaGiven) {
            const outOfRangeString = this.appState.getOutOfRangeString();
            topicalAmount = kitten.doses.topical === outOfRangeString ? 0 : kitten.doses.topical;
        }

        // Drontal: 0 if skipped, otherwise 1 dose if not given at center
        const drontalAmount = isSkipped('drontal') ? 0 :
            (kitten.day1Given.drontal ? 0 : 1);

        // Capstar: 0 if skipped, otherwise 1 tablet if not given at center
        const capstarAmount = isSkipped('capstar') ? 0 :
            ((kitten.day1Given && kitten.day1Given.capstar === false) ? 1 : 0);

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
            },
            capstar: {
                amount: capstarAmount
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

        if (remaining.capstar && remaining.capstar.amount > 0) {
            summary.push({
                medication: 'Capstar',
                dose: '1 tablet',
                days: 1,
                total: '1 tablet'
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