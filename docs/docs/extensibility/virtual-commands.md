---
title: Virtual Commands
sidebar_position: 4
---

# Virtual Commands

Virtual commands let you define reusable REST requests through configuration instead of writing JavaScript. They behave like built-in commands, including generated help output, option parsing, and standard output formatting.

You can define them directly in the CLI configuration or ship them from a plugin.

## Define Virtual Commands in `config.json`

Add entries to the `commands` array in your `config.json`:

```json
{
  "$schema": "https://mage-remote-run.muench.dev/config.schema.json",
  "commands": [
    {
      "name": "product get",
      "method": "GET",
      "endpoint": "/:store/V1/products/:sku",
      "description": "Fetch a specific product's data via its SKU",
      "options": {
        "store": {
          "type": "string",
          "required": false,
          "description": "Store view code, e.g. 'default'",
          "default": "all"
        },
        "sku": {
          "type": "string",
          "required": true,
          "description": "Product SKU"
        }
      },
      "connection_types": [
        "ac-cloud-paas",
        "magento-os",
        "mage-os",
        "ac-on-prem"
      ]
    },
    {
      "name": "product list-enabled",
      "method": "GET",
      "endpoint": "/:store/V1/products",
      "description": "List only enabled products",
      "filters": [
        "status=1",
        "visibility:in=2,3,4"
      ],
      "options": {
        "store": {
          "type": "string",
          "default": "all"
        }
      }
    }
  ]
}
```

Using spaces in `name` creates nested commands. For example, `product get` becomes `mage-remote-run product get`.

## Define Namespace Descriptions

You can create a parent command group without an executable endpoint by providing only descriptive metadata:

```json
{
  "name": "example",
  "description": "Custom namespace for all my example commands",
  "summary": "Holds custom virtual examples"
}
```

## Supported Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Required. CLI command path. Spaces create nested commands. |
| `method` | `string` | Required for executable commands. HTTP method such as `GET`, `POST`, `PUT`, or `DELETE`. |
| `endpoint` | `string` | Required for executable commands. API path relative to the API base URL, with optional `:placeholders`. |
| `description` | `string` | Optional help text for the command. |
| `summary` | `string` | Optional short listing text; falls back to `description`. |
| `options` | `object` | Optional map of CLI option definitions. These values are mapped into path placeholders, query parameters, or request bodies. |
| `option` / `parameter` / `parameters` | `object` | Backward-compatible aliases for `options`. |
| `filters` / `filter` | `string` or `array` | Optional predefined search filters using the same syntax as repeated `--filter` flags. These are merged before CLI-provided filters. |
| `connection_types` | `array` | Optional list of allowed profile types. |

Each entry inside `options` supports:

| Property | Type | Description |
|---|---|---|
| `required` | `boolean` | Marks the option as required. |
| `default` | `any` | Sets a fallback value when the option is not provided. |
| `description` | `string` | Adds help text for the option. |
| `short` | `string` | Adds a short flag such as `-s`. |
| `long` | `string` | Overrides the generated long flag name. |
| `flags` | `string` | Sets the full Commander flag string directly. |
| `type` | `string` | Use `"boolean"` to create a flag without a value placeholder. |
| `choices` | `array` | Restricts the option to a set of predefined values. When the value is not provided via CLI flag, an interactive selection prompt is shown. |

