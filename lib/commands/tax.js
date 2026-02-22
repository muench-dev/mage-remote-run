import { listTaxClassesAction, showTaxClassAction } from './tax-actions.js';

export function registerTaxCommands(program) {
    const tax = program.command('tax').description('Manage tax classes');
    const taxClass = tax.command('class').description('Manage tax classes');

    taxClass.command('list')
        .description('List tax classes')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run tax class list
  $ mage-remote-run tax class list --page 1 --size 50
`)
        .action(listTaxClassesAction);

    taxClass.command('show <id>')
        .description('Show tax class details')
        .addHelpText('after', `
Examples:
  $ mage-remote-run tax class show 3
`)
        .action(showTaxClassAction);
}
