from playwright.sync_api import sync_playwright
import json

URL = "https://www.amazon.com/s?k=dihydroberberine&crid=22AJ18R4YJDU5&sprefix=dihy%2Caps%2C170&ref=nb_sb_ss_p13n-expert-pd-ops-ranker_1_4"

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        args=["--disable-blink-features=AutomationControlled"]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 900}
    )
    page = context.new_page()
    page.goto(URL, wait_until="load", timeout=30000)
    page.wait_for_timeout(4000)  # let JS render results
    page.screenshot(path="amazon-search.png", full_page=False)

    products = page.evaluate("""() => {
        const results = [];
        const items = document.querySelectorAll('[data-asin]');
        let rank = 1;
        for (const item of items) {
            const asin = item.getAttribute('data-asin');
            if (!asin || asin.length < 10) continue;

            const titleEl = item.querySelector('h2 span, h2 a span');
            const brandEl = item.querySelector('.a-row .a-size-base+ .a-size-base, [data-cy="reviews-block"] + .a-section .a-row span, h2');
            const sponsoredEl = item.querySelector('.puis-sponsored-label-text, [data-component-type="sp-sponsored-result"]');

            const title = titleEl ? titleEl.innerText.trim() : '';
            if (!title) continue;

            results.push({
                rank: rank++,
                asin: asin,
                title: title.substring(0, 100),
                sponsored: !!sponsoredEl
            });
        }
        return results;
    }""")

    print(f"\\n{'='*70}")
    print(f"  DIHYDROBERBERINE — Amazon Search Results")
    print(f"  URL: {URL[:60]}...")
    print(f"{'='*70}")
    print(f"{'#':<4} {'ASIN':<12} {'S':<3} {'Title'}")
    print(f"{'-'*70}")

    organic_rank = 1
    for p_item in products:
        s_flag = "[AD]" if p_item['sponsored'] else f"#{organic_rank}"
        if not p_item['sponsored']:
            organic_rank += 1
        print(f"{s_flag:<4} {p_item['asin']:<12} {p_item['title']}")

    print(f"{'-'*70}")
    print(f"Total: {len(products)} products  |  Screenshot: amazon-search.png")
    print(f"{'='*70}\\n")

    browser.close()
