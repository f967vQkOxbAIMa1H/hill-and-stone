// Regenerates the static brand icons from the mark: navy mark on cream.
// Usage: npx tsx scripts/brand-icons.ts   (writes src/app/icon.svg and public/brand/icon-*.png)
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { MARK_PATH, MARK_RATIO } from "../src/components/brand/LogoMark";

const NAVY = "#10243a";
const CREAM = "#f4f2ed";

/** A square icon: the mark centered, `inset` of the side left clear around it. */
function iconSvg(side: number, { inset, radius }: { inset: number; radius: number }) {
  const w = side * (1 - inset * 2);
  const h = w / MARK_RATIO;
  const scale = w / 763;
  const x = (side - w) / 2;
  const y = (side - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"><rect width="${side}" height="${side}" rx="${radius}" fill="${CREAM}"/><path fill="${NAVY}" fill-rule="evenodd" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})" d="${MARK_PATH}"/></svg>\n`;
}

const png = (svg: string, size: number, out: string) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);

async function main() {
  writeFileSync("src/app/icon.svg", iconSvg(32, { inset: 0.12, radius: 6 }));
  await png(iconSvg(512, { inset: 0.14, radius: 0 }), 192, "public/brand/icon-192.png");
  await png(iconSvg(512, { inset: 0.14, radius: 0 }), 512, "public/brand/icon-512.png");
  // Maskable: Android crops to a circle, so keep the mark inside the 80% safe zone.
  await png(iconSvg(512, { inset: 0.24, radius: 0 }), 512, "public/brand/icon-maskable-512.png");
  console.log("Wrote src/app/icon.svg and public/brand/icon-{192,512,maskable-512}.png");
}

main();
