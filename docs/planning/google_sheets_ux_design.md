# 🎨 GOOGLE SHEETS UX/UI DESIGN

## Visual Approval Workflow & Bulk Export Interface

**Version:** 1.0  
**Last Updated:** 2026-02-01  
**Status:** 🎨 UX SPECIFICATION

---

## 🎯 USER EXPERIENCE OVERVIEW

### The Workflow You'll Experience

```
1. Open Google Sheets → See campaigns with color-coded priorities
2. Click dropdown in "Approval" column → Select APPROVE/REJECT/HOLD
3. Review gets highlighted green (approved) or red (rejected)
4. Click "GENERATE BULK FILE" button at top of sheet
5. Choose export option (Set A only, Set B only, or Both)
6. Download Excel file automatically
7. Upload to Amazon Ads Console
```

**Total time:** < 5 minutes for 50 campaigns

---

## 📊 GOOGLE SHEETS INTERFACE DESIGN

### Tab 1: PPC Campaigns (Enhanced Visual Design)

#### **Header Row Design (Row 10)**

| Column | Header | Type | Visual |
|--------|--------|------|--------|
| A | Campaign Name | Text | **Bold, Blue** |
| B | State | Badge | 🟢 ENABLED / ⏸️ PAUSED / 📦 ARCHIVED |
| C | Test Group | Badge | 🅰️ Set A / 🅱️ Set B / ⚪ CONTROL |
| P | VPC | Number | Currency format ($12.50) |
| Q | ACOS | Percentage | % format with color |
| R | **Priority** | Badge | 🔴🟠🟡🟢 (CRITICAL/HIGH/MEDIUM/LOW) |
| S | **New Bid** | Number | Currency, **bold if changed** |
| T | **Action** | Badge | ⬆️ INCREASE / ⬇️ REDUCE / ⏯️ PAUSE |
| U | **Approval** | Dropdown | ✅ APPROVE / ❌ REJECT / ⏸️ HOLD |
| V | **Status** | Auto | PENDING / APPROVED / REJECTED |

#### **Conditional Formatting Rules**

##### **Priority Column (R) - Color Coding**

| Priority | Background | Text | Icon | Criteria |
|----------|-----------|------|------|----------|
| 🔴 CRITICAL | `#F4CCCC` (light red) | `#990000` (dark red) | 🔴 | ACOS > 50% AND Spend > $50 |
| 🟠 HIGH | `#FCE5CD` (light orange) | `#E69138` (dark orange) | 🟠 | ACOS > 35% OR VPC < $8 |
| 🟡 MEDIUM | `#FFF2CC` (light yellow) | `#BF9000` (dark yellow) | 🟡 | ACOS 25-35% |
| 🟢 LOW | `#D9EAD3` (light green) | `#38761D` (dark green) | 🟢 | ACOS < 25% |

##### **Action Column (T) - Color Coding**

| Action | Background | Text | Icon |
|--------|-----------|------|------|
| INCREASE | `#C9DAF8` (light blue) | `#1155CC` | ⬆️ |
| REDUCE | `#EAD1DC` (light pink) | `#A64D79` | ⬇️ |
| PAUSE | `#F4CCCC` (light red) | `#990000` | ⏯️ |
| HOLD | `#F3F3F3` (light gray) | `#666666` | ⏸️ |

##### **Approval Column (U) - Color Coding**

| Selection | Background | Text |
|-----------|-----------|------|
| ✅ APPROVE | `#B6D7A8` (green) | `#274E13` (dark green) |
| ❌ REJECT | `#EA9999` (red) | `#660000` (dark red) |
| ⏸️ HOLD | `#FFE599` (yellow) | `#7F6000` (dark yellow) |
| _Empty_ | White | Black |

##### **Entire Row Highlighting**

```
If Column U = "APPROVE" → Entire row gets light green background (#E8F5E9)
If Column U = "REJECT" → Entire row gets light red background (#FFEBEE)
If Priority = "CRITICAL" → Row border is thick red
```

---

### Tab 2: Keywords (Similar Design)

