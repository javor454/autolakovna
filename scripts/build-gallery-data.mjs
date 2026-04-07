/**
 * Builds public/gallery-data.json from public/gallery-thumbs/.
 *
 * Preserves driveId from existing public/gallery-data.json (matched by thumb path).
 * Override / fill: optional repo-root gallery-drive-ids.json:
 *   { "citroen-c1/01.jpg": "1abc..." }  — keys = path under gallery-thumbs/
 *
 * Usage: node scripts/build-gallery-data.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const THUMBS = path.join(ROOT, "public", "gallery-thumbs");
const OUT = path.join(ROOT, "public", "gallery-data.json");
const IDS_PATH = path.join(ROOT, "gallery-drive-ids.json");

const ALBUM_TITLES = {
  "citroen-c1": "Citroën C1",
  "kola-kodiaq": "Škoda Kodiaq — kola",
  "opel-astra": "Opel Astra",
  "opel-mokka": "Opel Mokka",
  "peugeot": "Peugeot",
  "porsche": "Porsche",
  "renault-dodavka": "Renault — dodávka",
  "renault-kadjar": "Renault Kadjar",
  "skoda-fabia": "Škoda Fabia",
  "skoda-yeti": "Škoda Yeti",
};

async function* walkJpgFiles(dir, baseRel = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const rel = path.posix.join(baseRel.replace(/\\/g, "/"), ent.name);
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkJpgFiles(full, rel);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".jpg")) {
      yield { rel: rel.replace(/\\/g, "/") };
    }
  }
}

async function loadExtraIds() {
  try {
    const raw = await readFile(IDS_PATH, "utf8");
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj !== null ? obj : {};
  } catch {
    return {};
  }
}

async function loadPreservedByThumb() {
  const map = new Map();
  try {
    const raw = await readFile(OUT, "utf8");
    const data = JSON.parse(raw);
    for (const album of data.albums || []) {
      for (const item of album.items || []) {
        if (item.thumb && typeof item.driveId === "string" && item.driveId) {
          map.set(item.thumb, item.driveId);
        }
      }
    }
  } catch {
    /* no existing file */
  }
  return map;
}

/** @param {{ thumb: string, driveId?: string, alt?: string }[]} itemsByThumb */
function mergeCompactFromAlbums(compactIn, albums) {
  const thumbToItem = new Map();
  for (const al of albums) {
    for (const it of al.items || []) {
      if (it.thumb) thumbToItem.set(it.thumb, it);
    }
  }
  return compactIn.map((x) => {
    const full = thumbToItem.get(x.thumb);
    return {
      thumb: x.thumb,
      driveId:
        (full && typeof full.driveId === "string" && full.driveId) ||
        (typeof x.driveId === "string" ? x.driveId : "") ||
        "",
      alt: (full && full.alt) || x.alt || "",
    };
  });
}

async function loadPreservedCompactOrDefault(albums) {
  try {
    const raw = await readFile(OUT, "utf8");
    const data = JSON.parse(raw);
    const c = data.compact;
    if (Array.isArray(c) && c.length === 4 && c.every((x) => x && typeof x.thumb === "string")) {
      return mergeCompactFromAlbums(c, albums);
    }
  } catch {
    /* no file */
  }
  return defaultCompactFromAlbums(albums);
}

function defaultCompactFromAlbums(albums) {
  const out = [];
  for (const al of albums) {
    const first = al.items && al.items[0];
    if (first) out.push({ thumb: first.thumb, driveId: first.driveId || "", alt: first.alt || "" });
    if (out.length >= 4) return out;
  }
  const seen = new Set(out.map((o) => o.thumb));
  for (const al of albums) {
    for (const it of al.items || []) {
      if (out.length >= 4) return out;
      if (it.thumb && !seen.has(it.thumb)) {
        seen.add(it.thumb);
        out.push({ thumb: it.thumb, driveId: it.driveId || "", alt: it.alt || "" });
      }
    }
  }
  return out;
}

function relFromThumb(thumb) {
  const prefix = "/gallery-thumbs/";
  if (thumb.startsWith(prefix)) return thumb.slice(prefix.length);
  return null;
}

function naturalBasename(a, b) {
  return a.localeCompare(b, "cs", { numeric: true, sensitivity: "base" });
}

async function main() {
  const extraIds = await loadExtraIds();
  const preserved = await loadPreservedByThumb();

  const byAlbum = new Map();

  for await (const { rel } of walkJpgFiles(THUMBS)) {
    const slash = rel.indexOf("/");
    const albumId = slash === -1 ? "" : rel.slice(0, slash);
    const fileName = slash === -1 ? rel : rel.slice(slash + 1);
    if (!albumId) continue;
    if (!byAlbum.has(albumId)) byAlbum.set(albumId, []);
    byAlbum.get(albumId).push({ rel, fileName });
  }

  const albumIds = [...byAlbum.keys()].sort((a, b) =>
    a.localeCompare(b, "cs", { sensitivity: "base" }),
  );

  const albums = albumIds.map((id) => {
    let items = byAlbum.get(id).sort((x, y) => naturalBasename(x.fileName, y.fileName));
    if (id === "porsche") {
      items = [...items].sort((x, y) => {
        if (x.fileName === "porsche.jpg") return -1;
        if (y.fileName === "porsche.jpg") return 1;
        return naturalBasename(x.fileName, y.fileName);
      });
    }
    const title = ALBUM_TITLES[id] || id.replace(/-/g, " ");
    return {
      id,
      title,
      items: items.map(({ rel, fileName }) => {
        const base = fileName.replace(/\.jpg$/i, "");
        const thumb = `/gallery-thumbs/${rel}`;
        let driveId =
          (typeof extraIds[rel] === "string" && extraIds[rel]) ||
          preserved.get(thumb) ||
          "";
        return {
          thumb,
          driveId,
          alt: `${title} — ${base}`,
        };
      }),
    };
  });

  const compact = await loadPreservedCompactOrDefault(albums);

  const json = `${JSON.stringify({ compact, albums }, null, 2)}\n`;
  await writeFile(OUT, json, "utf8");
  const n = albums.reduce((acc, a) => acc + a.items.length, 0);
  console.error(`Wrote ${OUT} (compact: ${compact.length}, albums: ${albums.length}, items: ${n})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
