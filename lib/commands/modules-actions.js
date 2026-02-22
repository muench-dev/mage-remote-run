import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';

export async function listModulesAction(options) {
    try {
        const client = await createClient();
        const headers = {};

        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const data = await client.get('V1/modules', {}, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        if (Array.isArray(data)) {
            const rows = data.map(m => [m]);
            printTable(['Module'], rows);
        } else {
            console.log(data);
        }
    } catch (e) {
        handleError(e);
    }
}
