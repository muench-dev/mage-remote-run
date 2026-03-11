import {
    checkEventsConfigurationAction,
    createEventProviderAction,
    deleteEventProviderAction,
    listEventProvidersAction,
    showEventProviderAction,
    supportedEventsAction
} from './events-actions.js';

import { addFormatOption } from '../utils.js';

export function registerEventsCommands(program) {
    const events = program.command('event').description('Manage Adobe I/O Events');

    addFormatOption(events.command('check-configuration')
        .description('Check Adobe I/O Event configuration'))
        .addHelpText('after', `
Examples:
  $ mage-remote-run event check-configuration
  $ mage-remote-run event check-configuration --format json
`)
        .action(checkEventsConfigurationAction);

    const provider = events.command('provider').description('Manage event providers');

    addFormatOption(provider.command('list')
        .description('List event providers'))
        .addHelpText('after', `
Examples:
  $ mage-remote-run event provider list
`)
        .action(listEventProvidersAction);

    addFormatOption(provider.command('show <id>')
        .description('Show event provider details'))
        .action(showEventProviderAction);

    provider.command('create')
        .description('Create a new event provider')
        .action(createEventProviderAction);

    provider.command('delete <id>')
        .description('Delete an event provider')
        .action(deleteEventProviderAction);

    addFormatOption(events.command('supported-list')
        .description('List supported events'))
        .action(supportedEventsAction);
}
