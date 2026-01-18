/**
 * Amazon Ads API Client
 * Wrapper for making authenticated requests to Amazon Ads API
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface AmazonAdsApiConfig {
    region: 'NA' | 'EU' | 'FE';
    accessToken: string;
    profileId?: string;
    accountId?: string;
}

export class AmazonAdsApiClient {
    private readonly baseUrls = {
        NA: 'https://advertising-api.amazon.com',
        EU: 'https://advertising-api-eu.amazon.com',
        FE: 'https://advertising-api-fe.amazon.com',
    };

    private config: AmazonAdsApiConfig;

    constructor(config: AmazonAdsApiConfig) {
        this.config = config;
    }

    /**
     * Make authenticated request to Amazon Ads API
     */
    async request<T = any>(options: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        url: string;
        headers?: Record<string, string>;
        params?: Record<string, any>;
        data?: any;
    }): Promise<AxiosResponse<T>> {
        const baseUrl = this.baseUrls[this.config.region];

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID || '',
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add profile ID header if available (required for most Sponsored Ads endpoints)
        if (this.config.profileId) {
            headers['Amazon-Advertising-API-Scope'] = this.config.profileId;
        }

        // Add account ID header if available (required for DSP and cross-product)
        if (this.config.accountId) {
            headers['Amazon-Ads-AccountId'] = this.config.accountId;
        }

        const requestConfig: AxiosRequestConfig = {
            method: options.method,
            url: `${baseUrl}${options.url}`,
            headers,
            params: options.params,
            data: options.data,
        };

        try {
            return await axios(requestConfig);
        } catch (error: any) {
            if (error.response) {
                throw new Error(
                    `Amazon Ads API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
                );
            }
            throw error;
        }
    }

    /**
     * Fetch user profiles (first step after authentication)
     */
    async getProfiles(): Promise<any[]> {
        const response = await this.request({
            method: 'GET',
            url: '/v2/profiles',
        });

        return response.data;
    }

    /**
     * Set active profile for subsequent requests
     */
    setProfile(profileId: string): void {
        this.config.profileId = profileId;
    }

    /**
     * Update access token (after refresh)
     */
    setAccessToken(accessToken: string): void {
        this.config.accessToken = accessToken;
    }
}
