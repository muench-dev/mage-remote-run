import { createClient } from '../api/factory.js';
import { printTable, handleError, getFormatHeaders, formatOutput } from '../utils.js';

export async function listModulesAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const data = await client.get('V1/modules', {}, { headers });

        if (formatOutput(options, data)) {
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
