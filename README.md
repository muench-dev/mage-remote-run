# Mage Remote Run

The remote swiss army knife for Magento Open Source, Mage-OS, Adobe Commerce

## Project Status

This tool is in an early stage and not yet stable. Expect breaking changes as the CLI evolves.

## Features

- **Connection Management**: Easily switch between multiple Magento instances (SaaS/PaaS).
- **Interactive Prompts**: User-friendly wizard for configuration and command inputs.
- **Rich Output**: Formatted tables and structured data display.
- **Comprehensive API Support**:
    - **Stores**: Manage websites, stores, and store views.
    - **Customers**: List, search, show, and delete customers.
    - **Orders**: View latest orders and order details.
    - **Products**: Inspect product types and attributes.
    - **Tax**: List tax classes.

## Installation

```bash
npm install -g mage-remote-run
```

Or run directly via `npx` without installation:

```bash
npx mage-remote-run [command]
```

## Usage

### Configuration

The CLI supports multiple profiles. You can configure them interactively.

1.  **Add a Connection**:
    ```bash
    node bin/mage-remote-run.js connection add
    ```
    Follow the prompts to enter your instance URL and API credentials (Bearer Token).

2.  **Select Active Profile**:
    ```bash
    node bin/mage-remote-run.js connection select
    ```

3.  **Check Status**:
    ```bash
    node bin/mage-remote-run.js connection status
    ```

4.  **Test Connections**:
    ```bash
    node bin/mage-remote-run.js connection test --all
    ```
    
### Key Commands

- **Websites**:
  ```bash
  node bin/mage-remote-run.js website list
  node bin/mage-remote-run.js website search <query>
  ```

- **Stores**:
  ```bash
  node bin/mage-remote-run.js store list
  node bin/mage-remote-run.js store view list
  ```

- **Customers**:
  ```bash
  node bin/mage-remote-run.js customer list
  node bin/mage-remote-run.js customer show <id>
  ```

- **Orders**:
  ```bash
  node bin/mage-remote-run.js order latest
  node bin/mage-remote-run.js order show <increment_id>
  ```

## Development

### Testing

The project uses Jest for testing.

```bash
npm test
```

### Project Structure

- `bin/`: CLI entry point.
- `lib/commands/`: Command implementations.
- `lib/api/`: API client factory and logic.
- `tests/`: Unit and integration tests.