| Column | Header | Type | Visual |
|--------|--------|------|--------|
| A | Keyword Text | Text | Bold |
| F | Campaign Name | Link | Clickable link to campaign |
| G | Test Group | Badge | 🅰️ / 🅱️ |
| P | VPC | Number | $ format |
| Q | ACOS | Percentage | % with color |
| R | **Priority** | Badge | 🔴🟠🟡🟢 |
| S | New Bid | Number | $ format, bold if changed |
| T | Action | Badge | ⬆️⬇️⏯️ |
| U | **Approval** | Dropdown | ✅❌⏸️ |

**Same color coding as campaigns tab**

---

### Tab 3: Targeting Clauses (Audiences)

| Column | Header | Visual |
|--------|--------|--------|
| D | Audience Name | "Purchased Brand Product" |
| G | Test Group | 🅱️ (should only be Set B) |
| Q | CVR Lift | "2.5x" with color (green if >2x) |
| R | Recommended Bid | $ format |
| S | Action | ⬆️ INCREASE / ⏸️ HOLD |
| T | **Approval** | ✅❌⏸️ dropdown |

---

## 🎛️ APPROVAL MECHANISM

### **Option 1: Dropdown Menu (RECOMMENDED)** ✅

**Implementation:**

1. Select column U (Approval column)
2. Data → Data Validation
3. Criteria: List of items
4. Values: `APPROVE, REJECT, HOLD`
5. Show dropdown in cell: ✅
6. Display style: Chip (if available)

**User Experience:**

- Click cell → Dropdown appears
- Select APPROVE → Row turns green
- Select REJECT → Row turns red
- Select HOLD → Row turns yellow

**Pro:** Clean, professional, error-proof

---

### Option 2: Checkboxes (Alternative)

**Implementation:**

1. Column U: Checkbox for "Approved?"
2. Column V: Checkbox for "Rejected?"
3. Only one can be checked (via Apps Script validation)

**Pro:** One-click approval
**Con:** Takes 2 columns, less flexible

---

## 🔘 BULK EXPORT BUTTON

### **Visual Design**

**Location:** Frozen row at top (Row 1)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 PPC CAMPAIGNS DASHBOARD                                  │
│                                                               │
│  [🔄 REFRESH DATA]  [📊 GENERATE BULK FILE]  [📈 VIEW STATS] │
└─────────────────────────────────────────────────────────────┘
Row 1-9: Instructions, stats, buttons
Row 10: Headers
Row 11+: Data
```

### **Button Implementation: Google Apps Script**

#### **Step 1: Add Custom Menu**

When you open the sheet, you see:

```
File  Edit  View  ...  🎯 PPC Optimizer ◀ (New menu)
                         ├── 🔄 Refresh Data
                         ├── 📊 Generate Bulk File
                         ├── 📈 View Statistics
                         └── ❓ Help
```

#### **Step 2: Apps Script Code**

Create a script in: **Extensions → Apps Script**

```javascript
/**
 * Custom menu for PPC Optimizer
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎯 PPC Optimizer')
    .addItem('🔄 Refresh Data', 'refreshData')
    .addItem('📊 Generate Bulk File', 'generateBulkFile')
    .addItem('📈 View Statistics', 'viewStats')
    .addSeparator()
    .addItem('❓ Help', 'showHelp')
    .addToUi();
}

/**
 * Generate bulk file from approved campaigns
 */
function generateBulkFile() {
  const ui = SpreadsheetApp.getUi();
  
  // Step 1: Ask user which set to export
  const response = ui.alert(
    'Generate Bulk File',
    'Which campaigns do you want to export?',
    ui.ButtonSet.YES_NO_CANCEL
  );
  
  // YES = Set A only, NO = Set B only, CANCEL = Both
  let exportType;
  if (response == ui.Button.YES) {
    exportType = 'SET_A';
  } else if (response == ui.Button.NO) {
    exportType = 'SET_B';
  } else if (response == ui.Button.CANCEL) {
    return; // User cancelled
  } else {
    exportType = 'BOTH';
  }
  
  // Step 2: Trigger Node.js script via webhook
  // (Or collect data here and create file)
  
  const approvedCampaigns = getApprovedCampaigns(exportType);
  
  if (approvedCampaigns.length === 0) {
    ui.alert('No approved campaigns found. Please mark some as APPROVE first.');
    return;
  }
  
  // Step 3: Create download link
  ui.alert(
    'Bulk File Ready!',
    `✅ ${approvedCampaigns.length} campaigns exported.\n\nRun this command in your terminal:\n\nnode generate-bulk-csv.js`,
    ui.ButtonSet.OK
  );
}

