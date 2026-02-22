import {
    checkEventsConfigurationAction,
    createEventProviderAction,
    deleteEventProviderAction,
    listEventProvidersAction,
    showEventProviderAction,
    supportedEventsAction
} from './events-actions.js';

export function registerEventsCommands(program) {
    const events = program.command('event').description('Manage Adobe I/O Events');

    events.command('check-configuration')
        .description('Check Adobe I/O Event configuration')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run event check-configuration
  $ mage-remote-run event check-configuration --format json
`)
        .action(checkEventsConfigurationAction);

    const provider = events.command('provider').description('Manage event providers');

    provider.command('list')
        .description('List event providers')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run event provider list
`)
        .action(listEventProvidersAction);

    provider.command('show <id>')
        .description('Show event provider details')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(showEventProviderAction);

    provider.command('create')
        .description('Create a new event provider')
        .action(createEventProviderAction);

    provider.command('delete <id>')
        .description('Delete an event provider')
        .action(deleteEventProviderAction);

    events.command('supported-list')
        .description('List supported events')
        .option('-f, --format <type>', 'Output format (text, json)', 'text')
        .action(supportedEventsAction);
}
