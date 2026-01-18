/**
 * Analyze Amazon Ads Bulk Export
 * Extracts campaign data from bulk export Excel files
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { BleederDetector, CampaignMetrics } from '../detectors/bleeder-detector';

interface BulkExportRow {
    'Campaign Name'?: string;
    'Campaign ID'?: string;
    'Campaign Status'?: string;
    'Campaign Daily Budget'?: number;
    'Impressions'?: number;
    'Clicks'?: number;
    'Spend'?: number;
    'Sales'?: number;
    'Orders'?: number;
    'ACOS'?: number;
    'ROAS'?: number;
    'CPC'?: number;
    'CTR'?: number;
    'CVR'?: number;
    [key: string]: any;
}

/**
 * Read and parse Excel bulk export
 */
function readBulkExport(filePath: string): BulkExportRow[] {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const data: BulkExportRow[] = XLSX.utils.sheet_to_json(worksheet);

        return data;
    } catch (error: any) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return [];
    }
}

/**
 * Convert bulk export row to CampaignMetrics
 */
function convertToCampaignMetrics(row: BulkExportRow, index: number): CampaignMetrics | null {
    // Skip if missing critical data
    if (!row['Campaign Name'] || row['Spend'] === undefined) {
        return null;
    }

    const spend = Number(row['Spend'] || 0);
    const sales = Number(row['Sales'] || 0);
    const impressions = Number(row['Impressions'] || 0);
    const clicks = Number(row['Clicks'] || 0);
    const orders = Number(row['Orders'] || 0);

    // Calculate metrics if not provided
    const acos = row['ACOS'] !== undefined
        ? Number(row['ACOS'])
        : sales > 0 ? (spend / sales) * 100 : 0;

    const roas = row['ROAS'] !== undefined
        ? Number(row['ROAS'])
        : spend > 0 ? sales / spend : 0;

    const cpc = row['CPC'] !== undefined
        ? Number(row['CPC'])
        : clicks > 0 ? spend / clicks : 0;

    const ctr = row['CTR'] !== undefined
        ? Number(row['CTR'])
        : impressions > 0 ? (clicks / impressions) * 100 : 0;

    const cvr = row['CVR'] !== undefined
        ? Number(row['CVR'])
        : clicks > 0 ? (orders / clicks) * 100 : 0;

    return {
        campaignId: row['Campaign ID'] || `camp-${index}`,
        campaignName: row['Campaign Name'],
        spend,
        sales,
        acos,
        roas,
        impressions,
        clicks,
        conversions: orders,
        ctr,
        cvr,
        cpc,
        daysActive: 60, // Default to 60 days for bulk exports
    };
}

/**
 * Main analysis function
 */
