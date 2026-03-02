---
name: command-option-builder
description: Standardizes the implementation of generic API filtering and sorting capabilities (--filter, --sort options) across command-line interfaces for consistency and reusability.
---

# command-option-builder

Instructions for the agent to follow when this skill is activated.

## When to use

Use this skill when adding generic filtering or sorting capabilities to any `list` command (like `order list`, `product list`, etc.) that interfaces with the Magento/Adobe Commerce REST API using `SearchCriteriaBuilder`.

## Instructions

1. **Option Definition:** Define the filter and sort options in the command registration using the shared `addFilterOption` and `addSortOption` utilities from `lib/utils.js`.
   ```javascript
   import { addFilterOption, addSortOption } from '../utils.js';

   const listCommand = myCommand.command('list')
       // ... other options
   
   addFilterOption(listCommand);
   addSortOption(listCommand);

   listCommand.action(myListAction);
   ```

2. **Parsing Logic:** Use the shared `buildSearchCriteria(options)` and `buildSortCriteria(options)` utility functions from `lib/utils.js` inside the command action. Ensure that `params` objects are spread and merged safely.

   ```javascript
   import { buildSearchCriteria, buildSortCriteria } from '../utils.js';
   
   // ... inside your action handler:
   const { params: filterParams } = buildSearchCriteria(options);
   const { params: sortParams } = buildSortCriteria(options);
   
   const params = { ...filterParams, ...sortParams };
   ```

3. **Multiple Filter/Sort Examples:** Always include multi-filter and sort usage examples in the `.addHelpText('after', ...)` block to show the user how to apply more than one condition simultaneously:
   ```javascript
   $ mage-remote-run [command] list --filter "status=pending" --filter "grand_total>100"
   $ mage-remote-run [command] list --sort "grand_total:DESC" --sort "created_at:ASC"
   ```

4. **Testing:** In the test suite, ensure you are passing multiple filters and sorts as discrete strings in the `program.parseAsync` array format, e.g., `['--filter', 'status=pending', '--sort', 'id:DESC']` (note: Commander.js parses consecutive identifiers into an array). Tests should verify parameters are correctly appended to the API GET request params with their proper indexed keys.
