/**
 * ShelterLuv Sync Module - API integration for ShelterLuv shelter management
 * Handles API key storage, data extraction, and syncing to ShelterLuv
 */

// Feature flag - set to true to enable UI, or use ?shelterluv=1 URL param
const SHELTERLUV_ENABLED = false;

class ShelterLuvSync {
    constructor(appState) {
        this.appState = appState;
        this.storageKey = 'shelter-luv-config';
        this.isAvailable = this.checkStorageAvailability();
        this.baseUrl = 'https://www.shelterluv.com/api/v1';

        // Sync state
        this.syncStatus = 'idle'; // idle, syncing, success, error
        this.lastSyncTime = null;
        this.lastError = null;
    }

    /**
     * Check if ShelterLuv UI should be shown
     * @returns {boolean}
     */
    static isEnabled() {
        if (SHELTERLUV_ENABLED) return true;

        // Check URL param for testing
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('shelterluv') === '1';
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean}
     */
    checkStorageAvailability() {
        try {
            const test = '__shelterluv_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('LocalStorage not available for ShelterLuv config:', e);
            return false;
        }
    }

    // ========================
    // Configuration Management
    // ========================

    /**
     * Save ShelterLuv configuration
     * @param {object} config - { apiKey, shelterSlug, autoSync }
     * @returns {boolean} Success
     */
    saveConfig(config) {
        if (!this.isAvailable) return false;

        try {
            const payload = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                apiKey: config.apiKey || '',
                shelterSlug: config.shelterSlug || '',
                autoSync: config.autoSync || false
            };
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.warn('Failed to save ShelterLuv config:', e);
            return false;
        }
    }

    /**
     * Get ShelterLuv configuration
     * @returns {object|null} Config object or null
     */
    getConfig() {
        if (!this.isAvailable) return null;

        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return null;

            const payload = JSON.parse(saved);
            if (payload.version !== '1.0') return null;

            return {
                apiKey: payload.apiKey || '',
                shelterSlug: payload.shelterSlug || '',
                autoSync: payload.autoSync || false
            };
        } catch (e) {
            console.warn('Failed to load ShelterLuv config:', e);
            return null;
        }
    }

    /**
     * Clear ShelterLuv configuration
     * @returns {boolean} Success
     */
    clearConfig() {
        if (!this.isAvailable) return false;

        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.warn('Failed to clear ShelterLuv config:', e);
            return false;
        }
    }

    /**
     * Check if API key is configured
     * @returns {boolean}
     */
    hasApiKey() {
        const config = this.getConfig();
        return config && config.apiKey && config.apiKey.length > 0;
    }

    // ========================
    // Data Extraction
    // ========================

    /**
     * Extract all kitten data with doses for API submission
     * @returns {Array} Array of kitten objects with dose information
     */
    extractKittenDataForApi() {
        const kittens = this.appState.collectKittenData();

        return kittens
            .filter(kitten => kitten.weightGrams > 0)
            .map(kitten => {
                const doses = DoseCalculator.calculateAllDoses(kitten.weightLb);
                return {
                    ...kitten,
                    doses: doses,
                    intakeDate: new Date().toISOString()
                };
            });
    }

    /**
     * Transform kitten data to ShelterLuv animal format
     * @param {object} kitten - Kitten data from extractKittenDataForApi
     * @returns {object} ShelterLuv-formatted animal object
     */
    transformToShelterLuvAnimal(kitten) {
        return {
            Name: kitten.name || 'Unnamed Kitten',
            Type: 'Cat',
            Sex: 'Unknown',
            IntakeDate: kitten.intakeDate,
            Weight: {
                Value: kitten.weightLb,
                Unit: 'lb'
            },
            Status: 'Foster',
            Notes: `Intake via Kitten Intake App. Weight: ${AppState.formatNumber(kitten.weightGrams)}g`
        };
    }

    /**
     * Transform kitten medications to ShelterLuv medical record format
     * @param {object} kitten - Kitten data with doses
     * @returns {object} ShelterLuv-formatted medical record
     */
    transformToShelterLuvMedicalRecord(kitten) {
        const medications = [];
        const outOfRangeString = this.appState.getOutOfRangeString();

        // Panacur
        if (kitten.day1Given && kitten.day1Given.panacur) {
            medications.push({
                Name: 'Panacur (Fenbendazole)',
                Dose: AppState.formatNumber(kitten.doses.panacur, 2),
                Unit: 'mL',
                Route: 'Oral',
                Given: true
            });
        }

        // Ponazuril
        if (kitten.day1Given && kitten.day1Given.ponazuril) {
            medications.push({
                Name: 'Ponazuril',
                Dose: AppState.formatNumber(kitten.doses.ponazuril, 2),
                Unit: 'mL',
                Route: 'Oral',
                Given: true
            });
        }

        // Drontal
        if (kitten.day1Given && kitten.day1Given.drontal && kitten.doses.drontal !== outOfRangeString) {
            medications.push({
                Name: 'Drontal',
                Dose: kitten.doses.drontal,
                Unit: 'tablet(s)',
                Route: 'Oral',
                Given: true
            });
        }

        // Topical (Revolution or Advantage)
        if (kitten.fleaGiven && kitten.topical) {
            const topicalDose = kitten.topical === 'revolution'
                ? kitten.doses.revolution
                : kitten.doses.advantage;

            if (topicalDose !== outOfRangeString) {
                medications.push({
                    Name: kitten.topical === 'revolution' ? 'Revolution' : 'Advantage II',
                    Dose: AppState.formatNumber(topicalDose, 2),
                    Unit: 'mL',
                    Route: 'Topical',
                    Given: true
                });
            }
        }

        return {
            Date: kitten.intakeDate,
            Type: 'Medication',
            Notes: 'Intake medications administered',
            Medications: medications
        };
    }

    // ========================
    // API Operations
    // ========================

    /**
     * Test API connection
     * @returns {Promise<object>} Result with success boolean and message
     */
    async testConnection() {
        const config = this.getConfig();

        if (!config || !config.apiKey) {
            return { success: false, message: 'No API key configured' };
        }

        // For now, simulate API call since we don't have real endpoints
        console.log('[ShelterLuv] Testing connection with API key:', config.apiKey.substring(0, 8) + '...');

        try {
            // Placeholder: In production, this would be a real API call
            // const response = await fetch(`${this.baseUrl}/ping`, {
            //     method: 'GET',
            //     headers: {
            //         'X-Api-Key': config.apiKey,
            //         'Content-Type': 'application/json'
            //     }
            // });

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // For development, return success if API key looks valid (at least 10 chars)
            if (config.apiKey.length >= 10) {
                return {
                    success: true,
                    message: 'Connection test successful (simulated - real API pending)'
                };
            } else {
                return {
                    success: false,
                    message: 'API key appears to be invalid (too short)'
                };
            }
        } catch (error) {
            console.error('[ShelterLuv] Connection test failed:', error);
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    /**
     * Create an animal record in ShelterLuv
     * @param {object} animalData - ShelterLuv-formatted animal data
     * @returns {Promise<object>} Result with success and shelterLuvId
     */
    async createAnimal(animalData) {
        const config = this.getConfig();

        if (!config || !config.apiKey) {
            throw new Error('No API key configured');
        }

        console.log('[ShelterLuv] Creating animal:', animalData);

        // Placeholder: In production, this would POST to ShelterLuv API
        // const response = await fetch(`${this.baseUrl}/animals`, {
        //     method: 'POST',
        //     headers: {
        //         'X-Api-Key': config.apiKey,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(animalData)
        // });

        // Simulate API response
        await new Promise(resolve => setTimeout(resolve, 300));

        return {
            success: true,
            shelterLuvId: 'SL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            message: 'Animal created (simulated)'
        };
    }

    /**
     * Add a medical record to an animal in ShelterLuv
     * @param {string} animalId - ShelterLuv animal ID
     * @param {object} medicalRecord - ShelterLuv-formatted medical record
     * @returns {Promise<object>} Result
     */
    async addMedicalRecord(animalId, medicalRecord) {
        const config = this.getConfig();

        if (!config || !config.apiKey) {
            throw new Error('No API key configured');
        }

        console.log('[ShelterLuv] Adding medical record to', animalId, ':', medicalRecord);

        // Placeholder: In production, this would POST to ShelterLuv API
        // const response = await fetch(`${this.baseUrl}/animals/${animalId}/medical`, {
        //     method: 'POST',
        //     headers: {
        //         'X-Api-Key': config.apiKey,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(medicalRecord)
        // });

        // Simulate API response
        await new Promise(resolve => setTimeout(resolve, 200));

        return {
            success: true,
            message: 'Medical record added (simulated)'
        };
    }

    /**
     * Sync all current kittens to ShelterLuv
     * @returns {Promise<object>} Result with success count and errors
     */
    async syncAllKittens() {
        this.syncStatus = 'syncing';
        this.lastError = null;

        const results = {
            success: true,
            synced: 0,
            failed: 0,
            errors: [],
            kittens: []
        };

        try {
            const kittens = this.extractKittenDataForApi();

            if (kittens.length === 0) {
                this.syncStatus = 'idle';
                return {
                    success: false,
                    message: 'No valid kittens to sync',
                    synced: 0,
                    failed: 0
                };
            }

            for (const kitten of kittens) {
                try {
                    // Transform to ShelterLuv format
                    const animalData = this.transformToShelterLuvAnimal(kitten);
                    const medicalData = this.transformToShelterLuvMedicalRecord(kitten);

                    // Create animal
                    const animalResult = await this.createAnimal(animalData);

                    // Add medical record if animal was created
                    if (animalResult.success && medicalData.Medications.length > 0) {
                        await this.addMedicalRecord(animalResult.shelterLuvId, medicalData);
                    }

                    results.synced++;
                    results.kittens.push({
                        name: kitten.name,
                        shelterLuvId: animalResult.shelterLuvId,
                        success: true
                    });

                } catch (error) {
                    results.failed++;
                    results.errors.push(`${kitten.name || 'Unnamed'}: ${error.message}`);
                    results.kittens.push({
                        name: kitten.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            this.syncStatus = results.failed === 0 ? 'success' : 'error';
            this.lastSyncTime = new Date();

            if (results.failed > 0) {
                results.success = false;
                this.lastError = results.errors.join('; ');
            }

            console.log('[ShelterLuv] Sync complete:', results);
            return results;

        } catch (error) {
            this.syncStatus = 'error';
            this.lastError = error.message;
            console.error('[ShelterLuv] Sync failed:', error);

            return {
                success: false,
                message: error.message,
                synced: results.synced,
                failed: results.failed + 1,
                errors: [...results.errors, error.message]
            };
        }
    }

    // ========================
    // Status & UI Helpers
    // ========================

    /**
     * Get current sync status
     * @returns {string} idle, syncing, success, or error
     */
    getSyncStatus() {
        return this.syncStatus;
    }

    /**
     * Get last sync time
     * @returns {Date|null}
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }

    /**
     * Get last error message
     * @returns {string|null}
     */
    getLastError() {
        return this.lastError;
    }

    /**
     * Reset sync status to idle
     */
    resetStatus() {
        this.syncStatus = 'idle';
        this.lastError = null;
    }
}

// Export to global namespace
window.ShelterLuvSync = ShelterLuvSync;
