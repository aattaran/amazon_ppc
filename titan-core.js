#!/usr/bin/env node
/**
 * TITAN CORE - Unified Amazon PPC Data Pipeline
 * 
 * Replaces all fragmented scripts with single production-ready solution
 * 
 * Solves ALL architectural failures:
 * ✅ API Version Frankenstein - v3-only, no v2 code
 * ✅ Authentication Silent Expiry - Auto-refresh at T+55min
 * ✅ Data Object Mismatches - In-memory merge before write
 * ✅ Google Sheets Range Overwrites - Single atomic write
 * ✅ Polling Loop Fragility - 30-min timeout with backoff
 * 
 * Usage: node titan-core.js
 */

require('dotenv').config();

const TokenManager = require('./src/titan/auth/token-manager');
const AmazonV3Client = require('./src/titan/api/amazon-v3-client');
const ResilientPoller = require('./src/titan/api/resilient-poller');
const DataMerger = require('./src/titan/merge/data-merger');
const AtomicWriter = require('./src/titan/sync/atomic-writer');

// Configuration
const CONFIG = {
    amazon: {
        clientId: process.env.AMAZON_CLIENT_ID,
        clientSecret: process.env.AMAZON_CLIENT_SECRET,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN,
        profileId: process.env.AMAZON_PROFILE_ID,
        apiUrl: 'https://advertising-api.amazon.com'
    },
    googleSheets: {
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY
    }
};

class TitanCore {
    async run() {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  🚀 TITAN CORE - Unified Amazon PPC Pipeline              ║');
        console.log('║  Production-Ready Architecture                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        const startTime = Date.now();

        try {
            // ============================================================
            // PHASE 1: AUTHENTICATION
            // ============================================================
            console.log('═════════════════════════════════════════════════════════════');
            console.log('PHASE 1: AUTHENTICATION (Auto-Refresh Enabled)\n');
            console.log('═════════════════════════════════════════════════════════════\n');

            const tokenManager = new TokenManager(CONFIG.amazon);
            await tokenManager.getToken();  // Initial authentication

            // ============================================================
            // PHASE 2: FETCH STRUCTURE (Campaigns, Ad Groups, Keywords)
            // ============================================================
            console.log('═════════════════════════════════════════════════════════════');
            console.log('PHASE 2: FETCH STRUCTURE (v3 API Only)');
            console.log('═════════════════════════════════════════════════════════════\n');

            const apiClient = new AmazonV3Client(tokenManager, CONFIG.amazon);

            const campaigns = await apiClient.fetchCampaigns();
            const adGroups = await apiClient.fetchAdGroups();
            const keywords = await apiClient.fetchKeywords();

            console.log('📊 Structure Summary:');
            console.log(`   Campaigns: ${campaigns.length}`);
            console.log(`   Ad Groups: ${adGroups.length}`);
            console.log(`   Keywords: ${keywords.length}\n`);

            // ============================================================
            // PHASE 3: FETCH METRICS (v3 Reporting API)
            // ============================================================
            console.log('═════════════════════════════════════════════════════════════');
            console.log('PHASE 3: FETCH METRICS (Resilient Polling)');
            console.log('═════════════════════════════════════════════════════════════\n');

            const reportId = await apiClient.requestReport('KEYWORDS', 30);

            const poller = new ResilientPoller(apiClient);
            const reportUrl = await poller.poll(reportId);

            const metrics = await apiClient.downloadReport(reportUrl);

            console.log(`📈 Metrics Summary:`);
            console.log(`   Total metric records: ${metrics.length}\n`);

            // ============================================================
            // PHASE 4: MERGE IN MEMORY
            // ============================================================
            console.log('═════════════════════════════════════════════════════════════');
            console.log('PHASE 4: IN-MEMORY DATA MERGE');
            console.log('═════════════════════════════════════════════════════════════\n');

            const merger = new DataMerger();
            const campaignLookup = DataMerger.createCampaignLookup(campaigns);
            const mergedData = merger.merge(keywords, metrics, campaignLookup);
            const sheetRows = merger.toSheetRows(mergedData);

            console.log(`🔗 Merge Summary:`);
            console.log(`   Complete rows ready: ${sheetRows.length}\n`);

            // ============================================================
            // PHASE 5: ATOMIC WRITE TO GOOGLE SHEETS
            // ============================================================
            console.log('═════════════════════════════════════════════════════════════');
            console.log('PHASE 5: ATOMIC WRITE TO GOOGLE SHEETS');
            console.log('═════════════════════════════════════════════════════════════\n');

            const writer = new AtomicWriter(CONFIG.googleSheets);

            // Verify sheet structure first
            const isValid = await writer.verifySheetStructure('3. Keywords');
            if (!isValid) {
                throw new Error('Sheet structure invalid - run google_sheets_auto_setup.js first');
            }

            // Write to sheet
            await writer.writeToSheet('3. Keywords', sheetRows);

            // ============================================================
            // EXECUTION COMPLETE
            // ============================================================
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('═════════════════════════════════════════════════════════════');
            console.log('✅ TITAN CORE EXECUTION COMPLETE');
            console.log('═════════════════════════════════════════════════════════════\n');

            console.log(`📊 Final Summary:`);
            console.log(`   Campaigns fetched: ${campaigns.length}`);
            console.log(`   Ad Groups fetched: ${adGroups.length}`);
            console.log(`   Keywords fetched: ${keywords.length}`);
            console.log(`   Metrics fetched: ${metrics.length}`);
            console.log(`   Keywords with metrics: ${sheetRows.length}`);
            console.log(`   Execution time: ${duration}s\n`);

            console.log(`🔗 View your data:`);
            console.log(`   https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}\n`);

            console.log(`📝 Next steps:`);
            console.log(`   1. Review keyword data in "3. Keywords" tab`);
            console.log(`   2. Run: node optimize-bids.js (for bid recommendations)`);
            console.log(`   3. Review recommendations in columns R-T`);
            console.log(`   4. Set approvals in column U`);
            console.log(`   5. Run: node generate-bulk-csv.js (Phase 4)\n`);

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.error('\n═════════════════════════════════════════════════════════════');
            console.error('❌ TITAN CORE EXECUTION FAILED');
            console.error('═════════════════════════════════════════════════════════════\n');

            console.error(`Error: ${error.message}`);
            console.error(`Execution time before failure: ${duration}s\n`);

            if (error.stack) {
                console.error('Stack trace:');
                console.error(error.stack);
            }

            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const titan = new TitanCore();
    titan.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error('\nFatal error:', err.message);
        process.exit(1);
    });
}

module.exports = TitanCore;
