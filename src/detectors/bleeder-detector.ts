/**
 * Bleeder Detector Service
 * Identifies underperforming campaigns based on multiple performance factors
 */

export interface CampaignMetrics {
    campaignId: string;
    campaignName: string;
    spend: number;
    sales: number;
    acos: number;
    roas: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpc: number;
    daysActive: number;
}

export type BleederSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'HEALTHY';

export interface Recommendation {
    priority: number;
    action: 'PAUSE' | 'REDUCE_BIDS' | 'ADD_NEGATIVES' | 'AUDIT_LISTING' | 'INCREASE_BUDGET';
    reason: string;
    details?: string;
    impact?: string;
}

export interface BleederScore {
    score: number; // 0-100
    severity: BleederSeverity;
    issues: string[];
    recommendations: Recommendation[];
    estimatedMonthlyCost?: number;
    estimatedMonthlySavings?: number;
}

export class BleederDetector {
    private readonly thresholds = {
        criticalAcos: parseFloat(process.env.CRITICAL_ACOS_THRESHOLD || '100'),
        warningAcos: parseFloat(process.env.WARNING_ACOS_THRESHOLD || '50'),
        minRoas: parseFloat(process.env.MIN_ROAS_THRESHOLD || '1.0'),
    };

    /**
     * Analyze campaign and calculate bleeder score
     */
    analyzeCampaign(metrics: CampaignMetrics): BleederScore {
        let score = 0;
        const issues: string[] = [];

        // Factor 1: ACOS Critical (50 points max)
        if (metrics.acos > 150) {
            score += 50;
            issues.push(`ACOS critically high: ${metrics.acos.toFixed(2)}%`);
        } else if (metrics.acos > this.thresholds.criticalAcos) {
            score += 40;
            issues.push(`ACOS above 100%: ${metrics.acos.toFixed(2)}%`);
        } else if (metrics.acos > this.thresholds.warningAcos) {
            score += 25;
            issues.push(`ACOS elevated: ${metrics.acos.toFixed(2)}%`);
        }

        // Factor 2: Zero/Low Conversions with Significant Spend (30 points max)
        if (metrics.conversions === 0 && metrics.spend > 50) {
            score += 30;
            issues.push(`$${metrics.spend.toFixed(2)} spent with zero conversions`);
        } else if (metrics.conversions === 0 && metrics.spend > 20) {
            score += 20;
            issues.push(`$${metrics.spend.toFixed(2)} spent with zero conversions`);
        } else if (metrics.conversions < 2 && metrics.spend > 100) {
            score += 15;
            issues.push(`Only ${metrics.conversions} conversion(s) with $${metrics.spend.toFixed(2)} spend`);
        }

        // Factor 3: Poor ROAS (20 points max)
        if (metrics.roas < 0.5) {
            score += 20;
            issues.push(`ROAS critically low: ${metrics.roas.toFixed(2)}`);
        } else if (metrics.roas < this.thresholds.minRoas) {
            score += 15;
            issues.push(`ROAS below break-even: ${metrics.roas.toFixed(2)}`);
        } else if (metrics.roas < 2.0) {
            score += 10;
            issues.push(`ROAS below target: ${metrics.roas.toFixed(2)}`);
        }

        // Factor 4: High CPC with Poor Results (15 points max)
        if (metrics.cpc > 3.0 && metrics.conversions === 0) {
            score += 15;
            issues.push(`Very high CPC ($${metrics.cpc.toFixed(2)}) with no conversions`);
        } else if (metrics.cpc > 2.0 && metrics.cvr < 1.0) {
            score += 10;
            issues.push(`High CPC ($${metrics.cpc.toFixed(2)}) with poor conversion rate`);
        }

        // Factor 5: Poor CTR (indicates relevance issues) (10 points max)
        if (metrics.ctr < 0.1 && metrics.impressions > 1000) {
            score += 10;
            issues.push(`Very low CTR (${metrics.ctr.toFixed(2)}%) suggests poor relevance`);
        }

        // Classify severity
        const severity = this.classifySeverity(score);
        const recommendations = this.generateRecommendations(metrics, severity);

        return {
            score,
            severity,
            issues,
            recommendations,
            estimatedMonthlyCost: this.estimateMonthlyCost(metrics),
            estimatedMonthlySavings: severity !== 'HEALTHY' ? this.estimateSavings(metrics, severity) : 0,
        };
    }

