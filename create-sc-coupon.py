"""
Seller Central Coupon Creator — Chrome CDP Automation
======================================================
Creates an Amazon coupon in Seller Central by connecting to your
already-logged-in Chrome browser via Chrome DevTools Protocol (CDP).

SETUP (run once before this script):
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ^
    --remote-debugging-port=9222 ^
    --user-data-dir="%TEMP%\\chrome-sc"
  Then log in to sellercentral.amazon.com in that window.

USAGE:
  python create-sc-coupon.py --asin B0DTDZFMY7 --discount 20 --budget 50
  python create-sc-coupon.py --asin B0DTDZFMY7 --discount 20 --budget 50 --dry-run
  python create-sc-coupon.py --help
"""

import argparse
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SC_COUPON_URL = "https://sellercentral.amazon.com/coupons/create-new"
CDP_URL = "http://localhost:9222"


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(
        description="Create an Amazon Seller Central coupon via Chrome automation"
    )
    p.add_argument("--asin",     required=True,  help="Product ASIN (e.g. B0DTDZFMY7)")
    p.add_argument("--discount", required=True,  type=int, help="Percentage off (e.g. 20 for 20%%)")
    p.add_argument("--budget",   required=True,  type=float, help="Max redemption budget in USD")
    p.add_argument("--days",     default=30,     type=int, help="Coupon duration in days (1-90, default 30)")
    p.add_argument("--title",    default=None,   help="Coupon title (auto-generated if omitted)")
    p.add_argument("--tracking", default=None,   help="Tracking ID / internal name (auto-generated if omitted)")
    p.add_argument("--dry-run",  action="store_true", help="Screenshot each step but do NOT submit")
    return p.parse_args()


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def screenshot_dir():
    d = Path(f"coupon-creation-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    d.mkdir(exist_ok=True)
    return d


def snap(page, step: int, label: str, out_dir: Path):
    path = out_dir / f"step-{step}-{label}.png"
    page.screenshot(path=str(path))
    print(f"   📸 Screenshot: {path}")


def wait_and_fill(page, selector: str, value: str, timeout: int = 10000):
    page.wait_for_selector(selector, timeout=timeout)
    page.fill(selector, value)


def wait_and_click(page, selector: str, timeout: int = 10000):
    page.wait_for_selector(selector, timeout=timeout)
    page.click(selector)


def fmt_date(d: datetime) -> str:
    return d.strftime("%m/%d/%Y")


def check_login(page):
    """Return True if we're on a login page."""
    return "signin" in page.url or "ap/signin" in page.url


# ─────────────────────────────────────────────────────────────
# Main automation
# ─────────────────────────────────────────────────────────────
def create_coupon(args):
    out_dir = screenshot_dir()
    today = datetime.now()
    start_date = today + timedelta(days=1)
    end_date = start_date + timedelta(days=args.days)

    title = args.title or f"ELEMNT {args.discount}% Off - {start_date.strftime('%b %Y')}"
    tracking = args.tracking or f"ELEMNT-{args.asin}-{today.strftime('%Y%m%d')}"

    print(f"\n{'='*60}")
    print(f"  SELLER CENTRAL COUPON CREATOR")
    print(f"{'='*60}")
    print(f"  ASIN:      {args.asin}")
    print(f"  Discount:  {args.discount}% off")
    print(f"  Budget:    ${args.budget:.2f}")
    print(f"  Duration:  {args.days} days ({fmt_date(start_date)} → {fmt_date(end_date)})")
    print(f"  Title:     {title}")
    print(f"  Tracking:  {tracking}")
    print(f"  Mode:      {'DRY RUN (no submit)' if args.dry_run else 'LIVE — will submit'}")
    print(f"  Output:    {out_dir}/")
    print(f"{'='*60}\n")

    with sync_playwright() as pw:
        # ── Connect to existing Chrome via CDP ──────────────────
        print("🔌 Connecting to Chrome on port 9222...")
        try:
            browser = pw.chromium.connect_over_cdp(CDP_URL)
        except Exception:
            print("\n❌ Could not connect to Chrome on port 9222.\n")
            print("   Run this command first to open Chrome with debugging:\n")
            print('   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" '
                  '--remote-debugging-port=9222 '
                  '--user-data-dir="%TEMP%\\chrome-sc"\n')
            print("   Then log in to sellercentral.amazon.com and run this script again.")
            sys.exit(1)

        context = browser.contexts[0]
        page = context.new_page()
        print("   ✅ Connected\n")

        # ── Navigate to coupon creation ─────────────────────────
        print(f"🌐 Navigating to Seller Central Coupons...")
        page.goto(SC_COUPON_URL, wait_until="load", timeout=30000)
        page.wait_for_timeout(3000)

        # Check if redirected to login
        if check_login(page):
            print("⚠️  Not logged in. Please log in to Seller Central in the Chrome window.")
            print("   Waiting up to 60 seconds for login...")
            for _ in range(60):
                time.sleep(1)
                if not check_login(page):
                    break
            else:
                print("❌ Login timeout. Please log in and retry.")
                sys.exit(1)
            print("   ✅ Logged in — continuing\n")
            page.goto(SC_COUPON_URL, wait_until="load", timeout=30000)
            page.wait_for_timeout(3000)

        snap(page, 1, "initial", out_dir)

        # ── STEP 1: Product Selection ───────────────────────────
        print("📦 Step 1: Product Selection")
        try:
            # Tracking / campaign name field
            tracking_sel = 'input[name*="trackingId"], input[id*="trackingId"], input[placeholder*="Tracking"]'
            wait_and_fill(page, tracking_sel, tracking)
            print(f"   ✅ Tracking ID: {tracking}")

            # ASIN list textarea
            asin_sel = 'textarea[name*="asin"], textarea[id*="asin"], textarea[placeholder*="ASIN"]'
            wait_and_fill(page, asin_sel, args.asin)
            print(f"   ✅ ASIN: {args.asin}")

            snap(page, 1, "filled", out_dir)

            # Next button
            next_sel = 'button[data-testid*="next"], button:has-text("Next"), input[value="Next"]'
            wait_and_click(page, next_sel)
            page.wait_for_timeout(2000)
            print("   ✅ Clicked Next\n")

        except PlaywrightTimeout as e:
            snap(page, 1, "error", out_dir)
            print(f"❌ Step 1 failed — selector not found: {e}")
            print("   The Seller Central UI may have changed. Check step-1-error.png")
            sys.exit(1)

        # ── STEP 2: Discount & Budget ───────────────────────────
        print("💰 Step 2: Discount & Budget")
        try:
            snap(page, 2, "initial", out_dir)

            # Select "Percentage off" radio
            pct_radio = 'input[value*="percent"], input[id*="percent"], label:has-text("Percentage")'
            wait_and_click(page, pct_radio)
            print("   ✅ Selected: Percentage off")

            # Discount percentage
            pct_input = 'input[name*="discount"], input[id*="discount"], input[placeholder*="%"]'
            wait_and_fill(page, pct_input, str(args.discount))
            print(f"   ✅ Discount: {args.discount}%")

            # Budget
            budget_sel = 'input[name*="budget"], input[id*="budget"], input[placeholder*="budget"]'
            wait_and_fill(page, budget_sel, str(args.budget))
            print(f"   ✅ Budget: ${args.budget:.2f}")

            # Start date
            start_sel = 'input[name*="start"], input[id*="startDate"], input[placeholder*="start"]'
            wait_and_fill(page, start_sel, fmt_date(start_date))
            print(f"   ✅ Start: {fmt_date(start_date)}")

            # End date
            end_sel = 'input[name*="end"], input[id*="endDate"], input[placeholder*="end"]'
            wait_and_fill(page, end_sel, fmt_date(end_date))
            print(f"   ✅ End: {fmt_date(end_date)}")

            snap(page, 2, "filled", out_dir)

            wait_and_click(page, next_sel)
            page.wait_for_timeout(2000)
            print("   ✅ Clicked Next\n")

        except PlaywrightTimeout as e:
            snap(page, 2, "error", out_dir)
            print(f"❌ Step 2 failed: {e}")
            sys.exit(1)

        # ── STEP 3: Coupon Details ──────────────────────────────
        print("🏷️  Step 3: Coupon Details")
        try:
            snap(page, 3, "initial", out_dir)

            title_sel = 'input[name*="title"], input[id*="title"], input[placeholder*="title"]'
            wait_and_fill(page, title_sel, title)
            print(f"   ✅ Title: {title}")

            snap(page, 3, "filled", out_dir)

            wait_and_click(page, next_sel)
            page.wait_for_timeout(2000)
            print("   ✅ Clicked Next\n")

        except PlaywrightTimeout as e:
            snap(page, 3, "error", out_dir)
            print(f"❌ Step 3 failed: {e}")
            sys.exit(1)

        # ── STEP 4: Review & Submit ─────────────────────────────
        print("👀 Step 4: Review")
        snap(page, 4, "review", out_dir)

        if args.dry_run:
            print("\n✅ DRY RUN complete — coupon NOT submitted.")
            print(f"   Review screenshots in: {out_dir}/")
            print("\n   To submit for real, re-run without --dry-run\n")
        else:
            print("🚀 Submitting coupon...")
            try:
                submit_sel = 'button[type="submit"], button:has-text("Submit"), button:has-text("Create")'
                wait_and_click(page, submit_sel)
                page.wait_for_timeout(4000)
                snap(page, 4, "submitted", out_dir)

                # Try to grab coupon ID from confirmation
                coupon_id = None
                try:
                    id_el = page.locator('[class*="coupon-id"], [id*="coupon"], strong').first
                    coupon_id = id_el.inner_text(timeout=5000).strip()
                except Exception:
                    pass

                print(f"\n✅ Coupon submitted!")
                if coupon_id:
                    print(f"   Coupon ID: {coupon_id}")
                print(f"   Verify at: https://sellercentral.amazon.com/coupons")
                print(f"   Screenshots: {out_dir}/\n")

            except PlaywrightTimeout as e:
                snap(page, 4, "submit-error", out_dir)
                print(f"❌ Submit failed: {e}")
                sys.exit(1)

        browser.close()


# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    args = parse_args()

    if not (1 <= args.discount <= 80):
        print("❌ Discount must be between 1% and 80%")
        sys.exit(1)
    if args.budget < 1:
        print("❌ Budget must be at least $1")
        sys.exit(1)
    if not (1 <= args.days <= 90):
        print("❌ Days must be between 1 and 90")
        sys.exit(1)

    create_coupon(args)
