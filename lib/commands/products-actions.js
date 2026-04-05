import { createClient } from '../api/factory.js';
import { printTable, handleError, buildSearchCriteria, buildSortCriteria, buildPaginationCriteria, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';

function showBool(val) {
    const isTrue = val === '1' || val === 1 || val === true || val === 'true';
    return isTrue ? chalk.green('✅ Yes') : chalk.red('❌ No');
}

export async function listProductsAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const { params } = buildSearchCriteria(options);

        if (!options.sort && !options.sortBy) {
            options.sortBy = 'entity_id';
        }
        Object.assign(params, buildSortCriteria(options).params);

        const data = await client.get('V1/products', params, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        let listHeaders = [];
        let rowFieldsArray = [];

        if (options.fields) {
            rowFieldsArray = options.fields.split(',').map(f => f.trim());
            listHeaders = [...rowFieldsArray];
        } else {
            listHeaders = ['ID', 'SKU', 'Name', 'Type', 'Price'];
            rowFieldsArray = ['id', 'sku', 'name', 'type_id', 'price'];
            if (options.addFields) {
                const customFields = options.addFields.split(',').map(f => f.trim());
                rowFieldsArray.push(...customFields);
                listHeaders.push(...customFields);
            }
        }

        const resolvePath = (obj, path) => path.split('.').reduce((o, p) => (o ? o[p] : ''), obj);

        const rows = (data.items || []).map(o => {
            const row = [];
            for (const field of rowFieldsArray) {
                const val = resolvePath(o, field);
                row.push(val !== undefined && val !== null ? val : '');
            }
            return row;
        });

        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page || 1}, Size: ${options.size || 20}`));
        printTable(listHeaders, rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showProductAction(sku, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        let data;
        try {
            data = await client.get(`V1/products/${encodeURIComponent(sku)}`, {}, { headers });
        } catch {
            throw new Error(`Product '${sku}' not found.`);
        }

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        console.log(chalk.bold.blue('\n📦 Product Information'));
        console.log(chalk.gray('━'.repeat(60)));

        console.log(chalk.bold('\nℹ️  General Information'));
        console.log(`  ${chalk.bold('ID:')}             ${data.id}`);
        console.log(`  ${chalk.bold('SKU:')}            ${data.sku}`);
        console.log(`  ${chalk.bold('Name:')}           ${data.name}`);
        console.log(`  ${chalk.bold('Type:')}           ${data.type_id}`);
        console.log(`  ${chalk.bold('Set ID:')}         ${data.attribute_set_id}`);
        console.log(`  ${chalk.bold('Created At:')}     ${data.created_at}`);
        console.log(`  ${chalk.bold('Updated At:')}     ${data.updated_at}`);

        console.log(chalk.bold('\n💰 Pricing'));
        console.log(`  ${chalk.bold('Price:')}          ${data.price}`);
        const specialPrice = data.custom_attributes && data.custom_attributes.find(a => a.attribute_code === 'special_price');
        if (specialPrice) {
            console.log(`  ${chalk.bold('Special Price:')}  ${specialPrice.value}`);
        }
        if (data.tier_prices && data.tier_prices.length > 0) {
            console.log(`  ${chalk.bold('Tier Prices:')}    ${data.tier_prices.length} defined`);
        }

        if (data.extension_attributes && data.extension_attributes.stock_item) {
            const stock = data.extension_attributes.stock_item;
            console.log(chalk.bold('\n📦 Stock'));
            console.log(`  ${chalk.bold('In Stock:')}       ${stock.is_in_stock ? chalk.green('Yes') : chalk.red('No')}`);
            console.log(`  ${chalk.bold('Quantity:')}       ${stock.qty}`);
        }

        const { convert } = await import('html-to-text');
        const description = data.custom_attributes && data.custom_attributes.find(a => a.attribute_code === 'description');
        const shortDescription = data.custom_attributes && data.custom_attributes.find(a => a.attribute_code === 'short_description');

        if (description || shortDescription) {
            console.log(chalk.bold('\n📝 Content'));
            if (shortDescription) {
                console.log(chalk.bold.underline('Short Description:'));
                console.log(convert(shortDescription.value, { wordwrap: 80 }));
                console.log('');
            }
            if (description) {
                console.log(chalk.bold.underline('Description:'));
                console.log(convert(description.value, { wordwrap: 80 }));
                console.log('');
            }
        }

        if (data.custom_attributes && data.custom_attributes.length > 0) {
            const ignoredAttributes = ['description', 'short_description', 'special_price', 'category_ids', 'url_key'];
            const visibleAttributes = data.custom_attributes.filter(a => !ignoredAttributes.includes(a.attribute_code));

            if (visibleAttributes.length > 0) {
                console.log(chalk.bold('\n📋 Additional Attributes'));
                const attrRows = visibleAttributes
                    .filter(a => typeof a.value !== 'object')
                    .map(a => [a.attribute_code, a.value]);

                if (attrRows.length > 0) {
                    printTable(['Attribute', 'Value'], attrRows);
                }
            }
        }

        if (data.media_gallery_entries && data.media_gallery_entries.length > 0) {
            console.log(chalk.bold('\n🖼️  Media'));
            data.media_gallery_entries.forEach(entry => {
                console.log(`  [${entry.media_type}] ${entry.file} (${entry.label || 'No Label'})`);
            });
        }

        console.log(chalk.gray('━'.repeat(60)));
    } catch (e) {
        handleError(e);
    }
}

export async function listProductMediaAction(sku) {
    try {
        const client = await createClient();
        const data = await client.get(`V1/products/${encodeURIComponent(sku)}/media`);

        if (!data || data.length === 0) {
            console.log('No media found.');
            return;
        }

        const rows = data.map(m => [m.id, m.media_type, m.file, m.label || '', m.position, m.disabled ? 'Yes' : 'No']);
        printTable(['ID', 'Type', 'File', 'Label', 'Pos', 'Disabled'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function listProductTypesAction() {
    try {
        const client = await createClient();
        const data = await client.get('V1/products/types');
        const rows = (data || []).map(t => [t.name, t.label]);
        printTable(['Name (ID)', 'Label'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function listProductAttributesAction(options) {
    try {
        const client = await createClient();
        const params = {
            ...buildPaginationCriteria(options),
            'searchCriteria[sortOrders][0][field]': 'attribute_code',
            'searchCriteria[sortOrders][0][direction]': 'ASC'
        };
        const data = await client.get('V1/products/attributes', params);
        const rows = (data.items || []).map(a => [
            a.attribute_id,
            a.attribute_code,
            a.default_frontend_label,
            a.is_required,
            a.is_user_defined
        ]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Code', 'Label', 'Required', 'User Defined'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showProductAttributeAction(attributeCode, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        let data;
        try {
            data = await client.get(`V1/products/attributes/${attributeCode}`, {}, { headers });
        } catch {
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

        console.log(chalk.bold('\nℹ️  General Information'));
        console.log(`  ${chalk.bold('ID:')}             ${data.attribute_id}`);
        console.log(`  ${chalk.bold('Code:')}           ${data.attribute_code}`);
        console.log(`  ${chalk.bold('Default Label:')}  ${data.default_frontend_label}`);
        console.log(`  ${chalk.bold('Required:')}       ${showBool(data.is_required)}`);
        console.log(`  ${chalk.bold('User Defined:')}   ${showBool(data.is_user_defined)}`);
        console.log(`  ${chalk.bold('Unique:')}         ${showBool(data.is_unique)}`);

        console.log(chalk.bold('\n🎨 Frontend Properties'));
        console.log(`  ${chalk.bold('Input Type:')}     ${data.frontend_input}`);
        console.log(`  ${chalk.bold('Class:')}          ${data.frontend_class || '-'}`);
        console.log(`  ${chalk.bold('Visible on Front:')} ${showBool(data.is_visible_on_front)}`);
        console.log(`  ${chalk.bold('HTML Allowed:')}   ${showBool(data.is_html_allowed_on_front)}`);

        console.log(chalk.bold('\n🏪 Storefront Properties'));
        console.log(`  ${chalk.bold('Searchable:')}     ${showBool(data.is_searchable)}`);
        console.log(`  ${chalk.bold('Filterable:')}     ${showBool(data.is_filterable_in_search)}`);
        console.log(`  ${chalk.bold('Comparable:')}     ${showBool(data.is_comparable)}`);
        console.log(`  ${chalk.bold('Sort By:')}        ${showBool(data.used_for_sort_by)}`);
        console.log(`  ${chalk.bold('Promo Rules:')}    ${showBool(data.is_used_for_promo_rules)}`);

        console.log(chalk.gray('━'.repeat(60)));

        if (data.options && data.options.length > 0) {
            const visibleOptions = data.options.filter(o => o.value !== '' && o.label !== '');
            if (visibleOptions.length > 0) {
                console.log(chalk.bold('\n📋 Options'));
                const optRows = visibleOptions.map(o => [o.value, o.label]);
                printTable(['Value', 'Label'], optRows);
            }
        }
    } catch (e) {
        handleError(e);
    }
}

export async function listProductAttributeTypesAction() {
    try {
        const client = await createClient();
        const data = await client.get('V1/products/attributes/types');
        const rows = (data || []).map(t => [t.value, t.label]);
        printTable(['Value', 'Label'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function listProductLinkTypesAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const data = await client.get('V1/products/links/types', {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        const rows = (data || []).map(t => [t.code, t.name]);
        printTable(['Code', 'Name'], rows);
    } catch (e) {
        handleError(e);
    }
}
