
import { createClient } from '../api/factory.js';
import { handleError, readInput, validateAdobeCommerce, validatePaaSOrOnPrem } from '../utils.js';
import chalk from 'chalk';
import fs from 'fs';
import { input, select, confirm, editor } from '@inquirer/prompts';
import search from '@inquirer/search';
import os from 'os';

async function getImportBehaviorAndEntity(options) {
    let entityType = options.entityType;
    if (!entityType) {
        const ENTITY_TYPES = [
            { name: 'Advanced Pricing', value: 'advanced_pricing' },
            { name: 'Products', value: 'catalog_product' },
            { name: 'Customers and Addresses (single file)', value: 'customer_composite' },
            { name: 'Customers Main File', value: 'customer' },
            { name: 'Customer Addresses', value: 'customer_address' },
            { name: 'Customer Finances', value: 'customer_finance' },
            { name: 'Stock Sources', value: 'stock_sources' },
            { name: 'Custom...', value: 'custom' }
        ];

        entityType = await search({
            message: 'Select Entity Type:',
            source: async (term) => {
                if (!term) {
                    return ENTITY_TYPES;
                }
                return ENTITY_TYPES.filter((type) =>
                    type.name.toLowerCase().includes(term.toLowerCase()) ||
                    type.value.toLowerCase().includes(term.toLowerCase())
                );
            }
        });

        if (entityType === 'custom') {
            entityType = await input({
                message: 'Enter Custom Entity Type:',
                validate: value => value ? true : 'Entity Type is required'
            });
        }
    }

    let behavior = options.behavior;
    if (!behavior) {
        behavior = await select({
            message: 'Import Behavior:',
            choices: [
                { name: 'Append/Update', value: 'append' },
                { name: 'Replace', value: 'replace' },
                { name: 'Delete', value: 'delete_entity' }
            ],
            default: 'append'
        });
    }

    return { entityType, behavior };
}

async function getValidationOptions(options) {
    let validationStrategy = options.validationStrategy;
    if (!validationStrategy) {
        validationStrategy = await select({
            message: 'Validation Strategy:',
            choices: [
                { name: 'Stop on Error', value: 'validation-stop-on-errors' },
                { name: 'Skip error entries', value: 'validation-skip-errors' }
            ],
            default: 'validation-stop-on-errors'
        });
    }

    let allowedErrorCount = options.allowedErrorCount;
    if (!allowedErrorCount) {
        allowedErrorCount = await input({
            message: 'Allowed Error Count:',
            default: '10',
            validate: (value) => {
                const num = parseInt(value, 10);
                return !isNaN(num) && num >= 0 ? true : 'Please enter a valid number';
            }
        });
    }

    return {
        validationStrategy,
        allowedErrorCount: parseInt(allowedErrorCount, 10)
    };
}

