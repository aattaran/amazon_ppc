/**
 * LAUNCH SKC WINNER CAMPAIGNS + UNPAUSE PROVEN CAMPAIGNS
 *
 * Based on diagnosis: winners buried in paused/archived campaigns, CPC 5x too high
 * Target CPC: $0.49 = $17.70 AOV × 30% target ACoS × 9.2% CVR
 *
 * Actions:
 *   1. Create 7 SKC Exact campaigns for proven converting keywords
 *   2. Unpause berberine asin ne1 + berberine exact new 11, drop all their bids to $0.49
 *
 * Run:  node launch-skc-winners.js           (DRY RUN — shows what would happen)
 *       node launch-skc-winners.js --live     (LIVE — makes real API changes)
 */

require('dotenv').config();

const TokenManager = require('./src/titan/auth/token-manager.js');
const AmazonV3Client = require('./src/titan/api/amazon-v3-client.js');
const ResilientPoller = require('./src/titan/api/resilient-poller.js');

const DRY_RUN = !process.argv.includes('--live');
const ASIN = process.env.PRODUCT_ASIN || 'B0DTDZFMY7';
const SKU  = 'GC-TGFS-RCNL';
const TARGET_BID = 0.49;   // $17.70 × 30% × 9.2%
const DAILY_BUDGET = 15.00;
const TOS_MODIFIER = 100;  // +100% = 2x at top of search

// ── Proven converting keywords → each gets its own Exact SKC ──────────────
const SKC_KEYWORDS = [
    { keyword: 'glucogold advanced with berberine', note: '2 orders, 4.6% ACoS — GOLD' },
    { keyword: 'glucovantage dihydroberberine',     note: '2 orders, 17.9% ACoS' },
    { keyword: 'dihydroberberine supplement 200mg', note: '1 order, 18.3% ACoS' },
    { keyword: 'dihydroberberine',                  note: '1 order, 16.7% ACoS' },
    { keyword: 'glucovantage',                      note: '1 order, 13.4% ACoS' },
    { keyword: 'glaucoma supplement',               note: '1 order, 10.3% ACoS' },
    { keyword: 'bitter melon',                      note: '1 order, 17.5% ACoS' },
];

// ── Paused campaigns to re-enable (NOT archived — those can't be re-enabled) ──
const CAMPAIGNS_TO_UNPAUSE = [
    'berberine asin ne1',      // 4 orders, 73.4% ACoS → profitable at $0.49 bid
    'berberine exact new 11',  // 4 orders, 85.7% ACoS → profitable at $0.49 bid
];

const config = {
    clientId:     process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId:    process.env.AMAZON_PROFILE_ID || '1130011681132849',
    apiUrl:       'https://advertising-api.amazon.com',
};

// ── Generic API helper (used for ad groups, product ads, keyword create) ───
async function apiPost(client, path, acceptHeader, body) {
    return client.apiRequest('POST', path, acceptHeader, body);
}

async function apiPut(client, path, acceptHeader, body) {
    return client.apiRequest('PUT', path, acceptHeader, body);
}

