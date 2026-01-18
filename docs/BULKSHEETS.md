# Amazon Ads API - Bulksheets Guide

## Overview

Bulksheets is a spreadsheet-based tool that allows sponsored ads advertisers to create and optimize multiple campaigns in batches, reducing time and manual effort. Bulksheets can be a good option if you've already been using the advertising console, but want more robust functionality and the ability to scale without calling the API.

> [!IMPORTANT]
> **Legacy bulksheets has been deprecated effective September 28, 2023.** The legacy template will not work, and you must use the new version to continue managing sponsored ads campaigns using bulksheets.

---

## Key Features

With bulksheets, you can:

- **Update campaign names and ad group names** in large batches instead of one by one
- **Optimize campaigns** by updating thousands of keywords, product targeting, and bids at once
- **View performance metrics** such as impressions, clicks and click-through rates, conversions, ACOS, CPC, and ROAS
- **Download and view search term reports** for Sponsored Products
- **Add multiple ad groups** to a single campaign from the same bulksheets file

---

## Frequently Asked Questions

### Can I use a legacy template with the new version?

No. Legacy templates have been deprecated and will not work with the current system.

### Should I download a custom spreadsheet or use the blank template format?

- **Custom spreadsheet**: Download your existing campaign data and modify it
- **Blank template**: Start from scratch with a clean template

Both approaches work depending on your needs.

### Are there other formatting rules I should be aware of?

Yes. See the getting started guide for detailed formatting requirements.

### Where can I find more information about using bulksheets?

