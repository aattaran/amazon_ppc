const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

/**
 * Build product metrics from your actual files
 * - SalesDashboard (total sales)
 * - Bulk file (ad performance)
 */
async function buildMetricsFromActualData() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('         BUILDING METRICS FROM YOUR FILES');
    console.log('════════════════════════════════════════════════════════════════\n');

    // 1. Get ad data from bulk file
    const bulkFile = './data/bulk-a3snsjclchkfi8-20251126-20260125-1769384391526.xlsx';
    const workbook = XLSX.readFile(bulkFile);
    const sheet = workbook.Sheets['SP Search Term Report'];
    const searchTerms = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📊 Loaded ${searchTerms.length} search terms from bulk file`);

    // Aggregate ad performance
    let adSpend = 0;
    let adSales = 0;
    let adOrders = 0;
    let impressions = 0;
    let clicks = 0;

    searchTerms.forEach(row => {
        adSpend += parseFloat(row['Spend']) || 0;
        adSales += parseFloat(row['Sales']) || 0;
        adOrders += parseInt(row['Orders']) || 0;
        impressions += parseInt(row['Impressions']) || 0;
        clicks += parseInt(row['Clicks']) || 0;
    });

    console.log(`   Ad Spend: $${adSpend.toFixed(2)}`);
    console.log(`   Ad Sales: $${adSales.toFixed(2)}`);
    console.log(`   Ad Orders: ${adOrders}\n`);

    // 2. Get total sales from Sales Dashboard
    const totalSales = 1737.79; // From your Sales Dashboard
    const totalUnits = 76; // From your Sales Dashboard

    console.log(`📊 From Sales Dashboard:`);
    console.log(`   Total Sales: $${totalSales.toFixed(2)}`);
    console.log(`   Total Units: ${totalUnits}\n`);

    // 3. Load products.json
    const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');
    const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
    const product = products[0]; // Only 1 ASIN

    console.log(`📦 Product: ${product.name} (${product.asin})`);
    console.log(`   Launch Date: ${product.launchDate}\n`);

    // 4. Calculate metrics
    const organicSales = totalSales - adSales;
    const adDependency = adSales / totalSales;
    const tacos = adSpend / totalSales;

    const launchDate = new Date(product.launchDate);
    const now = new Date();
    const daysLive = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));

    // Estimate sessions (if we don't have exact number)
    // Assuming average $23/unit price, 76 units
    const avgPrice = totalSales / totalUnits;
    const estimatedCVR = 0.06; // 6% is reasonable for supplements
    const estimatedSessions = Math.round(totalUnits / estimatedCVR);

    console.log('🧮 CALCULATED METRICS:\n');
    console.log(`   Days Live: ${daysLive} days`);
    console.log(`   Organic Sales: $${organicSales.toFixed(2)}`);
    console.log(`   Ad Dependency: ${(adDependency * 100).toFixed(1)}%`);
    console.log(`   TACoS: ${(tacos * 100).toFixed(1)}%`);
    console.log(`   Estimated CVR: ${(estimatedCVR * 100).toFixed(1)}%`);
    console.log(`   Estimated Sessions: ${estimatedSessions}\n`);

    // 5. Build metrics object
    const metrics = {
        [product.asin]: {
            asin: product.asin,
            name: product.name,
            launchDate: product.launchDate,
            daysLive: daysLive,

            // Traffic
            sessions: estimatedSessions,

            // Sales
            totalSales: totalSales,
            adSales: adSales,
            organicSales: organicSales,
            units: totalUnits,

            // Ad Performance
            adSpend: adSpend,
            impressions: impressions,
            clicks: clicks,
            orders: adOrders,

            // Key Metrics
            adDependency: adDependency,
            tacos: tacos,
            cvr: estimatedCVR,

            // Health Flags
            isLaunch: daysLive < 60,
            isAdDependent: adDependency > 0.5,
            isHighTACoS: tacos > 0.08 && daysLive >= 60
        }
    };

    // 6. Save to file
    const outputPath = path.join(process.cwd(), 'data', 'processed', 'product-metrics.json');
    await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2));

    console.log('✅ Metrics saved to data/processed/product-metrics.json\n');

    // 7. Print health assessment
    console.log('════════════════════════════════════════════════════════════════');
    console.log('HEALTH ASSESSMENT:\n');

    const m = metrics[product.asin];

    if (m.isLaunch) {
        console.log('🚀 LAUNCH PHASE');
        console.log('   Product is still in honeymoon period (0-60 days)');
    } else if (m.isHighTACoS) {
        console.log('💸 HIGH TACOS');
        console.log(`   TACoS ${(m.tacos * 100).toFixed(1)}% is above 8% threshold`);
        console.log('   Recommendation: Reduce ad spend or improve organic ranking');
    } else if (m.adDependency < 0.4 && m.tacos <= 0.05) {
        console.log('🏆 CASH COW');
        console.log('   Healthy metrics - good balance of ad and organic');
    } else {
        console.log('✅ MAINTAIN');
        console.log('   Acceptable performance, monitor metrics');
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');

    return metrics;
}

buildMetricsFromActualData().catch(console.error);
