# Agent Guidelines for Mage Remote Run

This document provides context for AI agents working on this codebase.

## Project Overview

`mage-remote-run` is a Node.js CLI for interacting with Magento APIs. It uses `commander` for CLI structure and `axios` for API requests.

## Architecture

- **Entry Point**: `bin/mage-remote-run.js`.
- **Commands**: Located in `lib/commands/`. Each file exports a function `register[Name]Commands(program)` which attaches commands to the main program.
- **Configuration**: `lib/config.js` handles loading/saving profiles using `env-paths`.
- **API Factory**: `lib/api/factory.js` creates API clients. It supports switching between SaaS (OpenAPI) and PaaS/On-Prem adapters (although currently heavily mocked/abstracted).

## Key Conventions

- **ES Modules**: The project uses ESM (`type: "module"` in `package.json`).
- **Mocking**: Tests use `jest.unstable_mockModule` to mock ESM dependencies. **CRITICAL**: When mocking `@inquirer/prompts`, verify if you need to access the module namespace object or if named exports are sufficient. Previous issues showed conflicts when destructuring mocked functions directly in tests.
- **User Interaction**: Use `@inquirer/prompts` for all interactive prompts.
- **Output**: Use `chalk` for coloring and `console.log` for output. Errors should be handled via a central `handleError` utility (or standard try/catch blocks logging to `console.error`).

## Testing

- Run `npm test` to verify changes.
- Tests are co-located in `tests/`.
- Mocks are essential for `config.js`, `api/factory.js`, and external CLI libraries to avoid side effects during testing.

## Common Tasks

- **Adding a Command**:
    1. Create `lib/commands/<entity>.js`.
    2. Define `register<Entity>Commands`.
    3. Register it in `bin/mage-remote-run.js`.
    4. Add unit tests in `tests/<entity>.test.js`.
