/**
 * Constants Module - Centralized application constants
 * Eliminates magic strings and provides a single source of truth
 */

const Constants = {
    // Medication type keys (lowercase, used in form element IDs)
    // Order here defines form and results rendering order
    MEDICATIONS: ['flea', 'capstar', 'drontal', 'panacur', 'ponazuril', 'nexgard', 'pyrantel'],

    // Display names for medications
    MEDICATION_DISPLAY_NAMES: {
        flea: 'Flea Med',
        capstar: 'Capstar',
        panacur: 'Panacur',
        ponazuril: 'Ponazuril',
        drontal: 'Dewormer',
        nexgard: 'NexGard Combo',
        pyrantel: 'Pyrantel'
    },

    // Dewormer forms for the Droncit/Drontal row
    DRONTAL_TYPE: {
        DRONCIT: 'droncit',   // injectable (Praziquantel only)
        DRONTAL: 'drontal'    // tablet (Praziquantel + Pyrantel)
    },

    // Topical medication brands
    TOPICAL: {
        REVOLUTION: 'revolution',
        ADVANTAGE: 'advantage',
        NONE: 'none'
    },

    // Medication status values
    STATUS: {
        TODO: 'todo',
        DONE: 'done',
        SKIP: 'skip',
        DELAY: 'delay'
    },

    // Sex values
    SEX: {
        UNKNOWN: 'unknown',
        FEMALE: 'female',
        MALE: 'male'
    },

    // Ringworm scan status values
    RINGWORM_STATUS: {
        NOT_SCANNED: 'not-scanned',
        POSITIVE: 'positive',
        NEGATIVE: 'negative'
    },

    // FVRCP vaccination status values
    FVRCP_STATUS: {
        UNKNOWN: 'unknown',
        VACCINATED: 'vaccinated',
        NOT_VACCINATED: 'not-vaccinated'
    },

    // Validation messages
    MESSAGES: {
        OUT_OF_RANGE: 'Out of range'
    },

    // Main container element IDs
    ELEMENTS: {
        KITTENS_CONTAINER: 'kittens-container',
        RESULTS_SECTION: 'results-section',
        PAGINATION_DOTS: 'pagination-dots',
        NAV_CENTER: 'nav-center',
        FOSTER_CHECKLIST_CONTENT: 'foster-checklist-content',
        DISPENSE_SUMMARY_CONTENT: 'dispense-summary-content'
    },

    // CSS class names used in JavaScript
    CSS: {
        KITTEN_FORM: 'kitten-form',
        PAGINATION_DOT: 'pagination-dot',
        ACTIVE: 'active',
        HIDDEN: 'hidden',
        DISABLED: 'disabled',
        STATUS_LIGHT: 'status-light',
        OUT_OF_RANGE: 'out-of-range',
        EMPTY: 'empty'
    },

    // localStorage keys
    STORAGE: {
        FORM_DATA: 'cat-intake-form-data',
        VERSION: '2.0'
    },

    // Default values
    DEFAULTS: {
        PANACUR_DAYS: 5,
        PONAZURIL_DAYS: 3,
        TOPICAL: 'revolution',
        SEX: 'unknown'
    },

    // ID generator functions - create consistent element IDs
    ID: {
        // Kitten-level elements
        weight: (kittenId) => `${kittenId}-weight`,
        weightDisplay: (kittenId) => `${kittenId}-weight-display`,
        name: (kittenId) => `${kittenId}-name`,
        resultDisplay: (kittenId) => `${kittenId}-result-display`,
        resultHeader: (kittenId) => `${kittenId}-result-header`,
        resultContent: (kittenId) => `${kittenId}-result-content`,

        // Medication elements (per kitten, per medication)
        medRow: (kittenId, med) => `${kittenId}-${med}-row`,
        medEnabled: (kittenId, med) => `${kittenId}-${med}-enabled`,
        medStatusLight: (kittenId, med) => `${kittenId}-${med}-status-light`,
        medDose: (kittenId, med) => `${kittenId}-${med}-dose`,
        drontalLabel: (kittenId) => `${kittenId}-drontal-label`,

        // Radio button name patterns (for querySelectorAll)
        medStatusName: (kittenId, med) => `${kittenId}-${med}-status`,
        topicalName: (kittenId) => `${kittenId}-topical`,
        drontalTypeName: (kittenId) => `${kittenId}-drontal-type`,
        panacurName: (kittenId) => `${kittenId}-panacur`,
        ponazurilName: (kittenId) => `${kittenId}-ponazuril`,
        sexName: (kittenId) => `${kittenId}-sex`,
        ringwormName: (kittenId) => `${kittenId}-ringworm-status`,
        ringwormStatusLight: (kittenId) => `${kittenId}-ringworm-status-light`,
        fvrcpName: (kittenId) => `${kittenId}-fvrcp-status`,
        fvrcpStatusLight: (kittenId) => `${kittenId}-fvrcp-status-light`,

        // Microchip elements
        microchip: (kittenId) => `${kittenId}-microchip`,
        microchipFile: (kittenId) => `${kittenId}-microchip-file`,
        microchipScanBtn: (kittenId) => `${kittenId}-microchip-scan`
    }
};

// Freeze to prevent accidental modifications
Object.freeze(Constants);
Object.freeze(Constants.MEDICATIONS);
Object.freeze(Constants.MEDICATION_DISPLAY_NAMES);
Object.freeze(Constants.DRONTAL_TYPE);
Object.freeze(Constants.TOPICAL);
Object.freeze(Constants.STATUS);
Object.freeze(Constants.SEX);
Object.freeze(Constants.RINGWORM_STATUS);
Object.freeze(Constants.FVRCP_STATUS);
Object.freeze(Constants.MESSAGES);
Object.freeze(Constants.ELEMENTS);
Object.freeze(Constants.CSS);
Object.freeze(Constants.STORAGE);
Object.freeze(Constants.DEFAULTS);
Object.freeze(Constants.ID);

// Export to global namespace
window.Constants = Constants;
