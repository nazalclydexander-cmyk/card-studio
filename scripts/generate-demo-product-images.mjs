import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

import {
  demoManifestPath,
  demoProducts,
  ensureDemoAssetsDirectory,
  getVariantAbsolutePath,
  getVariantAltText,
  getVariantFileName,
  getVariantLabel,
  writeDemoManifest,
} from "./demo-product-catalog.mjs";

const PORTRAIT_WIDTH = 1200;
const PORTRAIT_HEIGHT = 1680;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createDecorationMarkup(product) {
  const style = product.decorativeStyle;
  const accent = product.palette.accent;
  const accentSoft = product.palette.accentSoft;
  const metallic = product.palette.metallic;

  if (style === "celestial") {
    return `
      <svg class="decor decor-celestial" viewBox="0 0 1200 1680" aria-hidden="true">
        <circle cx="915" cy="265" r="112" fill="${accentSoft}" opacity="0.18"></circle>
        <circle cx="880" cy="255" r="82" fill="none" stroke="${metallic}" stroke-width="6"></circle>
        <g fill="${metallic}" opacity="0.95">
          <circle cx="220" cy="245" r="7"></circle>
          <circle cx="274" cy="170" r="5"></circle>
          <circle cx="980" cy="380" r="6"></circle>
          <circle cx="1035" cy="320" r="4"></circle>
          <circle cx="930" cy="470" r="5"></circle>
        </g>
        <g stroke="${metallic}" stroke-width="3" stroke-linecap="round">
          <path d="M200 235 l0 -22"></path><path d="M200 235 l0 22"></path><path d="M200 235 l-22 0"></path><path d="M200 235 l22 0"></path>
          <path d="M1010 420 l0 -18"></path><path d="M1010 420 l0 18"></path><path d="M1010 420 l-18 0"></path><path d="M1010 420 l18 0"></path>
          <path d="M928 528 l0 -14"></path><path d="M928 528 l0 14"></path><path d="M928 528 l-14 0"></path><path d="M928 528 l14 0"></path>
        </g>
      </svg>
    `;
  }

  if (style === "minimal") {
    return `
      <div class="line-minimal top"></div>
      <div class="line-minimal bottom"></div>
    `;
  }

  if (style === "pastel") {
    return `
      <div class="blob one"></div>
      <div class="blob two"></div>
      <div class="blob three"></div>
      <div class="dots">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    `;
  }

  const flowerPetal = `
    <ellipse cx="0" cy="0" rx="28" ry="62" fill="${accentSoft}" opacity="0.72"></ellipse>
    <ellipse cx="0" cy="0" rx="18" ry="44" fill="${accent}" opacity="0.46" transform="rotate(22)"></ellipse>
  `;

  const leaf = `
    <path d="M0 0 C 56 -22, 100 -8, 126 18 C 84 48, 44 70, 0 64 C -8 40, -7 22, 0 0 Z"
      fill="${accentSoft}" opacity="0.72"></path>
    <path d="M8 32 C 38 28, 72 28, 120 30" stroke="${accent}" stroke-width="4" fill="none" opacity="0.7"></path>
  `;

  if (style === "botanical" || style === "woodland" || style === "greeting") {
    return `
      <svg class="decor decor-botanical" viewBox="0 0 1200 1680" aria-hidden="true">
        <g transform="translate(82 145) rotate(-10)">
          <g transform="translate(0 0)">${leaf}</g>
          <g transform="translate(65 110) rotate(26) scale(0.88)">${leaf}</g>
          <g transform="translate(122 212) rotate(42) scale(0.74)">${leaf}</g>
        </g>
        <g transform="translate(1090 145) scale(-1 1) rotate(-10)">
          <g transform="translate(0 0)">${leaf}</g>
          <g transform="translate(65 110) rotate(26) scale(0.88)">${leaf}</g>
          <g transform="translate(122 212) rotate(42) scale(0.74)">${leaf}</g>
        </g>
        <g transform="translate(92 1385) rotate(174)">
          <g transform="translate(0 0)">${leaf}</g>
          <g transform="translate(65 110) rotate(26) scale(0.88)">${leaf}</g>
          <g transform="translate(122 212) rotate(42) scale(0.74)">${leaf}</g>
        </g>
        <g transform="translate(1090 1385) scale(-1 1) rotate(174)">
          <g transform="translate(0 0)">${leaf}</g>
          <g transform="translate(65 110) rotate(26) scale(0.88)">${leaf}</g>
          <g transform="translate(122 212) rotate(42) scale(0.74)">${leaf}</g>
        </g>
      </svg>
    `;
  }

  if (style === "champagne") {
    return `
      <svg class="decor decor-champagne" viewBox="0 0 1200 1680" aria-hidden="true">
        <rect x="118" y="118" width="964" height="1444" rx="26" fill="none" stroke="${metallic}" stroke-width="3" opacity="0.8"></rect>
        <rect x="144" y="144" width="912" height="1392" rx="18" fill="none" stroke="${accentSoft}" stroke-width="2" opacity="0.8"></rect>
        <circle cx="600" cy="250" r="58" fill="none" stroke="${metallic}" stroke-width="2" opacity="0.55"></circle>
      </svg>
    `;
  }

  if (style === "thank-you") {
    return `
      <svg class="decor decor-thanks" viewBox="0 0 1200 1680" aria-hidden="true">
        <g transform="translate(150 230) rotate(-16)">
          ${leaf}
        </g>
        <g transform="translate(978 1425) rotate(158) scale(0.9)">
          ${leaf}
        </g>
      </svg>
    `;
  }

  return `
    <svg class="decor decor-floral" viewBox="0 0 1200 1680" aria-hidden="true">
      <g transform="translate(165 202)">
        <g transform="rotate(-12)">
          ${flowerPetal}
        </g>
        <g transform="rotate(40)">
          ${flowerPetal}
        </g>
        <g transform="rotate(92)">
          ${flowerPetal}
        </g>
        <circle r="18" fill="${metallic}" opacity="0.82"></circle>
      </g>
      <g transform="translate(1030 248)">
        <g transform="rotate(14)">
          ${flowerPetal}
        </g>
        <g transform="rotate(60)">
          ${flowerPetal}
        </g>
        <g transform="rotate(108)">
          ${flowerPetal}
        </g>
        <circle r="16" fill="${metallic}" opacity="0.8"></circle>
      </g>
      <g transform="translate(1036 1420)">
        <g transform="rotate(18)">
          ${flowerPetal}
        </g>
        <g transform="rotate(72)">
          ${flowerPetal}
        </g>
        <g transform="rotate(126)">
          ${flowerPetal}
        </g>
        <circle r="16" fill="${metallic}" opacity="0.8"></circle>
      </g>
      <g transform="translate(175 1410)">
        <g transform="rotate(-8)">
          ${flowerPetal}
        </g>
        <g transform="rotate(44)">
          ${flowerPetal}
        </g>
        <g transform="rotate(96)">
          ${flowerPetal}
        </g>
        <circle r="18" fill="${metallic}" opacity="0.82"></circle>
      </g>
    </svg>
  `;
}

