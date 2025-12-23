import { OpenAPIClientAxios } from 'openapi-client-axios';
import fs from 'fs';
import path from 'path';

// Locate specs relative to project root (assuming we are in lib/api)
const SPEC_DIR = path.resolve(process.cwd(), 'api-specs/2.4.8');

export function loadSpec(type) {
    let specFile;
    if (type === 'ac-saas' || type === 'saas') {
        specFile = 'swagger-saas.json';
    } else {
        // All others use PaaS/OpenSource spec
        specFile = 'swagger-paas.json';
    }

    const filePath = path.join(SPEC_DIR, specFile);
    if (!fs.existsSync(filePath)) {
        throw new Error(`OpenAPI spec not found at: ${filePath}`);
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
