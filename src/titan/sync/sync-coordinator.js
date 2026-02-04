/**
 * Sync Coordinator
 * Orchestrates bidirectional sync between Titan and Google Sheets
 */

const SheetsPushService = require('./sheets-push');
const SheetsPullService = require('./sheets-pull');
const KeywordDatabase = require('../database/keywords-db');

class SyncCoordinator {
    constructor(titanDatabase = null) {
        // Use provided database or create new one
        this.titanDB = titanDatabase || new KeywordDatabase();
        this.pushService = new SheetsPushService();
        this.pullService = new SheetsPullService();
    }

    /**
     * Full sync: Push Titan data to Sheets, then pull user edits back
     */
    async fullSync() {
        console.log('\n🔄 Starting full bidirectional sync...\n');

        try {
            // Step 1: Push Titan data to Sheets
            await this.pushToSheets();

            // Step 2: Pull user edits from Sheets
            await this.pullFromSheets();

            // Step 3: Sync settings
            await this.syncSettings();

            console.log('\n✅ Full sync completed successfully!\n');
            return { success: true };

        } catch (error) {
            console.error('\n❌ Sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Push Titan keywords to Google Sheets
     */
    async pushToSheets() {
        console.log('📤 PUSH: Titan → Google Sheets');

        try {
            // Get all keywords from Titan database
            const keywords = await this.titanDB.getAllKeywords();

            if (keywords.length === 0) {
                console.log('ℹ️ No keywords to push');
                return { success: true, count: 0 };
            }

            // Push to sheets
            await this.pushService.pushKeywords(keywords);

            // Get performance data
            const performance = await this.titanDB.getPerformanceData();
            if (performance && performance.length > 0) {
                await this.pushService.updatePerformance(performance);
            }

            return { success: true, count: keywords.length };

        } catch (error) {
            console.error('❌ Push failed:', error.message);
            throw error;
        }
    }

    /**
     * Pull user edits from Google Sheets to Titan
     */
    async pullFromSheets() {
        console.log('📥 PULL: Google Sheets → Titan');

        try {
            // Get user edits
            const edits = await this.pullService.pullUserEdits();

            if (edits.length === 0) {
                console.log('ℹ️ No edits to apply');
                return { success: true, count: 0 };
            }

            // Apply each edit to Titan database
            let updateCount = 0;
            for (const edit of edits) {
                const updated = await this.titanDB.updateKeyword(edit.keyword, {
                    yourBid: edit.yourBid,
                    tosMultiplier: edit.tosMultiplier,
                    ppMultiplier: edit.ppMultiplier,
                    status: edit.status,
                    tier: edit.tier,
                    matchType: edit.matchType,
                    campaignName: edit.campaignName,
                    notes: edit.notes,
                    yourRank: edit.yourRank
                });

                if (updated) updateCount++;
            }

            console.log(`✅ Applied ${updateCount} edits to Titan database`);

            // Check for new manual keywords
            const existingKeywords = await this.titanDB.getAllKeywords();
            const newKeywords = await this.pullService.findNewManualKeywords(existingKeywords);

            if (newKeywords.length > 0) {
                console.log(`➕ Found ${newKeywords.length} new manual keywords`);
                for (const kw of newKeywords) {
                    await this.titanDB.addKeyword(kw);
                }
                console.log(`✅ Added ${newKeywords.length} manual keywords to Titan`);
            }

            return { success: true, editsApplied: updateCount, newKeywords: newKeywords.length };

        } catch (error) {
            console.error('❌ Pull failed:', error.message);
            throw error;
        }
    }

    /**
     * Sync settings from Google Sheets
     */
    async syncSettings() {
        console.log('⚙️ Syncing settings...');

        try {
            const settings = await this.pullService.pullSettings();
            await this.titanDB.updateSettings(settings);
            console.log('✅ Settings synced');
            return { success: true };

        } catch (error) {
            console.error('⚠️ Settings sync failed:', error.message);
            // Don't throw - settings sync is not critical
            return { success: false };
        }
    }

    /**
     * Append new discoveries without full sync
     * Use this when Titan finds new keywords
     */
    async appendNewDiscoveries(newKeywords) {
        console.log(`\n📤 Appending ${newKeywords.length} new discoveries...\n`);

        try {
            await this.pushService.appendKeywords(newKeywords);
            console.log('✅ New discoveries appended to sheet');
            return { success: true, count: newKeywords.length };

        } catch (error) {
            console.error('❌ Append failed:', error.message);
            throw error;
        }
    }
}

module.exports = SyncCoordinator;
