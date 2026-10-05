// FoodCheck: look up a packaged food's ingredients and flag what to be careful about.
// Everything runs in the browser. Data: Open Food Facts (no key) and USDA FoodData Central (free key).

const CONFIG = Object.assign({
  usdaKey: "DEMO_KEY", // get a free key at https://fdc.nal.usda.gov/api-key-signup and put it in config.js
  offBase: "https://world.openfoodfacts.org",
  offSearch: "https://search.openfoodfacts.org/search",
  usdaBase: "https://api.nal.usda.gov/fdc/v1",
  zxingUrl: "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js",
  tesseractUrl: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
}, window.FC_CONFIG || {});

const OFF_FIELDS = "code,product_name,product_name_en,brands,image_front_small_url,ingredients_text_en,ingredients_text,allergens_tags,traces_tags,ingredients_analysis_tags,countries_tags";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- preferences

const PREF_KEY = "foodcheck.concerns";
function loadPrefs() {
  try { return new Set(JSON.parse(localStorage.getItem(PREF_KEY) || "[]")); } catch (e) { return new Set(); }
}
function savePrefs(set) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify([...set])); } catch (e) { /* private mode */ }
}
let prefs = loadPrefs();

function renderPrefs() {
  const groups = {};
  for (const c of FC_CONCERNS) (groups[c.group] = groups[c.group] || []).push(c);
  $("#prefs").innerHTML = Object.entries(groups).map(([g, list]) => `
    <fieldset><legend>${esc(g)}</legend>
      ${list.map((c) => `<label class="chip"><input type="checkbox" value="${c.id}" ${prefs.has(c.id) ? "checked" : ""}><span>${esc(c.label)}</span></label>`).join("")}
    </fieldset>`).join("");
  updatePrefSummary();
}
function updatePrefSummary() {
  const names = FC_CONCERNS.filter((c) => prefs.has(c.id)).map((c) => c.label);
  $("#prefSummary").textContent = names.length ? names.join(", ") : "None picked yet: showing every concern found";
}

// ---------------------------------------------------------------- analysis

function expand(id, out = new Set()) {
  if (out.has(id)) return out;
  out.add(id);
  for (const x of FC_IMPLIES[id] || []) expand(x, out);
  return out;
}

const wordRe = (w) => new RegExp("(?<![a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+") + "(?:s|es)?(?![a-z0-9])", "g");
const reCache = new Map();
const getRe = (w) => { if (!reCache.has(w)) reCache.set(w, wordRe(w)); return reCache.get(w); };

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/_/g, " ") // Open Food Facts marks allergens like _milk_
    .replace(/\s+/g, " ")
    .trim();
}

// Where the "may contain / made in a facility" part of the label starts, if any.
function tracesStart(t) {
  const m = t.match(/(may contain|may also contain|made in a facility|manufactured (?:in|on)|processed (?:in|on)|produced (?:in|on)|packaged in a facility|shared (?:equipment|facility)|same equipment)/);
  return m ? m.index : -1;
}

