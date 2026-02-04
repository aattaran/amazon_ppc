/**
 * RESILIENT POLLER - Exponential Backoff with Extended Timeout
 * 
 * Solves "Polling Loop Fragility" architectural failure
 * 
 * Features:
 * - 30-minute timeout (not 10-minute)
 * - Exponential backoff (30s → 45s → 67s → 100s → 120s)
 * - Detailed progress logging
 * - Handles large account reports
 */

class ResilientPoller {
    constructor(apiClient) {
        this.apiClient = apiClient;

        // Configuration
        this.config = {
            initialIntervalMs: 30000,          // Start with 30 seconds
            maxIntervalMs: 120000,             // Cap at 2 minutes
            maxDurationMs: 30 * 60 * 1000,     // 30 minutes total timeout
            backoffMultiplier: 1.5             // Increase by 50% each time
        };
    }

    /**
     * Poll report status with exponential backoff
     */
    async poll(reportId) {
        console.log('⏳ Polling for report completion...');
        console.log(`   Max timeout: ${this.config.maxDurationMs / 60000} minutes`);
        console.log(`   Initial interval: ${this.config.initialIntervalMs / 1000}s\n`);

        const startTime = Date.now();
        let interval = this.config.initialIntervalMs;
        let attempt = 1;

        while (Date.now() - startTime < this.config.maxDurationMs) {
            const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
            console.log(`   Attempt #${attempt} (${elapsedMinutes}min elapsed)...`);

            try {
                const status = await this.apiClient.checkReportStatus(reportId);

                if (status.status === 'COMPLETED') {
                    console.log(`✅ Report ready! (Took ${elapsedMinutes} minutes)\n`);
                    return status.url;
                }

                if (status.status === 'FAILED') {
                    throw new Error(`Report generation failed: ${status.statusDetails || 'Unknown error'}`);
                }

                // Still processing - wait and retry with exponential backoff
                const nextInterval = Math.min(
                    interval * this.config.backoffMultiplier,
                    this.config.maxIntervalMs
                );

                console.log(`      Status: ${status.status}`);
                console.log(`      Waiting ${Math.floor(nextInterval / 1000)}s before next check...\n`);

                await new Promise(resolve => setTimeout(resolve, nextInterval));

                interval = nextInterval;
                attempt++;

            } catch (error) {
                console.warn(`   ⚠️ Poll attempt ${attempt} failed: ${error.message}`);

                // If it's a rate limit error, wait longer
                if (error.message.includes('429') || error.message.includes('Rate')) {
                    console.log('   Waiting 60s due to rate limit...\n');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                } else {
                    // For other errors, use normal backoff
                    await new Promise(resolve => setTimeout(resolve, interval));
                }

                attempt++;
            }
        }

        // Timeout reached
        const totalMinutes = Math.floor((Date.now() - startTime) / 60000);
        throw new Error(
            `Report timeout after ${totalMinutes} minutes. ` +
            `Report may still be processing on Amazon's servers.`
        );
    }

    /**
     * Get polling progress estimate
     */
    getProgress(startTime, currentTime) {
        const elapsed = currentTime - startTime;
        const totalDuration = this.config.maxDurationMs;
        const percentComplete = (elapsed / totalDuration) * 100;

        return {
            elapsedMinutes: Math.floor(elapsed / 60000),
            remainingMinutes: Math.floor((totalDuration - elapsed) / 60000),
            percentComplete: Math.min(percentComplete, 100).toFixed(1)
        };
    }
}

module.exports = ResilientPoller;
