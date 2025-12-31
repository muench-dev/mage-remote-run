# Roadmap: mage-remote-run

This roadmap is based on a comparison of the currently implemented CLI commands in `lib/commands/*` with the OpenAPI specs in `api-specs/2.4.8/`:

- `api-specs/2.4.8/swagger-paas.json` (Adobe Commerce PaaS / on-prem style APIs)
- `api-specs/2.4.8/swagger-saas.json` (Adobe Commerce SaaS APIs)

The goal is to expand the CLI in a way that is:

- Operator-friendly (common support + admin workflows first)
- Spec-driven (endpoints in `api-specs/` map to commands predictably)
- Profile-type aware (register commands only where the API exists)

## Current State

### Existing Command Families

Implemented command families (top-level commands) include:

- Core:
  - [x] `website`
  - [x] `store`
  - [x] `customer` (partial)
  - [x] `order` (partial)
  - [x] `product` (partial)
  - [x] `eav` (partial)
  - [x] `cart` (partial)
  - [x] `tax` (partial; `taxClasses`)
  - [x] `inventory` (partial)
- Commerce/B2B:
  - [x] `company` (partial)
  - [x] `po-cart` (partial)
- Cloud/SaaS:
  - [x] `event` (partial)
  - [x] `webhook` (partial)
- Tooling:
  - [x] `connection`
  - [x] `import`
  - [x] `console`
  - [x] `mcp`
  - [x] `module`

### Observed Coverage (Specs vs CLI)

Exact endpoint coverage varies by profile type. As of now, the CLI covers a small subset of available endpoints in the specs (especially for sales/fulfillment, promotions, catalog tooling, and B2B extensions).

Key areas with good coverage:

- `store` (websites/store groups/store views/store configs)
- `webhooks` (SaaS)
- `adobe_io_events` (configuration check)

Areas with partial coverage:

- `products`, `customers`, `orders`, `carts`, `inventory`, `company`, `companyCredits`, `eventing`

## Command Taxonomy (Target)

To keep the CLI predictable, each API “group” should map to a top-level command family (or a sub-family where appropriate).

### Catalog & Merchandising

- [x] `product` (partial; expand)
- [ ] `category`
- [ ] `configurable-product`
- [ ] `bundle-product`
- [ ] `attribute-metadata` (complements `eav`)
- [ ] `media` (SaaS-only)

### Sales & Customer Operations

- [x] `order` (partial; expand)
- [ ] `invoice`
- [ ] `shipment`
- [ ] `creditmemo`
- [ ] `return` / `rma`
- [ ] `transaction`

### Promotions & Pricing

- [ ] `sales-rule`
- [ ] `coupon`
- [x] `tax` (partial; expand with `taxRates`/`taxRules`)

### B2B / Commerce Extensions

- [x] `company` (partial; expand)
- [ ] `shared-catalog`
- [ ] `negotiable-quote`
- [ ] `negotiable-quote-template`
- [ ] `team`
- [ ] `requisition-list` (PaaS-only)
- [ ] `negotiable-cart` (PaaS-only)

### Content (PaaS-only)

- [ ] `cms-page`
- [ ] `cms-block`
- [ ] `hierarchy`

### Platform & Admin Utilities

- [ ] `bulk` (job status + progress)
- [ ] `directory` (PaaS-only)
- [ ] `directory` (PaaS-only)
- [x] `modules`
- [ ] `integration` / `token` (admin/customer tokens)
- [ ] `integration` / `token` (admin/customer tokens)
- [ ] `tfa` (PaaS-only)

### SaaS Operational Extensions (SaaS-only)

- [ ] `oope-observability`
- [ ] `oope-shipping-carrier`
- [ ] `oope-payment-method`
- [ ] `oope-tax-management`

## Roadmap Phases

Each phase represents a coherent “operator value slice” rather than strictly endpoint-count maximization.

### Phase 1 — Sales Fulfillment (High Operator Value)

Why:
- Common support workflows: “invoice/ship/refund this order”
- Unblocks day-to-day operations in a single CLI session

Deliver:
- [ ] `invoice`: list/show/create/capture/void/email/comments
- [ ] `shipment`: create/show/label/track/email/comments
- [ ] `creditmemo`: create/refund/show/email/comments
- [ ] Expand `order` to include action endpoints (where available): invoice/ship/refund

### Phase 2 — Catalog Tooling (High Frequency)

Why:
- Common admin tasks: categories + product relations + media

Deliver:
- [ ] `category`: tree list/show/create/update/delete + assign/unassign products
- [ ] `configurable-product`: children/options operations
- [ ] `bundle-product`: options/links/children operations
- [ ] Expand `product` where useful (attributes/media/relations)

