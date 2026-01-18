/**
 * Demo Script - Bleeder Detector
 * Tests the bleeder detection algorithm with your actual campaign data
 */

import { BleederDetector, CampaignMetrics } from './detectors/bleeder-detector';

/**
 * Your actual campaign data from screenshot (Jan 10-16, 2026)
 */
const yourCampaignData: CampaignMetrics = {
    campaignId: 'camp-001',
    campaignName: 'Sponsored Brands Campaign',
    spend: 52.98,
    sales: 30.67, // Calculated from ROAS 0.58
    acos: 172.77,
    roas: 0.58,
    impressions: 7089,
    clicks: 26,
    conversions: 0,
    ctr: (26 / 7089) * 100, // 0.37%
    cvr: 0, // 0 conversions
    cpc: 2.04,
    daysActive: 7,
};

/**
 * Sample healthy campaign for comparison
 */
const healthyCampaign: CampaignMetrics = {
    campaignId: 'camp-002',
    campaignName: 'Protein Powder - Exact Match',
    spend: 45.00,
    sales: 180.00,
    acos: 25,
    roas: 4.0,
    impressions: 5000,
    clicks: 100,
    conversions: 10,
    ctr: 2.0,
    cvr: 10.0,
    cpc: 0.45,
    daysActive: 7,
};

/**
 * Sample moderate risk campaign
 */
const atRiskCampaign: CampaignMetrics = {
    campaignId: 'camp-003',
    campaignName: 'Vitamins - Auto Targeting',
    spend: 65.00,
    sales: 95.00,
    acos: 68.4,
    roas: 1.46,
    impressions: 8500,
    clicks: 85,
    conversions: 3,
    ctr: 1.0,
    cvr: 3.5,
    cpc: 0.76,
    daysActive: 7,
};

// Run analysis
const detector = new BleederDetector();

console.log('='.repeat(80));
console.log('AMAZON PPC BLEEDER DETECTION REPORT');
console.log('Generated:', new Date().toLocaleString());
console.log('='.repeat(80));
console.log();

// Analyze your actual campaign
console.log('📊 CAMPAIGN 1: YOUR ACTUAL CAMPAIGN');
console.log('-'.repeat(80));
const yourAnalysis = detector.analyzeCampaign(yourCampaignData);
printAnalysis(yourCampaignData, yourAnalysis);
console.log();

// Analyze at-risk campaign
console.log('📊 CAMPAIGN 2: AT-RISK CAMPAIGN (Example)');
console.log('-'.repeat(80));
const atRiskAnalysis = detector.analyzeCampaign(atRiskCampaign);
printAnalysis(atRiskCampaign, atRiskAnalysis);
console.log();

// Analyze healthy campaign
console.log('📊 CAMPAIGN 3: HEALTHY CAMPAIGN (Example)');
console.log('-'.repeat(80));
const healthyAnalysis = detector.analyzeCampaign(healthyCampaign);
printAnalysis(healthyCampaign, healthyAnalysis);
console.log();

// Batch analysis summary
console.log('='.repeat(80));
console.log('PORTFOLIO SUMMARY');
console.log('='.repeat(80));
const allCampaigns = [yourCampaignData, atRiskCampaign, healthyCampaign];
const categorized = detector.analyzeCampaigns(allCampaigns);

console.log(`\n🔴 CRITICAL BLEEDERS: ${categorized.get('CRITICAL')?.length || 0}`);
categorized.get('CRITICAL')?.forEach((c) => {
    console.log(`   - ${c.campaignName} (ACOS: ${c.acos.toFixed(2)}%, Loss: $${(c.spend - c.sales).toFixed(2)})`);
});

console.log(`\n⚠️  HIGH RISK: ${categorized.get('HIGH')?.length || 0}`);
categorized.get('HIGH')?.forEach((c) => {
    console.log(`   - ${c.campaignName} (ACOS: ${c.acos.toFixed(2)}%)`);
});

console.log(`\n🟡 MEDIUM RISK: ${categorized.get('MEDIUM')?.length || 0}`);
categorized.get('MEDIUM')?.forEach((c) => {
    console.log(`   - ${c.campaignName} (ACOS: ${c.acos.toFixed(2)}%)`);
});

console.log(`\n🟢 HEALTHY: ${categorized.get('HEALTHY')?.length || 0}`);
categorized.get('HEALTHY')?.forEach((c) => {
    console.log(`   - ${c.campaignName} (ACOS: ${c.acos.toFixed(2)}%, ROAS: ${c.roas.toFixed(2)})`);
});

const totalSpend = allCampaigns.reduce((sum, c) => sum + c.spend, 0);
const totalSales = allCampaigns.reduce((sum, c) => sum + c.sales, 0);
const blendedAcos = (totalSpend / totalSales) * 100;
const blendedRoas = totalSales / totalSpend;

console.log('\n📈 PORTFOLIO METRICS:');
console.log(`   Total Spend: $${totalSpend.toFixed(2)}`);
console.log(`   Total Sales: $${totalSales.toFixed(2)}`);
console.log(`   Blended ACOS: ${blendedAcos.toFixed(2)}%`);
console.log(`   Blended ROAS: ${blendedRoas.toFixed(2)}`);
console.log(`   Profit/Loss: $${(totalSales - totalSpend).toFixed(2)}`);

console.log('\n' + '='.repeat(80));

/**
 * Helper function to print analysis results
 */
function printAnalysis(metrics: CampaignMetrics, analysis: any) {
    console.log(`Campaign: ${metrics.campaignName}`);
    console.log(`Campaign ID: ${metrics.campaignId}`);
    console.log();

    console.log('Performance Metrics:');
    console.log(`  Spend: $${metrics.spend.toFixed(2)}`);
    console.log(`  Sales: $${metrics.sales.toFixed(2)}`);
    console.log(`  ACOS: ${metrics.acos.toFixed(2)}%`);
    console.log(`  ROAS: ${metrics.roas.toFixed(2)}`);
    console.log(`  Impressions: ${metrics.impressions.toLocaleString()}`);
    console.log(`  Clicks: ${metrics.clicks}`);
    console.log(`  Conversions: ${metrics.conversions}`);
    console.log(`  CTR: ${metrics.ctr.toFixed(2)}%`);
    console.log(`  CVR: ${metrics.cvr.toFixed(2)}%`);
    console.log(`  CPC: $${metrics.cpc.toFixed(2)}`);
    console.log();

    const severityEmoji = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        HEALTHY: '🟢',
    };

    console.log(`Health Status: ${severityEmoji[analysis.severity]} ${analysis.severity}`);
    console.log(`Bleeder Score: ${analysis.score}/100`);
    console.log();

    if (analysis.issues.length > 0) {
        console.log('Issues Detected:');
        analysis.issues.forEach((issue: string) => {
            console.log(`  ❌ ${issue}`);
        });
        console.log();
    }

    if (analysis.recommendations.length > 0) {
        console.log('Recommended Actions:');
        analysis.recommendations.forEach((rec: any) => {
            console.log(`  ${rec.priority}. [${rec.action}] ${rec.reason}`);
            if (rec.details) {
                console.log(`     → ${rec.details}`);
            }
            if (rec.impact) {
                console.log(`     💰 ${rec.impact}`);
            }
        });
        console.log();
    }

    if (analysis.estimatedMonthlyCost) {
        console.log(`Estimated Monthly Cost: $${analysis.estimatedMonthlyCost.toFixed(2)}`);
    }
    if (analysis.estimatedMonthlySavings) {
        console.log(`Potential Monthly Savings: $${analysis.estimatedMonthlySavings.toFixed(2)}`);
    }
}
