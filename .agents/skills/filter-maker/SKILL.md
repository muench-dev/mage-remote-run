---
name: filter-maker
description: The filter maker helps by defining filters for commands
---

# filter-maker

Instructions for the agent to follow when this skill is activated.

## When to use

Use this skill when adding generic filtering capabilities to any `list` command (like `order list`, `product list`, etc.) that interfaces with the Magento/Adobe Commerce REST API using `SearchCriteriaBuilder`.

## Instructions

1. **Option Definition:** Define the filter option in the command registration using Commander.js. It should accept multiple filters by using the variadic argument syntax `...` and list examples of equal (`=`) and greater/less than operators.
   ```javascript
   .option('--filter <filters...>', 'Generic filters (e.g. status=pending, price>=100)')
   ```

2. **Parsing Logic:** Use the shared `buildSearchCriteria(options)` utility function from `lib/utils.js` inside the command action. This function automatically extracts the initial `params`, `addFilter`, and handles parsing multiple `--filter` inputs using regex `^([^<>=]+)(<=|>=|<|>|=)(.*)$`.

   ```javascript
   import { buildSearchCriteria } from '../utils.js';
   
   // ... inside your action handler:
   const { params } = buildSearchCriteria(options);
   ```

3. **Multiple Filter Examples:** Always include multi-filter usage examples in the `.addHelpText('after', ...)` block to show the user how to apply more than one filter simultaneously:
   ```javascript
   $ mage-remote-run [command] list --filter "status=pending" --filter "grand_total>100"
   ```

4. **Testing:** In the test suite, ensure you are passing multiple filters as discrete strings in the `program.parseAsync` array format, e.g., `['--filter', 'status=pending', '--filter', 'price>=10']` (note: Commander.js parses consecutive filters or multiple filter flags into an array). Tests should verify multiple criteria parameters are correctly appended to the API GET request params with their proper indexed keys (`searchCriteria[filter_groups][0][filters][0][field]`, etc.).
