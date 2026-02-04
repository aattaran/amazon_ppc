/**
 * Test DataForSEO Integration
 * Run: node test-dataforseo.js
 */

require('dotenv').config();
const DataForSEOClient = require('./src/titan/services/dataforseo-client');
const KeywordEnricher = require('./src/titan/services/keyword-enricher');

async function testDataForSEO() {
    console.log('\n🔬 Testing DataForSEO Integration...\n');

    try {
        // 1. Initialize client
        console.log('📡 Initializing DataForSEO client...');
        const client = new DataForSEOClient();
        console.log('✅ Client initialized\n');

        // 2. Check account balance
        console.log('💰 Checking account balance...');
        const accountInfo = await client.getAccountInfo();
        if (accountInfo.money) {
            console.log(`✅ Balance: $${accountInfo.money.balance || 0}`);
            console.log(`   Spent: $${accountInfo.money.spent || 0}`);
            console.log(`   Limit: $${accountInfo.money.limit || 0}\n`);
        } else {
            console.log('⚠️  Account info structure:', accountInfo, '\n');
        }

        // 3. Test search volume for a few keywords
        console.log('📊 Testing search volume API...');
        const testKeywords = [
            'dihydroberberine',
            'dhb supplement',
            'berberine hcl'
        ];

        const volumeData = await client.getSearchVolume(testKeywords);
        console.log('\n✅ Search Volume Results:');
        volumeData.forEach(item => {
            console.log(`   "${item.keyword}": ${item.search_volume || 0} searches/month`);
        });

        // 4. Test keyword ideas/expansion
        console.log('\n💡 Testing keyword expansion...');
        const ideas = await client.getKeywordIdeas('dihydroberberine', 10);
        console.log(`\n✅ Found ${ideas.length} related keywords:`);
        ideas.slice(0, 5).forEach(idea => {
            console.log(`   "${idea.keyword}": ${idea.searchVolume} vol, $${idea.cpc} CPC`);
        });

        // 5. Test enricher service
        console.log('\n\n🔍 Testing Keyword Enricher Service...\n');
        const enricher = new KeywordEnricher();

        const enrichedKeywords = await enricher.enrichBatch([
            'berberine supplement',
            'dhb capsules',
            'blood sugar support'
        ]);

        console.log('✅ Enriched Keywords:');
        enrichedKeywords.forEach(kw => {
            console.log(`   "${kw.keyword}":`);
            console.log(`      Volume: ${kw.searchVolume}`);
            console.log(`      Competition: ${kw.competition}`);
            console.log(`      CPC: $${kw.estimatedCPC}`);
        });

        console.log('\n✨ All tests passed! DataForSEO integration is working.\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testDataForSEO();
