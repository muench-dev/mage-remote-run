
import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';

export function registerModulesCommands(program) {
    const modules = program.command('module').description('Manage modules');

    //-------------------------------------------------------
    // "module list" Command
    //-------------------------------------------------------
    modules.command('list')
        .description('List all modules')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run module list
  $ mage-remote-run module list --format json
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                // The API endpoint seems to be just a list of strings usually for /V1/modules?
                // Actually standard Magento API GET /V1/modules returns string[].

                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                let data;
                try {
                    data = await client.get('V1/modules', {}, { headers });
                } catch (apiError) {
                    // Sometimes client.get throws if non-200, which is good.
                    throw apiError;
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    // If the response was already XML string because of Accept header, data might be the string.
                    // But client.get usually parses JSON by default. If Accept is XML, axios might return string.
                    // Let's assume data is what we got.
                    console.log(data);
                    return;
                }

                // Default text format
                // data is expected to be an array of module names strings ["Magento_Store", ...]
                // Map to rows for table
                if (Array.isArray(data)) {
                    const rows = data.map(m => [m]);
                    printTable(['Module'], rows);
                } else {
                    // Fallback if structure is different
                    console.log(data);
                }

            } catch (e) { handleError(e); }
        });
}
