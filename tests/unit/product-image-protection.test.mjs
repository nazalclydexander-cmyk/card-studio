import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  createAppearanceWatermarkSampleBuffer,
  createProtectedProductPreview,
} from "../../lib/product-image-protection-core.ts";
import {
  assertServerWatermarkFontExists,
  getServerWatermarkFont,
} from "../../lib/server-watermark-fonts.ts";

const demoPrimaryImagePath = path.join(
  process.cwd(),
  "demo-assets",
  "products",
  "elegant-floral-wedding-invitation--primary.png",
);

test("createProtectedProductPreview completes for a stored product original", async () => {
  const sourceBuffer = readFileSync(demoPrimaryImagePath);
  const result = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "MARIANNE",
      watermark_font: "inter",
      watermark_mode: "manual",
      watermark_color: "#60544C",
      watermark_light_color: "#F8F4EE",
      watermark_dark_color: "#60544C",
      watermark_opacity: 0.2,
      watermark_rotation: -30,
      watermark_font_scale: 1,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: true,
    },
  });

  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.contentType, "image/webp");
  assert.ok(result.buffer.length > 0);
  assert.ok((result.width ?? 0) > 0);
  assert.ok((result.height ?? 0) > 0);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.text, "MARIANNE");
  assert.equal(result.watermark.font, "inter");
  assert.equal(result.watermark.enabled, true);
});

test("createProtectedProductPreview completes for the appearance sample in adaptive mode", async () => {
  const result = await createProtectedProductPreview({
    sourceBuffer: await createAppearanceWatermarkSampleBuffer(),
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "PREVIEW",
      watermark_font: "inter",
      watermark_mode: "adaptive",
      watermark_color: "#60544C",
      watermark_light_color: "#F8F4EE",
      watermark_dark_color: "#60544C",
      watermark_opacity: 0.2,
      watermark_rotation: -30,
      watermark_font_scale: 1,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: true,
    },
  });

  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.contentType, "image/webp");
  assert.ok(result.buffer.length > 0);
  assert.ok((result.width ?? 0) > 0);
  assert.ok((result.height ?? 0) > 0);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.text, "PREVIEW");
  assert.ok(["light", "dark", "manual"].includes(result.watermark.tone));
});

test("createProtectedProductPreview completes with MARIANNE using Georgia in manual mode", async () => {
  const sourceBuffer = readFileSync(demoPrimaryImagePath);

  const result = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "MARIANNE",
      watermark_font: "georgia",
      watermark_mode: "manual",
      watermark_color: "#60544C",
      watermark_light_color: "#F8F4EE",
      watermark_dark_color: "#60544C",
      watermark_opacity: 0.2,
      watermark_rotation: -30,
      watermark_font_scale: 1,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: true,
    },
  });

  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.contentType, "image/webp");
  assert.ok(result.buffer.length > 0);
  assert.ok((result.width ?? 0) > 0);
  assert.ok((result.height ?? 0) > 0);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.text, "MARIANNE");
  assert.equal(result.watermark.font, "libre_baskerville");
  assert.equal(result.watermark.enabled, true);
  assert.equal(result.watermark.tone, "manual");
});

test("server watermark fonts resolve deterministically and legacy Georgia maps to bundled serif", () => {
  const legacyGeorgiaFont = getServerWatermarkFont("georgia");
  const bundledSansFont = assertServerWatermarkFontExists("inter");
  const bundledSerifFont = assertServerWatermarkFontExists("libre_baskerville");

  assert.equal(legacyGeorgiaFont.key, "libre_baskerville");
  assert.equal(legacyGeorgiaFont.label, "Libre Baskerville Serif");
  assert.equal(bundledSansFont.key, "inter");
  assert.equal(bundledSerifFont.key, "libre_baskerville");
});

test("manual repeated watermark remains stable for bundled serif and default preview geometry", async () => {
  const sourceBuffer = readFileSync(demoPrimaryImagePath);
  const result = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "TEST WATERMARK",
      watermark_font: "libre_baskerville",
      watermark_mode: "manual",
      watermark_color: "#FF0000",
      watermark_light_color: "#F8F4EE",
      watermark_dark_color: "#60544C",
      watermark_opacity: 0.4,
      watermark_rotation: 0,
      watermark_font_scale: 1,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: true,
    },
  });

  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.font, "libre_baskerville");
  assert.equal(result.watermark.repeat, true);
});

test("adaptive repeated watermark remains stable with rotated bundled sans text", async () => {
  const sourceBuffer = readFileSync(demoPrimaryImagePath);
  const result = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "TEST WATERMARK",
      watermark_font: "inter",
      watermark_mode: "adaptive",
      watermark_color: "#00AA00",
      watermark_light_color: "#FF0000",
      watermark_dark_color: "#0000FF",
      watermark_opacity: 0.15,
      watermark_rotation: 45,
      watermark_font_scale: 1,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: true,
    },
  });

  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.font, "inter");
  assert.equal(result.watermark.repeat, true);
});

test("single centered watermark remains stable with large scale and rotation", async () => {
  const sourceBuffer = readFileSync(demoPrimaryImagePath);
  const result = await createProtectedProductPreview({
    sourceBuffer,
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "CARD STUDIO PREVIEW",
      watermark_font: "libre_baskerville",
      watermark_mode: "manual",
      watermark_color: "#60544C",
      watermark_light_color: "#F8F4EE",
      watermark_dark_color: "#60544C",
      watermark_opacity: 0.22,
      watermark_rotation: -30,
      watermark_font_scale: 1.8,
      watermark_spacing_x: 100,
      watermark_spacing_y: 100,
      watermark_repeat: false,
    },
  });

  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(result.watermark.repeat, false);
});
