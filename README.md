# FoodCheck

A free, public website: type a packaged food's name or barcode, or take a photo, and it shows the ingredients and flags what you picked to avoid (allergies, meat, eggs, gelatin, carmine, alcohol, halal/kosher/Jain issues, and "hidden" sources like whey = milk or L-cysteine = feathers/hair).

It's 5 static files with no server, so hosting is free.

| File | What it is |
|---|---|
| `index.html` | The page |
| `app.js` | Lookups, barcode/photo reading, analysis, display |
| `rules.js` | The ingredient knowledge: ~50 rules, each with trigger words, exceptions (cocoa butter is not dairy, eggplant is not egg) and a plain-English note. Edit this to add ingredients. |
| `styles.css` | Look and feel (light and dark mode) |
| `config.js` | Your USDA API key |

## How it works

1. **Text box.** A barcode number looks it up directly. A product name searches. Anything that looks like an ingredient list (3+ commas, or starts with "Ingredients:") is analyzed right away.
2. **Photo button.** On a phone it offers the camera or photo library.
   - First it looks for a barcode (the phone's built-in barcode reader, or the free ZXing library).
   - No barcode? It reads the text with Tesseract OCR (free, runs on the phone). If it sees "Ingredients", it analyzes that text. Otherwise it searches using the words it read.
3. **Lookup**, all free:
   - **Open Food Facts** (no key, ~4M products, good US coverage, includes allergen tags). Tried first.
   - **USDA FoodData Central, Branded Foods** (free key, ~450k US products, ingredient lists come straight from manufacturers). Used when Open Food Facts doesn't have the product or lacks its ingredients.
4. **Analysis** runs in the browser against the concerns the user picked under "My concerns" (saved on their device). Results are "Contains" (red), "Check" (amber: may come from an animal, may contain alcohol, cross-contact warnings) or "No flags".
5. **Find it at** links open the same product search on Walmart, Target, Costco, Trader Joe's, Kroger and Instacart.

## Put it online for free (about 10 minutes)

**GitHub Pages** (recommended):
1. Create a free GitHub account and a new **public** repository, e.g. `foodcheck`.
2. Upload these 5 files (Add file > Upload files).
3. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. Your site is live at `https://<your-username>.github.io/foodcheck/` within a minute or two.

Alternatives that are just as free: **Cloudflare Pages** or **Netlify** (drag the folder onto their dashboard). Any of them gives you HTTPS, which phones need for the camera. A custom domain (~$10/year) is the only thing that costs money, and it's optional.

**Get your own USDA key** (free, 1 minute): sign up at https://fdc.nal.usda.gov/api-key-signup, then put it in `config.js`. The built-in `DEMO_KEY` is limited to about 30 searches an hour per visitor. The key is visible in the page; that's normal for this API, the worst case is someone uses up your quota.

**Try it on your computer first:** in this folder run `python3 -m http.server 8000` and open http://localhost:8000.

## Connecting to US grocery stores: the honest picture

None of the big stores offer a free, open API with ingredient lists, and scraping their sites breaks their terms of service and gets blocked. Realistic options, cheapest first:

| Option | Cost | What you get |
|---|---|---|
| **Barcode lookup (already built)** | Free | Almost every packaged product at Walmart, Costco, Target, Kroger etc. has a UPC barcode that's in Open Food Facts or USDA. Scanning the barcode in the store is the most reliable "connection". |
| **Store search links (already built)** | Free | One tap to the product on each store's site. |
| **Open Food Facts contributions** | Free | Trader Joe's and Costco Kirkland store brands are less complete. Users can add missing products on openfoodfacts.org from their phone, and the app picks them up immediately. |
| **Kroger Developer API** | Free | Official product search/UPC/price/store-availability API (Kroger, Ralphs, Fred Meyer, King Soopers, etc.). Good for "is it in stock near me"; ingredient data there is not reliable, so keep using OFF/USDA for ingredients. Needs a tiny server or serverless function to hold the secret. |
| **Walmart affiliate API (walmart.io)** | Free, approval needed | Product search and details for affiliates. Requires applying as a Walmart affiliate. |
| **Instacart Developer Platform** | Free to join, approval needed | Lets you send users to a cart/shopping list across many US stores (Costco, Aldi, Publix, Safeway...). |
| **Paid nutrition databases** (Nutritionix, Spoonacular, Edamam, Syndigo) | Free tiers are small; real use is paid | Larger store-brand coverage. Worth it only if the free sources aren't enough. |

Trader Joe's and Costco have no public APIs at all. I haven't verified current terms for each paid service; check before signing up.

## Ideas for later

- **AI fallback**: when a product isn't in any database, send the label photo to a vision AI model to read and explain the ingredients. Better than OCR on curved or glossy packaging, but costs a few cents per photo and needs a small server to hide the API key.
- **Live camera scanning** instead of taking a photo.
- **Spanish and other languages** (Tesseract and Open Food Facts both support them).
- **"Share this result"** link for a product.

## Limits to be upfront about

- Data is only as good as Open Food Facts/USDA, and recipes change. The page says so and tells people to read the package.
- "Natural flavors", mono- and diglycerides, enzymes and similar ingredients can't be resolved from a label; the app flags them as "Check" and explains why.
- Halal/kosher depends on certification, not just ingredients. The app flags problem ingredients; it can't confirm something is halal or kosher.
- Photo OCR on curved, shiny packages is hit or miss. The barcode is far more reliable.