// Returns { hits: [{concern, level, word, note, traces}], spans: [[start,end,level]] }
function analyze(rawText, product) {
  const text = normalize(rawText);
  const traceIdx = tracesStart(text);
  const active = prefs.size ? [...prefs] : FC_CONCERNS.map((c) => c.id);
  const scope = Object.fromEntries(active.map((c) => [c, expand(c)]));
  const hits = [];
  const spans = [];
  const seen = new Set();

  for (const rule of FC_RULES) {
    const concerns = active.filter((c) => rule.concerns.some((rc) => scope[c].has(rc)));
    if (!concerns.length) continue;
    // Blank out phrases that look like a match but aren't (cocoa butter, eggplant...).
    let masked = text;
    for (const ex of rule.exclude || []) masked = masked.replace(getRe(ex), (m) => " ".repeat(m.length));
    // Longest words first, blanking each match, so "wheat flour" isn't also reported as "flour".
    for (const w of [...rule.words].sort((a, b) => b.length - a.length)) {
      const re = getRe(w);
      re.lastIndex = 0;
      let m;
      const found = [];
      while ((m = re.exec(masked))) found.push([m.index, m[0]]);
      for (const [i, word] of found) masked = masked.slice(0, i) + " ".repeat(word.length) + masked.slice(i + word.length);
      for (const [index, word] of found) {
        m = { index, 0: word };
        const inTraces = traceIdx >= 0 && m.index > traceIdx;
        const level = rule.info ? "info" : inTraces ? "maybe" : rule.level;
        spans.push([m.index, m.index + m[0].length, level]);
        for (const c of concerns) {
          const key = c + "|" + m[0] + "|" + level;
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({ concern: c, base: rule.concerns, level, word: m[0], note: inTraces ? "Cross-contact warning on the label (may contain / made in a facility with). " + rule.note : rule.note, quiet: rule.quiet });
        }
      }
    }
  }

  // Signals from Open Food Facts' own tagging, when we have a product from there.
  if (product) {
    const addTag = (tag, level, note) => {
      const id = FC_OFF_TAGS[tag];
      if (!id) return;
      for (const c of active) {
        if (!scope[c].has(id)) continue;
        const key = c + "|tag:" + tag;
        if (seen.has(key)) continue;
        // Skip when the ingredient text already showed the same allergen at this level or worse.
        if (hits.some((h) => h.concern === c && (h.base || []).includes(id) && (h.level === "contains" || h.level === level))) continue;
        seen.add(key);
        const label = tag.replace(/^en:/, "").replace(/-/g, " ");
        hits.push({ concern: c, level, word: label, note });
      }
    };
    for (const t of product.allergenTags || []) addTag(t, "contains", "Listed as an allergen for this product on Open Food Facts.");
    for (const t of product.traceTags || []) addTag(t, "maybe", "Listed as a possible trace (may contain) on Open Food Facts.");
    const a = product.analysisTags || [];
    const flag = (ids, level, word, note) => {
      for (const c of active) {
        if (!ids.some((x) => scope[c].has(x)) || seen.has(c + "|" + word)) continue;
        seen.add(c + "|" + word);
        hits.push({ concern: c, level, word, note });
      }
    };
    if (a.includes("en:non-vegetarian")) flag(["vegetarian"], "contains", "non-vegetarian (Open Food Facts)", "Open Food Facts' ingredient analysis marks this product as not vegetarian.");
    if (a.includes("en:non-vegan")) flag(["vegan"], "contains", "non-vegan (Open Food Facts)", "Open Food Facts' ingredient analysis marks this product as not vegan.");
  }

  // Kosher meat + dairy mixing.
  if (prefs.has("kosher")) {
    const meat = hits.some((h) => h.level === "contains" && /beef|chicken|turkey|meat|lamb|veal|broth|gelatin/.test(h.word));
    const dairy = FC_RULES.filter((r) => r.concerns.includes("milk") && r.level === "contains").some((r) => {
      let masked = text;
      for (const ex of r.exclude || []) masked = masked.replace(getRe(ex), (m) => " ".repeat(m.length));
      return r.words.some((w) => masked.match(getRe(w)));
    });
    if (meat && dairy) hits.push({ concern: "kosher", level: "contains", word: "meat + dairy", note: "Has both meat and dairy ingredients, which kosher rules do not allow together." });
  }

  return { text, hits, spans };
}

function highlight(text, spans) {
  // Merge overlapping spans; "contains" wins over "maybe".
  const rank = { contains: 3, maybe: 2, info: 1 };
  const marks = new Array(text.length).fill(null);
  for (const [s, e, lvl] of spans) for (let i = s; i < e; i++) if (!marks[i] || rank[lvl] > rank[marks[i]]) marks[i] = lvl;
  let out = "", cur = null, buf = "";
  const flush = () => { if (buf) out += cur ? `<mark class="${cur}">${esc(buf)}</mark>` : esc(buf); buf = ""; };
  for (let i = 0; i < text.length; i++) { if (marks[i] !== cur) { flush(); cur = marks[i]; } buf += text[i]; }
  flush();
  return out;
}

// ---------------------------------------------------------------- data sources