function createInvitationMarkup(product, variant) {
  const bodyLines = product.copy.bodyLines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  const [primaryName, secondaryName] = product.copy.names;
  const namesBlock =
    secondaryName &&
    (product.copy.heading.toLowerCase().includes("wedding") ||
      product.name.toLowerCase().includes("save the date"))
      ? `
        <div class="names wedding">
          <span>${escapeHtml(primaryName)}</span>
          <span class="amp">&amp;</span>
          <span>${escapeHtml(secondaryName)}</span>
        </div>
      `
      : `
        <div class="names single">
          <span>${escapeHtml(primaryName)}</span>
          ${secondaryName ? `<span class="sub-name">${escapeHtml(secondaryName)}</span>` : ""}
        </div>
      `;

  const decorativeMarkup = createDecorationMarkup(product);
  const isMockup = variant === "mockup";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          :root {
            --bg: ${product.palette.background};
            --card: ${product.palette.cardBackground};
            --text: ${product.palette.text};
            --muted: ${product.palette.muted};
            --accent: ${product.palette.accent};
            --accent-soft: ${product.palette.accentSoft};
            --border: ${product.palette.border};
            --metallic: ${product.palette.metallic};
          }

          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body {
            width: ${PORTRAIT_WIDTH}px;
            height: ${PORTRAIT_HEIGHT}px;
            background:
              radial-gradient(circle at top, rgba(255,255,255,0.92), transparent 38%),
              ${isMockup ? "linear-gradient(180deg, #f2ece6 0%, #ebe2d8 100%)" : "var(--bg)"};
            color: var(--text);
            font-family: "Georgia", "Times New Roman", serif;
          }

          #capture-root {
            position: relative;
            width: ${PORTRAIT_WIDTH}px;
            height: ${PORTRAIT_HEIGHT}px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .paper-stage {
            position: relative;
            width: ${isMockup ? "1020px" : `${PORTRAIT_WIDTH}px`};
            height: ${isMockup ? "1480px" : `${PORTRAIT_HEIGHT}px`};
            border-radius: ${isMockup ? "28px" : "0"};
            background:
              linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.22)),
              repeating-linear-gradient(
                0deg,
                rgba(255,255,255,0.3) 0px,
                rgba(255,255,255,0.3) 2px,
                transparent 2px,
                transparent 10px
              ),
              var(--card);
            border: 1px solid var(--border);
            box-shadow: ${
              isMockup
                ? "0 42px 90px rgba(70, 54, 41, 0.18), 0 18px 35px rgba(70, 54, 41, 0.11)"
                : "none"
            };
            overflow: hidden;
          }

          .paper-stage::before {
            content: "";
            position: absolute;
            inset: 34px;
            border: 1px solid rgba(255,255,255,0.55);
            pointer-events: none;
          }

          .paper-shadow {
            position: absolute;
            inset: auto 140px 120px auto;
            width: 360px;
            height: 56px;
            border-radius: 999px;
            background: rgba(41, 28, 22, 0.16);
            filter: blur(20px);
            opacity: ${isMockup ? "1" : "0"};
            transform: rotate(-7deg);
          }

          .content {
            position: relative;
            z-index: 2;
            height: 100%;
            padding: ${isMockup ? "138px 120px 118px" : "152px 120px 132px"};
            display: flex;
            flex-direction: column;
            text-align: center;
          }

          .eyebrow {
            margin: 0;
            font-family: "Arial", sans-serif;
            font-size: 28px;
            letter-spacing: 0.36em;
            text-transform: uppercase;
            color: var(--accent);
          }

          .divider {
            width: 132px;
            height: 2px;
            margin: 40px auto 30px;
            background: linear-gradient(90deg, transparent, var(--metallic), transparent);
          }

          .names {
            margin-top: 24px;
            color: var(--text);
          }

          .names.wedding {
            display: grid;
            gap: 8px;
            text-transform: uppercase;
          }

          .names.wedding span:first-child,
          .names.wedding span:last-child {
            font-size: 124px;
            line-height: 0.95;
            letter-spacing: 0.08em;
          }

          .names .amp {
            font-size: 64px;
            line-height: 1;
            color: var(--accent);
          }

          .names.single {
            display: grid;
            gap: 14px;
          }

          .names.single span:first-child {
            font-size: 108px;
            line-height: 0.96;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .sub-name {
            font-family: "Arial", sans-serif;
            font-size: 34px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--muted);
          }

          .body-copy {
            margin-top: 70px;
            display: grid;
            gap: 18px;
            color: var(--muted);
            font-size: 42px;
            line-height: 1.35;
          }

          .body-copy p {
            margin: 0;
          }

          .body-copy p:nth-child(3),
          .body-copy p:nth-child(4),
          .body-copy p:nth-child(5) {
            color: var(--text);
          }

          .footer {
            margin-top: auto;
            padding-top: 44px;
            font-family: "Arial", sans-serif;
            font-size: 26px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: var(--muted);
          }

          .decor {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .line-minimal {
            position: absolute;
            left: 180px;
            right: 180px;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
            opacity: 0.7;
          }

          .line-minimal.top { top: 160px; }
          .line-minimal.bottom { bottom: 160px; }

          .blob {
            position: absolute;
            border-radius: 999px;
            filter: blur(6px);
            opacity: 0.7;
          }

          .blob.one {
            width: 240px; height: 180px; left: 110px; top: 150px;
            background: #f5d9d1;
          }

          .blob.two {
            width: 220px; height: 220px; right: 128px; top: 240px;
            background: #ddd4f0;
          }

          .blob.three {
            width: 300px; height: 180px; right: 110px; bottom: 170px;
            background: #d6e2f0;
          }

          .dots {
            position: absolute;
            left: 132px;
            bottom: 180px;
            display: grid;
            grid-template-columns: repeat(5, 16px);
            gap: 14px;
          }

          .dots span {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: var(--accent);
            opacity: 0.35;
          }
        </style>
      </head>
      <body>
        <main id="capture-root">
          ${isMockup ? '<div class="paper-shadow"></div>' : ""}
          <section class="paper-stage">
            ${decorativeMarkup}
            <div class="content">
              <p class="eyebrow">${escapeHtml(product.copy.heading)}</p>
              <div class="divider"></div>
              ${namesBlock}
              <div class="body-copy">${bodyLines}</div>
              <p class="footer">${escapeHtml(product.copy.footer)}</p>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}

export async function generateDemoProductImages() {
  ensureDemoAssetsDirectory();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const generatedAssets = [];

  try {
    for (const product of demoProducts) {
      for (const variant of product.variants) {
        const targetPath = getVariantAbsolutePath(product, variant);

        await page.setContent(createInvitationMarkup(product, variant), {
          waitUntil: "load",
        });
        await page.evaluate(async () => {
          if ("fonts" in document) {
            await document.fonts.ready;
          }
        });

        await page.locator("#capture-root").screenshot({
          path: targetPath,
          type: "png",
        });

        generatedAssets.push({
          productName: product.name,
          slug: product.slug,
          variant,
          label: getVariantLabel(variant),
          altText: getVariantAltText(product, variant),
          fileName: getVariantFileName(product, variant),
          absolutePath: targetPath,
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    imageCount: generatedAssets.length,
    outputDirectory: path.dirname(demoManifestPath),
    assets: generatedAssets,
  };

  writeDemoManifest(manifest);

  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateDemoProductImages()
    .then((manifest) => {
      console.log(
        `Generated ${manifest.imageCount} demo product image(s) in ${manifest.outputDirectory}`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
