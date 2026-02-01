# ⚡ BULK EXPORT: QUICK CLARIFICATIONS

## Question 1: "Is each option only 1 campaign?"

### **NO - Each option exports MULTIPLE campaigns**

The "Choose output type" options refer to **how you want to organize/filter** the export, NOT limiting to 1 campaign.

### Example Scenario

**Your account has:**

- 20 total campaigns
- 10 tagged as `[KW-ONLY]` (Set A)
- 10 tagged as `[KW+AUD]` (Set B)

**You review Google Sheets and approve keyword changes for:**

- 8 campaigns from Set A
- 7 campaigns from Set B
- **Total: 15 campaigns approved**

### Output Options Explained

#### **Option 1: Single File (All Approved Changes)**

- **Result:** 1 Excel file
- **Contains:** All 15 approved campaigns (both Set A and Set B mixed together)
- **Filename:** `amazon-bulk-all-changes-2026-02-01.xlsx`
- **Use case:** You want to apply all changes at once

#### **Option 2: Two Files (Set A vs Set B)**

- **Result:** 2 Excel files
- **File 1:** `amazon-bulk-set-a-2026-02-01.xlsx` (8 Set A campaigns)
- **File 2:** `amazon-bulk-set-b-2026-02-01.xlsx` (7 Set B campaigns)
- **Use case:** Upload changes separately to maintain clean A/B test separation

#### **Option 3: Filtered File (Only Set A OR Only Set B)**

- **Result:** 1 Excel file
- **Option 3a:** Only Set A (`amazon-bulk-set-a-only-2026-02-01.xlsx`) - 8 campaigns
- **Option 3b:** Only Set B (`amazon-bulk-set-b-only-2026-02-01.xlsx`) - 7 campaigns
- **Use case:** You only want to apply one test group's changes today

---

## Question 2: "Make sure it follows Amazon's bulk template"

### **100% AGREED - This is CRITICAL**

**BEFORE we write any export code, you MUST:**

### Step 1: Download Amazon's Official Template

1. Login to **Amazon Ads Console**
2. Click **"Bulk Operations"** (left sidebar)
3. Click **"Download a blank template for bulk operations"**
4. Select **"Sponsored Products"**
5. Save as: `amazon-sp-bulk-template.xlsx`

### Step 2: Share Template with Me

**Option A:** Place file in your workspace: `C:\Users\AATTARAN\workspace\amazon-ppc-platform\templates\amazon-sp-bulk-template.xlsx`

**Option B:** Tell me the exact column names/order from the template

### Step 3: I'll Match Format 100%

Once I see the template, I will:

- ✅ Use **exact column names** (case-sensitive)
- ✅ Use **exact column order**
- ✅ Include **all columns** (even if we don't fill them all)
- ✅ Use **same data types** (text, numbers, dates)
- ✅ Follow **same validation rules**

### Why This Matters

❌ **If we guess the format:**

- Amazon rejects the upload
- Error messages are cryptic
- Wasted time debugging

✅ **If we use the official template:**

- Upload succeeds first try
- Amazon accepts changes instantly
- Zero format errors

---

## 🚨 CRITICAL: Don't Start Coding Until

- [ ] You download Amazon's SP bulk template
- [ ] You place it in the workspace (or share column structure)
- [ ] I verify the format before writing `generate-bulk-csv.js`

**Once we have the template, implementation will be fast and error-free!**

---

**Status:** ⏸️ PAUSED - Waiting for Amazon bulk template  
**Next Step:** User downloads official template from Amazon Ads Console
