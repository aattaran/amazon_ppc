/**
 * Amazon OAuth Service
 * Handles Login with Amazon (LWA) authentication for Amazon Ads API
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export class AmazonOAuthService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor() {
        this.clientId = process.env.AMAZON_CLIENT_ID || '';
        this.clientSecret = process.env.AMAZON_CLIENT_SECRET || '';
        this.redirectUri = process.env.AMAZON_REDIRECT_URI || '';

        if (!this.clientId || !this.clientSecret) {
            throw new Error('Amazon API credentials not configured');
        }
    }

    /**
     * Step 1: Generate OAuth authorization URL
     * User visits this URL to authorize the application
     */
    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            scope: 'advertising::campaign_management',
            response_type: 'code',
            redirect_uri: this.redirectUri,
        });

        return `https://www.amazon.com/ap/oa?${params.toString()}`;
    }

    /**
     * Step 2: Exchange authorization code for access token
     * Called after user authorizes and is redirected back with code
     */
    async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        try {
            const response = await axios.post<TokenResponse>(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    redirect_uri: this.redirectUri,
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            return response.data;
        } catch (error: any) {
            throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
        }
    }

    /**
     * Step 3: Refresh access token
     * Access tokens expire after 1 hour, refresh tokens are long-lived
     */
    async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
        try {
            const response = await axios.post<TokenResponse>(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            return response.data;
        } catch (error: any) {
            throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
        }
    }
}
