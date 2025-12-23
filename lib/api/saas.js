import axios from 'axios';
import { ApiClient } from './client.js';
import { OpenAPIClientAxios } from 'openapi-client-axios';
import { loadSpec } from './spec-loader.js';

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
        this.openApi = new OpenAPIClientAxios({
            definition,
            axiosConfigDefaults: {
                baseURL: `${this.baseUrl}/rest/V1`, // Base for generated client
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
        if (this.token && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }

        const tokenUrl = `${this.baseUrl}/oauth/token`;

        try {
            // Use raw axios for token fetch to avoid circular dependency or interceptor issues
            const response = await axios.post(tokenUrl, {
                grant_type: 'client_credentials',
                client_id: this.config.auth.clientId,
                client_secret: this.config.auth.clientSecret
            });

            this.token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;
            this.tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;

            return this.token;
        } catch (error) {
            throw new Error(`Failed to obtain OAuth2 token: ${error.message}`);
        }
    }

    async request(method, endpoint, data = {}, params = {}, config = {}) {
        await this.init();

        // Use the configured axios instance for generic requests
        // Note: endpoint passed here is like 'store/websites'
        // openapi-client-axios client base is usually set to server root or we adjusted it.
        // If we set baseURL to /rest/V1, we just need the relative path.

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