/**
 * Get all approved campaigns
 */
function getApprovedCampaigns(exportType) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Keywords');
  const data = sheet.getDataRange().getValues();
  
  const approved = [];
  
  // Skip header rows (1-10)
  for (let i = 10; i < data.length; i++) {
    const row = data[i];
    const testGroup = row[6]; // Column G
    const approval = row[20]; // Column U
    
    if (approval === 'APPROVE') {
      // Filter by test group if needed
      if (exportType === 'SET_A' && testGroup !== 'A') continue;
      if (exportType === 'SET_B' && testGroup !== 'B') continue;
      
      approved.push(row);
    }
  }
  
  return approved;
}

/**
 * Show statistics dashboard
 */
function viewStats() {
  const ui = SpreadsheetApp.getUi();
  const stats = calculateStats();
  
  ui.alert(
    'Campaign Statistics',
    `📊 Set A (Keywords Only)\n` +
    `  Campaigns: ${stats.setA.campaigns}\n` +
    `  Approved: ${stats.setA.approved}\n` +
    `  Avg ACOS: ${stats.setA.acos}%\n\n` +
    `📊 Set B (Keywords + Audiences)\n` +
    `  Campaigns: ${stats.setB.campaigns}\n` +
    `  Approved: ${stats.setB.approved}\n` +
    `  Avg ACOS: ${stats.setB.acos}%`,
    ui.ButtonSet.OK
  );
}

function calculateStats() {
  // Implementation: aggregate from sheet data
  return {
    setA: { campaigns: 10, approved: 5, acos: 25.3 },
    setB: { campaigns: 10, approved: 7, acos: 20.1 }
  };
}
```

---

## 🎨 VISUAL DASHBOARD (Row 1-9)

### **Row 1-3: Quick Stats**

```
┌──────────────────────────────────────────────────────────────┐
│                    PPC CAMPAIGNS DASHBOARD                    │
├──────────────────────────────────────────────────────────────┤
│  📊 SET A (Keywords Only)          📊 SET B (Keywords + Aud)  │
│  Campaigns: 10                     Campaigns: 10              │
│  Approved: 5 ✅                    Approved: 7 ✅             │
│  Rejected: 2 ❌                    Rejected: 1 ❌             │
│  Pending: 3 ⏸️                     Pending: 2 ⏸️              │
│  Avg ACOS: 25.3%                   Avg ACOS: 20.1% 🎯        │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:** Formulas

```excel
=COUNTIFS(Z:Z,"A",U:U,"APPROVE")  // Set A approved count
=AVERAGEIF(Z:Z,"A",Q:Q)           // Set A average ACOS
```

### **Row 4-6: Priority Breakdown**

```
┌──────────────────────────────────────────────┐
│  PRIORITY BREAKDOWN                          │
│  🔴 CRITICAL: 3 campaigns (APPROVE 2)        │
│  🟠 HIGH: 8 campaigns (APPROVE 5)            │
│  🟡 MEDIUM: 12 campaigns (APPROVE 8)         │
│  🟢 LOW: 7 campaigns (APPROVE 3)             │
└──────────────────────────────────────────────┘
```

### **Row 7-9: Instructions**

```
┌──────────────────────────────────────────────────────────────┐
│  HOW TO USE THIS SHEET:                                      │
│  1. Review campaigns with 🔴 CRITICAL priority first         │
│  2. Click dropdown in "Approval" column                      │
│  3. Select ✅ APPROVE, ❌ REJECT, or ⏸️ HOLD               │
│  4. When ready, click "🎯 PPC Optimizer" → "Generate Bulk"  │
│  5. Download file and upload to Amazon Ads Console           │
└──────────────────────────────────────────────────────────────┘
```

---

## 📥 BULK FILE GENERATION WORKFLOW

### **Workflow A: Google Sheets Button → Terminal Command** (RECOMMENDED)

**Steps:**

1. User clicks "Generate Bulk File" in Google Sheets menu
2. Apps Script shows pop-up: "Run: `node generate-bulk-csv.js --set-a`"
3. User copies command
4. User opens terminal, runs command
5. Script reads Google Sheets, filters for approved items
6. Excel file generated: `amazon-bulk-set-a-2026-02-01.xlsx`
7. User downloads from `/workspace/` folder

