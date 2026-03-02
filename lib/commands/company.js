import {
    listCompaniesAction,
    showCompanyAction,
    createCompanyAction,
    updateCompanyAction,
    deleteCompanyAction,
    structureCompanyAction,
    listRolesAction,
    showRoleAction,
    showCreditAction,
    historyCreditAction,
    increaseCreditAction,
    decreaseCreditAction
} from './company-actions.js';

import {
    addPaginationOptions,
    addFormatOption,
    addFilterOption,
    addSortOption
} from '../utils.js';

export function registerCompanyCommands(program) {
    const company = program.command('company').description('Manage companies');

    //-------------------------------------------------------
    // "company list" Command
    //-------------------------------------------------------
    addFormatOption(addSortOption(addFilterOption(addPaginationOptions(company.command('list')
        .description('List companies')))))
        .addHelpText('after', `
Examples:
  $ mage-remote-run company list
  $ mage-remote-run company list --page 2 --size 50
  $ mage-remote-run company list --format json
  $ mage-remote-run company list --filter "status=1"
  $ mage-remote-run company list --sort "company_name:ASC"
`)
        .action(listCompaniesAction);

    //-------------------------------------------------------
    // "company show" Command
    //-------------------------------------------------------
    addFormatOption(company.command('show <companyId>')
        .description('Show company details'))
        .addHelpText('after', `
Examples:
  $ mage-remote-run company show 123
  $ mage-remote-run company show 123 --format json
`)
        .action(showCompanyAction);

    //-------------------------------------------------------
    // "company create" Command
    //-------------------------------------------------------
    company.command('create')
        .description('Create a new company')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company create
`)
        .action(createCompanyAction);

    //-------------------------------------------------------
    // "company update" Command
    //-------------------------------------------------------
    company.command('update <companyId>')
        .description('Update company details')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company update 123
`)
        .action(updateCompanyAction);

    //-------------------------------------------------------
    // "company delete" Command
    //-------------------------------------------------------
    company.command('delete <companyId>')
        .description('Delete a company')
        .option('--force', 'Force delete without confirmation')
        .action(deleteCompanyAction);

    //-------------------------------------------------------
    // "company structure" Command
    //-------------------------------------------------------
    company.command('structure <companyId>')
        .description('Show company structure (hierarchy)')
        .action(structureCompanyAction);

    registerRoleCommands(company);
    registerCreditCommands(company);
}

function registerRoleCommands(company) {
    //-------------------------------------------------------
    // "company role" Group
    //-------------------------------------------------------
    const role = company.command('role').description('Manage company roles');

    addSortOption(addFilterOption(addPaginationOptions(role.command('list')
        .description('List roles'))))
        .addHelpText('after', `
Examples:
  $ mage-remote-run company role list
  $ mage-remote-run company role list --filter "role_name=%Admin%"
  $ mage-remote-run company role list --sort "role_name:ASC"
`)
        .action(listRolesAction);

    role.command('show <roleId>')
        .description('Show role details')
        .action(showRoleAction);
}

function registerCreditCommands(company) {
    //-------------------------------------------------------
    // "company credit" Group
    //-------------------------------------------------------
    const credit = company.command('credit').description('Manage company credits');

    credit.command('show <companyId>')
        .description('Show credit for company')
        .action(showCreditAction);

    addSortOption(addFilterOption(addPaginationOptions(credit.command('history <companyId>')
        .description('Show credit history'))))
        .addHelpText('after', `
Examples:
  $ mage-remote-run company credit history 123
  $ mage-remote-run company credit history 123 --filter "type=1"
  $ mage-remote-run company credit history 123 --sort "datetime:DESC"
`)
        .action(historyCreditAction);

    credit.command('increase [creditId] [amount]')
        .description('Increase balance')
        .option('--currency <code >', 'Currency code')
        .option('--type <number>', 'Operation Type (1=Allocate, 2=Reimburse, 4=Refund, 5=Revert)')
        .option('--comment <text>', 'Comment', 'Manual increase')
        .option('--po <number>', 'PO Number', '')
        .action(increaseCreditAction);

    credit.command('decrease [creditId] [amount]')
        .description('Decrease balance')
        .option('--currency <code>', 'Currency code')
        .option('--type <number>', 'Operation Type (3=Purchase)')
        .option('--comment <text>', 'Comment', 'Manual decrease')
        .option('--po <number>', 'PO Number', '')
        .action(decreaseCreditAction);
}
