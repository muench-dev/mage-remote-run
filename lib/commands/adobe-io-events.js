import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerAdobeIoEventsCommands(program) {
    const adobeIoEvents = program.command('adobe-io-event').description('Manage Adobe I/O Events');

    adobeIoEvents.command('check-configuration')
        .description('Check Adobe I/O Event configuration')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run adobe-io-event check-configuration
  $ mage-remote-run adobe-io-event check-configuration --format json
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                // The endpoint is likely returning a simple boolean/string or a small object.
                // Based on standard Magento APIs, let's assume it returns a boolean or object.
                // We'll inspect the data structure.
                const data = await client.get('V1/adobe_io_events/check_configuration', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                console.log(chalk.bold.blue('\n🔍 Configuration Check Result'));
                console.log(chalk.gray('━'.repeat(60)));

                if (typeof data === 'object' && data !== null) {
                    if (Array.isArray(data)) {
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        Object.entries(data).forEach(([key, value]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            let displayValue = value;
                            if (typeof value === 'boolean') {
                                displayValue = value ? chalk.green('Yes') : chalk.red('No');
                            } else if (value === null) {
                                displayValue = chalk.gray('null');
                            } else if (typeof value === 'object') {
                                displayValue = JSON.stringify(value);
                            }

                            console.log(`  ${chalk.bold(label + ':').padEnd(35)} ${displayValue}`);
                        });
                    }
                } else {
                    console.log(`  ${data}`);
                }
                console.log('');

            } catch (e) { handleError(e); }
        });
}
