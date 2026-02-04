require('dotenv').config();
const ReviewRequestService = require('./src/reviews/review-request-service');
const OrdersFetcher = require('./src/reviews/orders-fetcher');
const ReviewDatabase = require('./src/reviews/database/review-database');

/**
 * SUPPLEMENT-OPTIMIZED REVIEW REQUEST AUTOMATION
 * 
 * Strategy for Dihydroberberine (takes 3+ weeks to show effects):
 * - Day 22: Send review request (optimal timing for supplement results)
 * - Single request only (Amazon API limit)
 * - Track all requests in database
 * - Smart deduplication to prevent double-sending
 */

async function main() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('    SUPPLEMENT-OPTIMIZED REVIEW REQUESTS');
    console.log(`    ${new Date().toLocaleDateString()}`);
    console.log('    Strategy: Day 22 (optimal for supplement effects)');
    console.log('════════════════════════════════════════════════════════════════\n');

    // Check credentials
    if (!process.env.SP_API_REFRESH_TOKEN || !process.env.SP_API_CLIENT_ID) {
        console.error('❌ Missing SP-API credentials in .env file\n');
        console.error('Required variables:');
        console.error('  - SP_API_REFRESH_TOKEN');
        console.error('  - SP_API_CLIENT_ID');
        console.error('  - SP_API_CLIENT_SECRET');
        console.error('  - SP_API_REGION (optional, default: na)\n');
        process.exit(1);
    }

    const reviewService = new ReviewRequestService();
    const db = new ReviewDatabase();

    try {
        // 1. Get access token
        await reviewService.getAccessToken();

        // 2. Fetch orders from day 22 window
        // Amazon allows 5-30 days, but we target day 22 specifically
        const ordersFetcher = new OrdersFetcher(
            reviewService.accessToken,
            process.env.SP_API_REGION || 'na'
        );

        console.log('📦 Fetching orders from day 22 (3+ weeks ago)...\n');

        // Calculate exact day 22 date
        const day22Date = new Date();
        day22Date.setDate(day22Date.getDate() - 22);

        const allOrders = await ordersFetcher.getEligibleOrders();

        // Filter to day 22 only
        const day22Orders = allOrders.filter(order => {
            const orderDate = new Date(order.orderDate);
            const daysOld = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysOld === 22;
        });

        console.log(`   Found ${day22Orders.length} orders from day 22\n`);

        if (day22Orders.length === 0) {
            console.log('ℹ️  No orders at day 22 today. Check back tomorrow!\n');
            await printStats(db);
            db.close();
            return;
        }

        // 3. Record orders in database
        for (const order of day22Orders) {
            await db.recordOrder({
                orderId: order.orderId,
                orderDate: order.orderDate,
                deliveryDate: null, // Not available in Orders API response
                productAsin: process.env.PRODUCT_ASIN || 'B0DTDZFMY7'
            });
        }

        // 4. Filter out orders we've already sent requests to
        const ordersToProcess = [];
        for (const order of day22Orders) {
            const alreadySent = await db.hasRequestBeenSent(order.orderId);
            if (!alreadySent) {
                ordersToProcess.push(order);
            } else {
                console.log(`ℹ️  ${order.orderId} - Already sent request, skipping`);
            }
        }

        console.log(`\n📧 Sending requests to ${ordersToProcess.length} new orders\n`);

        if (ordersToProcess.length === 0) {
            console.log('✅ All day 22 orders have already been sent requests\n');
            await printStats(db);
            db.close();
            return;
        }

        // 5. Process review requests
        const results = await reviewService.processOrders(ordersToProcess);

        // 6. Record results in database
        for (const orderId of results.sent) {
            await db.recordRequest(orderId, 22, true);
        }

        for (const orderId of results.alreadySent) {
            await db.recordRequest(orderId, 22, false);
        }

        // 7. Print statistics
        await printStats(db);

        console.log('════════════════════════════════════════════════════════════════');
        console.log('✅ Automation complete!\n');

        db.close();

    } catch (error) {
        console.error('\n❌ Automation failed:', error.message);
        console.error('\n💡 Common issues:');
        console.error('   - Invalid SP-API credentials');
        console.error('   - Expired refresh token');
        console.error('   - Orders API not enabled in app permissions\n');

        db.close();
        throw error;
    }
}

async function printStats(db) {
    const stats = await db.getStats();

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('LIFETIME STATISTICS:');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`📦 Total Orders Tracked: ${stats.total_orders}`);
    console.log(`📧 Review Requests Sent: ${stats.requests_sent}`);
    console.log(`⭐ Reviews Received: ${stats.reviews_received}`);
    console.log(`📊 Response Rate: ${stats.response_rate || 0}%\n`);
}

// Run if called directly
if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = main;
