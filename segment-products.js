const SmartSegmenter = require('./src/analysis/smart-segmenter');
const fs = require('fs').promises;
const path = require('path');

/**
 * Script: Segment products based on metrics
 * Run: node segment-products.js
 */
async function main() {
    const segmenter = new SmartSegmenter();

    try {
        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('         PRODUCT SEGMENTATION (Heist Methodology)');
        console.log('════════════════════════════════════════════════════════════════\n');

        const segmented = await segmenter.segment();

        console.log('📊 SEGMENTATION RESULTS:\n');

        segmented.forEach(p => {
            console.log(`${p.segment} - ${p.name} (${p.asin})`);
            console.log(`  Priority: ${p.priority} | Budget Multiplier: ${p.budgetMultiplier}x`);
            console.log(`  Days Live: ${p.daysLive} | Total Sales: $${p.totalSales.toFixed(2)}`);
            console.log(`  Ad Dep: ${(p.adDependency * 100).toFixed(1)}% | TACoS: ${(p.tacos * 100).toFixed(1)}%`);
            console.log(`  Strategy:`);
            p.strategy.forEach(s => console.log(`    - ${s}`));
            console.log('');
        });

        // Save to file
        const outputPath = path.join(process.cwd(), 'data', 'processed', 'product-segments.json');
        await fs.writeFile(outputPath, JSON.stringify(segmented, null, 2));

        console.log('════════════════════════════════════════════════════════════════');
        console.log('✅ Segmentation saved to data/processed/product-segments.json\n');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n💡 Make sure you have run: node calculate-metrics.js first\n');
        process.exit(1);
    }
}

main();
