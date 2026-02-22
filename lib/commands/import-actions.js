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
            { name: '🏷️  Advanced Pricing', value: 'advanced_pricing' },
            { name: '📦  Products', value: 'catalog_product' },
            { name: '👥  Customers and Addresses (single file)', value: 'customer_composite' },
            { name: '👤  Customers Main File', value: 'customer' },
            { name: '📍  Customer Addresses', value: 'customer_address' },
            { name: '💰  Customer Finances', value: 'customer_finance' },
            { name: '🏭  Stock Sources', value: 'stock_sources' },
            { name: '✏️  Custom...', value: 'custom' }
        ];

        entityType = await search({
            message: 'Select Entity Type:',
            source: async term => {
                if (!term) return ENTITY_TYPES;
                return ENTITY_TYPES.filter(type =>
                    type.name.toLowerCase().includes(term.toLowerCase())
                    || type.value.toLowerCase().includes(term.toLowerCase())
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
                { name: '➕  Append/Update', value: 'append' },
                { name: '🔄  Replace', value: 'replace' },
                { name: '❌  Delete', value: 'delete_entity' }
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
            validate: value => {
                const num = parseInt(value, 10);
                return !Number.isNaN(num) && num >= 0 ? true : 'Please enter a valid number';
            }
        });
    }

    return {
        validationStrategy,
        allowedErrorCount: parseInt(allowedErrorCount, 10)
    };
}

async function readOrPromptContent(file, type) {
    let content = await readInput(file);
    if (content) return content;

    const fromFile = await confirm({
        message: 'Do you want to import a file?',
        default: true
    });

    if (fromFile) {
        const filePath = await input({
            message: `Path to ${type.toUpperCase()} file:`,
            validate: value => {
                let p = value;
                if (p.startsWith('~/') || p === '~') p = p.replace(/^~/, os.homedir());
                return fs.existsSync(p) ? true : 'File not found';
            }
        });
        return readInput(filePath);
    }

    return editor({
        message: `Enter ${type.toUpperCase()} content`,
        postfix: `.${type}`
    });
}

export async function importJsonAction(file, options) {
    try {
        await validateAdobeCommerce();

        const content = await readOrPromptContent(file, 'json');

        let data;
        try {
            data = JSON.parse(content);
        } catch {
            throw new Error('Invalid JSON data');
        }

        const { entityType, behavior } = await getImportBehaviorAndEntity(options);
        const { validationStrategy, allowedErrorCount } = await getValidationOptions(options);

        const payload = {
            source: {
                entity: entityType,
                behavior,
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
}

export async function importCsvAction(file, options) {
    try {
        await validatePaaSOrOnPrem();
        const content = await readOrPromptContent(file, 'csv');

        console.log(chalk.blue(`Size: ${content.length} characters.`));

        const { entityType, behavior } = await getImportBehaviorAndEntity(options);
        const { validationStrategy, allowedErrorCount } = await getValidationOptions(options);

        const payload = {
            source: {
                entity: entityType,
                behavior,
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
}
