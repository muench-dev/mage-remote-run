---
title: purchase-order-cart
sidebar_position: 4
---

# Purchase Order Cart Commands

Manage checkout carts for Purchase Orders.

:::info
These commands are available only when B2B modules are detected. For PaaS/On-Prem profiles, B2B modules are checked during `connection add` or `connection edit`.
:::

## Get Totals

Get totals for a purchase order cart.

```bash
mage-remote-run po-cart totals <cartId>
```

## Estimate Shipping

Estimate shipping methods for a cart.

```bash
mage-remote-run po-cart shipping-methods <cartId> --address-id <addressId>
```

## Payment Information

Get payment information and totals.

```bash
mage-remote-run po-cart payment-info <cartId>
```
