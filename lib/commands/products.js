import {
  listProductAttributeTypesAction,
  listProductAttributesAction,
  listProductLinkTypesAction,
  listProductMediaAction,
  listProductsAction,
  listProductTypesAction,
  showProductAction,
  showProductAttributeAction
} from './products-actions.js';

import { addFilterOption, addSortOption, addPaginationOptions, addFormatOption } from '../utils.js';

export function registerProductsCommands(program) {
  const products = program.command('product').description('Manage products');

  const listCommand = addFormatOption(addPaginationOptions(products.command('list')
    .description('List products')))
    .option('--fields <fields>', 'Comma-separated columns to display exclusively (overrides default fields)')
    .option('--add-fields <fields>', 'Comma-separated columns to add alongside default fields')
    .addHelpText('after', `
Examples:
  $ mage-remote-run product list
  $ mage-remote-run product list --page 2 --size 50
  $ mage-remote-run product list --sort-by price --sort-order DESC
  $ mage-remote-run product list --sort "price:DESC" "sku:ASC"
  $ mage-remote-run product list --filter "type_id=simple" "price>=100"
  $ mage-remote-run product list --fields "sku,name,price"
  $ mage-remote-run product list --add-fields "created_at,updated_at"
`);

  addSortOption(addFilterOption(listCommand)).action(listProductsAction);

  addFormatOption(products.command('show <sku>')
    .description('Show product details'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run product show SKU123
  $ mage-remote-run product show SKU123 --format json
`)
    .action(showProductAction);

  const media = products.command('media').description('Manage product media');

  media.command('list <sku>')
    .description('List media for a product')
    .addHelpText('after', `
Examples:
  $ mage-remote-run product media list SKU123
`)
    .action(listProductMediaAction);

  const types = products.command('type').description('Manage product types');

  types.command('list')
    .description('List available product types')
    .addHelpText('after', `
Examples:
  $ mage-remote-run product type list
`)
    .action(listProductTypesAction);

  const attributes = products.command('attribute').description('Manage product attributes');

  addPaginationOptions(attributes.command('list')
    .description('List product attributes'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run product attribute list
  $ mage-remote-run product attribute list --page 1 --size 50
`)
    .action(listProductAttributesAction);

  addFormatOption(attributes.command('show <attributeCode>')
    .description('Show product attribute details'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run product attribute show color
`)
    .action(showProductAttributeAction);

  const attributeTypes = attributes.command('type').description('Manage attribute types');

  attributeTypes.command('list')
    .description('List product attribute types')
    .addHelpText('after', `
Examples:
  $ mage-remote-run product attribute type list
`)
    .action(listProductAttributeTypesAction);

  const linkTypes = products.command('link-type').description('Manage product link types');

  addFormatOption(linkTypes.command('list')
    .description('List available product link types'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run product link-type list
  $ mage-remote-run product link-type list --format json
`)
    .action(listProductLinkTypesAction);
}
