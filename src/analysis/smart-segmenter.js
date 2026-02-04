const fs = require('fs').promises;
const path = require('path');

/**
 * Smart Segmenter - Heist Methodology Implementation
 * Segments products by lifecycle stage and health metrics
 */
class SmartSegmenter {
    /**
     * Segment products based on metrics
     */
    async segment() {
        // Load metrics from file
        const metricsPath = path.join(process.cwd(), 'data', 'processed', 'product-metrics.json');
        const metricsData = await fs.readFile(metricsPath, 'utf8');
        const metrics = JSON.parse(metricsData);

        const segmented = [];

        for (const [asin, m] of Object.entries(metrics)) {
            const segment = this.determineSegment(m);

            segmented.push({
                ...m,
                ...segment
            });
        }

        // Sort by priority (1 = highest)
        segmented.sort((a, b) => a.priority - b.priority);

        return segmented;
    }

    determineSegment(m) {
        // LAUNCH PHASE (0-60 days)
        if (m.daysLive < 60) {
            return {
                segment: '🚀 LAUNCH',
                priority: 1,
                budgetMultiplier: 2.0,
                strategy: [
                    'Aggressive ranking on 25 power keywords',
                    'External traffic via Amazon Attribution',
                    'Monitor: CTR, CVR, Sessions, Add-to-Carts',
                    'Budget: No TACoS limit (investment phase)'
                ]
            };
        }

        // MATURE PRODUCTS (60+ days)

        // UNHEALTHY: High ad dependency
        if (m.adDependency > 0.5) {
            return {
                segment: '⚠️ AD-DEPENDENT',
                priority: 5,
                budgetMultiplier: 0.5,
                strategy: [
                    `CRITICAL: ${(m.adDependency * 100).toFixed(0)}% sales from ads`,
                    'Audit listing: Images, A+, reviews, pricing',
                    'Reduce ad spend gradually',
                    'Fix organic ranking or consider discontinuing'
                ]
            };
        }

        // UNHEALTHY: High TACoS
        if (m.tacos > 0.08) {
            return {
                segment: '💸 HIGH TACOS',
                priority: 4,
                budgetMultiplier: 0.7,
                strategy: [
                    `TACoS at ${(m.tacos * 100).toFixed(1)}% (>8% threshold)`,
                    'Run incrementality tests (pause branded keywords)',
                    'Negate waste search terms',
                    'Focus on competitor keywords only'
                ]
            };
        }

        // HEALTHY: Cash Cow
        if (m.tacos <= 0.05 && m.adDependency < 0.4) {
            return {
                segment: '🏆 CASH COW',
                priority: 2,
                budgetMultiplier: 1.2,
                strategy: [
                    `Healthy: TACoS ${(m.tacos * 100).toFixed(1)}%, Ad Dep ${(m.adDependency * 100).toFixed(0)}%`,
                    'Maintain current strategy',
                    'Defend against competitors',
                    'Efficiency optimization only'
                ]
            };
        }

        // Default: Maintain
        return {
            segment: '✅ MAINTAIN',
            priority: 2,
            budgetMultiplier: 1.0,
            strategy: ['Standard optimization', 'Monitor performance metrics']
        };
    }
}

module.exports = SmartSegmenter;