async function getJSON(url, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const str = (v) => Array.isArray(v) ? v.join(", ") : v && typeof v === "object" ? (v.en || Object.values(v)[0] || "") : (v || "");

function fromOFF(p) {
  return {
    source: "Open Food Facts",
    code: p.code,
    name: str(p.product_name_en) || str(p.product_name) || "Unnamed product",
    brand: str(p.brands),
    image: p.image_front_small_url || "",
    ingredients: str(p.ingredients_text_en) || str(p.ingredients_text) || "",
    allergenTags: p.allergens_tags || [],
    traceTags: p.traces_tags || [],
    analysisTags: p.ingredients_analysis_tags || [],
    us: (p.countries_tags || []).includes("en:united-states"),
    url: `${CONFIG.offBase}/product/${encodeURIComponent(p.code)}`,
  };
}

function fromUSDA(f) {
  return {
    source: "USDA FoodData Central",
    code: f.gtinUpc || "",
    name: titleCase(f.description || "Unnamed product"),
    brand: titleCase(f.brandName || f.brandOwner || ""),
    image: "",
    ingredients: f.ingredients || "",
    allergenTags: [], traceTags: [], analysisTags: [],
    us: true,
    url: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`,
  };
}

function titleCase(s) {
  return /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function offByBarcode(code) {
  const tries = [code];
  if (code.length === 12) tries.push("0" + code);
  if (code.length === 13 && code.startsWith("0")) tries.push(code.slice(1));
  for (const c of tries) {
    try {
      const j = await getJSON(`${CONFIG.offBase}/api/v2/product/${c}.json?fields=${OFF_FIELDS}`);
      if (j && j.status === 1 && j.product) return fromOFF(Object.assign({ code: c }, j.product));
    } catch (e) { console.warn("OFF barcode", e); }
  }
  return null;
}

async function usdaSearch(query, pageSize = 8) {
  try {
    const j = await getJSON(`${CONFIG.usdaBase}/foods/search?api_key=${encodeURIComponent(CONFIG.usdaKey)}&dataType=Branded&pageSize=${pageSize}&query=${encodeURIComponent(query)}`);
    return (j.foods || []).map(fromUSDA);
  } catch (e) { console.warn("USDA", e); return []; }
}

async function usdaByBarcode(code) {
  const strip = (s) => String(s).replace(/^0+/, "");
  const list = await usdaSearch(code, 5);
  return list.find((p) => strip(p.code) === strip(code)) || null;
}

async function offSearch(q) {
  try {
    const j = await getJSON(`${CONFIG.offSearch}?q=${encodeURIComponent(q)}&page_size=12&langs=en&fields=${OFF_FIELDS}`);
    if (j && Array.isArray(j.hits)) return j.hits.map(fromOFF);
  } catch (e) { console.warn("OFF search-a-licious", e); }
  try {
    const j = await getJSON(`${CONFIG.offBase}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=${OFF_FIELDS}`);
    return (j.products || []).map(fromOFF);
  } catch (e) { console.warn("OFF search.pl", e); return []; }
}

async function searchProducts(q) {
  const [off, usda] = await Promise.all([offSearch(q), usdaSearch(q)]);
  const all = [...off, ...usda];
  // US products with ingredient lists first.
  const score = (p) => (p.ingredients ? 2 : 0) + (p.us ? 1 : 0);
  return all.map((p, i) => [p, i]).sort((a, b) => score(b[0]) - score(a[0]) || a[1] - b[1]).map((x) => x[0]);
}

// ---------------------------------------------------------------- photo input

function loadScript(src) {
  return new Promise((ok, fail) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

function fileToImage(file) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("Could not read that image"));
    img.src = URL.createObjectURL(file);
  });
}

function scaled(img, maxW) {
  const r = Math.min(1, maxW / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * r);
  c.height = Math.round(img.naturalHeight * r);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function readBarcode(img) {
  if ("BarcodeDetector" in window) {
    try {
      const d = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const r = await d.detect(img);
      if (r.length) return r[0].rawValue;
    } catch (e) { console.warn("BarcodeDetector", e); }
  }
  await loadScript(CONFIG.zxingUrl);
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  const reader = new ZXing.MultiFormatReader();
  reader.setHints(hints);
  for (const w of [1200, 800, 1800]) {
    const c = scaled(img, w);
    const src = new ZXing.HTMLCanvasElementLuminanceSource(c);
    // TRY_HARDER also tries the image turned sideways.
    try { return reader.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(src))).getText(); } catch (e) { /* not found at this size */ }
  }
  return null;
}

async function readText(file, onProgress) {
  await loadScript(CONFIG.tesseractUrl);
  const r = await Tesseract.recognize(file, "eng", { logger: (m) => m.status === "recognizing text" && onProgress(Math.round(m.progress * 100)) });
  return r.data.text || "";
}

// ---------------------------------------------------------------- UI

function setBusy(msg) {
  $("#results").innerHTML = `<div class="busy"><span class="spinner" aria-hidden="true"></span><span>${esc(msg)}</span></div>`;
}
function setNote(html) { $("#results").innerHTML = `<div class="note">${html}</div>`; }

function storeLinks(name) {
  const q = encodeURIComponent(name);
  const stores = [
    ["Walmart", `https://www.walmart.com/search?q=${q}`],
    ["Target", `https://www.target.com/s?searchTerm=${q}`],
    ["Costco", `https://www.costco.com/CatalogSearch?keyword=${q}`],
    ["Trader Joe's", `https://www.traderjoes.com/home/search?q=${q}&section=products`],
    ["Kroger", `https://www.kroger.com/search?query=${q}`],
    ["Instacart", `https://www.instacart.com/store/s?k=${q}`],
  ];
  return stores.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join("");
}

function renderList(list, q) {
  if (!list.length) {
    setNote(`No products found for <b>${esc(q)}</b>. Try the brand plus product name (e.g. "Kirkland almond butter"), scan the barcode, or paste the ingredient list from the package.`);
    return;
  }
  $("#results").innerHTML = `<h2 class="sub">Pick the product</h2><ul class="picks">${list.map((p, i) => `
    <li><button type="button" data-i="${i}">
      ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : `<span class="noimg" aria-hidden="true">?</span>`}
      <span class="pn"><b>${esc(p.name)}</b><small>${esc(p.brand)}${p.brand ? " · " : ""}${esc(p.source)}${p.ingredients ? "" : " · no ingredient list"}</small></span>
    </button></li>`).join("")}</ul>`;
  $("#results").querySelectorAll(".picks button").forEach((b) => b.addEventListener("click", () => renderProduct(list[+b.dataset.i])));
}

