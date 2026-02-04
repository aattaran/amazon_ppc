const XLSX = require('xlsx');

/**
 * Aggregate Search Term data to get total ad performance
 */
async function aggregateAdData(filePath) {
    console.log(`\n📊 Aggregating ad performance from Search Term Report\n`);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['SP Search Term Report'];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📋 Found ${data.length} search terms\n`);

    // Aggregate totals
    let totalSpend = 0;
    let totalSales = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    data.forEach(row => {
        totalSpend += parseFloat(row['Spend']) || 0;
        totalSales += parseFloat(row['Sales']) || 0;
        totalOrders += parseInt(row['Orders']) || 0;
        totalImpressions += parseInt(row['Impressions']) || 0;
        totalClicks += parseInt(row['Clicks']) || 0;
    });

    console.log('📈 Total Ad Performance (Last 90 days):');
    console.log(`   Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`   Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`   Ad Spend: $${totalSpend.toFixed(2)}`);
    console.log(`   Ad Sales: $${totalSales.toFixed(2)}`);
    console.log(`   Ad Orders: ${totalOrders}`);
    console.log(`   ACOS: ${totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : 0}%`);
    console.log(`   CPC: $${totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0}\n`);

    return {
        adSpend: totalSpend,
        adSales: totalSales,
        adOrders: totalOrders,
        impressions: totalImpressions,
        clicks: totalClicks
    };
}

const filePath = './data/bulk-a3snsjclchkfi8-20251126-20260125-1769384391526.xlsx';
aggregateAdData(filePath).then(data => {
    console.log('✅ Ad data aggregated\n');
    console.log('📝 For products.json, we have:');
    console.log(`   ASIN: B0DTDZFMY7`);
    console.log(`   Ad Sales: $${data.adSales.toFixed(2)}`);
    console.log(`   Ad Spend: $${data.adSpend.toFixed(2)}`);
    console.log(`   Ad Orders: ${data.adOrders}`);
    console.log(`\n💡 We still need TOTAL sales (ad + organic) from Sales Dashboard`);
    console.log(`   From your SalesDashboard: Total Sales = $1,737.79`);
    console.log(`\n🧮 We can calculate:`);
    const totalSales = 1737.79;
    const adDep = (data.adSales / totalSales) * 100;
    const tacos = (data.adSpend / totalSales) * 100;
    console.log(`   Ad Dependency: ${adDep.toFixed(1)}%`);
    console.log(`   TACoS: ${tacos.toFixed(1)}%`);
});
