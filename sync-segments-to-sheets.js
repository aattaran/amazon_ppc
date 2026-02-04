const fs = require('fs').promises;
const path = require('path');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

/**
 * Sync Product Segments to Google Sheets
 * Adds "Product Segments" tab with lifecycle analysis
 */
async function syncProductSegments() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('         SYNCING PRODUCT SEGMENTS TO GOOGLE SHEETS');
    console.log('════════════════════════════════════════════════════════════════\n');

    try {
        // 1. Initialize sheets service
        const sheetsService = new UnifiedSheetsService();

        // 2. Load segment data
        const segmentsPath = path.join(process.cwd(), 'data', 'processed', 'product-segments.json');
        const segmentsData = await fs.readFile(segmentsPath, 'utf8');
        const segments = JSON.parse(segmentsData);

        console.log(`📊 Loaded ${segments.length} product(s) from product-segments.json\n`);

        // 3. Ensure sheet exists
        await sheetsService.ensureSheet('Product Segments');

        // 4. Build rows for sheet
        const rows = [
            [
                'ASIN',
                'Product Name',
                'Days Live',
                'Segment',
                'Priority',
                'Total Sales',
                'Ad Sales',
                'Organic Sales',
                'Ad Spend',
                'Ad Dep %',
                'TACoS %',
                'CVR %',
                'Budget Multiplier',
                'Primary Strategy',
                'Health Status'
            ]
        ];

        // 5. Add data rows
        segments.forEach(product => {
            const healthStatus = getHealthStatus(product);

            rows.push([
                product.asin,
                product.name,
                product.daysLive,
                product.segment,
                product.priority,
                `$${product.totalSales.toFixed(2)}`,
                `$${product.adSales.toFixed(2)}`,
                `$${product.organicSales.toFixed(2)}`,
                `$${product.adSpend.toFixed(2)}`,
                `${(product.adDependency * 100).toFixed(1)}%`,
                `${(product.tacos * 100).toFixed(1)}%`,
                `${(product.cvr * 100).toFixed(1)}%`,
                `${product.budgetMultiplier}x`,
                product.strategy[0], // First strategy item
                healthStatus
            ]);
        });

        // 6. Clear and update Google Sheets
        console.log('📤 Pushing to Google Sheets...');
        await sheetsService.clearSheet('Product Segments');
        await sheetsService.writeRows('Product Segments', rows);

        console.log('✅ Product Segments sheet updated!\n');
        console.log('════════════════════════════════════════════════════════════════');
        console.log('📊 VIEW YOUR SEGMENTS:');
        console.log('   Open your Google Sheet and check the "Product Segments" tab');
        console.log('════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error syncing to Google Sheets:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   1. You ran: node segment-products.js first');
        console.error('   2. Google Sheets credentials are set up');
        console.error('   3. Auto-sync service is running\n');
        throw error;
    }
}

function getHealthStatus(product) {
    if (product.segment.includes('LAUNCH')) {
        return '🚀 Launching - Monitor closely';
    } else if (product.segment.includes('CASH COW')) {
        return '✅ Healthy - Maintain';
    } else if (product.segment.includes('AD-DEPENDENT')) {
        return '⚠️ CRITICAL - Fix organic';
    } else if (product.segment.includes('HIGH TACOS')) {
        return '💸 Overspending - Reduce ads';
    } else if (product.segment.includes('DECLINING')) {
        return '📉 Investigate decline';
    } else {
        return '✅ Monitor';
    }
}

// Run
syncProductSegments().catch(err => {
    console.error(err);
    process.exit(1);
});
