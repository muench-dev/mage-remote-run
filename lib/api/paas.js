import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { ApiClient } from './client.js';
import { OpenAPIClientAxios } from 'openapi-client-axios';
import { loadSpec } from './spec-loader.js';

export class PaasClient extends ApiClient {
    constructor(config) {
        super(config);
        this.openApi = null;
        this.axiosInstance = null;
    }

    async init() {
        if (this.openApi) return;

        const definition = loadSpec(this.config.type);
        this.openApi = new OpenAPIClientAxios({
            definition,
            axiosConfigDefaults: {
                baseURL: `${this.baseUrl}/rest/V1`
            }
        });

        this.axiosInstance = await this.openApi.getClient();

        // Add auth interceptor
        this.axiosInstance.interceptors.request.use((config) => {
            // Handle Auth
            if (this.config.auth.method === 'bearer') {
                config.headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            } else if (this.config.auth.method === 'oauth1') {
                // Calculate OAuth1 signature
                // Note: config.url here might be relative or full depending on axios usage.
                // axios instance url is typically combined.

                // We need to construct the full URL for signing.
                // config.baseURL + config.url
                const baseURL = config.baseURL || '';
                const url = baseURL.replace(/\/$/, '') + '/' + config.url.replace(/^\//, ''); // rudimentary join

                const oauth = OAuth({
                    consumer: {
                        key: this.config.auth.consumerKey,
                        secret: this.config.auth.consumerSecret
                    },
                    signature_method: 'HMAC-SHA256',
                    hash_function(base_string, key) {
                        return crypto
                            .createHmac('sha256', key)
                            .update(base_string)
                            .digest('base64');
                    }
                });

                const requestData = {
                    url,
                    method: config.method.toUpperCase(),
                    data: config.params // OAuth 1.0a signs query params
                };

                const token = {
                    key: this.config.auth.accessToken,
                    secret: this.config.auth.tokenSecret
                };

                const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
                Object.assign(config.headers, authHeader);
            }
            return config;
        });
    }

    async request(method, endpoint, data = {}, params = {}, config = {}) {
        await this.init();

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
