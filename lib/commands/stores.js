import {
  deleteStoreGroupAction,
  deleteStoreViewAction,
  editStoreGroupAction,
  editStoreViewAction,
  listStoreConfigsAction,
  listStoreGroupsAction,
  listStoreViewsAction,
  searchStoreGroupsAction,
  searchStoreViewsAction
} from './stores-actions.js';
import { addFormatOption } from '../utils.js';

export function registerStoresCommands(program) {
  const stores = program.command('store').description('Manage stores');

  const groups = stores.command('group').description('Manage store groups');

  addFormatOption(groups.command('list')
    .description('List store groups'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run store group list
  $ mage-remote-run store group list --format json
`)
    .action(listStoreGroupsAction);

  groups.command('search <query>')
    .description('Search store groups')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store group search "Main"
`)
    .action(searchStoreGroupsAction);

  groups.command('delete <id>')
    .description('Delete store group')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store group delete 2
`)
    .action(deleteStoreGroupAction);

  groups.command('edit <id>')
    .description('Edit store group')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store group edit 2
`)
    .action(editStoreGroupAction);

  const views = stores.command('view').description('Manage store views');

  addFormatOption(views.command('list')
    .description('List store views'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run store view list
  $ mage-remote-run store view list --format json
`)
    .action(listStoreViewsAction);

  views.command('search <query>')
    .description('Search store views')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store view search "default"
`)
    .action(searchStoreViewsAction);

  views.command('delete <id>')
    .description('Delete store view')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store view delete 1
`)
    .action(deleteStoreViewAction);

  views.command('edit <id>')
    .description('Edit store view')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store view edit 1
`)
    .action(editStoreViewAction);

  const configs = stores.command('config').description('Manage store configurations');

  configs.command('list')
    .description('List store configurations')
    .addHelpText('after', `
Examples:
  $ mage-remote-run store config list
`)
    .action(listStoreConfigsAction);
}
