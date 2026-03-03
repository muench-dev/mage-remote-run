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
   ```bash
   $ mage-remote-run [command] list --filter "status=pending" --filter "grand_total>100"
   $ mage-remote-run [command] list --sort "grand_total:DESC" --sort "created_at:ASC"
   ```

4. **Local Filtering (For non-SearchCriteria APIs):** Some APIs (like `V1/store/websites` or `V1/store/storeViews`) return flat JSON arrays and do not support Magento's standard `SearchCriteria` syntax. For these commands, define the options exactly as above, but apply them locally after fetching all data using `applyLocalSearchCriteria`:

   ```javascript
   import { applyLocalSearchCriteria } from '../utils.js';
   
   // ... inside your action handler:
   const data = await client.get('V1/endpoint', null, { headers });
   
   // Apply the filter, sort, and pagination locally
   let result = applyLocalSearchCriteria(data, options);
   
   // Proceed formatted output or mapping on `result` rather than `data`
   ```

5. **Testing:** In the test suite, ensure you are passing multiple filters and sorts as discrete strings in the `program.parseAsync` array format, e.g., `['--filter', 'status=pending', '--sort', 'id:DESC']` (note: Commander.js parses consecutive identifiers into an array). Tests should verify parameters are correctly appended to the API GET request params with their proper indexed keys.

6. **Format Option Definition:** Define the format option using `addFormatOption(command)` from `lib/utils.js`. Ensure this is applied to any command that retrieves and outputs data.
   ```javascript
   import { addFormatOption } from '../utils.js';

   const listCommand = myCommand.command('list')
       // ... other options
   
   addFormatOption(listCommand);
   ```

7. **Format Logic:** Use `getFormatHeaders(options)` and `formatOutput(options, data)` inside actions.
   ```javascript
   import { getFormatHeaders, formatOutput } from '../utils.js';
   
   // ... inside your action handler:
   const headers = getFormatHeaders(options);
   
   const data = await client.get('V1/endpoint', params, { headers });
   
   // This handles json and xml stdout logging and returns true if handled
   if (formatOutput(options, data)) {
       return;
   }
   
   // standard text output below...
   ```
