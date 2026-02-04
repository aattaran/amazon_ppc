const CSVParser = require('./csv-parser');
const fs = require('fs').promises;
const path = require('path');

/**
 * Metrics Calculator
 * Loads CSVs, merges data, calculates Ad Dependency %, TACoS %, etc.
 */
class MetricsCalculator {
    constructor() {
        this.parser = new CSVParser();
    }

    /**
     * Main function: Load CSVs, merge data, calculate metrics
     */
    async calculateProductMetrics() {
        console.log('📊 Calculating product metrics...\n');

        // 1. Load products.json
        const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');
        const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
        console.log(`✅ Loaded ${products.length} products from products.json\n`);

        // 2. Find latest Business Report
        const businessReportPath = await this.findLatestFile('data/business-reports', '.csv');
        console.log(`📁 Using Business Report: ${path.basename(businessReportPath)}`);

        const businessData = await this.parser.parseBusinessReport(businessReportPath);
        const businessByASIN = this.parser.aggregateByASIN(businessData);
        console.log(`✅ Parsed Business Report: ${businessByASIN.length} ASINs\n`);

        // 3. Find latest Ads Report
        const adsReportPath = await this.findLatestFile('data/ads-reports', '.csv');
        console.log(`📁 Using Ads Report: ${path.basename(adsReportPath)}`);

        const adsData = await this.parser.parseAdsReport(adsReportPath);
        const adsByASIN = this.parser.aggregateByASIN(adsData);
        console.log(`✅ Parsed Ads Report: ${adsByASIN.length} ASINs\n`);

        // 4. Merge and calculate metrics
        const metrics = {};

        for (const product of products) {
            const business = businessByASIN.find(b => b.asin === product.asin) || {};
            const ads = adsByASIN.find(a => a.asin === product.asin) || {};

            // Calculate derived metrics
            const totalSales = business.orderedProductSales || 0;
            const adSales = ads.sales7d || 0;
            const organicSales = totalSales - adSales;
            const adSpend = ads.spend || 0;

            const adDependency = totalSales > 0 ? adSales / totalSales : 0;
            const tacos = totalSales > 0 ? adSpend / totalSales : 0;
            const cvr = business.unitSessionPercentage || 0;

            const daysLive = this.getDaysLive(product.launchDate);

            metrics[product.asin] = {
                asin: product.asin,
                name: product.name,
                launchDate: product.launchDate,
                daysLive: daysLive,

                // Traffic
                sessions: business.sessions || 0,

                // Sales
                totalSales: totalSales,
                adSales: adSales,
                organicSales: organicSales,
                units: business.unitsOrdered || 0,

                // Ad Performance
                adSpend: adSpend,
                impressions: ads.impressions || 0,
                clicks: ads.clicks || 0,
                orders: ads.orders7d || 0,

                // Key Metrics (Heist Framework)
                adDependency: adDependency,
                tacos: tacos,
                cvr: cvr,

                // Health Flags
                isLaunch: daysLive < 60,
                isAdDependent: adDependency > 0.5,
                isHighTACoS: tacos > 0.08 && daysLive >= 60
            };
        }

        // 5. Save to file
        const outputPath = path.join(process.cwd(), 'data', 'processed', 'product-metrics.json');
        await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2));

        console.log('✅ Metrics calculated and saved to data/processed/product-metrics.json\n');

        // Print summary
        this.printSummary(metrics);

        return metrics;
    }

    async findLatestFile(directory, extension) {
        const files = await fs.readdir(directory);
        const csvFiles = files.filter(f => f.endsWith(extension));

        if (csvFiles.length === 0) {
            throw new Error(`No ${extension} files found in ${directory}. Please download reports from Amazon.`);
        }

        // Sort by modification time, newest first
        const filesWithStats = await Promise.all(
            csvFiles.map(async (file) => {
                const filepath = path.join(directory, file);
                const stats = await fs.stat(filepath);
                return { file: filepath, mtime: stats.mtime };
            })
        );

        filesWithStats.sort((a, b) => b.mtime - a.mtime);
        return filesWithStats[0].file;
    }

    getDaysLive(launchDate) {
        const launch = new Date(launchDate);
        const now = new Date();
        return Math.floor((now - launch) / (1000 * 60 * 60 * 24));
    }

    printSummary(metrics) {
        console.log('📈 SUMMARY:\n');
        console.log('════════════════════════════════════════════════════════════════\n');

        Object.values(metrics).forEach(m => {
            console.log(`${m.asin} - ${m.name}`);
            console.log(`  Days Live: ${m.daysLive}`);
            console.log(`  Total Sales: $${m.totalSales.toFixed(2)}`);
            console.log(`  Ad Dependency: ${(m.adDependency * 100).toFixed(1)}%`);
            console.log(`  TACoS: ${(m.tacos * 100).toFixed(1)}%`);
            console.log(`  CVR: ${(m.cvr * 100).toFixed(1)}%`);

            if (m.isLaunch) console.log(`  🚀 LAUNCH PHASE`);
            if (m.isAdDependent) console.log(`  ⚠️  AD-DEPENDENT (>50%)`);
            if (m.isHighTACoS) console.log(`  💸 HIGH TACOS (>8%)`);

            console.log('');
        });
    }
}

module.exports = MetricsCalculator;
