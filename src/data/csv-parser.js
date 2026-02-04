const fs = require('fs');
const csv = require('csv-parser');

/**
 * CSV Parser for Amazon Business Reports and Ads Reports
 * Handles manual CSV imports before API automation
 */
class CSVParser {
    /**
     * Parse Business Report CSV
     * Expected columns: (Parent) ASIN, Sessions, Ordered Product Sales, Units Ordered, Unit Session Percentage
     */
    async parseBusinessReport(filePath) {
        const results = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Amazon's column names have spaces and special chars
                    const asin = row['(Parent) ASIN'] || row['ASIN'] || row['Parent ASIN'];

                    if (asin && asin !== '(not set)' && asin !== '') {
                        results.push({
                            asin: asin.trim(),
                            sessions: parseInt(row['Sessions']) || 0,
                            orderedProductSales: this.parseFloat(row['Ordered Product Sales']) || 0,
                            unitsOrdered: parseInt(row['Units Ordered']) || 0,
                            unitSessionPercentage: this.parsePercentage(row['Unit Session Percentage']) || 0
                        });
                    }
                })
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    /**
     * Parse Ads Report CSV
     * Expected columns: Advertised ASIN, Impressions, Clicks, Spend, 7 Day Total Sales, 7 Day Total Orders
     */
    async parseAdsReport(filePath) {
        const results = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const asin = row['Advertised ASIN'];

                    if (asin && asin !== '') {
                        results.push({
                            asin: asin.trim(),
                            impressions: parseInt(row['Impressions']) || 0,
                            clicks: parseInt(row['Clicks']) || 0,
                            spend: this.parseFloat(row['Spend']) || 0,
                            sales7d: this.parseFloat(row['7 Day Total Sales']) || 0,
                            orders7d: parseInt(row['7 Day Total Orders']) || 0
                        });
                    }
                })
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    /**
     * Aggregate data by ASIN (sum across all rows)
     */
    aggregateByASIN(data) {
        const aggregated = {};

        data.forEach(row => {
            if (!aggregated[row.asin]) {
                aggregated[row.asin] = { asin: row.asin };

                // Initialize all numeric fields
                Object.keys(row).forEach(key => {
                    if (key !== 'asin' && typeof row[key] === 'number') {
                        aggregated[row.asin][key] = 0;
                    }
                });
            }

            // Sum all numeric fields
            Object.keys(row).forEach(key => {
                if (key !== 'asin' && typeof row[key] === 'number') {
                    aggregated[row.asin][key] += row[key];
                }
            });
        });

        return Object.values(aggregated);
    }

    /**
     * Helper: Parse float from string with $ and commas
     */
    parseFloat(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.toString().replace(/[$,]/g, '')) || 0;
    }

    /**
     * Helper: Parse percentage from string
     */
    parsePercentage(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value / 100;
        return parseFloat(value.toString().replace('%', '')) / 100 || 0;
    }
}

module.exports = CSVParser;
