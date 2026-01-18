const fs = require('fs');

// Read the bulk analysis
const data = JSON.parse(fs.readFileSync('bulk-analysis.json', 'utf8'));
const campaigns = data['Sponsored Products Campaigns'] || [];

// Extract unique campaigns with their performance
const campaignSummary = {};

campaigns.forEach(row => {
    if (row.Entity === 'Campaign') {
        const campaignId = row['Campaign ID'];
        const campaignName = row['Campaign Name'];

        if (!campaignSummary[campaignId]) {
            campaignSummary[campaignId] = {
                id: campaignId,
                name: campaignName,
                budget: row['Daily Budget'],
                state: row['State'],
                spend: row['Spend'],
                sales: row['Sales'],
                orders: row['Orders'],
                acos: row['ACOS'],
                roas: row['ROAS'],
                impressions: row['Impressions'],
                clicks: row['Clicks'],
                cpc: row['CPC']
            };
        }
    }
});

console.log('=== CAMPAIGN PERFORMANCE SUMMARY ===\n');
console.log('Total Campaigns:', Object.keys(campaignSummary).length);
console.log('\n--- Details ---\n');

// Sort by ACOS (worst first)
const sortedCampaigns = Object.values(campaignSummary).sort((a, b) => {
    if (!a.acos) return 1;
    if (!b.acos) return -1;
    return b.acos - a.acos;
});

sortedCampaigns.forEach(camp => {
    console.log(`Campaign: ${camp.name}`);
    console.log(`  ID: ${camp.id}`);
    console.log(`  Budget: $${camp.budget}/day`);
    console.log(`  State: ${camp.state}`);
    console.log(`  Spend: $${camp.spend}`);
    console.log(`  Sales: $${camp.sales}`);
    console.log(`  Orders: ${camp.orders}`);
    console.log(`  ACOS: ${(camp.acos * 100).toFixed(2)}%`);
    console.log(`  ROAS: ${camp.roas}`);
    console.log(`  CPC: $${camp.cpc}`);
    console.log(`  Status: ${camp.acos > 1 ? '🔴 BLEEDER' : camp.acos > 0.6 ? '⚠️ WARNING' : '✅ GOOD'}`);
    console.log('');
});

// Save summary
fs.writeFileSync('campaign-summary.json', JSON.stringify(sortedCampaigns, null, 2));
console.log('Saved to campaign-summary.json');
