<<<<<<< HEAD
# amazon_ppc
=======
# Amazon PPC Platform

> Automated Amazon PPC monitoring and optimization platform for Luxe Allur supplement brand

## 🎯 Features

- **Bleeder Detection**: Automatically identify money-losing campaigns
- **Smart Optimization**: AI-powered bid adjustments and budget reallocation
- **Campaign Generation**: Create high-ROI campaigns using proven templates
- **Real-Time Monitoring**: Dashboard with live performance metrics
- **Automated Alerts**: Email/SMS notifications for critical issues

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Amazon Ads API access (see setup guide)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your Amazon API credentials in .env
nano .env

# Run development server
npm run dev
```

### Amazon Ads API Setup

**⚠️ IMPORTANT**: Your current LWA app only has basic profile scopes. You need to:

1. Visit [Amazon Advertising API Onboarding](https://advertising.amazon.com/API/docs/en-us/get-started/onboarding)
2. Request these scopes for your app:
   - `advertising::campaign_management`
   - `advertising::audiences`
3. Complete verification process

## 📊 Your Current Campaign Status

Based on your uploaded data (Jan 10-16, 2026):

| Metric | Value | Status |
|--------|-------|--------|
| **ACOS** | 172.77% | 🔴 Critical Bleeder |
| **ROAS** | 0.58 | 🔴 Losing $0.42 per $1 |
| **Budget** | $1-3/day | ⚠️ Too low |
| **Conversions** | 0 | 🔴 Critical |

**Estimated monthly loss**: $95

## 📁 Project Structure

```
amazon-ppc-platform/
├── src/
│   ├── auth/                 # Amazon OAuth authentication
│   ├── services/             # Amazon Ads API client
│   ├── detectors/            # Bleeder detection algorithms
│   ├── optimizers/           # Bid & budget optimization
│   ├── generators/           # Campaign creation
│   └── database/             # Schema & models
├── frontend/                 # React dashboard (coming soon)
└── tests/                    # Unit & integration tests
```

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## 📈 Roadmap

- [x] Phase 1: API authentication setup
- [x] Phase 2: Bleeder detection engine
- [ ] Phase 3: Campaign data collection
- [ ] Phase 4: Bid optimization automation
- [ ] Phase 5: Dashboard UI
- [ ] Phase 6: Automated reporting

## 🤝 Support

For questions or issues, contact the development team.

## 📄 License

MIT License - See LICENSE file for details
>>>>>>> b0e599a (Initial commit: Amazon PPC optimization platform with conservative bulksheet generator, bleeder detection, and API integration)
