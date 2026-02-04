/**
 * Auto-Sync Service
 * Automatically syncs all data to Google Sheets on a schedule
 */

require('dotenv').config();
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SheetsPushService = require('./src/titan/sync/sheets-push');
const { google } = require('googleapis');

const SYNC_INTERVAL_MINUTES = 30; // Sync every 30 minutes

class AutoSyncService {
    constructor() {
        this.db = new KeywordDatabase();
        this.pushService = new SheetsPushService();
        this.isRunning = false;
        this.lastSync = null;
    }

    async syncAll() {
        console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Starting auto-sync...\n`);

        try {
            // 1. Sync Keywords
            const keywords = this.db.getAllKeywords();
            console.log(`📊 Syncing ${keywords.length} keywords...`);
            await this.pushService.pushKeywords(keywords);

            // 2. Sync PPC Campaigns (if fetch-ppc-quick has been run)
            // This would call the campaign fetcher

            this.lastSync = new Date();
            console.log(`✅ Sync complete at ${this.lastSync.toLocaleTimeString()}\n`);

            // Record sync in database
            this.db.recordSync('push', keywords.length, true);

            return { success: true, keywordsSynced: keywords.length };

        } catch (error) {
            console.error(`❌ Sync failed: ${error.message}\n`);
            this.db.recordSync('push', 0, false, error.message);
            return { success: false, error: error.message };
        }
    }

    async start() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  🔄 AUTO-SYNC SERVICE STARTED              ║');
        console.log(`║  Syncing every ${SYNC_INTERVAL_MINUTES} minutes               ║`);
        console.log('╚════════════════════════════════════════════╝\n');

        this.isRunning = true;

        // Initial sync
        await this.syncAll();

        // Set up recurring sync
        this.interval = setInterval(async () => {
            if (this.isRunning) {
                await this.syncAll();
            }
        }, SYNC_INTERVAL_MINUTES * 60 * 1000);

        console.log(`⏰ Next sync in ${SYNC_INTERVAL_MINUTES} minutes\n`);
        console.log('Press Ctrl+C to stop\n');
    }

    stop() {
        console.log('\n🛑 Stopping auto-sync service...\n');
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.db.close();
        console.log('✅ Auto-sync stopped\n');
    }
}

// Run if called directly
if (require.main === module) {
    const service = new AutoSyncService();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        service.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        service.stop();
        process.exit(0);
    });

    service.start().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = AutoSyncService;
