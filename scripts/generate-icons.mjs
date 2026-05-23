// Generate extension icons (PNG) from the Sb monogram SVG.
// One-shot build helper: re-run only if assets/logo-mark.svg changes.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { Resvg } from "@resvg/resvg-js"

const SRC = "public/brand/logo-mark.svg"
const SIZES = [16, 32, 48, 128]
const OUT_DIR = "public/icons"

mkdirSync(OUT_DIR, { recursive: true })

const svg = readFileSync(SRC, "utf8")

for (const size of SIZES) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  })
  const png = resvg.render().asPng()
  const path = `${OUT_DIR}/icon-${size}.png`
  writeFileSync(path, png)
  console.log(`wrote ${path}  (${png.length} bytes)`)
}
