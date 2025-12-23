export class ApiClient {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    }

    async get(endpoint, params = {}, config = {}) {
        throw new Error('Method not implemented');
    }

    async post(endpoint, data = {}, config = {}) {
        throw new Error('Method not implemented');
    }

    async put(endpoint, data = {}, config = {}) {
        throw new Error('Method not implemented');
    }

    async delete(endpoint, config = {}) {
        throw new Error('Method not implemented');
    }
}