**Pro:** Simple, no complex Google Apps Script
**Con:** Requires terminal access

---

### Workflow B: Fully Automated (Google Apps Script generates file)

**Steps:**

1. User clicks "Generate Bulk File"
2. Apps Script collects all approved rows
3. Apps Script calls Node.js webhook/cloud function
4. Cloud function generates Excel file
5. Download link appears in Google Sheets

**Pro:** Fully automated, no terminal
**Con:** Requires webhook setup or Apps Script XLSX library

**Recommendation:** Start with Workflow A, upgrade to B later

---

## 🎯 COMPLETE USER JOURNEY

### **Day 1 Morning: Data Sync**

**Terminal:**

```bash
node fetch-ppc-data.js
```

**Google Sheets automatically updates:**

- Campaigns → Row 11+
- Keywords → Row 11+
- Targeting Clauses → Row 11+

---

### **Day 1 Afternoon: Review & Approve**

**User opens Google Sheets:**

1. **See priority breakdown** in dashboard (Row 4-6)
2. **Sort by Priority column** (🔴 CRITICAL first)
3. **Review each campaign:**
   - Red rows = Bad performers (ACOS >50%)
   - Orange rows = Needs attention (ACOS 35-50%)
   - Yellow rows = On target (ACOS 25-35%)
   - Green rows = Winners (ACOS <25%)

4. **Click Approval dropdown** for each campaign:
   - 🔴 CRITICAL + High spend → ❌ REJECT (pause)
   - 🟠 HIGH + Good VPC → ✅ APPROVE (reduce bid)
   - 🟢 LOW + Great ACOS → ✅ APPROVE (increase bid)

5. **Watch row highlight** as you approve/reject

**Stats update in real-time:**

```
Approved: 5 → 6 → 7 ... → 18 ✅
```

---

### **Day 1 Evening: Export & Upload**

**In Google Sheets:**

1. Click **🎯 PPC Optimizer** menu
2. Click **📊 Generate Bulk File**
3. Dialog appears: "Which set? (A/B/Both)"
4. Select "Set A only"
5. Copy command: `node generate-bulk-csv.js --set-a`

**In Terminal:**

```bash
node generate-bulk-csv.js --set-a
```

**Output:**

```
✅ Bulk file generated: amazon-bulk-set-a-2026-02-01.xlsx
   Approved campaigns: 8
   Approved keywords: 45
   Total changes: 45
```

**Upload to Amazon:**

1. Open Excel file
2. Amazon Ads Console → Bulk Operations → Upload File
3. Review changes preview
4. Click "Apply"

**Done!** 🎉

---

## 📋 IMPLEMENTATION CHECKLIST

### Google Sheets Setup

- [ ] Add conditional formatting (Priority, Action, Approval columns)
- [ ] Add data validation dropdowns (Approval column)
- [ ] Create dashboard rows (1-9) with formulas
- [ ] Freeze header rows (1-10)
- [ ] Add Apps Script custom menu

### Apps Script Development

- [ ] Create `onOpen()` function
- [ ] Create `generateBulkFile()` function
- [ ] Create `getApprovedCampaigns()` filter
- [ ] Create `viewStats()` dashboard
- [ ] Test menu functionality

### Node.js Script Enhancement

- [ ] Add `--set-a` and `--set-b` command-line flags
- [ ] Filter keywords by approval status
- [ ] Generate Excel file with Amazon's template format
- [ ] Add success/error logging

---

## ✅ FINAL RESULT

**What you'll have:**

1. **Visual Dashboard** - See stats at a glance
2. **Color-Coded Priorities** - Know what to review first
3. **One-Click Approval** - Dropdown menu per campaign
4. **Real-Time Highlighting** - Approved rows turn green
5. **Button to Export** - "Generate Bulk File" in menu
6. **Filtered Downloads** - Get Set A, Set B, or both
7. **Upload to Amazon** - Guaranteed format compatibility

**Time to review 50 campaigns:** ~10 minutes  
**Time to generate bulk file:** ~5 seconds  
**Time to upload to Amazon:** ~2 minutes

**Total time from sync to live:** < 20 minutes 🚀

---

**Status:** ✅ UX DESIGN COMPLETE  
**Next Step:** Implement Google Sheets conditional formatting and Apps Script