const LEVEL_TEXT = { contains: "Contains", maybe: "Check", info: "Note" };

let lastProduct = null;

function renderProduct(p) {
  lastProduct = p;
  if (!p.ingredients) {
    $("#results").innerHTML = `${productHead(p)}
      <div class="note">We found the product but not its ingredient list. Take a photo of the <b>ingredients panel</b> on the package and we'll read it, or paste the list into the box above.
      ${p.source === "Open Food Facts" ? ` You can also <a href="${esc(p.url)}" target="_blank" rel="noopener">add it on Open Food Facts</a> so it works for everyone next time.` : ""}</div>`;
    // Still show tag-based allergens if Open Food Facts has them.
    const { hits } = analyze("", p);
    if (hits.length) $("#results").insertAdjacentHTML("beforeend", verdict(hits));
    return;
  }
  const { text, hits, spans } = analyze(p.ingredients, p);
  $("#results").innerHTML = `${productHead(p)}${verdict(hits)}
    <details class="ingr" open><summary>Ingredients</summary><p>${highlight(text, spans)}</p>
      <p class="src">Source: <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a>. Recipes change. Always double-check the package you are holding.</p></details>
    ${p.name && p.source !== "Your photo" ? `<div class="stores"><span>Find it at</span>${storeLinks((p.brand ? p.brand.split(",")[0] + " " : "") + p.name)}</div>` : ""}`;
}

function productHead(p) {
  return `<div class="prod">${p.image ? `<img src="${esc(p.image)}" alt="">` : ""}<div><h2>${esc(p.name)}</h2><p>${esc(p.brand)}${p.code ? ` · UPC ${esc(p.code)}` : ""}</p></div></div>`;
}

function verdict(hits) {
  const labels = Object.fromEntries(FC_CONCERNS.map((c) => [c.id, c.label]));
  const by = {};
  for (const h of hits) if (!h.quiet || prefs.has(h.concern)) (by[h.concern] = by[h.concern] || []).push(h);
  const worst = (list) => list.some((h) => h.level === "contains") ? "contains" : list.some((h) => h.level === "maybe") ? "maybe" : "info";
  const order = { contains: 0, maybe: 1, info: 2 };
  const ids = Object.keys(by).sort((a, b) => order[worst(by[a])] - order[worst(by[b])]);
  const clear = [...prefs].filter((c) => !by[c]);

  let html = `<div class="cards">`;
  for (const id of ids) {
    const list = by[id].sort((a, b) => order[a.level] - order[b.level]);
    const w = worst(list);
    // Group same note together so the explanation shows once.
    const notes = new Map();
    for (const h of list) {
      const k = h.level + "|" + h.note;
      if (!notes.has(k)) notes.set(k, { level: h.level, note: h.note, words: [] });
      if (!notes.get(k).words.includes(h.word)) notes.get(k).words.push(h.word);
    }
    html += `<section class="card ${w}"><h3><span class="badge">${LEVEL_TEXT[w]}</span>${esc(labels[id])}</h3><ul>
      ${[...notes.values()].map((n) => `<li><span class="lvl ${n.level}">${LEVEL_TEXT[n.level]}</span> <b>${n.words.map(esc).join(", ")}</b><br><small>${esc(n.note)}</small></li>`).join("")}
    </ul></section>`;
  }
  if (clear.length) html += `<section class="card ok"><h3><span class="badge">No flags</span>${clear.map((c) => esc(labels[c])).join(", ")}</h3><p><small>Nothing in the ingredient list matched. That isn't a guarantee: check the package for allergen statements and certification symbols.</small></p></section>`;
  if (!ids.length && !clear.length) html += `<section class="card ok"><h3><span class="badge">No flags</span>Nothing we track was found</h3></section>`;
  if (!prefs.size) html += `<p class="hint">Tip: open <b>My concerns</b> and pick what you avoid, so you only see what matters to you.</p>`;
  return html + `</div>`;
}