`body` is a top-level command property (not inside `options`) — see [JSON Request Body Templates](#json-request-body-templates) below.

## Parameter Mapping Rules

CLI options are matched against placeholders in `endpoint`.

Example:

```bash
mage-remote-run product get --sku 12345 --store default
```

This maps to:

```text
GET /default/V1/products/12345
```

Parameters not used in the endpoint are sent as follows:

- `GET` and `DELETE`: query string parameters
- `POST`, `PUT`, and `PATCH`: JSON request body fields (or the `body` template when defined)

## Predefine Search Filters

If a virtual command supports filters, you can ship default query filters directly in config instead of hardcoding `searchCriteria[...]` into the endpoint.

```json
{
  "name": "product list-by-letter",
  "method": "GET",
  "endpoint": "/:store/V1/products",
  "filters": [
    "name:like=${firstLetter}*"
  ],
  "options": {
    "firstLetter": {
      "type": "string",
      "required": true,
      "description": "First product-name letter"
    }
  }
}
```

This behaves like running:

```bash
mage-remote-run product list-by-letter --firstLetter A --filter "name:like=A*"
```

Placeholders such as `${firstLetter}` are resolved from the command options before filter parsing. The alternative `{:firstLetter}` syntax is also supported for readability.

Only simple placeholder substitution is supported. JavaScript expressions inside `${...}` are not evaluated.

Users can still add more `--filter` flags at runtime; those filters are appended to the predefined ones.

## JSON Request Body Templates

For `POST`, `PUT`, and `PATCH` requests, you can define a `body` field as a JSON template. String values inside the template may contain `${paramName}` or `{:paramName}` placeholders that are replaced with the actual option values at runtime. Nested objects and arrays are fully supported.

```json
{
  "name": "customer create",
  "method": "POST",
  "endpoint": "/:store/V1/customers",
  "supports_filters": false,
  "body": {
    "customer": {
      "email": "${email}",
      "firstname": "${firstname}",
      "lastname": "${lastname}",
      "websiteId": "${websiteId}"
    },
    "password": "${password}"
  },
  "options": {
    "store":     { "type": "string", "default": "all" },
    "email":     { "type": "string", "required": true },
    "firstname": { "type": "string", "required": true },
    "lastname":  { "type": "string", "required": true },
    "websiteId": { "type": "string", "default": "1" },
    "password":  { "type": "string", "required": true }
  }
}
```

When `body` is defined, only path parameters (`:store`) are substituted in the URL. All remaining option values must be referenced explicitly inside the body template. Options not referenced in the template are ignored for the body.

### Type preservation

A placeholder that covers the entire string value (e.g., `"${websiteId}"`) receives the original typed value from the CLI option — a number stays a number, a boolean stays a boolean. Mixed-content strings such as `"Order ${orderId} created"` always produce a string.

Static JSON values (numbers, booleans, `null`) in the template pass through unchanged regardless of placeholders.

## Option Choices

Adding a `choices` array to an option restricts it to a set of predefined values:

- When the user provides the option via `--flag value`, Commander validates that the value is in the allowed list.
- When the option is **not provided**, an interactive selection prompt is shown automatically.

### Simple string choices

```json
{
  "name": "product set-status",
  "method": "PUT",
  "endpoint": "/:store/V1/products/:sku",
  "options": {
    "store": { "type": "string", "default": "all" },
    "sku":    { "type": "string", "required": true },
    "status": {
      "type": "string",
      "required": true,
      "description": "Product status",
      "choices": ["enabled", "disabled"]
    }
  }
}
```

```bash
# pass directly
mage-remote-run product set-status --sku SHIRT-M --status enabled

# omit the flag → interactive select prompt appears
mage-remote-run product set-status --sku SHIRT-M
```

### Object choices

Use objects to show a human-readable label in the prompt while sending a different underlying value in the request:

```json
"choices": [
  { "name": "Not Visible Individually", "value": "1" },
  { "name": "Catalog",                  "value": "2" },
  { "name": "Search",                   "value": "3" },
  { "name": "Catalog, Search",          "value": "4" }
]
```

The `name` is displayed in the interactive prompt; `value` is what gets sent in the API request.

## Ship Virtual Commands from Plugins

Plugins can distribute virtual commands in two ways:

- Runtime injection through `context.config.commands`
- Static configuration through `mage-remote-run.json` or `package.json`

See [Plugin Configuration](./plugin-configuration.md) for both patterns.
