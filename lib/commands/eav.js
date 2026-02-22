import { listAttributeSetsAction, showAttributeSetAction } from './eav-actions.js';

export function registerEavCommands(program) {
    const eav = program.command('eav').description('Manage EAV attributes and sets');
    const attributeSets = eav.command('attribute-set').description('Manage attribute sets');

    attributeSets.command('list')
        .description('List all attribute sets')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run eav attribute-set list
  $ mage-remote-run eav attribute-set list --page 1 --size 50
`)
        .action(listAttributeSetsAction);

    attributeSets.command('show <id>')
        .description('Show attribute set details')
        .addHelpText('after', `
Examples:
  $ mage-remote-run eav attribute-set show 4
`)
        .action(showAttributeSetAction);
}
