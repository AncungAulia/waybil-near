/*
 * Compares what the app renders against design-spec.json, one screen at a time.
 *
 * How to run it:
 *   1. Start the app with the gallery on
 *        $env:NEXT_PUBLIC_GALLERY='on'; pnpm --filter @waybil/fe dev
 *   2. Open http://localhost:3001/dev/gallery in the browser
 *   3. Paste design-spec.json into the console as
 *        window.__designSpec = { ... }
 *      then paste this whole file, and
 *        await compareToDesign(["W1.1", "W1.2"])        // a few screens
 *        await compareToDesign()                         // every screen in the spec
 *
 * It reports, per screen: text the board draws that the app never renders, text the app
 * renders that the board does not draw, a font size that differs by more than 2 px, and a
 * different number of icons. It does not judge colour, spacing or motion, so a screen that
 * comes back clean still deserves one look.
 */

/** Set `window.__designSpec` from fe/review/design-spec.json, or serve it and set this. */
const SPEC_URL = "/review-design-spec.json";

/** The copy rules add a full stop the board leaves off, and the two write quotes differently. */
function normalise(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
}

/** The navbar, the footer note and the map are not part of what the board draws per screen. */
function isSkipped(el) {
  return (
    el.closest("nav, header") !== null ||
    el.closest("[role='img'], [role='region']") !== null ||
    normalise(el.textContent || "").startsWith("This demo uses sample data")
  );
}

function readScreen(doc, win) {
  const rows = [];
  /*
   * The board writes a line as one text node. The app often splits it over several spans, so
   * text is gathered per block and joined back before it is compared.
   */
  let group = null;
  const flush = () => {
    if (group && group.text.trim()) rows.push("T|" + group.size + "|" + normalise(group.text));
    group = null;
  };
  const walk = (el) => {
    if (el instanceof win.SVGElement) {
      if (!isSkipped(el)) rows.push("I|");
      return;
    }
    if (["NAV", "HEADER", "SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"].includes(el.tagName)) return;
    const style = win.getComputedStyle(el);
    /* A mobile-only block and a spoken-only label are not drawn at this width. */
    if (style.display === "none" || style.visibility === "hidden") return;
    if (typeof el.className === "string" && el.className.includes("sr-only")) return;
    const block = !style.display.startsWith("inline") && style.display !== "contents";
    if (block) flush();
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const text = node.textContent || "";
        if (text.trim() && !isSkipped(el)) {
          const size = Math.round(parseFloat(style.fontSize));
          if (!group) group = { text: "", size };
          /* Raw, so "#" and "1041" stay together; normalise collapses the gaps at the end. */
          group.text += text;
          group.size = Math.max(group.size, size);
        }
      } else if (node.nodeType === 1) {
        walk(node);
      }
    }
    if (block) flush();
  };
  walk(doc.body);
  flush();
  return rows;
}

function split(rows) {
  const texts = new Map();
  let icons = 0;
  for (const row of rows) {
    if (row.startsWith("I|")) {
      icons++;
      continue;
    }
    const [, size, ...rest] = row.split("|");
    const key = normalise(rest.join("|"));
    if (!texts.has(key)) texts.set(key, []);
    texts.get(key).push(Number(size));
  }
  return { texts, icons };
}

async function compareToDesign(codes) {
  const spec = window.__designSpec ?? (await fetch(SPEC_URL).then((r) => r.json()));
  const wanted = (codes ?? Object.keys(spec)).filter((c) => !c.startsWith("_"));
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-9999px;top:0;width:1440px;height:1400px;border:0";
  document.body.appendChild(frame);
  const report = [];

  for (const code of wanted) {
    await new Promise((done) => {
      frame.onload = () => done();
      frame.src = "/dev/gallery/screens/" + encodeURIComponent(code);
    });
    await new Promise((r) => setTimeout(r, 450));

    const want = split(spec[code]);
    const got = split(readScreen(frame.contentDocument, frame.contentWindow));
    const lines = [];

    for (const [text, sizes] of want.texts) {
      const mine = got.texts.get(text);
      if (!mine) {
        lines.push("  missing   " + JSON.stringify(text));
        continue;
      }
      if (Math.abs(mine[0] - sizes[0]) > 2)
        lines.push(
          "  size      " + JSON.stringify(text) + "  board " + sizes[0] + ", app " + mine[0],
        );
    }
    for (const text of got.texts.keys())
      if (!want.texts.has(text)) lines.push("  extra     " + JSON.stringify(text));
    if (want.icons !== got.icons)
      lines.push("  icons     board " + want.icons + ", app " + got.icons);

    if (lines.length) report.push(code + "\n" + lines.join("\n"));
  }

  frame.remove();
  const text = report.length ? report.join("\n") : "every screen matches";
  console.log(text);
  return text;
}

window.compareToDesign = compareToDesign;