function analyzeBulkExport() {
    console.log('='.repeat(80));
    console.log('AMAZON ADS BULK EXPORT ANALYSIS');
    console.log('Generated:', new Date().toLocaleString());
    console.log('='.repeat(80));
    console.log();

    // File paths
    const bulkFilePath = path.join(__dirname, '../../bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx');
    const templateFilePath = path.join(__dirname, '../../AmazonAdvertisingBulksheetSellerTemplate.xlsx');

    console.log('📂 Reading bulk export file...');
    console.log(`   Path: ${bulkFilePath}`);

    const bulkData = readBulkExport(bulkFilePath);

    if (bulkData.length === 0) {
        console.log('❌ No data found in bulk export file');
        console.log('\n💡 Checking template file...');
        const templateData = readBulkExport(templateFilePath);

        if (templateData.length > 0) {
            console.log(`✅ Template file contains ${templateData.length} rows`);
            console.log('\nTemplate columns:', Object.keys(templateData[0]).slice(0, 10).join(', '));
        }
        return;
    }

    console.log(`✅ Loaded ${bulkData.length} rows from bulk export\n`);

    // Show available columns
    if (bulkData.length > 0) {
        console.log('📊 Available columns in export:');
        const columns = Object.keys(bulkData[0]);
        columns.forEach((col, idx) => {
            if (idx < 20) { // Show first 20 columns
                console.log(`   - ${col}`);
            }
        });
        if (columns.length > 20) {
            console.log(`   ... and ${columns.length - 20} more columns`);
        }
        console.log();
    }

    // Convert to campaign metrics
    console.log('🔄 Converting to campaign metrics...');
    const campaigns: CampaignMetrics[] = bulkData
        .map((row, idx) => convertToCampaignMetrics(row, idx))
        .filter((c): c is CampaignMetrics => c !== null);

    console.log(`✅ Processed ${campaigns.length} campaigns\n`);

    if (campaigns.length === 0) {
        console.log('❌ No valid campaigns found with required metrics');
        console.log('\nSample row data:');
        console.log(JSON.stringify(bulkData[0], null, 2));
        return;
    }

    // Run bleeder detection
    const detector = new BleederDetector();
    const categorized = detector.analyzeCampaigns(campaigns);

    console.log('='.repeat(80));
    console.log('BLEEDER DETECTION RESULTS');
    console.log('='.repeat(80));
    console.log();

    // Critical bleeders
    const criticalBleeders = categorized.get('CRITICAL') || [];
    console.log(`🔴 CRITICAL BLEEDERS: ${criticalBleeders.length}`);
    if (criticalBleeders.length > 0) {
        criticalBleeders.forEach((campaign) => {
            const analysis = detector.analyzeCampaign(campaign);
            console.log(`\n   Campaign: ${campaign.campaignName}`);
            console.log(`   ACOS: ${campaign.acos.toFixed(2)}% | ROAS: ${campaign.roas.toFixed(2)}`);
            console.log(`   Spend: $${campaign.spend.toFixed(2)} | Sales: $${campaign.sales.toFixed(2)}`);
            console.log(`   Loss: $${(campaign.spend - campaign.sales).toFixed(2)}`);
            console.log(`   Bleeder Score: ${analysis.score}/100`);

            if (analysis.recommendations.length > 0) {
                console.log(`   Recommended Action: ${analysis.recommendations[0].action}`);
            }
        });
    }
    console.log();

    // High risk
    const highRisk = categorized.get('HIGH') || [];
    console.log(`🟠 HIGH RISK: ${highRisk.length}`);
    if (highRisk.length > 0) {
        highRisk.forEach((campaign) => {
            console.log(`   - ${campaign.campaignName} (ACOS: ${campaign.acos.toFixed(2)}%, ROAS: ${campaign.roas.toFixed(2)})`);
        });
    }
    console.log();

    // Medium risk
    const mediumRisk = categorized.get('MEDIUM') || [];
    console.log(`🟡 MEDIUM RISK: ${mediumRisk.length}`);
    if (mediumRisk.length > 0) {
        mediumRisk.slice(0, 5).forEach((campaign) => {
            console.log(`   - ${campaign.campaignName} (ACOS: ${campaign.acos.toFixed(2)}%)`);
        });
        if (mediumRisk.length > 5) {
            console.log(`   ... and ${mediumRisk.length - 5} more`);
        }
    }
    console.log();

    // Healthy campaigns
    const healthy = categorized.get('HEALTHY') || [];
    console.log(`🟢 HEALTHY: ${healthy.length}`);
    if (healthy.length > 0) {
        healthy.slice(0, 5).forEach((campaign) => {
            console.log(`   - ${campaign.campaignName} (ACOS: ${campaign.acos.toFixed(2)}%, ROAS: ${campaign.roas.toFixed(2)})`);
        });
        if (healthy.length > 5) {
            console.log(`   ... and ${healthy.length - 5} more`);
        }
    }
    console.log();

    // Portfolio summary
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalSales = campaigns.reduce((sum, c) => sum + c.sales, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

    const blendedAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const blendedRoas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const blendedCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const portfolioProfit = totalSales - totalSpend;

    console.log('='.repeat(80));
    console.log('PORTFOLIO SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total Campaigns: ${campaigns.length}`);
    console.log(`Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`Total Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`Total Conversions: ${totalConversions.toLocaleString()}`);
    console.log(`Total Spend: $${totalSpend.toFixed(2)}`);
    console.log(`Total Sales: $${totalSales.toFixed(2)}`);
    console.log(`Blended ACOS: ${blendedAcos.toFixed(2)}%`);
    console.log(`Blended ROAS: ${blendedRoas.toFixed(2)}`);
    console.log(`Blended CPC: $${blendedCpc.toFixed(2)}`);
    console.log(`Portfolio ${portfolioProfit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(portfolioProfit).toFixed(2)}`);
    console.log();

    // Calculate potential savings
    const totalPotentialSavings = criticalBleeders.reduce((sum, campaign) => {
        const analysis = detector.analyzeCampaign(campaign);
        return sum + (analysis.estimatedMonthlySavings || 0);
    }, 0);

    if (criticalBleeders.length > 0) {
        console.log('💰 POTENTIAL SAVINGS:');
        console.log(`   Pausing ${criticalBleeders.length} critical bleeder(s): ~$${totalPotentialSavings.toFixed(2)}/month`);
    }

    console.log('\n' + '='.repeat(80));
}

// Run analysis
analyzeBulkExport();
