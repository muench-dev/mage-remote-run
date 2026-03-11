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

- `required`: marks the option as required.
- `default`: sets a fallback value.
- `description`: adds help text for the option.
- `short`: adds a short flag such as `-s`.
- `long`: overrides the generated long flag.
- `flags`: sets the full Commander flag string directly.
- `type: "boolean"`: creates a flag without a value placeholder.

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
- `POST`, `PUT`, and `PATCH`: JSON request body fields

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

## Ship Virtual Commands from Plugins

Plugins can distribute virtual commands in two ways:

- Runtime injection through `context.config.commands`
- Static configuration through `mage-remote-run.json` or `package.json`

See [Plugin Configuration](./plugin-configuration.md) for both patterns.
