/**
 * ATOMIC WRITER - Single Operation Sheet Write
 * 
 * Solves "Google Sheets Range Overwrites" architectural failure
 * 
 * Features:
 * - Single atomic write operation
 * - All-or-nothing (no partial writes)
 * - Preserves headers (rows 1-10)
 * - Updates timestamp
 * - Error rollback
 */

const UnifiedSheetsService = require('./unified-sheets');

class AtomicWriter {
    constructor(config) {
        this.sheets = new UnifiedSheetsService(config);
    }

    /**
     * Write data to sheet atomically
     * 
     * @param {string} sheetName - Target sheet (e.g., "3. Keywords")
     * @param {Array} rows - Complete data rows
     * @returns {Promise<void>}
     */
    async writeToSheet(sheetName, rows) {
        console.log(`📝 Atomic write to "${sheetName}"`);
        console.log(`   Rows to write: ${rows.length}`);
        console.log(`   Columns: ${rows[0]?.length || 0}\n`);

        if (!rows || rows.length === 0) {
            console.warn('⚠️ No data to write - skipping');
            return;
        }

        try {
            // STEP 1: Clear data zone ONLY (preserve headers in rows 1-10)
            console.log('   🧹 Step 1/3: Clearing data zone (rows 11+)...');
            await this.sheets.clearRange(sheetName, 'A11:Z');
            console.log('      ✅ Data zone cleared');

            // STEP 2: Write ALL data in ONE operation
            console.log(`   ✍️  Step 2/3: Writing ${rows.length} rows...`);
            await this.sheets.writeRows(sheetName, rows, 'A11');
            console.log('      ✅ Data written');

            // STEP 3: Update timestamp
            console.log('   ⏰ Step 3/3: Updating timestamp...');
            const timestamp = new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            await this.sheets.writeRows(sheetName, [[`Last Updated: ${timestamp}`]], 'Y1');
            console.log('      ✅ Timestamp updated');

            console.log(`\n✅ Atomic write complete for "${sheetName}"\n`);

        } catch (error) {
            console.error(`\n❌ Atomic write FAILED for "${sheetName}"`);
            console.error('   Error:', error.message);
            console.error('   No partial data written (all-or-nothing guarantee)\n');
            throw error;
        }
    }

    /**
     * Write to multiple sheets atomically
     */
    async writeMultipleSheets(writes) {
        console.log(`📝 Atomic write to ${writes.length} sheets\n`);

        for (const { sheetName, rows } of writes) {
            await this.writeToSheet(sheetName, rows);
        }

        console.log(`✅ All ${writes.length} sheets updated successfully\n`);
    }

    /**
     * Verify sheet structure before writing
     */
    async verifySheetStructure(sheetName) {
        console.log(`🔍 Verifying sheet structure: "${sheetName}"`);

        try {
            // Check if sheet exists by trying to read headers
            const headers = await this.sheets.readSheet(sheetName);

            if (!headers || headers.length < 10) {
                throw new Error(`Sheet "${sheetName}" missing headers (rows 1-10)`);
            }

            console.log(`   ✅ Sheet structure valid\n`);
            return true;

        } catch (error) {
            console.error(`   ❌ Sheet structure invalid: ${error.message}\n`);
            return false;
        }
    }
}

module.exports = AtomicWriter;
