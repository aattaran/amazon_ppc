"""Generate individual PNG images for each of the 8 SOP flows using Playwright."""
import asyncio
from playwright.async_api import async_playwright
import os

HTML_PATH = os.path.join(os.path.dirname(__file__), "amazon-ppc-sop-flows.html")
OUT_DIR = os.path.join(os.path.dirname(__file__), "flows")

FLOW_NAMES = [
    "01-pre-launch-readiness",
    "02-campaign-structure",
    "03-launch-phase",
    "04-bid-optimization",
    "05-sales-funnel",
    "06-scaling-phase",
    "07-weekly-maintenance",
    "08-tacos-journey",
]

async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        await page.goto(file_url, wait_until="networkidle")
        # Wait for all Mermaid diagrams to render
        await page.wait_for_timeout(5000)

        sections = await page.query_selector_all(".section")
        for i, section in enumerate(sections):
            if i >= len(FLOW_NAMES):
                break
            out_path = os.path.join(OUT_DIR, f"{FLOW_NAMES[i]}.png")
            await section.screenshot(path=out_path, type="png")
            print(f"Saved: {out_path}")

        await browser.close()
    print(f"\nDone — {len(FLOW_NAMES)} PNGs saved to {OUT_DIR}")

asyncio.run(main())