    /**
     * Classify severity based on score
     */
    private classifySeverity(score: number): BleederSeverity {
        if (score >= 70) return 'CRITICAL'; // Pause immediately
        if (score >= 40) return 'HIGH'; // Optimize urgently
        if (score >= 20) return 'MEDIUM'; // Monitor closely
        return 'HEALTHY';
    }

    /**
     * Generate actionable recommendations
     */
    private generateRecommendations(metrics: CampaignMetrics, severity: BleederSeverity): Recommendation[] {
        const recommendations: Recommendation[] = [];

        if (severity === 'CRITICAL') {
            recommendations.push({
                priority: 1,
                action: 'PAUSE',
                reason: 'Prevent further losses',
                impact: `Save ~$${this.estimateSavings(metrics, severity).toFixed(2)}/month`,
            });
        }

        if (metrics.conversions === 0 && metrics.clicks > 20) {
            recommendations.push({
                priority: 2,
                action: 'AUDIT_LISTING',
                reason: 'Traffic not converting - likely product listing issues',
                details: 'Review title, images, A+ content, price, and reviews',
            });
        }

        if (metrics.cpc > 2.0 || (metrics.acos > 50 && metrics.acos < 150)) {
            const reductionPct = severity === 'CRITICAL' ? 50 : 30;
            const newBid = metrics.cpc * (1 - reductionPct / 100);
            recommendations.push({
                priority: 3,
                action: 'REDUCE_BIDS',
                reason: severity === 'CRITICAL' ? 'CPC too high for zero/low conversions' : 'ACOS above target',
                details: `Lower bids by ${reductionPct}% ($${metrics.cpc.toFixed(2)} → $${newBid.toFixed(2)})`,
            });
        }

        if (metrics.spend > 30) {
            recommendations.push({
                priority: 4,
                action: 'ADD_NEGATIVES',
                reason: 'Reduce wasted spend on irrelevant searches',
                details: 'Download search term report and add negative keywords',
            });
        }

        return recommendations.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Estimate monthly cost at current rate
     */
    private estimateMonthlyCost(metrics: CampaignMetrics): number {
        if (metrics.daysActive === 0) return 0;
        const dailySpend = metrics.spend / Math.max(metrics.daysActive, 1);
        return dailySpend * 30;
    }

    /**
     * Estimate monthly savings from pausing/optimizing
     */
    private estimateSavings(metrics: CampaignMetrics, severity: BleederSeverity): number {
        const monthlyCost = this.estimateMonthlyCost(metrics);

        if (severity === 'CRITICAL') {
            // Assume pause saves 100% of spend since ROAS < 1
            return monthlyCost * (1 - metrics.roas);
        } else if (severity === 'HIGH') {
            // Assume optimization saves 40-50% of wasted spend
            return monthlyCost * 0.45 * (1 - (metrics.roas / 2));
        } else {
            // Assume optimization saves 20-30%
            return monthlyCost * 0.25 * (1 - (metrics.roas / 2));
        }
    }

    /**
     * Batch analyze multiple campaigns
     */
    analyzeCampaigns(campaigns: CampaignMetrics[]): Map<BleederSeverity, CampaignMetrics[]> {
        const categorized = new Map<BleederSeverity, CampaignMetrics[]>([
            ['CRITICAL', []],
            ['HIGH', []],
            ['MEDIUM', []],
            ['HEALTHY', []],
        ]);

        for (const campaign of campaigns) {
            const analysis = this.analyzeCampaign(campaign);
            categorized.get(analysis.severity)?.push(campaign);
        }

        return categorized;
    }
}