### Phase 3 — Promotions & Pricing Workflows

Why:
- Operators need “create promo → generate coupons → validate totals”

Deliver:
- [ ] `sales-rule`: list/show/create/update/delete/search
- [ ] `coupon`: generate/search/show/delete
- [ ] Expand `tax` to support `taxRates` and `taxRules`

### Phase 4 — Returns & After-Sales

Why:
- Reduces time-to-resolution for post-purchase issues

Deliver:
- [ ] `return` / `rma`: list/show/create/update/labels/tracking/comments
- [ ] `transaction`: list/show for payment reconciliation and support

### Phase 5 — B2B Expansion

Why:
- Unlocks key Adobe Commerce B2B features beyond `company`

Deliver:
- [ ] `shared-catalog`: create/update/delete + assign companies/categories/products
- [ ] `negotiable-quote` and `negotiable-quote-template`: list/show/create/update actions
- [ ] `team`: team CRUD and membership operations
- [ ] PaaS-only: `requisition-list`, `negotiable-cart` where applicable

### Phase 6 — Platform & SaaS Ops

Why:
- Covers remaining gaps that are valuable for platform maintenance and SaaS-specific operations

Deliver:
- [ ] `bulk`: status and detailed-status tooling
- [ ] PaaS-only: `directory`, `integration`/`token`, `tfa`
- [ ] SaaS-only: `modules`, `media`, and `oope-*` command families

## “Combo” Workflows (Orchestrated Commands)

These are higher-level commands that combine multiple API calls. They can be shipped as:

- `workflow <name>` commands, or
- scriptable subcommands (with `--json` output for automation)

Suggested workflows:

- [ ] `workflow fulfill-order <incrementId>`:
  - resolve `order` by increment id, then invoice → capture → ship (+ tracking) → notify
- [ ] `workflow refund-order <incrementId>`:
  - fetch order → create credit memo → refund → email
- [ ] `workflow launch-product <sku>`:
  - update product → upload/attach media → assign categories → validate inventory salability
- [ ] `workflow promo-smoke-test`:
  - create sales rule → generate coupon → create/inspect cart → apply coupon → compare totals
- [ ] `workflow onboard-b2b-company`:
  - create company → assign shared catalog → seed credit → verify team/roles
- [ ] `workflow inventory-health`:
  - list sources/stocks → resolve stock for website/store → report salability issues by SKU

## Implementation Conventions

### Command-to-Spec Mapping

- Prefer a 1:1 mapping from spec “group” to CLI top-level command (or clearly documented sub-family).
- Keep naming consistent and discoverable:
  - Spec group `creditmemo` → CLI `creditmemo`
  - Spec group `salesRules` → CLI `sales-rule` (kebab-case is fine, but be consistent)

### Profile-Type Awareness

- Only register commands that exist for the active profile type:
  - PaaS-only groups should not appear for SaaS profiles
  - SaaS-only groups should not appear for PaaS/on-prem profiles

### Quality Bar

- Every new command must include Jest coverage in `tests/`.
- Every new command must be documented under `docs/docs/command-docs/`.

## Backlog (By API Spec Group)

Use this as a “missing list” to drive implementation planning:

- Catalog:
  - [ ] `categories`
  - [ ] `configurable-products`
  - [ ] `bundle-products`
  - [ ] `attributeMetadata`
  - [ ] (SaaS) `media`
- Sales:
  - [ ] `invoices`
  - [ ] `shipment`
  - [ ] `shipments`
  - [ ] `creditmemo`
  - [ ] `creditmemos`
  - [ ] `returns`
  - [ ] `transactions`
  - [ ] `order` (action endpoints)
- Promotions:
  - [ ] `salesRules`
  - [ ] `coupons`
  - [ ] `taxRates`
  - [ ] `taxRules`
- B2B:
  - [ ] `sharedCatalog`
  - [ ] `negotiableQuote`
  - [ ] `negotiableQuoteTemplate`
  - [ ] `team`
  - [ ] (PaaS) `requisition_lists`
  - [ ] (PaaS) `negotiable-carts`
- Content (PaaS):
  - [ ] `cmsPage`
  - [ ] `cmsBlock`
  - [ ] `hierarchy`
- Platform:
  - [ ] `bulk`
  - [ ] (PaaS) `directory`
  - [ ] (PaaS) `integration`
  - [ ] (PaaS) `tfa`
  - [ ] (PaaS) `tfa`
  - [x] `modules`
  - [ ] (SaaS) `oope_*`
