"""Generate PDF from the SOP flows HTML page using Playwright."""
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    html_path = os.path.join(os.path.dirname(__file__), "amazon-ppc-sop-flows.html")
    pdf_path = os.path.join(os.path.dirname(__file__), "Amazon-PPC-SOP-Flows.pdf")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(file_url, wait_until="networkidle")
        # Wait for Mermaid to finish rendering all diagrams
        await page.wait_for_timeout(5000)
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
        )
        await browser.close()
        print(f"PDF saved to: {pdf_path}")

asyncio.run(main())
