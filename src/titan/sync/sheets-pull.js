/**
 * Google Sheets Sync Service - Pull User Edits from Sheets
 * Reads manual edits from Google Sheets and updates Titan database
 */

const { google } = require('googleapis');

class SheetsPullService {
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
     * Pull all keyword data from Google Sheets
     * Returns array of keyword objects with user edits
     */
    async pullKeywords() {
        console.log('📥 Pulling keywords from Google Sheets...');

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Keywords!A2:T' // Skip header row
            });

            const rows = response.data.values || [];
            console.log(`📥 Found ${rows.length} rows in sheet`);

            const keywords = rows.map((row, index) => ({
                rowNumber: index + 2, // +2 because row 1 is header, array is 0-indexed
                icon: row[0] || '',
                opportunityScore: parseFloat(row[1]) || 0,
                keyword: row[2] || '',
                searchVolume: parseInt(row[3]) || null,
                competition: parseFloat(row[4]) || null,
                estimatedCPC: parseFloat(row[5]) || null,
                yourRank: parseInt(row[6]) || null,
                competitorRanks: row[7] ? row[7].split(',').map(r => parseInt(r.trim())) : [],
                tier: row[8] || 'Tier 5',
                matchType: row[9] || 'PHRASE',
                suggestedBid: parseFloat(row[10]) || null,
                yourBid: parseFloat(row[11]) || null,
                tosMultiplier: parseInt(row[12]) || 200,
                ppMultiplier: parseInt(row[13]) || 100,
                status: row[14] || 'Ready',
                campaignName: row[15] || '',
                notes: row[16] || '',
                source: row[17] || 'manual',
                addedDate: row[18] || '',
                lastUpdated: row[19] || ''
            })).filter(kw => kw.keyword); // Only keywords with actual keyword text

            console.log(`✅ Pulled ${keywords.length} keywords from sheet`);
            return keywords;

        } catch (error) {
            console.error('❌ Error pulling keywords:', error.message);
            throw error;
        }
    }

    /**
     * Pull only user-editable fields for sync
     * Returns changes made by user
     */
    async pullUserEdits() {
        console.log('📥 Checking for user edits...');

        try {
            const keywords = await this.pullKeywords();

            // Extract only editable fields that matter for sync
            const edits = keywords.map(kw => ({
                keyword: kw.keyword,
                yourBid: kw.yourBid,
                tosMultiplier: kw.tosMultiplier,
                ppMultiplier: kw.ppMultiplier,
                status: kw.status,
                tier: kw.tier,
                matchType: kw.matchType,
                campaignName: kw.campaignName,
                notes: kw.notes,
                yourRank: kw.yourRank // User can manually update this
            }));

            console.log(`✅ Found ${edits.length} keyword edits`);
            return edits;

        } catch (error) {
            console.error('❌ Error pulling edits:', error.message);
            throw error;
        }
    }

    /**
     * Pull settings from Settings tab
     */
    async pullSettings() {
        console.log('⚙️ Pulling settings from sheet...');

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Settings!A1:B23'
            });

            const rows = response.data.values || [];

            // Parse settings into object
            const settings = {
                targetCPA: parseFloat(rows[2]?.[1]) || 15.00,
                targetROAS: parseFloat(rows[3]?.[1]) || 3.0,
                minClicksForDecision: parseInt(rows[4]?.[1]) || 10,
                autoDeployTier1: rows[5]?.[1] === 'Yes',
                autoPauseThreshold: parseFloat(rows[6]?.[1]) || 2.0,
                dataForSEOEnabled: rows[7]?.[1] === 'Yes',
                syncFrequency: rows[8]?.[1] || 'Hourly',
                tierBudgets: {
                    tier1: parseFloat(rows[11]?.[1]) || 1500,
                    tier2: parseFloat(rows[12]?.[1]) || 900,
                    tier3: parseFloat(rows[13]?.[1]) || 450,
                    tier4: parseFloat(rows[14]?.[1]) || 150
                },
                bidMultipliers: {
                    aggressiveTOS: parseInt(rows[17]?.[1]) || 200,
                    aggressivePP: parseInt(rows[18]?.[1]) || 100,
                    moderateTOS: parseInt(rows[19]?.[1]) || 150,
                    moderatePP: parseInt(rows[20]?.[1]) || 75,
                    conservativeTOS: parseInt(rows[21]?.[1]) || 100,
                    conservativePP: parseInt(rows[22]?.[1]) || 50
                }
            };

            console.log('✅ Settings pulled successfully');
            return settings;

        } catch (error) {
            console.error('❌ Error pulling settings:', error.message);
            throw error;
        }
    }

    /**
     * Find new keywords added manually by user
     * Compares with existing Titan database
     */
    async findNewManualKeywords(existingKeywords) {
        console.log('🔍 Looking for manually added keywords...');

        try {
            const sheetKeywords = await this.pullKeywords();
            const existingKeywordTexts = new Set(existingKeywords.map(k => k.keyword.toLowerCase()));

            const newKeywords = sheetKeywords.filter(kw =>
                !existingKeywordTexts.has(kw.keyword.toLowerCase()) &&
                kw.source === 'manual'
            );

            if (newKeywords.length > 0) {
                console.log(`✅ Found ${newKeywords.length} new manual keywords`);
            } else {
                console.log('ℹ️ No new manual keywords found');
            }

            return newKeywords;

        } catch (error) {
            console.error('❌ Error finding new keywords:', error.message);
            throw error;
        }
    }
}

module.exports = SheetsPullService;