export function registerImportCommands(program, profile) {
    const importCmd = program.command('import').description('Import data');

    //-------------------------------------------------------
    // "import json" Command
    //-------------------------------------------------------
    importCmd.command('json [file]')
        .description('Import data from JSON (Adobe Commerce)')
        .option('--entity-type <type>', 'Entity Type (e.g. catalog_product, customer)')
        .option('--behavior <behavior>', 'Import Behavior (append, replace, delete_entity)')
        .option('--validation-strategy <strategy>', 'Validation Strategy (validation-stop-on-errors, validation-skip-errors)')
        .option('--allowed-error-count <count>', 'Allowed Error Count')
        .addHelpText('after', `
Examples:
  Product from file:
  $ mage-remote-run import json products.json --entity-type=catalog_product --allowed-error-count=10 --validation-strategy=validation-skip-errors
  
  From STDIN (piped):
  $ cat data.json | mage-remote-run import json
`)
        .action(async (file, options) => {
            try {
                await validateAdobeCommerce();

                let content = await readInput(file);
                if (!content) {
                    const fromFile = await confirm({
                        message: 'Do you want to import a file?',
                        default: true
                    });

                    if (fromFile) {
                        const filePath = await input({
                            message: 'Path to JSON file:',
                            validate: value => {
                                let p = value;
                                if (p.startsWith('~/') || p === '~') p = p.replace(/^~/, os.homedir());
                                return fs.existsSync(p) ? true : 'File not found';
                            }
                        });
                        content = await readInput(filePath);
                    } else {
                        content = await editor({
                            message: 'Enter JSON content',
                            postfix: '.json'
                        });
                    }
                }

                let data;
                try {
                    data = JSON.parse(content);
                } catch (e) {
                    throw new Error('Invalid JSON data');
                }

                const { entityType, behavior } = await getImportBehaviorAndEntity(options);
                const { validationStrategy, allowedErrorCount } = await getValidationOptions(options);

                const payload = {
                    source: {
                        entity: entityType,
                        behavior: behavior,
                        validation_strategy: validationStrategy,
                        allowed_error_count: allowedErrorCount,
                        items: Array.isArray(data) ? data : [data]
                    }
                };

                const client = await createClient();
                const endpoint = 'V1/import/json';

                try {
                    const result = await client.post(endpoint, payload);
                    console.log(chalk.green('Import submitted successfully.'));
                    if (result) console.log(JSON.stringify(result, null, 2));
                } catch (apiError) {
                    if (apiError.message && (apiError.message.includes('Route') || apiError.message.includes('404'))) {
                        throw new Error(`The endpoint "${endpoint}" was not found on the server.\nEnsure your Magento instance has the required Import API module installed.`);
                    }
                    throw apiError;
                }

            } catch (e) {
                if (e.name === 'ExitPromptError') return;
                handleError(e);
            }
        });

    //-------------------------------------------------------
    // "import csv" Command
    //-------------------------------------------------------
    // Only register/show if profile is allowed (PaaS or On-Prem)
    if (profile && (profile.type === 'ac-cloud-paas' || profile.type === 'ac-on-prem')) {
        importCmd.command('csv [file]')
            .description('Import data from CSV (Adobe Commerce PaaS/On-Prem)')
            .option('--entity-type <type>', 'Entity Type (e.g. catalog_product, customer)')
            .option('--behavior <behavior>', 'Import Behavior (append, replace, delete_entity)')
            .option('--validation-strategy <strategy>', 'Validation Strategy (validation-stop-on-errors, validation-skip-errors)')
            .option('--allowed-error-count <count>', 'Allowed Error Count')
            .option('--field-separator <char>', 'Field Separator', ',')
            .option('--multi-value-separator <char>', 'Multiple Value Separator', ',')
            .option('--empty-value-constant <string>', 'Empty Attribute Value Constant', '__EMPTY__VALUE__')
            .option('--images-file-dir <dir>', 'Images File Directory', 'var/import/images')
            .addHelpText('after', `
Examples:
  Interactive:
  $ mage-remote-run import csv products.csv

  Non-Interactive:
  $ mage-remote-run import csv products.csv --entity-type catalog_product --behavior append

  Custom Separators:
  $ mage-remote-run import csv products.csv --field-separator ";" --multi-value-separator "|"
`)
            .action(async (file, options) => {
                try {
                    await validatePaaSOrOnPrem();

                    let content = await readInput(file);
                    if (!content) {
                        const fromFile = await confirm({
                            message: 'Do you want to import a file?',
                            default: true
                        });

                        if (fromFile) {
                            const filePath = await input({
                                message: 'Path to CSV file:',
                                validate: value => {
                                    let p = value;
                                    if (p.startsWith('~/') || p === '~') p = p.replace(/^~/, os.homedir());
                                    return fs.existsSync(p) ? true : 'File not found';
                                }
                            });
                            content = await readInput(filePath);
                        } else {
                            content = await editor({
                                message: 'Enter CSV content',
                                postfix: '.csv'
                            });
                        }
                    }

                    console.log(chalk.blue(`Size: ${content.length} characters.`));

                    const { entityType, behavior } = await getImportBehaviorAndEntity(options);
                    const { validationStrategy, allowedErrorCount } = await getValidationOptions(options);

                    const payload = {
                        source: {
                            entity: entityType,
                            behavior: behavior,
                            csv_data: Buffer.from(content).toString('base64'),
                            import_field_separator: options.fieldSeparator,
                            import_multiple_value_separator: options.multiValueSeparator,
                            import_empty_attribute_value_constant: options.emptyValueConstant,
                            import_images_file_dir: options.imagesFileDir,
                            validation_strategy: validationStrategy,
                            allowed_error_count: allowedErrorCount
                        }
                    };

                    const client = await createClient();
                    const endpoint = 'V1/import/csv';

                    try {
                        const result = await client.post(endpoint, payload);
                        console.log(chalk.green('Import submitted successfully.'));
                        if (result) console.log(JSON.stringify(result, null, 2));
                    } catch (apiError) {
                        if (apiError.message && (apiError.message.includes('Route') || apiError.message.includes('404'))) {
                            throw new Error(`The endpoint "${endpoint}" was not found on the server.\nEnsure your Magento instance has the required Import API module installed.`);
                        }
                        throw apiError;
                    }

                } catch (e) {
                    if (e.name === 'ExitPromptError') return;
                    handleError(e);
                }
            });
    }
}
