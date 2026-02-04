/**
 * NUMERICAL SANITIZATION UTILITY
 * 
 * Strips currency symbols, percentage signs, and commas from Google Sheets data
 * Prevents NaN failures during numerical operations
 * 
 * Features:
 * - Removes $, %, commas
 * - Handles empty strings and null values
 * - Returns clean numbers ready for parseFloat()
 */

class NumberSanitizer {
    /**
     * Sanitize a single value from Google Sheets
     * @param {string|number} value - Raw value from sheet
     * @returns {number} Clean number
     */
    static sanitize(value) {
        // Handle null, undefined, empty
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        // Already a number
        if (typeof value === 'number') {
            return isNaN(value) ? 0 : value;
        }

        // Convert to string and clean
        let cleaned = String(value)
            .trim()
            .replace(/[$,%]/g, '')  // Remove $, %, comma
            .replace(/,/g, '');      // Remove thousand separators

        // Parse to float
        const parsed = parseFloat(cleaned);

        // Return 0 if NaN
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Sanitize percentage value (e.g., "15.5%" → 0.155)
     * @param {string|number} value - Raw percentage from sheet
     * @returns {number} Decimal representation
     */
    static sanitizePercentage(value) {
        const cleaned = this.sanitize(value);
        // If original had %, convert from percentage to decimal
        if (String(value).includes('%')) {
            return cleaned / 100;
        }
        return cleaned;
    }

    /**
     * Sanitize currency value (e.g., "$1,234.56" → 1234.56)
     * @param {string|number} value - Raw currency from sheet
     * @returns {number} Clean dollar amount
     */
    static sanitizeCurrency(value) {
        return this.sanitize(value);
    }

    /**
     * Sanitize an array of values
     * @param {Array} values - Array of raw values
     * @returns {Array} Array of clean numbers
     */
    static sanitizeArray(values) {
        return values.map(v => this.sanitize(v));
    }
}

module.exports = NumberSanitizer;