// ── Create a full SKC: campaign → ad group → keyword → product ad ──────────
async function createSKC(client, kw) {
    const slug = kw.keyword.replace(/\s+/g, '-').toLowerCase().substring(0, 40);
    const campaignName = `SKC_EXACT_${slug}_${new Date().toISOString().split('T')[0]}`;
    const today = new Date().toISOString().split('T')[0];

    console.log(`\n  📦 Creating SKC: "${kw.keyword}"`);
    console.log(`     Note: ${kw.note}`);

    if (DRY_RUN) {
        console.log(`     [DRY RUN] Would create campaign: ${campaignName}`);
        console.log(`     [DRY RUN] Bid: $${TARGET_BID}, Budget: $${DAILY_BUDGET}/day, TOS: +${TOS_MODIFIER}%`);
        return;
    }

    // 1. Create campaign
    const campaignBody = {
        campaigns: [{
            name: campaignName,
            targetingType: 'MANUAL',
            state: 'ENABLED',
            budget: { budget: DAILY_BUDGET, budgetType: 'DAILY' },
            startDate: today,
            dynamicBidding: {
                strategy: 'LEGACY_FOR_SALES',   // Fixed bids (down-only) — v3 enum
                placementBidding: [
                    { placement: 'PLACEMENT_TOP', percentage: TOS_MODIFIER },
                    { placement: 'PLACEMENT_PRODUCT_PAGE', percentage: 0 },
                ]
            }
        }]
    };

    const campResult = await apiPost(client, '/sp/campaigns',
        'application/vnd.spCampaign.v3+json', campaignBody);
    let campaignId = campResult.campaigns?.success?.[0]?.campaignId;

    // If duplicate name, fetch existing campaign and reuse its ID
    if (!campaignId) {
        const dupErr = campResult.campaigns?.error?.[0]?.errors?.[0]?.errorValue?.duplicateValueError;
        if (dupErr) {
            console.log(`     ⚠️  Duplicate — resuming from existing campaign`);
            const existing = await client.fetchCampaigns({ include: ['ENABLED', 'PAUSED', 'ARCHIVED'] });
            const match = existing.find(c => c.name === campaignName);
            if (match) campaignId = match.campaignId;
        }
        if (!campaignId) {
            console.error(`     ❌ Campaign creation failed:`, JSON.stringify(campResult));
            return;
        }
    }
    console.log(`     ✅ Campaign: ${campaignId}`);

    // 2. Create ad group
    const adGroupBody = {
        adGroups: [{
            name: `AG_${slug}`,
            campaignId,
            defaultBid: TARGET_BID,
            state: 'ENABLED',
        }]
    };

    const agResult = await apiPost(client, '/sp/adGroups',
        'application/vnd.spAdGroup.v3+json', adGroupBody);
    const adGroup = agResult.adGroups?.success?.[0] ?? agResult.adGroups?.[0];
    if (!adGroup?.adGroupId) {
        console.error(`     ❌ Ad group creation failed:`, JSON.stringify(agResult));
        return;
    }
    const adGroupId = adGroup.adGroupId;
    console.log(`     ✅ Ad group created: ${adGroupId}`);

    // 3. Create keyword (Exact match)
    const kwBody = {
        keywords: [{
            campaignId,
            adGroupId,
            state: 'ENABLED',
            keywordText: kw.keyword,
            matchType: 'EXACT',
            bid: TARGET_BID,
        }]
    };

    const kwResult = await apiPost(client, '/sp/keywords',
        'application/vnd.spKeyword.v3+json', kwBody);
    const keyword = kwResult.keywords?.success?.[0] ?? kwResult.keywords?.[0];
    if (!keyword?.keywordId) {
        console.error(`     ❌ Keyword creation failed:`, JSON.stringify(kwResult));
        return;
    }
    console.log(`     ✅ Keyword created: ${keyword.keywordId} [EXACT]`);

    // 4. Create product ad (links SKU/ASIN to ad group)
    const adBody = {
        productAds: [{
            campaignId,
            adGroupId,
            sku: SKU,
            asin: ASIN,
            state: 'ENABLED',
        }]
    };

    const adResult = await apiPost(client, '/sp/productAds',
        'application/vnd.spProductAd.v3+json', adBody);
    const ad = adResult.productAds?.success?.[0] ?? adResult.productAds?.[0];
    if (!ad?.adId) {
        console.error(`     ❌ Product ad creation failed:`, JSON.stringify(adResult));
        return;
    }
    console.log(`     ✅ Product ad created: ${ad.adId} (ASIN: ${ASIN})`);
    console.log(`     ✓  SKC complete for "${kw.keyword}"`);
}

