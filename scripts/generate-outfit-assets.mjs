import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = process.cwd();
const SPRITES = path.join(ROOT, "assets/sprites");
const OUTPUT = path.join(ROOT, "assets/outfits");

const athletes = {
  maestro: {
    primary: (h, s) => h >= 175 && h <= 245 && s >= 0.28,
    accent: (h, s, v) => h >= 175 && h <= 215 && s >= 0.18 && v >= 0.62,
    concepts: "tmp/imagegen/outfits/maestro.png",
  },
  pantera: {
    primary: (h, s) => (h >= 332 || h <= 8) && s >= 0.48,
    accent: (h, s, v) => (h >= 338 || h <= 12) && s >= 0.28 && v >= 0.68,
    concepts: "tmp/imagegen/outfits/pantera.png",
  },
  steamer: {
    primary: (h, s) => h >= 12 && h <= 48 && s >= 0.72,
    accent: (h, s, v) => h >= 18 && h <= 48 && s >= 0.62 && v >= 0.72,
    secondary: (h, s) => h >= 198 && h <= 238 && s >= 0.35,
    concepts: "tmp/imagegen/outfits/steamer.png",
  },
  fiamma: {
    primary: (h, s) => h >= 58 && h <= 105 && s >= 0.46,
    accent: (h, s, v) => h >= 55 && h <= 108 && s >= 0.36 && v >= 0.68,
    concepts: "tmp/imagegen/outfits/fiamma.png",
  },
};

const variants = {
  circuit: { primaryHue: 218, secondaryHue: 190, saturation: 0.84, value: 0.98 },
  legend: { primaryHue: 42, secondaryHue: 36, saturation: 0.82, value: 0.96 },
};

const sheets = [
  ["idle", (id) => `${id}.webp`],
  ["action", (id) => `${id}-action.webp`],
  ["run", (id) => `${id}-run-v3.webp`],
  ["back-idle", (id) => `back/${id}.webp`],
  ["back-action", (id) => `back/${id}-action.webp`],
  ["back-run", (id) => `back/${id}-run-v3.webp`],
];

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  return [h, max ? delta / max : 0, max];
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((channel) => Math.round((channel + m) * 255));
}

function recolorPixel(r, g, b, athlete, variant) {
  const [h, s, v] = rgbToHsv(r, g, b);
  const isAccent = athlete.accent(h, s, v);
  const isPrimary = athlete.primary(h, s, v);
  const isSecondary = athlete.secondary?.(h, s, v) ?? false;
  if (!isPrimary && !isSecondary) return [r, g, b];

  if (variant === "circuit") {
    const targetHue = isSecondary ? variants.circuit.secondaryHue : variants.circuit.primaryHue;
    const targetSaturation = Math.min(0.96, Math.max(0.48, s * variants.circuit.saturation));
    const targetValue = Math.min(1, v * (isAccent ? 1.06 : variants.circuit.value));
    return hsvToRgb(targetHue, targetSaturation, targetValue);
  }

  if (isSecondary) return hsvToRgb(32, Math.min(0.22, s), Math.max(0.12, v * 0.48));
  if (isAccent) return hsvToRgb(45, 0.16, Math.min(1, v * 1.08));
  return hsvToRgb(variants.legend.primaryHue, Math.min(0.92, Math.max(0.52, s * variants.legend.saturation)), Math.min(1, v * variants.legend.value));
}

async function createSheet(athleteId, athlete, variant, sheetName, sourceRelative) {
  const source = path.join(SPRITES, sourceRelative);
  const image = sharp(source).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const [r, g, b] = recolorPixel(data[i], data[i + 1], data[i + 2], athlete, variant);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  const outDir = path.join(OUTPUT, athleteId, variant);
  await fs.mkdir(outDir, { recursive: true });
  const frameCount = sheetName.includes("run") ? 8 : 4;
  const targetWidth = Math.max(frameCount, Math.round((info.width * 0.72) / frameCount) * frameCount);
  await sharp(data, { raw: info })
    .resize({ width: targetWidth, kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 64, alphaQuality: 82, effort: 6, smartSubsample: true })
    .toFile(path.join(outDir, `${sheetName}.webp`));
}

async function createPreviews(athleteId, athlete) {
  const source = path.join(ROOT, athlete.concepts);
  const meta = await sharp(source).metadata();
  const half = Math.floor(meta.width / 2);
  const dir = path.join(OUTPUT, athleteId);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([
    sharp(source).extract({ left: 0, top: 0, width: half, height: meta.height }).resize({ width: 240 }).webp({ quality: 68, effort: 6 }).toFile(path.join(dir, "circuit-preview.webp")),
    sharp(source).extract({ left: half, top: 0, width: meta.width - half, height: meta.height }).resize({ width: 240 }).webp({ quality: 68, effort: 6 }).toFile(path.join(dir, "legend-preview.webp")),
  ]);
}

for (const [athleteId, athlete] of Object.entries(athletes)) {
  await createPreviews(athleteId, athlete);
  for (const variant of Object.keys(variants)) {
    for (const [sheetName, sourceName] of sheets) {
      await createSheet(athleteId, athlete, variant, sheetName, sourceName(athleteId));
    }
  }
}

console.log(`Generated outfit previews and ${Object.keys(athletes).length * Object.keys(variants).length * sheets.length} dedicated sprite sheets in assets/outfits.`);
