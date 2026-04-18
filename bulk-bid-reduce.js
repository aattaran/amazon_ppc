/**
 * Bulk Bid Reduction Script
 *
 * Emergency triage: Caps all keyword bids to near TargetCPC ($0.42).
 *
 * Logic:
 *   bid > $1.00  → new_bid = max($0.50, bid * 0.30)  // 70% cut, floor $0.50
 *   bid > $0.42  → new_bid = max($0.42, bid * 0.85)  // 15% cut, floor at ceiling
 *   bid <= $0.42 → no change
 *
 * Usage:
 *   DRY_RUN=1 node bulk-bid-reduce.js    # Preview only (default)
 *   DRY_RUN=0 node bulk-bid-reduce.js    # Actually update bids
 */

const dotenv = require('dotenv');
dotenv.config();

const TokenManager = require('./src/titan/auth/token-manager.js');
const AmazonV3Client = require('./src/titan/api/amazon-v3-client.js');

const TARGET_CPC = 0.42;
const DRY_RUN = process.env.DRY_RUN !== '0'; // Default: dry run

const config = {
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId: process.env.AMAZON_PROFILE_ID,
    apiUrl: 'https://advertising-api.amazon.com',
};

function calculateNewBid(currentBid) {
    if (currentBid > 1.00) {
        return Math.max(0.50, currentBid * 0.30);
    } else if (currentBid > TARGET_CPC) {
        return Math.max(TARGET_CPC, currentBid * 0.85);
    }
    return null; // No change
}

async function main() {
    const tokenManager = new TokenManager(config);
    const client = new AmazonV3Client(tokenManager, config);

    console.log('='.repeat(70));
    console.log(DRY_RUN ? 'BULK BID REDUCTION — DRY RUN (set DRY_RUN=0 to apply)' : 'BULK BID REDUCTION — LIVE MODE');
    console.log('='.repeat(70));

    // Fetch all enabled keywords
    const keywords = await client.fetchKeywords({ include: ['ENABLED'] });
    console.log(`\nTotal enabled keywords: ${keywords.length}`);

    // Calculate changes
    const changes = [];
    let unchanged = 0;

    for (const kw of keywords) {
        const currentBid = parseFloat(kw.bid);
        if (isNaN(currentBid) || currentBid <= 0) continue;

        const newBid = calculateNewBid(currentBid);
        if (newBid !== null) {
            changes.push({
                keywordId: kw.keywordId,
                keywordText: kw.keywordText,
                matchType: kw.matchType,
                currentBid,
                newBid: parseFloat(newBid.toFixed(2)),
                reduction: ((1 - newBid / currentBid) * 100).toFixed(0),
            });
        } else {
            unchanged++;
        }
    }

    // Summary
    console.log(`\nKeywords to change: ${changes.length}`);
    console.log(`Keywords unchanged (≤ $${TARGET_CPC}): ${unchanged}`);

    // Buckets
    const over1 = changes.filter(c => c.currentBid > 1.00);
    const mid = changes.filter(c => c.currentBid > TARGET_CPC && c.currentBid <= 1.00);

    console.log(`\n  Tier 1 (bid > $1.00): ${over1.length} keywords`);
    if (over1.length) {
        const avgOld = over1.reduce((s, c) => s + c.currentBid, 0) / over1.length;
        const avgNew = over1.reduce((s, c) => s + c.newBid, 0) / over1.length;
        console.log(`    Avg bid: $${avgOld.toFixed(2)} → $${avgNew.toFixed(2)} (−${((1 - avgNew / avgOld) * 100).toFixed(0)}%)`);
    }

    console.log(`  Tier 2 ($${TARGET_CPC} < bid ≤ $1.00): ${mid.length} keywords`);
    if (mid.length) {
        const avgOld = mid.reduce((s, c) => s + c.currentBid, 0) / mid.length;
        const avgNew = mid.reduce((s, c) => s + c.newBid, 0) / mid.length;
        console.log(`    Avg bid: $${avgOld.toFixed(2)} → $${avgNew.toFixed(2)} (−${((1 - avgNew / avgOld) * 100).toFixed(0)}%)`);
    }

    // Sample changes
    console.log('\n--- Sample changes (first 20) ---');
    for (const c of changes.slice(0, 20)) {
        console.log(`  $${c.currentBid.toFixed(2)} → $${c.newBid.toFixed(2)} (−${c.reduction}%) | "${c.keywordText}" (${c.matchType})`);
    }

    if (DRY_RUN) {
        console.log('\n*** DRY RUN — No changes applied ***');
        console.log('Run with DRY_RUN=0 to apply changes.');
        return;
    }

    // Apply in batches of 100
    console.log(`\nApplying ${changes.length} bid changes in batches of 100...`);
    const batchSize = 100;
    let applied = 0;

    for (let i = 0; i < changes.length; i += batchSize) {
        const batch = changes.slice(i, i + batchSize);
        const updates = batch.map(c => ({
            keywordId: c.keywordId,
            bid: c.newBid,
        }));

        try {
            await client.updateKeywordBids(updates);
            applied += batch.length;
            console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} keywords updated (${applied}/${changes.length} total)`);
        } catch (err) {
            console.error(`  Batch ${Math.floor(i / batchSize) + 1} FAILED:`, err.message);
        }

        // Rate limit: 1 second between batches
        if (i + batchSize < changes.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log(`\nDone. ${applied}/${changes.length} keyword bids updated.`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
