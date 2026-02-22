import { importCsvAction, importJsonAction } from './import-actions.js';

export function registerImportCommands(program, profile) {
    const importCmd = program.command('import').description('Import data');

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
        .action(importJsonAction);

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
            .action(importCsvAction);
    }
}
