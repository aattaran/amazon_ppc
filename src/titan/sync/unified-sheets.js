/**
 * Unified Google Sheets Service
 * Wrapper for all Google Sheets operations
 */

const { google } = require('googleapis');
require('dotenv').config();

class UnifiedSheetsService {
    constructor() {
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    }

    /**
     * Ensure a sheet exists, create if it doesn't
     */
    async ensureSheet(sheetName) {
        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const exists = response.data.sheets.find(s => s.properties.title === sheetName);

            if (!exists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [{
                            addSheet: {
                                properties: { title: sheetName }
                            }
                        }]
                    }
                });
                console.log(`✅ Created new sheet: ${sheetName}`);
            }
        } catch (error) {
            console.error(`Error ensuring sheet ${sheetName}:`, error.message);
            throw error;
        }
    }

    /**
     * Clear all data from a sheet
     */
    async clearSheet(sheetName) {
        await this.sheets.spreadsheets.values.clear({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:ZZ`
        });
    }

    /**
     * Clear specific range from a sheet (e.g., "A11:Q" to preserve headers)
     */
    async clearRange(sheetName, range) {
        await this.sheets.spreadsheets.values.clear({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!${range}`
        });
    }

    /**
     * Write rows to a sheet (overwrites existing)
     */
    async writeRows(sheetName, rows, startCell = 'A1') {
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!${startCell}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        });
    }

    /**
     * Append rows to a sheet
     */
    async appendRows(sheetName, rows) {
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        });
    }

    /**
     * Read all data from a sheet
     */
    async readSheet(sheetName) {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A:ZZ`
        });
        return response.data.values || [];
    }

    /**
     * Insert rows at a specific position
     */
    async insertRowsAt(sheetName, startRow, rows) {
        // Get sheet ID first
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId
        });

        const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
        const sheetId = sheet.properties.sheetId;

        // Insert blank rows
        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
                requests: [{
                    insertDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: startRow,
                            endIndex: startRow + rows.length
                        }
                    }
                }]
            }
        });

        // Write data to inserted rows
        await this.writeRows(sheetName, rows, `A${startRow + 1}`);
    }
}

module.exports = UnifiedSheetsService;
