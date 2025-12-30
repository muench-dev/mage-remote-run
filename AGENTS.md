# Agent Guidelines for Mage Remote Run

This document provides context for AI agents working on this codebase.

## Project Overview

`mage-remote-run` is a Node.js CLI for interacting with Magento APIs. It uses `commander` for CLI structure and `axios` for API requests.



## Architecture

- **Entry Point**: `bin/mage-remote-run.js`.
- **Command Registry**: `lib/command-registry.js` manages command registration.
    - `registerCoreCommands`: Registers standard commands (websites, stores, customers, products, etc.).
    - `registerCloudCommands`: Registers cloud-specific commands (Adobe I/O Events, Company, Webhooks).
    - **Selective Registration**: Commands are registered based on the active profile's type. e.g., Cloud commands are only available for `ac-cloud-paas` and `ac-saas`.
- **Connection Types**:
    - **SaaS** (`ac-saas`, `saas`): Uses `SaasClient` (OpenAPI based).
    - **PaaS/On-Prem** (`magento-os`, `mage-os`, `ac-on-prem`, `ac-cloud-paas`, `paas`): Uses `PaasClient` (REST API based).
    - Factory: `lib/api/factory.js` instantiates the correct client based on the profile type.
- **API Specs**: Located in `api-specs/`. `lib/api/spec-loader.js` loads OpenAPI definitions (e.g., `swagger-saas.json`) which are used by `SaasClient` to generate API methods via `openapi-client-axios`.
- **Configuration**: `lib/config.js` handles loading/saving profiles using `env-paths`.

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

