import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  createAppearanceWatermarkSampleBuffer,
  createProtectedProductPreview,
} from "../../lib/product-image-protection-core.ts";

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
      watermark_font: "arial",
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
  assert.equal(result.watermark.font, "arial");
  assert.equal(result.watermark.enabled, true);
});

test("createProtectedProductPreview completes for the appearance sample in adaptive mode", async () => {
  const result = await createProtectedProductPreview({
    sourceBuffer: createAppearanceWatermarkSampleBuffer(),
    watermarkSettings: {
      watermark_enabled: true,
      watermark_text: "PREVIEW",
      watermark_font: "trebuchet_ms",
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
  assert.equal(result.watermark.font, "georgia");
  assert.equal(result.watermark.enabled, true);
  assert.equal(result.watermark.tone, "manual");
});