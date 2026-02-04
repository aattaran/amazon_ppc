const axios = require('axios');

/**
 * Orders Fetcher
 * Gets orders from SP-API Orders endpoint
 */
class OrdersFetcher {
    constructor(accessToken, region = 'na') {
        this.accessToken = accessToken;

        const endpoints = {
            na: 'https://sellingpartnerapi-na.amazon.com',
            eu: 'https://sellingpartnerapi-eu.amazon.com',
            fe: 'https://sellingpartnerapi-fe.amazon.com'
        };

        this.baseUrl = endpoints[region];

        // Marketplace IDs
        this.marketplaceIds = {
            na: 'ATVPDKIKX0DER', // US
            eu: 'A1F83G8C2ARO7P', // UK
            fe: 'A1VC38T7YXB528'  // Japan
        };

        this.marketplaceId = this.marketplaceIds[region];
    }

    /**
     * Get orders from last 30 days (eligible for review requests)
     */
    async getEligibleOrders() {
        console.log('📦 Fetching orders from last 30 days...\n');

        // Calculate date range (5-30 days ago for review requests)
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        try {
            const response = await axios.get(`${this.baseUrl}/orders/v0/orders`, {
                headers: {
                    'x-amz-access-token': this.accessToken,
                    'x-amz-date': new Date().toISOString()
                },
                params: {
                    MarketplaceIds: this.marketplaceId,
                    CreatedAfter: thirtyDaysAgo.toISOString(),
                    CreatedBefore: fiveDaysAgo.toISOString(),
                    OrderStatuses: 'Shipped,Unshipped' // Include both to catch all completed
                }
            });

            const orders = response.data.payload?.Orders || [];

            console.log(`   Found ${orders.length} orders in eligible window\n`);

            return orders.map(order => ({
                orderId: order.AmazonOrderId,
                orderDate: order.PurchaseDate,
                status: order.OrderStatus,
                total: order.OrderTotal?.Amount || 0
            }));
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Orders API authentication failed. Token may be expired.');
            }

            console.error('❌ Failed to fetch orders:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get order details (optional - for more info)
     */
    async getOrderItems(orderId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/orders/v0/orders/${orderId}/orderItems`,
                {
                    headers: {
                        'x-amz-access-token': this.accessToken
                    }
                }
            );

            return response.data.payload?.OrderItems || [];
        } catch (error) {
            console.error(`Failed to get items for order ${orderId}`);
            return [];
        }
    }
}

module.exports = OrdersFetcher;
