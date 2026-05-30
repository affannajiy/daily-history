import { readFileSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

/**
 * Rasterizes assets/avatar/avatar.svg into square, opaque PNGs at the sizes
 * inbox/avatar consumers expect. The 512 is the canonical upload (Gravatar,
 * BIMI raster consumers); 256/128 are convenience downscales.
 * Run with: npm run build:avatar
 */
const AVATAR_DIR = join(__dirname, "..", "assets", "avatar");
const SRC = join(AVATAR_DIR, "avatar.svg");
const SIZES = [512, 256, 128] as const;

// Opaque backstop so no client ever composites the avatar onto a stray
// transparent pixel — matches the SVG's #111111 canvas.
const BACKGROUND = { r: 0x11, g: 0x11, b: 0x11, alpha: 1 };

async function main(): Promise<void> {
  mkdirSync(AVATAR_DIR, { recursive: true });
  const svg = readFileSync(SRC);

  for (const size of SIZES) {
    const out = join(AVATAR_DIR, `avatar-${size}.png`);
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "cover", background: BACKGROUND })
      .flatten({ background: BACKGROUND })
      .png()
      .toFile(out);
    console.log(`Wrote ${out}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Failed to build avatar PNGs:", err);
  process.exit(1);
});
