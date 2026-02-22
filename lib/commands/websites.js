import {
    deleteWebsiteAction,
    editWebsiteAction,
    listWebsitesAction,
    searchWebsitesAction
} from './websites-actions.js';

export function registerWebsitesCommands(program) {
    const websites = program.command('website').description('Manage websites');

    websites.command('list')
        .description('List all websites')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website list
  $ mage-remote-run website list --format json
`)
        .action(listWebsitesAction);

    websites.command('search <query>')
        .description('Search websites by code or name (local filter)')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website search "Main"
`)
        .action(searchWebsitesAction);

    websites.command('delete <id>')
        .description('Delete a website by ID')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website delete 1
`)
        .action(deleteWebsiteAction);

    websites.command('edit <id>')
        .description('Edit a website')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website edit 1
`)
        .action(editWebsiteAction);
}
