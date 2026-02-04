/**
 * TOKEN MANAGER - Auto-Refresh Authentication
 * 
 * Solves "Authentication Silent Expiry" architectural failure
 * 
 * Features:
 * - Tracks token expiry timestamp
 * - Auto-refreshes before expiry (5-minute buffer)
 * - Thread-safe refresh (prevents duplicate refreshes)
 * - Logging for debugging
 */

class TokenManager {
    constructor(config) {
        this.config = config;
        this.accessToken = null;
        this.expiresAt = null;
        this.isRefreshing = false;
    }

    /**
     * Get valid access token (auto-refreshes if needed)
     */
    async getToken() {
        // Check if token is still valid (at least 5 minutes remaining)
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (this.accessToken && this.expiresAt && (this.expiresAt - now > fiveMinutes)) {
            const minutesRemaining = Math.floor((this.expiresAt - now) / 60000);
            console.log(`✅ Token valid for ${minutesRemaining} more minutes`);
            return this.accessToken;
        }

        // Token expired or missing - need to refresh
        console.log('🔄 Token expired or missing - refreshing...');
        await this.refreshToken();
        return this.accessToken;
    }

    /**
     * Refresh access token from Amazon LWA
     */
    async refreshToken() {
        // Prevent concurrent refresh requests
        if (this.isRefreshing) {
            console.log('⏳ Refresh already in progress, waiting...');
            // Wait for existing refresh to complete
            while (this.isRefreshing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        try {
            this.isRefreshing = true;

            console.log('🔐 Requesting new access token from Amazon LWA...');

            const response = await fetch('https://api.amazon.com/auth/o2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.config.refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Auth failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`Auth error: ${data.error_description || data.error}`);
            }

            // Store token and calculate expiry
            this.accessToken = data.access_token;
            const expiresInMs = (data.expires_in || 3600) * 1000;
            this.expiresAt = Date.now() + expiresInMs;

            const expiryTime = new Date(this.expiresAt).toLocaleTimeString();
            console.log(`✅ Token refreshed successfully`);
            console.log(`   Expires at: ${expiryTime}`);
            console.log(`   Valid for: ${Math.floor(expiresInMs / 60000)} minutes\n`);

        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Get current token status (for debugging)
     */
    getStatus() {
        if (!this.accessToken) {
            return { valid: false, reason: 'No token' };
        }

        if (!this.expiresAt) {
            return { valid: false, reason: 'No expiry time' };
        }

        const now = Date.now();
        const minutesRemaining = Math.floor((this.expiresAt - now) / 60000);

        if (this.expiresAt <= now) {
            return { valid: false, reason: 'Expired', minutesAgo: -minutesRemaining };
        }

        return {
            valid: true,
            minutesRemaining,
            expiresAt: new Date(this.expiresAt).toLocaleTimeString()
        };
    }
}

module.exports = TokenManager;
