# Agent Guidelines for Mage Remote Run

This document provides context for AI agents working on this codebase.

## Project Overview

`mage-remote-run` is a Node.js CLI for interacting with Magento APIs. It uses `commander` for CLI structure and `axios` for API requests.

## Architecture

- **Entry Point**: `bin/mage-remote-run.js`.
- **Command Registry**: `lib/command-registry.js` manages command registration.
  - `registerCommands`: Registers connection commands plus groups based on the active profile type.
  - Groups: CORE (websites, stores, customers, orders, products, cart, tax, inventory, shipments, console), COMMERCE (company, purchase-order-cart), CLOUD (events, webhooks), IMPORT, MODULES.
  - Backward-compat helpers: `registerCoreCommands`, `registerCloudCommands`, and `registerAllCommands`.
- **Selective Registration**: Commands are registered by profile type (see `TYPE_MAPPINGS` in `lib/command-registry.js`).
- **Connection Types**:
  - **SaaS** (`ac-saas`, `saas`): Uses `SaasClient` (OpenAPI based).
  - **PaaS/On-Prem** (`magento-os`, `mage-os`, `ac-on-prem`, `ac-cloud-paas`, `paas`): Uses `PaasClient` (REST API based).
  - Factory: `lib/api/factory.js` instantiates the correct client based on the profile type.
- **API Specs**: Located in `api-specs/2.4.8`. `lib/api/spec-loader.js` loads OpenAPI definitions (`swagger-saas.json`, `swagger-paas.json`) used by `SaasClient` via `openapi-client-axios`.
- **Configuration**: `lib/config.js` handles loading/saving profiles using `env-paths` and migrates legacy config on macOS.

## REPL (Console)

- **Entry Point**: `lib/commands/console.js`.
- **Functionality**: Provides an interactive shell (`mage-remote-run console`) with autocomplete.
- **Context**: Exposes `client` (API factory), `config`, and `chalk` for JavaScript execution.
- **Commands**: Can execute standard CLI commands directly within the REPL.
- **State**: Dynamically handles profile switching within the session.

## MCP Server

- **Entry Point**: `lib/mcp.js`.
- **Protocol**: Implements the Model Context Protocol (MCP).
- **Transports**: Supports `stdio` (default) and `http` (SSE).
- **Discovery**: Automatically converts registered CLI commands into MCP tools (e.g., `website list` becomes `website_list`).
- **Execution**: Captures stdout/stderr of command execution to return as tool results.

## Debug Mode

- **Enable**: Set the environment variable `DEBUG=1` (or any value) to enable debug output.
  - Example: `DEBUG=1 mage-remote-run connection test`
- **Output**: Debug messages are typically printed using `console.log` or `console.error` with `chalk.gray` or standard error output.
- **Usage**: Use `process.env.DEBUG` to conditionally log detailed information during development or troubleshooting.

## Testing

- **Requirement**: **Every new command must be covered by tests.**
- **Tool**: Jest is used for testing.
- **Run Tests**: `npm test`
- **Location**: Tests are located in `tests/`.
- **Mocking**: Extensive use of `jest.unstable_mockModule` for ESM mocking. Pay attention to mocking external dependencies like `@inquirer/prompts` and `axios`.

## Documentation

- **Requirement**: **Every command must be documented.**
- **Location**: `docs/docs/command-docs/`.
- **Format**: Markdown files with Frontmatter for sidebar positioning.
- **Ordering**: Keep `index.md` first, then sort alphabetically.

## Key Conventions

- **ES Modules**: The project uses ESM.
- **User Interaction**: Use `@inquirer/prompts`.
- **Output**: Use `chalk` for colors.

## Tools

Helper scripts and tools available for development:

- `npm run dev:api-discover`: Parses local Swagger files (`api-specs/2.4.8`) and lists available API endpoints grouped by domain. Useful for discovering new endpoints to implement.

