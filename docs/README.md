# Amazon PPC Platform - Documentation Index

Welcome to the Amazon PPC Platform documentation. This platform helps you monitor, optimize, and automate your Amazon advertising campaigns.

## 📚 Documentation Structure

### Getting Started

- [README.md](../README.md) - Quick start guide and project overview
- [SECURITY.md](../SECURITY.md) - Credential management and security practices

### Amazon Ads API Reference

- [API_REFERENCE.md](./API_REFERENCE.md) - Core concepts, authorization, reporting, rate limiting
- [BULKSHEETS.md](./BULKSHEETS.md) - Bulksheets guide with examples and best practices

### Project Artifacts

Located in `C:\Users\AATTARAN\.gemini\antigravity\brain\69fc7ba4-5d0c-4704-bf2b-41e0705abf34\`:

- [task.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/task.md) - Development task checklist
- [implementation_plan.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/implementation_plan.md) - Technical implementation plan
- [walkthrough.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md) - Development walkthrough and findings

---

## 🎯 Quick Links

### For Developers

- **Authentication**: See [API_REFERENCE.md#authorization](./API_REFERENCE.md#authorization)
- **Reporting**: See [API_REFERENCE.md#reporting-and-exports](./API_REFERENCE.md#reporting-and-exports)
- **Postman Setup**: See [API_REFERENCE.md#postman-setup](./API_REFERENCE.md#postman-setup)
- **Rate Limiting**: See [API_REFERENCE.md#rate-limiting](./API_REFERENCE.md#rate-limiting)

### For Campaign Managers

- **Bulksheet Operations**: See [BULKSHEETS.md#example-scenarios](./BULKSHEETS.md#example-scenarios)
- **Bleeder Detection**: See [walkthrough.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md)
- **Best Practices**: See [BULKSHEETS.md#best-practices](./BULKSHEETS.md#best-practices)

---

## 🔑 Key Concepts

### Bleeder Campaigns

Campaigns that are losing money (ACOS >100%, ROAS <1.0). Our platform automatically detects and provides recommendations to fix them.

### Profiles

An identifier representing an advertiser's account in a particular marketplace. Required for most API operations.

### Bulksheets

Spreadsheet-based tool for batch campaign management. Faster than the console for large-scale changes.

### Reports vs Exports

- **Reports**: Performance data (impressions, sales, ACOS)
- **Exports**: Campaign structure (names, budgets, states)

---

## 📖 Documentation by Topic

### Authentication & Setup

1. [Create LWA Application](./API_REFERENCE.md#authorization)
2. [Configure Environment Variables](../SECURITY.md)
3. [Get Access Token](./API_REFERENCE.md#token-management)
4. [Retrieve Profile ID](./API_REFERENCE.md#authorization)

### Campaign Management

1. [Fetch Campaign Data](./API_REFERENCE.md#reporting-and-exports)
2. [Detect Bleeders](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md#campaign-performance-analysis-from-screenshot)
3. [Optimize Bids](./BULKSHEETS.md#example-2-create-new-campaign-and-ad-group-downloaded-custom-spreadsheet)
4. [Archive Underperformers](./BULKSHEETS.md#example-4-archive-product-ad-and-update-product-targeting-downloaded-custom-spreadsheet)

### Bulk Operations

1. [Download Bulksheet Template](./BULKSHEETS.md#overview)
2. [Modify Campaigns in Bulk](./BULKSHEETS.md#example-scenarios)
3. [Upload Changes](./BULKSHEETS.md#best-practices)
4. [Verify in Console](./BULKSHEETS.md#best-practices)

---

## 🛠️ Platform Features

### ✅ Completed

- Amazon Ads API OAuth 2.0 authentication
- Multi-factor bleeder detection engine
- Bulk export analysis tools
- Comprehensive API documentation

### 🚧 In Development

- Automated bid optimization
- Negative keyword mining
- Budget reallocation engine
- Real-time dashboard

### 📋 Planned

- Campaign generation templates
- A/B testing framework
- Automated reporting
- Alert system (email/SMS)

---

## 🎓 Learning Path

### Beginner

1. Read [README.md](../README.md)
2. Review [API_REFERENCE.md#authorization](./API_REFERENCE.md#authorization)
3. Set up [Postman](./API_REFERENCE.md#postman-setup)
4. Make first API call

### Intermediate

1. Understand [Reporting](./API_REFERENCE.md#reporting-and-exports)
2. Learn [Bulksheets](./BULKSHEETS.md)
3. Explore bleeder detection in [walkthrough.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md)
4. Practice with test campaigns

### Advanced

1. Implement custom optimization algorithms
2. Build automated workflows
3. Integrate with data pipeline
4. Scale to portfolio management

---

## ❓ Common Questions

### How do I get API access?

Complete the [Amazon Ads API onboarding](https://advertising.amazon.com/API/docs/en-us/get-started/onboarding) process.

### What are bleeders?

Campaigns with ACOS >100% or ROAS <1.0 that are losing money. See [walkthrough.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md) for detection details.

### Should I use API or Bulksheets?

- **API**: Real-time automation, programmatic control
- **Bulksheets**: Batch operations, visual editing

### How often can I call the API?

Rate limits are dynamic. Use [exponential backoff](./API_REFERENCE.md#rate-limiting) and respect 429 responses.

---

## 📞 Support

- **Documentation Issues**: Create an issue in the repository
- **API Problems**: Contact [Amazon Ads API Support](https://advertising.amazon.com/API/support)
- **Platform Questions**: Review [walkthrough.md](../../.gemini/antigravity/brain/69fc7ba4-5d0c-4704-bf2b-41e0705abf34/walkthrough.md) first

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details
