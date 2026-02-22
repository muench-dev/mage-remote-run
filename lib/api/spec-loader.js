import { OpenAPIClientAxios } from 'openapi-client-axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Locate specs relative to project root (assuming we are in lib/api)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(__dirname, '../../api-specs/2.4.8');

// Simple in-memory cache for parsed specs
const specCache = {};

export function loadSpec(type) {
    let specFile;
    if (type === 'ac-saas' || type === 'saas') {
        specFile = 'swagger-saas.json';
    } else {
        // All others use PaaS/OpenSource spec
        specFile = 'swagger-paas.json';
    }

    if (specCache[specFile]) {
        return specCache[specFile];
    }

    const filePath = path.join(SPEC_DIR, specFile);
    if (!fs.existsSync(filePath)) {
        throw new Error(`OpenAPI spec not found at: ${filePath}`);
    }

    const spec = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    specCache[specFile] = spec;
    return spec;
}
