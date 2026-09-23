// Run after prepare-map.py. Sharp is included with the installed Next.js runtime.
// Rasterize the same coordinates once, so panning never repaints 96,000 SVG paths.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
sharp(path.join(root, "public/maps/astana.svg"), { limitInputPixels: 200000000 })
  .resize({ width: 7600 })
  .webp({ quality: 85, effort: 4 })
  .toFile(path.join(root, "public/maps/astana.webp"))
  .then(info => console.log(`Map: ${info.width} x ${info.height}, ${info.size} bytes`))
  .catch(error => { console.error(error); process.exitCode = 1; });
