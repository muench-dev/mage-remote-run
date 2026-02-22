import axios from 'axios';
import { ApiClient } from './client.js';
import { OpenAPIClientAxios } from 'openapi-client-axios';
import { loadSpec } from './spec-loader.js';
import { loadTokenCache, saveTokenCache } from '../config.js';

export class SaasClient extends ApiClient {
    constructor(config) {
        super(config);
        this.token = null;
        this.tokenExpiresAt = 0;
        this.openApi = null;
        this.axiosInstance = null;
    }

    async init() {
        if (this.openApi) return;

        const definition = loadSpec(this.config.type);
        const basePath = this.baseUrl;
        this.openApi = new OpenAPIClientAxios({
            definition,
            axiosConfigDefaults: {
                baseURL: basePath, // Base for generated client
                // Note: The definition might have servers block, but we override functionality.
            }
        });

        // We initialize the client but we will handle auth via interceptors or manual token injection
        this.axiosInstance = await this.openApi.getClient();

        // Add auth interceptor
        this.axiosInstance.interceptors.request.use(async (config) => {
            const token = await this.getToken();
            config.headers['Authorization'] = `Bearer ${token}`;
            return config;
        });
    }

    async getToken() {
        // Support static token from config
        if (this._getStaticToken()) {
            return this._getStaticToken();
        }

        if (this._getInMemoryToken()) {
            return this._getInMemoryToken();
        }

        try {
            const cacheKey = this._getCacheKey();
            const cachedToken = await this._getCachedToken(cacheKey);
            if (cachedToken) {
                return cachedToken;
            }

            const tokenData = await this._fetchNewToken();
            await this._saveTokenToCache(cacheKey, tokenData);

            return this.token;
        } catch (error) {
            throw new Error(`Failed to obtain OAuth2 token: ${error.message}`);
        }
    }

    _getStaticToken() {
        return this.config.auth.token;
    }

    _getInMemoryToken() {
        if (this.token && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }
        return null;
    }

    _getCacheKey() {
        return `${this.config.type}|${this.config.url}|${this.config.auth.clientId}`;
    }

    async _getCachedToken(cacheKey) {
        const cache = await loadTokenCache();
        const cachedEntry = cache[cacheKey];
        if (cachedEntry?.token && cachedEntry?.expiresAt && Date.now() < cachedEntry.expiresAt) {
            this.token = cachedEntry.token;
            this.tokenExpiresAt = cachedEntry.expiresAt;
            return this.token;
        }
        return null;
    }

    _isAdobeCommerceSaas() {
        return this.config.type === 'ac-saas' || this.config.type === 'saas';
    }

    async _fetchNewToken() {
        const tokenUrl = this._isAdobeCommerceSaas()
            ? 'https://ims-na1.adobelogin.com/ims/token/v3'
            : `${this.baseUrl}/oauth/token`;

        // Use raw axios for token fetch to avoid circular dependency or interceptor issues
        let response;
        if (this._isAdobeCommerceSaas()) {
            const payload = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.config.auth.clientId,
                client_secret: this.config.auth.clientSecret,
                scope: 'openid,AdobeID,email,profile,additional_info.roles,additional_info.projectedProductContext,commerce.accs'
            });
            response = await axios.post(tokenUrl, payload.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        } else {
            const payload = {
                grant_type: 'client_credentials',
                client_id: this.config.auth.clientId,
                client_secret: this.config.auth.clientSecret
            };
            response = await axios.post(tokenUrl, payload);
        }

        const token = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        const expiresAt = Date.now() + (expiresIn * 1000) - 60000;

        return { token, expiresAt };
    }

    async _saveTokenToCache(cacheKey, { token, expiresAt }) {
        this.token = token;
        this.tokenExpiresAt = expiresAt;

        const cache = await loadTokenCache();
        cache[cacheKey] = {
            token: this.token,
            expiresAt: this.tokenExpiresAt
        };
        await saveTokenCache(cache);
    }

    async request(method, endpoint, data = {}, params = {}, config = {}) {
        await this.init();

        // Use the configured axios instance for generic requests
        // Note: endpoint passed here is like 'store/websites'
        // openapi-client-axios client base is usually set to server root or we adjusted it.
        // baseURL is the instance root; include API version in the endpoint.

        // Ensure endpoint does not start with / if base has it, or handle cleanly
        const cleanEndpoint = endpoint.replace(/^\//, '');

        try {
            const response = await this.axiosInstance({
                method,
                url: cleanEndpoint,
                data,
                params,
                ...config
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                const newError = new Error(`API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
                newError.response = error.response;
                throw newError;
            }
            throw error;
        }
    }

    async get(endpoint, params, config) { return this.request('get', endpoint, undefined, params, config); }
    async post(endpoint, data, config) { return this.request('post', endpoint, data, undefined, config); }
    async put(endpoint, data, config) { return this.request('put', endpoint, data, undefined, config); }
    async delete(endpoint, config) { return this.request('delete', endpoint, undefined, undefined, config); }
}
