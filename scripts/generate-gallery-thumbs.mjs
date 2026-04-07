/**
 * Reads gitignored gallery/ and writes optimized JPEG thumbs to public/gallery-thumbs/
 * (same subfolders, max width 400px, .jpg output).
 *
 * Usage: npm run gallery-thumbs
 *    or: make gallery-thumbs
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GALLERY_DIR = path.join(ROOT, "gallery");
const OUT_ROOT = path.join(ROOT, "public", "gallery-thumbs");

const MAX_WIDTH = 400;
const JPEG_QUALITY = 78;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function* walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

function isImage(filePath) {
  return IMAGE_EXT.has(path.extname(filePath).toLowerCase());
}

async function main() {
  let st;
  try {
    st = await stat(GALLERY_DIR);
  } catch {
    console.error(`Missing gallery folder: ${GALLERY_DIR}`);
    console.error("Add photos under gallery/<album>/ and run again.");
    process.exit(1);
  }
  if (!st.isDirectory()) {
    console.error(`Not a directory: ${GALLERY_DIR}`);
    process.exit(1);
  }

  let count = 0;
  for await (const absIn of walkFiles(GALLERY_DIR)) {
    if (!isImage(absIn)) continue;

    const relFromGallery = path.relative(GALLERY_DIR, absIn);
    const dirPart = path.dirname(relFromGallery);
    const base = path.basename(relFromGallery, path.extname(relFromGallery));
    const relOut = path.join(dirPart, `${base}.jpg`);
    const absOut = path.join(OUT_ROOT, relOut);

    await mkdir(path.dirname(absOut), { recursive: true });

    await sharp(absIn)
      .rotate()
      .resize(MAX_WIDTH, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(absOut);

    count += 1;
    console.log(relOut);
  }

  if (count === 0) {
    console.warn("No images found under gallery/.");
    process.exit(1);
  }

  console.error(`Done. ${count} thumbnail(s) → public/gallery-thumbs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
