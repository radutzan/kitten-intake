/**
 * Form Validator Module - Handles field validation and error display
 * Extracted from FormManager to improve modularity
 */

class FormValidator {
    constructor() {
        // Validation rules can be extended here
        this.rules = {
            name: {
                required: true,
                message: 'Name is required'
            },
            weight: {
                required: true,
                min: 0,
                message: 'Weight must be greater than 0'
            }
        };
    }

    /**
     * Validate a specific field for a kitten
     * @param {string} kittenId - The kitten ID
     * @param {string} fieldName - The field name ('name' or 'weight')
     * @returns {boolean} True if valid, false otherwise
     */
    validateField(kittenId, fieldName) {
        const input = document.getElementById(`${kittenId}-${fieldName}`);
        const errorDiv = document.getElementById(`${kittenId}-${fieldName}-error`);
        const formGroup = input?.closest('.form-group');

        if (!input || !errorDiv || !formGroup) return true;

        let isValid = true;
        let errorMessage = '';

        if (fieldName === 'name') {
            if (!input.value.trim()) {
                isValid = false;
                errorMessage = this.rules.name.message;
            }
        } else if (fieldName === 'weight') {
            const weight = parseFloat(input.value);
            if (!weight || weight <= 0) {
                isValid = false;
                errorMessage = this.rules.weight.message;
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

    /**
     * Validate all fields for all kitten forms
     * @returns {boolean} True if all valid, false otherwise
     */
    validateAllKittens() {
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
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

    /**
     * Check if a specific kitten form is valid (without showing errors)
     * @param {string} kittenId - The kitten ID
     * @returns {boolean} True if valid, false otherwise
     */
    isKittenValid(kittenId) {
        const nameInput = document.getElementById(`${kittenId}-name`);
        const weightInput = document.getElementById(`${kittenId}-weight`);

        const nameValid = nameInput && nameInput.value.trim().length > 0;
        const weightValid = weightInput && parseFloat(weightInput.value) > 0;

        return nameValid && weightValid;
    }

    /**
     * Get validation errors for a kitten (without modifying DOM)
     * @param {string} kittenId - The kitten ID
     * @returns {Object} Object with field names as keys and error messages as values
     */
    getValidationErrors(kittenId) {
        const errors = {};
        const nameInput = document.getElementById(`${kittenId}-name`);
        const weightInput = document.getElementById(`${kittenId}-weight`);

        if (!nameInput || !nameInput.value.trim()) {
            errors.name = this.rules.name.message;
        }

        const weight = weightInput ? parseFloat(weightInput.value) : 0;
        if (!weight || weight <= 0) {
            errors.weight = this.rules.weight.message;
        }

        return errors;
    }

    /**
     * Clear all validation errors for a kitten
     * @param {string} kittenId - The kitten ID
     */
    clearErrors(kittenId) {
        ['name', 'weight'].forEach(fieldName => {
            const errorDiv = document.getElementById(`${kittenId}-${fieldName}-error`);
            const input = document.getElementById(`${kittenId}-${fieldName}`);
            const formGroup = input?.closest('.form-group');

            if (errorDiv) errorDiv.textContent = '';
            if (formGroup) formGroup.classList.remove('has-error');
        });
    }
}

// Export to global namespace
window.FormValidator = FormValidator;
