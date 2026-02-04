/**
 * Google Sheets Sync Service - Push Keywords to Sheets
 * Pushes discovered keywords from Titan to Google Sheets
 */

const { google } = require('googleapis');

class SheetsPushService {
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
     * Push all keywords to Google Sheets
     * @param {Array} keywords - Array of keyword objects from Titan
     */
    async pushKeywords(keywords) {
        console.log(`📤 Pushing ${keywords.length} keywords to Google Sheets...`);

        try {
            // Convert keywords to sheet rows
            const rows = keywords.map(kw => [
                '', // Icon (formula handles this)
                kw.opportunityScore || 0,
                kw.keyword,
                kw.searchVolume || '',
                kw.competition || '',
                kw.estimatedCPC || '',
                kw.yourRank || '',
                kw.competitorRanks ? kw.competitorRanks.join(',') : '',
                kw.tier || 'Tier 5',
                kw.matchType || 'PHRASE',
                '', // Suggested Bid (formula calculates)
                kw.yourBid || '', // Your Bid (user editable)
                kw.tosMultiplier || 200,
                kw.ppMultiplier || 100,
                kw.status || 'Ready',
                kw.campaignName || '',
                kw.notes || '',
                kw.source || 'titan',
                kw.addedDate || new Date().toISOString().split('T')[0],
                new Date().toISOString()
            ]);

            // Clear existing data (keep headers)
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: 'Keywords!A2:T'
            });

            // Insert new data
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Keywords!A2',
                valueInputOption: 'USER_ENTERED',
                resource: { values: rows }
            });

            console.log(`✅ Successfully pushed ${keywords.length} keywords to Google Sheets`);
            return { success: true, count: keywords.length };

        } catch (error) {
            console.error('❌ Error pushing keywords:', error.message);
            throw error;
        }
    }

    /**
     * Append new keywords without clearing existing ones
     * @param {Array} keywords - New keywords to append
     */
    async appendKeywords(keywords) {
        console.log(`📤 Appending ${keywords.length} new keywords...`);

        try {
            const rows = keywords.map(kw => [
                '',
                kw.opportunityScore || 0,
                kw.keyword,
                kw.searchVolume || '',
                kw.competition || '',
                kw.estimatedCPC || '',
                kw.yourRank || '',
                kw.competitorRanks ? kw.competitorRanks.join(',') : '',
                kw.tier || 'Tier 5',
                kw.matchType || 'PHRASE',
                '',
                kw.yourBid || '',
                kw.tosMultiplier || 200,
                kw.ppMultiplier || 100,
                kw.status || 'Ready',
                kw.campaignName || '',
                kw.notes || '',
                kw.source || 'titan',
                new Date().toISOString().split('T')[0],
                new Date().toISOString()
            ]);

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Keywords!A2',
                valueInputOption: 'USER_ENTERED',
                resource: { values: rows }
            });

            console.log(`✅ Appended ${keywords.length} keywords`);
            return { success: true, count: keywords.length };

        } catch (error) {
            console.error('❌ Error appending keywords:', error.message);
            throw error;
        }
    }

    /**
     * Update performance data in Performance tab
     * @param {Array} performanceData - Array of performance objects
     */
    async updatePerformance(performanceData) {
        console.log(`📊 Updating performance for ${performanceData.length} keywords...`);

        try {
            const rows = performanceData.map(p => [
                p.keyword,
                p.impressions || 0,
                p.clicks || 0,
                '', // CTR (formula)
                p.orders || 0,
                '', // CVR (formula)
                p.spend || 0,
                p.sales || 0,
                '', // ROAS (formula)
                '', // ACoS (formula)
                '', // Status icon (formula)
                '' // Action (formula)
            ]);

            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: 'Performance!A2:L'
            });

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Performance!A2',
                valueInputOption: 'USER_ENTERED',
                resource: { values: rows }
            });

            console.log(`✅ Updated performance for ${performanceData.length} keywords`);
            return { success: true, count: performanceData.length };

        } catch (error) {
            console.error('❌ Error updating performance:', error.message);
            throw error;
        }
    }
}

module.exports = SheetsPushService;
