import fs from "fs";
import path from "path";

export function loadSeen(filePath) {
  try {
    if (!fs.existsSync(filePath)) return new Set();
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new Set(Array.isArray(raw) ? raw : raw.ids || []);
  } catch {
    return new Set();
  }
}

export function saveSeen(filePath, ids) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({ updatedAt: new Date().toISOString(), ids: [...ids] }, null, 2),
    "utf8"
  );
}
