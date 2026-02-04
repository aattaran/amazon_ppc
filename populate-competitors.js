/**
 * Populate Competitors from Brand Analytics
 * Extracts top ASINs and their performance from analyze-brand-analytics.js
 */

require('dotenv').config();
const { google } = require('googleapis');

// Brand Analytics data with top ASINs
const BRAND_ANALYTICS_DATA = [
    {
        searchTerm: 'dihydrober berine',
        searchFrequencyRank: 73890,
        topASINs: [
            { asin: 'B0D4RMJ8NB', brand: 'Nutricost', clickShare: 17.33, conversionShare: 16.41 },
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 16.44, conversionShare: 14.44 },
            { asin: 'B0DJ7XMLXQ', brand: 'HealMeal', clickShare: 9.38, conversionShare: 4.04 }
        ]
    },
    {
        searchTerm: 'dihydroberberine supplement',
        searchFrequencyRank: 316086,
        topASINs: [
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 13.53, conversionShare: 10.49 },
            { asin: 'B0FGNRSYCF', brand: 'Unknown', clickShare: 10.19, conversionShare: 10.49 },
            { asin: 'B0DJ7XMLXQ', brand: 'HealMeal', clickShare: 9.25, conversionShare: 5.57 }
        ]
    },
    {
        searchTerm: 'dihydroberberine 200mg',
        searchFrequencyRank: 704965,
        topASINs: [
            { asin: 'B0D4RMJ8NB', brand: 'Nutricost', clickShare: 15.44, conversionShare: 25 },
            { asin: 'B0CWC6F56X', brand: "NATURE'S FUSIONS", clickShare: 9.42, conversionShare: 8.33 },
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 8.85, conversionShare: 3.33 }
        ]
    },
    {
        searchTerm: 'dihydroberberine 500mg',
        searchFrequencyRank: 1448955,
        topASINs: [
            { asin: 'B0DDMM94BF', brand: 'NATUREBELL', clickShare: 31.27, conversionShare: 31.34 },
            { asin: 'B0DCZPTMLX', brand: 'VINATURA', clickShare: 12.36, conversionShare: 11.94 },
            { asin: 'B0FGNRSYCF', brand: 'Unknown', clickShare: 10.42, conversionShare: 11.94 }
        ]
    }
];

async function populateCompetitors() {
    console.log('\n📊 Populating Competitors sheet from Brand Analytics...\n');

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    try {
        // Aggregate ASINs
        const asinMap = new Map();

        BRAND_ANALYTICS_DATA.forEach(term => {
            term.topASINs.forEach(asinData => {
                if (!asinMap.has(asinData.asin)) {
                    asinMap.set(asinData.asin, {
                        asin: asinData.asin,
                        brand: asinData.brand,
                        keywords: [],
                        totalClickShare: 0,
                        totalConversionShare: 0,
                        count: 0,
                        avgPosition: 0
                    });
                }

                const comp = asinMap.get(asinData.asin);
                comp.keywords.push(term.searchTerm);
                comp.totalClickShare += asinData.clickShare;
                comp.totalConversionShare += asinData.conversionShare;
                comp.count++;
            });
        });

        // Convert to rows
        const rows = Array.from(asinMap.values()).map(comp => [
            comp.asin,
            comp.brand,
            '', // Product title - to fill manually
            comp.keywords.join(', '),
            '', // Avg position
            '', // Est monthly volume
            (comp.totalClickShare / comp.count).toFixed(1),
            (comp.totalConversionShare / comp.count).toFixed(1),
            'Conquest',
            'Active'
        ]);

        // Sort by click share descending
        rows.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

        console.log(`Found ${rows.length} unique competitor ASINs\n`);

        // Append to Competitors sheet (after headers)
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Competitors!A10:J',
            valueInputOption: 'RAW',
            resource: { values: rows }
        });

        console.log('✅ Competitors populated!\n');
        console.log('Top 5 Competitors:');
        rows.slice(0, 5).forEach((row, i) => {
            console.log(`  ${i + 1}. ${row[1]} (${row[0]}) - Click: ${row[6]}%, Conv: ${row[7]}%`);
        });

        console.log('\n🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

populateCompetitors().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
