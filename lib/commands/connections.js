import {
    addConnectionAction,
    clearTokenCacheAction,
    deleteConnectionAction,
    editConnectionAction,
    listConnectionsAction,
    searchConnectionsAction,
    selectConnectionAction,
    statusConnectionAction,
    statusHeaderConnectionAction,
    testConnectionsAction
} from './connections-actions.js';

export function registerConnectionCommands(program) {
    const connections = program.command('connection').description('Manage mage-remote-run connection profiles');

    connections.command('add')
        .description('Configure a new connection profile')
        .option('--name <name>', 'Profile Name')
        .option('--type <type>', 'System Type (magento-os, mage-os, ac-on-prem, ac-cloud-paas, ac-saas)')
        .option('--url <url>', 'Instance URL')
        .option('--client-id <id>', 'Client ID (SaaS)')
        .option('--client-secret <secret>', 'Client Secret (SaaS)')
        .option('--auth-method <method>', 'Auth Method (bearer, oauth1)')
        .option('--token <token>', 'Bearer Token')
        .option('--consumer-key <key>', 'Consumer Key (OAuth1)')
        .option('--consumer-secret <secret>', 'Consumer Secret (OAuth1)')
        .option('--access-token <token>', 'Access Token (OAuth1)')
        .option('--token-secret <secret>', 'Token Secret (OAuth1)')
        .option('--signature-method <method>', 'Signature Method (hmac-sha256, hmac-sha1)', 'hmac-sha256')
        .option('--active', 'Set as active profile')
        .option('--no-test', 'Skip connection test')
        .addHelpText('after', `
Examples:
  Interactive Mode:
  $ mage-remote-run connection add

  SaaS (Non-Interactive):
  $ mage-remote-run connection add --name "MySaaS" --type ac-saas --url "https://example.com" --client-id "id" --client-secret "secret" --active

  SaaS (Pre-generated Token):
  $ mage-remote-run connection add --name "MySaaS" --type ac-saas --url "https://example.com" --token "access_token_here"

  PaaS (Integration Token):
  $ mage-remote-run connection add --name "MyPaaS" --type ac-cloud-paas --url "https://paas.example.com" --token "integration_token"

  OAuth 1.0a (Non-Interactive):
  $ mage-remote-run connection add --name "MyOAuth" --type ac-on-prem --url "https://example.com" --consumer-key "ck" --consumer-secret "cs" --access-token "at" --token-secret "ts"

  Bearer Token (Non-Interactive):
  $ mage-remote-run connection add --name "MyStore" --type magento-os --url "https://magento.example.com" --token "tkn"
`)
        .action(addConnectionAction);

    connections.command('list')
        .description('List connection profiles')
        .option('--format <format>', 'Output format (table, json, csv)', 'table')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection list
  $ mage-remote-run connection list --format json
  $ mage-remote-run connection list --format csv
`)
        .action(listConnectionsAction);

    connections.command('search <query>')
        .description('Search connection profiles')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection search production
`)
        .action(searchConnectionsAction);

    connections.command('delete <name>')
        .description('Delete a connection profile')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection delete "Production"
`)
        .action(deleteConnectionAction);

    connections.command('edit [name]')
        .description('Edit a connection profile')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection edit
  $ mage-remote-run connection edit "Production"
`)
        .action(editConnectionAction);

    connections.command('test')
        .description('Test connection(s)')
        .option('--all', 'Test all configured connections')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection test
  $ mage-remote-run connection test --all
`)
        .action(testConnectionsAction);

    connections.command('status')
        .description('Show current configuration status')
        .option('--format <format>', 'Output format (text, json)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection status
  $ mage-remote-run connection status --format json
`)
        .action(statusConnectionAction);

    connections.command('select')
        .description('Select the active connection profile (aliases: change, switch)')
        .aliases(['switch', 'change'])
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection select
  $ mage-remote-run connection switch
`)
        .action(selectConnectionAction);

    connections.command('clear-token-cache')
        .description('Clear cached access tokens')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection clear-token-cache
`)
        .action(clearTokenCacheAction);

    connections.command('status-header <state>')
        .description('Enable or disable the active connection header (on|off)')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection status-header on
  $ mage-remote-run connection status-header off
`)
        .action(statusHeaderConnectionAction);
}