Refer to the [getting started guide](https://advertising.amazon.com/API/docs/en-us/bulksheets/getting-started) for comprehensive instructions.

---

## Important Note on Blank Operations

> [!TIP]
> **In rows where the "Operation" field is blank**, those entities will be ignored in the bulk upload and will remain unchanged. This lets you keep data in the sheet if you don't want to update it, and will make the upload more efficient because the rows won't be processed.

---

## Example Scenarios

### Example 1: Update Campaign and Ad Group Name (Downloaded Custom Spreadsheet)

**Use case**: Renaming existing campaigns and ad groups in bulk

| Product | Entity | Operation | Campaign ID | Ad Group ID | Campaign Name | Ad Group Name | State | Daily Budget |
|---------|--------|-----------|-------------|-------------|---------------|---------------|-------|--------------|
| Sponsored Products | Campaign | Update | 2270350216 | | New Campaign Name 1 | | enabled | 15 |
| Sponsored Products | Ad Group | Update | 2270350216 | 1764163005 | | New Ad Group Name 1 | enabled | |

**Key points**:

- Use `Update` operation for existing entities
- Provide Campaign ID and/or Ad Group ID to identify entities
- Leave operation blank for child entities you don't want to modify

---

### Example 2: Create New Campaign and Ad Group (Downloaded Custom Spreadsheet)

**Use case**: Creating new campaigns alongside existing data

| Product | Entity | Operation | Campaign ID | Ad Group ID | Campaign Name | Ad Group Name | Start Date | Targeting Type | State | Daily Budget |
|---------|--------|-----------|-------------|-------------|---------------|---------------|------------|----------------|-------|--------------|
| Sponsored Products | Campaign | Create | SP Campaign Name 2 | | SP Campaign Name 2 | | 20220411 | Auto | enabled | 10 |
| Sponsored Products | Ad Group | Create | SP Campaign Name 2 | Ad Group Name 2 | | Ad Group Name 2 | | | enabled | |

**Key points**:

- Use `Create` operation for new entities
- For new campaigns, use the Campaign Name as the Campaign ID reference
- Child entities (Ad Groups) reference the parent Campaign Name

---

### Example 3: Create Auto-Targeting Campaign with Bidding Adjustment (Blank Template)

**Use case**: Creating a new campaign from scratch with bid adjustments

| Product | Entity | Operation | Campaign ID | Campaign Name | Start Date | Targeting Type | State | Daily Budget | Bidding Strategy | Placement | Percentage |
|---------|--------|-----------|-------------|---------------|------------|----------------|-------|--------------|------------------|-----------|-----------|
| Sponsored Products | Campaign | Create | Spring toys 2022 | Spring toys 2022 | 20220401 | Auto | Enabled | 100 | Fixed bid | | |
| Sponsored Products | Bidding adjustment | Create | Spring toys 2022 | | | | | | Fixed bid | placementTop | 35 |
| Sponsored Products | Ad group | Create | Spring toys 2022 | Outdoors | | | Enabled | | | | |

**Key points**:

- Create campaign first
- Add bidding adjustments (e.g., 35% increase for top of search placement)
- Add ad groups to the campaign

---

### Example 4: Archive Product Ad and Update Product Targeting (Downloaded Custom Spreadsheet)

**Use case**: Removing underperforming ASINs and adjusting targeting

| Product | Entity | Operation | Campaign ID | Ad Group ID | Ad ID | Product Targeting ID | State | ASIN | Product Targeting Expression |
|---------|--------|-----------|-------------|-------------|-------|---------------------|-------|------|----------------------------|
| Sponsored Products | Product Ad | Archive | 2270350216 | 1764163005 | 1626147106 | | enabled | B01N05APQY | |
| Sponsored Products | Product Targeting | Update | 2270350216 | 1764163005 | | 1475350320 | paused | | close-match |
| Sponsored Products | Product Targeting | | 2270350216 | 1764163005 | | 15431673257 | enabled | | loose-match |

**Key points**:

- Use `Archive` operation to remove entities without deleting them
- Update targeting expressions (close-match, loose-match, etc.)
- Leave operation blank on rows you're not modifying

---

## Common Operations

| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Create** | Add new entities | New campaigns, ad groups, keywords |
| **Update** | Modify existing entities | Change names, budgets, bids, states |
| **Archive** | Remove entities (reversible) | Pause underperforming ads |
| **Delete** | Permanently remove entities | Clean up test campaigns (use cautiously) |
| *(blank)* | No action | Keep data visible without modifying |

---

## Bulksheet Column Reference

### Campaign-Level Columns

| Column | Required | Description |
|--------|----------|-------------|
| Product | ✅ | Always "Sponsored Products" |
| Entity | ✅ | "Campaign" |
| Operation | ✅ | Create, Update, Archive |
| Campaign ID | For Update/Archive | Unique campaign identifier |
| Campaign Name | ✅ | Display name |
| Start Date | For Create | Format: YYYYMMDD |
| End Date | Optional | Format: YYYYMMDD |
| Targeting Type | For Create | Auto, Manual |
| State | ✅ | enabled, paused, archived |
| Daily Budget | ✅ | Dollar amount |
| Bidding Strategy | ✅ | Fixed bid, Dynamic bids - down only, Dynamic bids - up and down |

### Ad Group-Level Columns

| Column | Required | Description |
|--------|----------|-------------|
| Ad Group ID | For Update/Archive | Unique ad group identifier |
| Ad Group Name | ✅ | Display name |
| Ad Group Default Bid | ✅ | Default bid for targeting |

### Product Ad Columns

| Column | Required | Description |
|--------|----------|-------------|
| ASIN | ✅ | Product ASIN to advertise |
| SKU | Alternative to ASIN | Seller SKU |

---

## Best Practices

### 1. Use Descriptive Names

```
❌ "Campaign 1"
✅ "Protein Powder - Exact Match - Q1 2024"
```

### 2. Organize by Strategy

Group similar campaigns together in your bulksheet:

- Discovery campaigns (Auto targeting)
- Conversion campaigns (Exact match)
- Competitor campaigns (Phrase match)

### 3. Download Before Uploading

Always download your current campaigns first, then modify the spreadsheet. This ensures you:

- Have correct IDs for existing entities
- Can track your changes
- Have a backup

### 4. Test with Small Batches

Before uploading thousands of changes:

1. Test with 2-3 campaigns
2. Verify changes in Amazon Ads console
3. Scale up once confirmed

### 5. Use Blank Operations Strategically

Leave operations blank for:

- Child entities you're viewing but not modifying
- Historical data you want to keep visible
- Reference rows

---

## Integration with Our Platform

Our bleeder detection engine can work with bulksheet exports:

```typescript
// Export bleeder campaigns to bulksheet format
const criticalBleeders = await detectBleeders();
const bulksheet = generateBulksheetForPause(criticalBleeders);

// Suggested operations:
// - Set State to 'paused' for critical bleeders
// - Reduce bids by 40% for high-risk campaigns
// - Archive zero-conversion product ads
```

---

## Resources

- [Getting Started Guide](https://advertising.amazon.com/API/docs/en-us/bulksheets/getting-started)
- [Bulksheet Template Download](https://advertising.amazon.com/help/bulksheets)
- [API Bulksheet Operations](https://advertising.amazon.com/API/docs/en-us/bulksheets/operations)
