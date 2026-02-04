const cron = require('node-cron');
const reviewRequestsMain = require('./send-review-requests');

/**
 * Scheduled Review Request Automation
 * Runs daily at 10:00 AM
 */

console.log('\n════════════════════════════════════════════════════════════════');
console.log('         REVIEW REQUEST SCHEDULER STARTED');
console.log('         Schedule: Daily at 10:00 AM');
console.log('════════════════════════════════════════════════════════════════\n');

// Run every day at 10:00 AM
cron.schedule('0 10 * * *', async () => {
    console.log(`\n[${new Date().toLocaleString()}] Running scheduled review requests...\n`);

    try {
        await reviewRequestsMain();
        console.log(`\n[${new Date().toLocaleString()}] Scheduled run complete\n`);
    } catch (error) {
        console.error(`\n[${new Date().toLocaleString()}] Scheduled run failed:`, error.message);
    }
}, {
    timezone: "America/Chicago" // Change to your timezone
});

console.log('✅ Scheduler is running. Press Ctrl+C to stop.\n');

// Keep process alive
process.stdin.resume();
