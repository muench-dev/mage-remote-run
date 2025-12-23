import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerProductsCommands(program) {
    const products = program.command('product').description('Manage products');

    products.command('types')
        .description('List available product types')
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('products/types');
                const rows = (data || []).map(t => [t.name, t.label]);
                printTable(['Name (ID)', 'Label'], rows);
            } catch (e) { handleError(e); }
        });

    const attributes = products.command('attribute').description('Manage product attributes');

    attributes.command('list')
        .description('List product attributes')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size,
                    'searchCriteria[sortOrders][0][field]': 'attribute_code',
                    'searchCriteria[sortOrders][0][direction]': 'ASC'
                };
                const data = await client.get('products/attributes', params);
                const rows = (data.items || []).map(a => [
                    a.attribute_id,
                    a.attribute_code,
                    a.default_frontend_label,
                    a.is_required,
                    a.is_user_defined
                ]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Code', 'Label', 'Required', 'User Defined'], rows);
            } catch (e) { handleError(e); }
        });

    attributes.command('show <attributeCode>')
        .description('Show product attribute details')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (attributeCode, options) => {
            try {
                const client = await createClient();
                let headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                let data;
                try {
                    data = await client.get(`products/attributes/${attributeCode}`, {}, { headers });
                } catch (e) {
                    throw new Error(`Attribute '${attributeCode}' not found.`);
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                console.log(chalk.bold.blue('\n📦 Attribute Information'));
                console.log(chalk.gray('━'.repeat(60)));

                // Helper for boolean display
                const showBool = (val) => {
                    const isTrue = val === '1' || val === 1 || val === true || val === 'true';
                    return isTrue ? chalk.green('✅ Yes') : chalk.red('❌ No');
                };

                // General
                console.log(chalk.bold('\nℹ️  General Information'));
                console.log(`  ${chalk.bold('ID:')}             ${data.attribute_id}`);
                console.log(`  ${chalk.bold('Code:')}           ${data.attribute_code}`);
                console.log(`  ${chalk.bold('Default Label:')}  ${data.default_frontend_label}`);
                console.log(`  ${chalk.bold('Required:')}       ${showBool(data.is_required)}`);
                console.log(`  ${chalk.bold('User Defined:')}   ${showBool(data.is_user_defined)}`);
                console.log(`  ${chalk.bold('Unique:')}         ${showBool(data.is_unique)}`);

                // Frontend Properties
                console.log(chalk.bold('\n🎨 Frontend Properties'));
                console.log(`  ${chalk.bold('Input Type:')}     ${data.frontend_input}`);
                console.log(`  ${chalk.bold('Class:')}          ${data.frontend_class || '-'}`);
                console.log(`  ${chalk.bold('Visible on Front:')} ${showBool(data.is_visible_on_front)}`);
                console.log(`  ${chalk.bold('HTML Allowed:')}   ${showBool(data.is_html_allowed_on_front)}`);

                // Storefront Properties
                console.log(chalk.bold('\n🏪 Storefront Properties'));
                console.log(`  ${chalk.bold('Searchable:')}     ${showBool(data.is_searchable)}`);
                console.log(`  ${chalk.bold('Filterable:')}     ${showBool(data.is_filterable_in_search)}`);
                console.log(`  ${chalk.bold('Comparable:')}     ${showBool(data.is_comparable)}`);
                console.log(`  ${chalk.bold('Sort By:')}        ${showBool(data.used_for_sort_by)}`);
                console.log(`  ${chalk.bold('Promo Rules:')}    ${showBool(data.is_used_for_promo_rules)}`);

                console.log(chalk.gray('━'.repeat(60)));

                if (data.options && data.options.length > 0) {
                    // Filter out empty options if needed, but showing all is safer
                    // Often option value '' is a placeholder
                    const visibleOptions = data.options.filter(o => o.value !== '' && o.label !== '');
                    if (visibleOptions.length > 0) {
                        console.log(chalk.bold('\n📋 Options'));
                        const optRows = visibleOptions.map(o => [o.value, o.label]);
                        printTable(['Value', 'Label'], optRows);
                    }
                }

            } catch (e) { handleError(e); }
        });

    const attributeTypes = attributes.command('type').description('Manage attribute types');
    attributeTypes.command('list')
        .description('List product attribute types')
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('products/attributes/types');
                const rows = (data || []).map(t => [t.value, t.label]);
                printTable(['Value', 'Label'], rows);
            } catch (e) { handleError(e); }
        });
}
