import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "..");
export const demoAssetsDir = path.join(repoRoot, "demo-assets", "products");
export const demoManifestPath = path.join(demoAssetsDir, "manifest.json");
export const fallbackLocalBaseUrl = "http://localhost:3000";
export const adminStorageStatePath = path.join(
  repoRoot,
  ".playwright",
  "auth",
  "admin.json",
);

function parseEnvFile(contents) {
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");
    entries[key] = value;
  }

  return entries;
}

export function loadLocalEnv() {
  for (const relativePath of [".env.local", ".env"]) {
    const absolutePath = path.join(repoRoot, relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(absolutePath, "utf8"));

    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function normalizeOrigin(url) {
  return new URL(url).origin.toLowerCase();
}

export function normalizeBaseUrl(url) {
  return new URL(url).origin.replace(/\/+$/, "");
}

function isLocalhostUrl(url) {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1"].includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getDemoSeedBaseUrl() {
  return normalizeBaseUrl(
    process.env.DEMO_SEED_BASE_URL?.trim() ||
    process.env.PLAYWRIGHT_BASE_URL?.trim() ||
    fallbackLocalBaseUrl,
  );
}

export function ensureSafeDemoSeedTarget(baseUrl) {
  if (isLocalhostUrl(baseUrl)) {
    return;
  }

  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.PLAYWRIGHT_PRODUCTION_URL,
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return normalizeOrigin(value);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const normalizedBaseUrl = normalizeOrigin(baseUrl);
  const isProductionTarget = candidates.includes(normalizedBaseUrl);

  if (
    isProductionTarget &&
    process.env.ALLOW_PRODUCTION_DEMO_SEED !== "true"
  ) {
    throw new Error(
      `Refusing to seed demo content against production target ${baseUrl}. Set ALLOW_PRODUCTION_DEMO_SEED=true only if you explicitly intend to seed that environment.`,
    );
  }
}

export function slugifyProductName(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function createLongDescription(summary, angle) {
  return `${summary} ${angle} It is designed to feel polished on both digital viewing and home printing, with balanced spacing, premium typography, and room for personalization to suit the occasion.`;
}

export const demoProducts = [
  {
    name: "Elegant Floral Wedding Invitation",
    slug: slugifyProductName("Elegant Floral Wedding Invitation"),
    category: "Wedding Invitations",
    theme: "Floral",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "An elegant wedding invitation featuring delicate botanical details and a refined romantic layout.",
    description: createLongDescription(
      "An elegant wedding invitation featuring delicate botanical details and a refined romantic layout.",
      "Soft florals, warm neutrals, and restrained metallic accents make it especially well suited for garden weddings and classic celebrations.",
    ),
    customizable: true,
    featured: true,
    active: true,
    priceFrom: 250,
    showPrice: true,
    imageDirection:
      "Cream paper, dusty rose flowers, muted sage leaves, elegant serif typography, subtle gold accents.",
    palette: {
      background: "#fcf7f1",
      cardBackground: "#fffdf9",
      text: "#3e2c2c",
      muted: "#8a6f6f",
      accent: "#b76e79",
      accentSoft: "#d9b6b5",
      border: "#e7d8ce",
      metallic: "#b9985a",
    },
    decorativeStyle: "floral",
    copy: {
      heading: "Wedding Invitation",
      names: ["Amelia", "Noah"],
      bodyLines: [
        "Together with their families",
        "invite you to celebrate their wedding",
        "October 18, 2026",
        "Four o'clock in the afternoon",
        "The Garden Pavilion",
      ],
      footer: "Formal attire requested",
    },
    variants: ["primary", "mockup"],
  },
  {
    name: "Sage Botanical Wedding Invitation",
    slug: slugifyProductName("Sage Botanical Wedding Invitation"),
    category: "Wedding Invitations",
    theme: "Botanical",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A calm botanical wedding invitation with soft sage foliage and understated typography.",
    description: createLongDescription(
      "A calm botanical wedding invitation with soft sage foliage and understated typography.",
      "Its centered composition and watercolor-inspired greenery make it a graceful choice for intimate ceremonies and modern romantic weddings.",
    ),
    customizable: true,
    featured: true,
    active: true,
    priceFrom: 280,
    showPrice: true,
    imageDirection:
      "Warm ivory paper, eucalyptus and sage watercolor foliage, minimalist centered typography.",
    palette: {
      background: "#f8f6f1",
      cardBackground: "#fffdfa",
      text: "#314037",
      muted: "#7a857d",
      accent: "#6f8b74",
      accentSoft: "#d2ddd2",
      border: "#d8e2d7",
      metallic: "#a89a7c",
    },
    decorativeStyle: "botanical",
    copy: {
      heading: "Wedding Invitation",
      names: ["Sophia", "Lucas"],
      bodyLines: [
        "Together with their families",
        "joyfully invite you to their wedding celebration",
        "November 07, 2026",
        "Half past three in the afternoon",
        "Hearth & Vine Hall",
      ],
      footer: "Reception to follow",
    },
    variants: ["primary", "mockup"],
  },
  {
    name: "Modern Minimal Wedding Invitation",
    slug: slugifyProductName("Modern Minimal Wedding Invitation"),
    category: "Wedding Invitations",
    theme: "Minimal",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A sophisticated minimalist wedding invitation designed around clean spacing and timeless typography.",
    description: createLongDescription(
      "A sophisticated minimalist wedding invitation designed around clean spacing and timeless typography.",
      "This design leans on rhythm, proportion, and contrast rather than ornament, creating a polished editorial feel for contemporary celebrations.",
    ),
    customizable: true,
    featured: false,
    active: true,
    priceFrom: 220,
    showPrice: true,
    imageDirection:
      "White or ivory card, black editorial serif typography, very subtle beige accent line.",
    palette: {
      background: "#fbf8f3",
      cardBackground: "#fffdfb",
      text: "#23201f",
      muted: "#837a72",
      accent: "#cab8a5",
      accentSoft: "#efe6dd",
      border: "#e8ddd1",
      metallic: "#cab8a5",
    },
    decorativeStyle: "minimal",
    copy: {
      heading: "Wedding Invitation",
      names: ["Olivia", "Ethan"],
      bodyLines: [
        "invite you to celebrate their marriage",
        "September 26, 2026",
        "Five o'clock in the evening",
        "Atelier Hall",
        "Makati City",
      ],
      footer: "Dinner and dancing to follow",
    },
    variants: ["primary"],
  },
  {
    name: "Blush Floral Save the Date",
    slug: slugifyProductName("Blush Floral Save the Date"),
    category: "Save the Date",
    theme: "Romantic Floral",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A romantic save-the-date design featuring soft blush florals and a graceful modern layout.",
    description: createLongDescription(
      "A romantic save-the-date design featuring soft blush florals and a graceful modern layout.",
      "Blush blooms and handwritten accents help it feel celebratory while still polished enough for a refined wedding stationery suite.",
    ),
    customizable: true,
    featured: true,
    active: true,
    priceFrom: 180,
    showPrice: true,
    imageDirection:
      "Blush pink florals, ivory card, dusty rose details, elegant serif + handwritten accent.",
    palette: {
      background: "#fdf6f5",
      cardBackground: "#fffdfa",
      text: "#4a3038",
      muted: "#94737e",
      accent: "#c07d8f",
      accentSoft: "#f0d1d7",
      border: "#efd6db",
      metallic: "#b58a8b",
    },
    decorativeStyle: "blush-floral",
    copy: {
      heading: "Save the Date",
      names: ["Isabella", "Noah"],
      bodyLines: [
        "for the wedding of",
        "December 12, 2026",
        "The Conservatory",
        "Invitation to follow",
      ],
      footer: "Please save our date",
    },
    variants: ["primary", "mockup"],
  },
  {
    name: "Celestial Debut Invitation",
    slug: slugifyProductName("Celestial Debut Invitation"),
    category: "Debut Invitations",
    theme: "Celestial",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "An elegant debut invitation inspired by stars, moonlight, and sophisticated evening celebrations.",
    description: createLongDescription(
      "An elegant debut invitation inspired by stars, moonlight, and sophisticated evening celebrations.",
      "Fine celestial detailing and a polished evening palette give it a formal, memorable tone suited to milestone celebrations.",
    ),
    customizable: true,
    featured: true,
    active: true,
    priceFrom: 300,
    showPrice: true,
    imageDirection:
      "Deep muted navy background or cream card with navy celestial accents, fine gold stars, elegant typography.",
    palette: {
      background: "#0f1a2a",
      cardBackground: "#16233a",
      text: "#f6efe0",
      muted: "#d0c6b1",
      accent: "#f3d089",
      accentSoft: "#314664",
      border: "#3e5576",
      metallic: "#e1c27b",
    },
    decorativeStyle: "celestial",
    copy: {
      heading: "Debut Invitation",
      names: ["Eliana", "Santiago"],
      bodyLines: [
        "requests the honor of your presence",
        "as she celebrates her eighteenth birthday",
        "August 29, 2026",
        "Seven o'clock in the evening",
        "The Astoria Ballroom",
      ],
      footer: "An evening under the stars",
    },
    variants: ["primary", "mockup"],
  },
  {
    name: "Champagne Debut Invitation",
    slug: slugifyProductName("Champagne Debut Invitation"),
    category: "Debut Invitations",
    theme: "Elegant",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A refined debut invitation with champagne tones, delicate linework, and sophisticated typography.",
    description: createLongDescription(
      "A refined debut invitation with champagne tones, delicate linework, and sophisticated typography.",
      "Its soft metallic palette and controlled layout create a polished invitation for formal family gatherings and evening receptions.",
    ),
    customizable: true,
    featured: false,
    active: true,
    priceFrom: 280,
    showPrice: true,
    imageDirection:
      "Ivory and champagne palette, fine gold line details, elegant centered typography.",
    palette: {
      background: "#fbf7f1",
      cardBackground: "#fffdf9",
      text: "#44372d",
      muted: "#8b7a6c",
      accent: "#c7a773",
      accentSoft: "#f0e2cc",
      border: "#ebdbc5",
      metallic: "#c5a15c",
    },
    decorativeStyle: "champagne",
    copy: {
      heading: "Debut Invitation",
      names: ["Mia", "Santos"],
      bodyLines: [
        "invites you to celebrate her eighteenth birthday",
        "October 03, 2026",
        "Six o'clock in the evening",
        "The Champagne Room",
        "Quezon City",
      ],
      footer: "Cocktail chic attire",
    },
    variants: ["primary"],
  },
  {
    name: "Pastel Birthday Invitation",
    slug: slugifyProductName("Pastel Birthday Invitation"),
    category: "Birthday Invitations",
    theme: "Pastel",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A cheerful birthday invitation featuring soft pastel tones and a clean playful layout.",
    description: createLongDescription(
      "A cheerful birthday invitation featuring soft pastel tones and a clean playful layout.",
      "Rounded shapes and soft color blocking keep the mood light while still feeling polished enough for a premium curated catalog.",
    ),
    customizable: true,
    featured: true,
    active: true,
    priceFrom: 150,
    showPrice: true,
    imageDirection:
      "Soft peach, lavender, dusty blue, subtle abstract shapes, premium playful typography.",
    palette: {
      background: "#fff8f4",
      cardBackground: "#fffdfb",
      text: "#55454e",
      muted: "#8f7f88",
      accent: "#c8a8cf",
      accentSoft: "#f5d9d1",
      border: "#efe1dd",
      metallic: "#9bb5d3",
    },
    decorativeStyle: "pastel",
    copy: {
      heading: "Birthday Invitation",
      names: ["Olivia", "Turns Nine"],
      bodyLines: [
        "join us for an afternoon celebration",
        "September 19, 2026",
        "Two o'clock in the afternoon",
        "Sunroom Party Studio",
      ],
      footer: "Cake, games, and sweet treats",
    },
    variants: ["primary"],
  },
  {
    name: "Woodland Christening Invitation",
    slug: slugifyProductName("Woodland Christening Invitation"),
    category: "Christening Invitations",
    theme: "Botanical",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A gentle christening invitation with soft greenery and a peaceful nature-inspired presentation.",
    description: createLongDescription(
      "A gentle christening invitation with soft greenery and a peaceful nature-inspired presentation.",
      "Muted foliage, spacious typography, and a calm palette create a tender invitation well suited to intimate family celebrations.",
    ),
    customizable: true,
    featured: false,
    active: true,
    priceFrom: 180,
    showPrice: true,
    imageDirection:
      "Cream paper, pale sage greenery, delicate botanical illustration, gentle serif typography.",
    palette: {
      background: "#faf8f3",
      cardBackground: "#fffefa",
      text: "#425046",
      muted: "#80897f",
      accent: "#7b9a81",
      accentSoft: "#dbe7da",
      border: "#e1eadf",
      metallic: "#9da99b",
    },
    decorativeStyle: "woodland",
    copy: {
      heading: "Christening Invitation",
      names: ["Baby Eliana"],
      bodyLines: [
        "with joy in our hearts,",
        "we invite you to a christening celebration",
        "October 24, 2026",
        "St. Michael Chapel",
        "Reception to follow at Willow Hall",
      ],
      footer: "With love, the Rivera family",
    },
    variants: ["primary"],
  },
  {
    name: "Modern Thank You Card",
    slug: slugifyProductName("Modern Thank You Card"),
    category: "Thank You Cards",
    theme: "Minimal",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A clean and elegant thank-you card suitable for weddings, celebrations, and thoughtful messages.",
    description: createLongDescription(
      "A clean and elegant thank-you card suitable for weddings, celebrations, and thoughtful messages.",
      "Its restrained composition makes it versatile for many occasions while still feeling warm, personal, and beautifully finished.",
    ),
    customizable: true,
    featured: false,
    active: true,
    priceFrom: 120,
    showPrice: true,
    imageDirection:
      "Warm cream background, simple serif 'Thank You', subtle botanical corner detail.",
    palette: {
      background: "#fbf6f0",
      cardBackground: "#fffdf9",
      text: "#362d28",
      muted: "#83776f",
      accent: "#b8a492",
      accentSoft: "#efe4d7",
      border: "#e7dccf",
      metallic: "#a39284",
    },
    decorativeStyle: "thank-you",
    copy: {
      heading: "Thank You",
      names: ["With sincere appreciation"],
      bodyLines: [
        "for your love, presence, and thoughtful wishes",
        "your kindness means so much to us",
      ],
      footer: "Amelia & Noah",
    },
    variants: ["primary"],
  },
  {
    name: "Botanical Greeting Card",
    slug: slugifyProductName("Botanical Greeting Card"),
    category: "Greeting Cards",
    theme: "Botanical",
    orientation: "portrait",
    format: "Digital / Printable",
    shortDescription:
      "A timeless botanical greeting card designed for warm personal messages and special occasions.",
    description: createLongDescription(
      "A timeless botanical greeting card designed for warm personal messages and special occasions.",
      "Watercolor-inspired florals and restrained typography make it suitable for many heartfelt celebrations and personal notes.",
    ),
    customizable: true,
    featured: false,
    active: true,
    priceFrom: 120,
    showPrice: true,
    imageDirection:
      "Soft watercolor wildflowers, ivory card, understated typography.",
    palette: {
      background: "#fbf8f2",
      cardBackground: "#fffefb",
      text: "#3b342e",
      muted: "#81796f",
      accent: "#8ba47e",
      accentSoft: "#dce8d5",
      border: "#e5e7da",
      metallic: "#bf9f8a",
    },
    decorativeStyle: "greeting",
    copy: {
      heading: "For You",
      names: ["A thoughtful note"],
      bodyLines: [
        "wishing you beauty, calm, and joyful moments",
        "today and always",
      ],
      footer: "With warm wishes",
    },
    variants: ["primary"],
  },
];

export function getVariantFileName(product, variant) {
  return `${product.slug}--${variant}.png`;
}

export function getVariantAbsolutePath(product, variant) {
  return path.join(demoAssetsDir, getVariantFileName(product, variant));
}

export function getVariantLabel(variant) {
  return variant === "mockup" ? "mockup" : "artwork";
}

export function getVariantAltText(product, variant) {
  if (variant === "mockup") {
    return `${product.name} styled mockup view`;
  }

  return `${product.name} invitation artwork`;
}

export function ensureDemoAssetsDirectory() {
  fs.mkdirSync(demoAssetsDir, { recursive: true });
}

export function readDemoManifest() {
  if (!fs.existsSync(demoManifestPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(demoManifestPath, "utf8"));
}

export function writeDemoManifest(manifest) {
  ensureDemoAssetsDirectory();
  fs.writeFileSync(demoManifestPath, JSON.stringify(manifest, null, 2));
}
