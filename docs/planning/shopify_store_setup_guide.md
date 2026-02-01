# Shopify Store Setup Guide - Phase 3 PPC Automation

**Objective**: Set up a simple Shopify store to enable Amazon Attribution tracking and external traffic campaigns.

**Estimated Time**: 1-2 hours  
**Cost**: $1 for first month, then $39/month (Basic plan)

---

## Prerequisites

- [ ] Amazon Seller Central account (you have this)
- [ ] Amazon ASIN: **B0DTDZFMY7** (ELEMNT Super Berberine)
- [ ] Credit card for Shopify trial
- [ ] Facebook Business Manager account (create if needed)
- [ ] Google Analytics 4 property (create if needed)

---

## Step 1: Create Shopify Account (5 minutes)

1. **Go to** [shopify.com](https://www.shopify.com)
2. **Click** "Start free trial"
3. **Enter**:
   - Email address
   - Password
   - Store name: `elemnt-supplements` (or your brand name)
4. **Skip** the setup questionnaire (click "Skip" at bottom)
5. **Choose plan**: Select **Basic** ($39/month, but first month is $1)
6. **Enter payment details** (won't be charged until trial ends)

✅ **Your store URL will be**: `elemnt-supplements.myshopify.com`

---

## Step 2: Create Product Listings (20 minutes)

You'll create 2-3 simple product pages that link to Amazon.

### Product 1: ELEMNT Super Berberine (Main Product)

1. **Go to**: Shopify Admin → Products → Add product
2. **Fill in**:
   - **Title**: `ELEMNT Super Berberine - Advanced Blood Sugar Support`
   - **Description**: Copy from your Amazon listing (benefits, ingredients, etc.)
   - **Images**: Download from Amazon listing and upload here
   - **Price**: Set to match Amazon (e.g., $29.99)
   - **Inventory**: Set to "Don't track inventory"

3. **Add "Buy on Amazon" Button**:
   - Scroll to **Product availability** section
   - **Uncheck** "This is a physical product"
   - In the description, add:

     ```html
     <a href="https://www.amazon.com/dp/B0DTDZFMY7" 
        style="display:inline-block;background:#FF9900;color:white;padding:12px 24px;
               text-decoration:none;border-radius:4px;font-weight:bold;margin-top:20px;">
        Buy on Amazon
     </a>
     ```

   - **Note**: We'll add Attribution tracking to this link later

4. **Click** "Save"

### Product 2 & 3: Optional Support Pages

Create 2 more simple "products" or use them as landing pages:

- **Product 2**: Bundle/multi-pack (links to Amazon multi-pack listing if you have one)
- **Product 3**: Related product (e.g., other supplements you sell)

---

## Step 3: Create Landing Pages (15 minutes)

### Support Page

1. **Go to**: Online Store → Pages → Add page
2. **Title**: `Support`
3. **Content**:

   ```markdown
   # Product Support
   
   Have questions about ELEMNT Super Berberine? We're here to help!
   
   ## Frequently Asked Questions
   
   **Q: How do I take this supplement?**
   A: Take [dosage] with meals, or as directed by your healthcare provider.
   
   **Q: What are the ingredients?**
   A: [List key ingredients]
   
   **Q: How long until I see results?**
   A: Most customers report benefits within 2-4 weeks of consistent use.
   
   ## Contact Us
   Email: support@youremail.com
   ```

4. **Click** "Save"

### Warranty/Guarantee Page

1. **Add another page**: Pages → Add page
2. **Title**: `Money-Back Guarantee`
3. **Content**:

   ```markdown
   # 100% Satisfaction Guarantee
   
   We stand behind ELEMNT Super Berberine with a 30-day money-back guarantee.
   
   If you're not completely satisfied, contact Amazon customer service for a full refund.
   
   [Buy on Amazon](https://www.amazon.com/dp/B0DTDZFMY7)
   ```

4. **Click** "Save"

---

## Step 4: Install Meta Pixel (10 minutes)

> [!IMPORTANT]
> This pixel will collect visitor data for retargeting campaigns on Facebook/Instagram.

### Get Your Pixel ID

1. **Go to**: [Facebook Business Manager](https://business.facebook.com)
2. **Navigate to**: Events Manager → Data Sources → Add → Web
3. **Create pixel**: Name it `ELEMNT Supplements Pixel`
4. **Copy** the Pixel ID (format: `123456789012345`)

### Install in Shopify

1. **Go to**: Shopify Admin → Settings → Customer events
2. **Click**: "Add custom pixel"
3. **Name**: `Meta Pixel`
4. **Paste** this code:

   ```javascript
   !function(f,b,e,v,n,t,s)
   {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
   n.callMethod.apply(n,arguments):n.queue.push(arguments)};
   if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
   n.queue=[];t=b.createElement(e);t.async=!0;
   t.src=v;s=b.getElementsByTagName(e)[0];
   s.parentNode.insertBefore(t,s)}(window, document,'script',
   'https://connect.facebook.net/en_US/fbevents.js');
   fbq('init', 'YOUR_PIXEL_ID_HERE'); // Replace with your actual pixel ID
   fbq('track', 'PageView');
   ```

5. **Replace** `YOUR_PIXEL_ID_HERE` with your actual pixel ID
6. **Click** "Save"

### Verify Installation

1. **Install** [Meta Pixel Helper Chrome Extension](https://chrome.google.com/webstore/detail/meta-pixel-helper/)
2. **Visit** your store: `elemnt-supplements.myshopify.com`
3. **Check** that extension shows green checkmark

---

## Step 5: Install Google Analytics (10 minutes)

### Get Measurement ID

1. **Go to**: [Google Analytics](https://analytics.google.com)
2. **Create property**: "ELEMNT Supplements Shopify"
3. **Select**: "Web" platform
4. **Copy** Measurement ID (format: `G-XXXXXXXXXX`)

### Install in Shopify

1. **Go to**: Shopify Admin → Online Store → Preferences
2. **Scroll to**: Google Analytics
3. **Paste** your Measurement ID in "Google Analytics account"
4. **Check**: "Use Enhanced Ecommerce"
5. **Click** "Save"

---

## Step 6: Amazon Attribution Setup (7-14 days)

> [!WARNING]
> This requires approval from Amazon and takes 7-14 business days.

### Request Access

1. **Go to**: [Amazon Attribution](https://advertising.amazon.com/solutions/products/amazon-attribution)
2. **Click**: "Get started"
3. **Fill out** the application form
4. **Wait** for approval email

### Once Approved: Create Attribution Tags

1. **Log into** Amazon Attribution dashboard
2. **Click**: "Create new tag"
3. **Select**:
   - **Channel**: Social media
   - **Publisher**: Facebook
   - **Product**: B0DTDZFMY7
4. **Copy** the Attribution URL (format: `https://www.amazon.com/dp/B0DTDZFMY7?maas=...`)

### Update Shopify "Buy on Amazon" Links

1. **Go back** to Shopify → Products → ELEMNT Super Berberine
2. **Replace** the Amazon link in the "Buy on Amazon" button with your Attribution URL
3. **Save**

---

## Step 7: Verify Everything Works (10 minutes)

### Checklist

- [ ] Visit your store: `your-store.myshopify.com`
- [ ] Click "Buy on Amazon" button → Should redirect to Amazon
- [ ] Check Meta Pixel Helper → Shows pixel is firing
- [ ] Check Google Analytics Realtime → Shows visitor
- [ ] Visit /support and /warranty pages → Load correctly

---

## Step 8: Domain Setup (Optional - 15 minutes)

If you want a custom domain (e.g., `elemntsupplements.com`):

1. **Go to**: Settings → Domains
2. **Click**: "Buy new domain" or "Connect existing domain"
3. **Follow** the wizard to set up DNS

---

## Next Steps: Launch Meta Retargeting Campaign

Once your pixel has collected 180 days of visitor data (or at minimum 100 unique visitors), you can:

1. Create a Custom Audience in Facebook Ads Manager
2. Build a Lookalike Audience (1%)
3. Launch retargeting ads ($20/day test budget)
4. Use Attribution links to measure the 10% Brand Referral Bonus

---

## Costs Summary

| Item | Cost |
|------|------|
| Shopify Basic Plan | $1 first month, then $39/mo |
| Custom Domain (optional) | ~$14/year |
| Meta Ads (optional) | $20/day test budget |
| **Total Month 1** | **$1-22** |

---

## Troubleshooting

### "Buy on Amazon" button not showing

- Check that you added the HTML in the product description
- Switch to "Show HTML" mode in the editor

### Pixel not firing

- Clear browser cache and revisit
- Verify pixel ID is correct
- Check browser console for errors

### Attribution not tracking

- Verify you're using the full Attribution URL (with `?maas=` parameter)
- Check that cookies are enabled
- Wait 24-48 hours for data to appear in dashboard

---

## Resources

- [Shopify Help Center](https://help.shopify.com)
- [Meta Pixel Setup Guide](https://www.facebook.com/business/help/952192354843755)
- [Amazon Attribution Help](https://advertising.amazon.com/help/GMCFFRRD59TK2WJK)
- [Google Analytics 4 Setup](https://support.google.com/analytics/answer/9304153)

---

**Need help?** Refer back to this guide or ask me specific questions about any step!