// ---------------------------------------------------------------- handlers

async function handleQuery(raw) {
  const q = raw.trim();
  if (!q) return;
  const digits = q.replace(/[\s-]/g, "");
  if (/^\d{8,14}$/.test(digits)) return handleBarcode(digits);
  if (/^ingredients?\s*:/i.test(q) || (q.match(/,/g) || []).length >= 3) {
    return renderProduct({ source: "Your text", name: "Ingredient list you entered", brand: "", ingredients: q.replace(/^ingredients?\s*:\s*/i, ""), url: "#" });
  }
  setBusy(`Searching for "${q}"…`);
  renderList(await searchProducts(q), q);
}

async function handleBarcode(code) {
  setBusy(`Looking up barcode ${code}…`);
  const p = (await offByBarcode(code)) || (await usdaByBarcode(code));
  if (p && !p.ingredients) {
    // Open Food Facts had it without ingredients: see if USDA has the list.
    const u = await usdaByBarcode(code);
    if (u && u.ingredients) { u.image = p.image; return renderProduct(u); }
  }
  if (p) return renderProduct(p);
  setNote(`We couldn't find barcode <b>${esc(code)}</b> in Open Food Facts or USDA. Take a photo of the <b>ingredients panel</b> instead, or type the product name.`);
}

async function handlePhoto(file) {
  if (!file) return;
  try {
    setBusy("Looking for a barcode in your photo…");
    const img = await fileToImage(file);
    let code = null;
    try { code = await readBarcode(img); } catch (e) { console.warn(e); }
    if (code) return handleBarcode(code);

    setBusy("No barcode found. Reading the label text…");
    const text = await readText(file, (pct) => setBusy(`Reading the label text… ${pct}%`));
    const t = text.replace(/\s+/g, " ").trim();
    const at = t.search(/ingredients?\s*[:;.]?/i);
    if (at >= 0) {
      const ingr = t.slice(at).replace(/^ingredients?\s*[:;.]?\s*/i, "");
      return renderProduct({ source: "Your photo", name: "Ingredients read from your photo", brand: "", ingredients: ingr, url: "#" });
    }
    if (t.length > 3) {
      // Probably the front of the package: use the biggest words as a search.
      const guess = t.split(" ").filter((w) => /^[A-Za-z'&]{3,}$/.test(w)).slice(0, 6).join(" ");
      $("#q").value = guess;
      setBusy(`Searching for "${guess}"…`);
      const list = await searchProducts(guess);
      renderList(list, guess);
      $("#results").insertAdjacentHTML("afterbegin", `<p class="hint">We couldn't find a barcode or an ingredient list in the photo, so we searched for the words we could read. Fix the search above if it's off, or photograph the barcode or ingredients panel.</p>`);
      return;
    }
    setNote("We couldn't read that photo. Try again with the barcode or the ingredients panel filling most of the frame, in good light.");
  } catch (e) {
    console.error(e);
    setNote("Something went wrong reading the photo: " + esc(e.message));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderPrefs();
  $("#prefs").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    e.target.checked ? prefs.add(e.target.value) : prefs.delete(e.target.value);
    savePrefs(prefs);
    updatePrefSummary();
    if (lastProduct && document.querySelector("#results .prod, #results .cards")) renderProduct(lastProduct);
  });
  $("#form").addEventListener("submit", (e) => { e.preventDefault(); handleQuery($("#q").value); });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#form").requestSubmit(); } });
  $("#photo").addEventListener("change", (e) => { handlePhoto(e.target.files[0]); e.target.value = ""; });
});

// Exposed for tests.
window.FoodCheck = { analyze, handleQuery, handleBarcode, handlePhoto, prefs };
