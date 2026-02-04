const axios = require('axios');
const crypto = require('crypto');

/**
 * Amazon Review Request Service
 * Uses SP-API Solicitations API to send automated review requests
 */
class ReviewRequestService {
    constructor() {
        this.refreshToken = process.env.SP_API_REFRESH_TOKEN;
        this.clientId = process.env.SP_API_CLIENT_ID;
        this.clientSecret = process.env.SP_API_CLIENT_SECRET;
        this.region = process.env.SP_API_REGION || 'na';

        // Regional endpoints
        const endpoints = {
            na: 'https://sellingpartnerapi-na.amazon.com',
            eu: 'https://sellingpartnerapi-eu.amazon.com',
            fe: 'https://sellingpartnerapi-fe.amazon.com'
        };

        this.baseUrl = endpoints[this.region];
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get access token from refresh token
     */
    async getAccessToken() {
        // Check if current token is still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        console.log('🔐 Getting new access token...');

        try {
            const response = await axios.post('https://api.amazon.com/auth/o2/token', {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            // Token expires in 1 hour, refresh 5 min before
            this.tokenExpiry = Date.now() + (55 * 60 * 1000);

            console.log('✅ Access token obtained\n');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Failed to get access token:', error.response?.data || error.message);
            throw new Error('Authentication failed. Check your SP-API credentials.');
        }
    }

    /**
     * Check if order is eligible for review request
     */
    async checkEligibility(orderId) {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/solicitations/v1/orders/${orderId}`,
                {
                    headers: {
                        'x-amz-access-token': this.accessToken,
                        'x-amz-date': new Date().toISOString()
                    }
                }
            );

            // Check if productReviewAndSellerFeedback action exists
            const actions = response.data._links?.actions || [];
            const eligible = actions.some(a =>
                a.name === 'productReviewAndSellerFeedbackSolicitation'
            );

            return {
                eligible: eligible,
                orderId: orderId
            };
        } catch (error) {
            // 404 = not eligible (too early, too late, or already sent)
            if (error.response?.status === 404) {
                return {
                    eligible: false,
                    orderId: orderId,
                    reason: 'Outside 5-30 day window or already sent'
                };
            }

            // Token expired, retry once
            if (error.response?.status === 401) {
                this.accessToken = null;
                await this.getAccessToken();
                return this.checkEligibility(orderId);
            }

            throw error;
        }
    }

    /**
     * Send review request for an order
     */
    async sendReviewRequest(orderId) {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/solicitations/v1/orders/${orderId}/solicitations/productReviewAndSellerFeedback`,
                {}, // Empty body
                {
                    headers: {
                        'x-amz-access-token': this.accessToken,
                        'x-amz-date': new Date().toISOString(),
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                orderId: orderId,
                message: 'Review request sent successfully'
            };
        } catch (error) {
            if (error.response?.status === 400) {
                return {
                    success: false,
                    orderId: orderId,
                    error: 'Already requested review for this order'
                };
            }

            // Token expired, retry once
            if (error.response?.status === 401) {
                this.accessToken = null;
                await this.getAccessToken();
                return this.sendReviewRequest(orderId);
            }

            throw error;
        }
    }

    /**
     * Process review requests for eligible orders
     */
    async processOrders(orders) {
        console.log(`\n📧 Processing ${orders.length} orders for review requests\n`);

        const results = {
            sent: [],
            alreadySent: [],
            notEligible: [],
            errors: []
        };

        for (const order of orders) {
            try {
                // Check eligibility
                const eligibility = await this.checkEligibility(order.orderId);

                if (!eligibility.eligible) {
                    results.notEligible.push({
                        orderId: order.orderId,
                        reason: eligibility.reason
                    });
                    console.log(`⏭️  ${order.orderId} - Not eligible`);
                    continue;
                }

                // Send request
                const result = await this.sendReviewRequest(order.orderId);

                if (result.success) {
                    results.sent.push(order.orderId);
                    console.log(`✅ ${order.orderId} - Review request sent`);
                } else {
                    results.alreadySent.push(order.orderId);
                    console.log(`ℹ️  ${order.orderId} - Already sent`);
                }

                // Rate limiting: 500ms between requests
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                results.errors.push({
                    orderId: order.orderId,
                    error: error.message
                });
                console.error(`❌ ${order.orderId} - Error: ${error.message}`);
            }
        }

        // Print summary
        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('REVIEW REQUEST SUMMARY:');
        console.log('════════════════════════════════════════════════════════════════\n');
        console.log(`✅ Sent: ${results.sent.length}`);
        console.log(`ℹ️  Already Sent: ${results.alreadySent.length}`);
        console.log(`⏭️  Not Eligible: ${results.notEligible.length}`);
        console.log(`❌ Errors: ${results.errors.length}\n`);

        return results;
    }
}

module.exports = ReviewRequestService;