// ── Unpause campaign + drop all keyword bids to TARGET_BID ────────────────
async function unpauseAndReduceBids(client, allCampaigns, allKeywords, campaignName) {
    const campaign = allCampaigns.find(c =>
        c.name?.toLowerCase().includes(campaignName.toLowerCase())
    );

    if (!campaign) {
        console.log(`  ⚠️  Campaign not found: "${campaignName}" (may be ARCHIVED — cannot re-enable)`);
        return;
    }

    console.log(`\n  🔓 Unpausing: "${campaign.name}" (ID: ${campaign.campaignId}, state: ${campaign.state})`);

    if (campaign.state === 'ARCHIVED') {
        console.log(`  ❌ ARCHIVED — cannot re-enable via API. Must recreate campaign.`);
        return;
    }

    if (DRY_RUN) {
        const kwCount = allKeywords.filter(k => k.campaignId === campaign.campaignId).length;
        console.log(`  [DRY RUN] Would set state → ENABLED`);
        console.log(`  [DRY RUN] Would drop ${kwCount} keyword bids → $${TARGET_BID}`);
        return;
    }

    // Enable campaign
    await apiPut(client, '/sp/campaigns', 'application/vnd.spCampaign.v3+json', {
        campaigns: [{ campaignId: campaign.campaignId, state: 'ENABLED' }]
    });
    console.log(`  ✅ Campaign enabled`);

    // Drop all keyword bids
    const kws = allKeywords.filter(k => k.campaignId === campaign.campaignId);
    if (kws.length === 0) {
        console.log(`  ⚠️  No keywords found for this campaign`);
        return;
    }

    // Direct API call — library method uses wrong bid format for v3 PUT
    const bidUpdates = kws.map(k => ({ keywordId: k.keywordId, bid: TARGET_BID }));
    const bidResult = await client.apiRequest('PUT', '/sp/keywords',
        'application/vnd.spKeyword.v3+json',
        { keywords: bidUpdates });
    const updated = bidResult.keywords?.success ?? [];
    const failed  = bidResult.keywords?.error ?? [];
    console.log(`  ✅ Bid update: ${updated.length} updated, ${failed.length} failed → $${TARGET_BID}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('='.repeat(70));
    console.log(DRY_RUN
        ? '  LAUNCH SKC WINNERS — DRY RUN (no changes made)'
        : '  LAUNCH SKC WINNERS — LIVE MODE');
    console.log(`  Target bid: $${TARGET_BID} | Budget: $${DAILY_BUDGET}/day | TOS: +${TOS_MODIFIER}%`);
    console.log(`  ASIN: ${ASIN}`);
    console.log('='.repeat(70));

    const tokenManager = new TokenManager(config);
    const client = new AmazonV3Client(tokenManager, config);

    // Fetch all campaigns (include PAUSED so we can re-enable them)
    console.log('\n── Fetching campaigns (ENABLED + PAUSED) ──');
    const allCampaigns = await client.fetchCampaigns({ include: ['ENABLED', 'PAUSED'] });

    // Fetch all keywords from paused campaigns
    console.log('\n── Fetching keywords (ENABLED + PAUSED) ──');
    const allKeywords = await client.fetchKeywords({ include: ['ENABLED', 'PAUSED'] });

    // ── PART 1: Create SKC campaigns ───────────────────────────────────────
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`PART 1: Creating ${SKC_KEYWORDS.length} SKC Exact campaigns`);
    console.log(`${'─'.repeat(70)}`);

    for (const kw of SKC_KEYWORDS) {
        await createSKC(client, kw);
        if (!DRY_RUN) {
            await new Promise(r => setTimeout(r, 500)); // rate limit
        }
    }

    // ── PART 2: Unpause proven campaigns + drop bids ───────────────────────
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`PART 2: Unpausing ${CAMPAIGNS_TO_UNPAUSE.length} proven campaigns`);
    console.log(`${'─'.repeat(70)}`);

    for (const name of CAMPAIGNS_TO_UNPAUSE) {
        await unpauseAndReduceBids(client, allCampaigns, allKeywords, name);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(70)}`);
    if (DRY_RUN) {
        console.log('DRY RUN complete. Review the plan above, then run with --live to execute.');
        console.log('  node launch-skc-winners.js --live');
    } else {
        console.log('Done! Check Seller Central in 15-30 min for the new campaigns.');
        console.log('Remember to also update TargetCPC in SBC rules from $0.42 → $0.49');
    }
    console.log('='.repeat(70));
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
