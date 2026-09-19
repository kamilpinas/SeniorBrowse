// Builds the Chrome Web Store upload artifact.
//
// Pipeline: sync manifest version -> run tests (must pass) -> build -> zip.
// The zip contains the CONTENTS of dist/ at its root (manifest.json at the top
// level, which is what the Web Store requires) and excludes _metadata/, which
// Chrome writes into an installed/unpacked extension and must not be uploaded.
//
// package.json is the single source of truth for the version; it is copied into
// public/manifest.json here so the two can never drift (Chrome reads the
// manifest, and rejects an update whose version isn't higher than the live one).

import { createWriteStream, readFileSync, writeFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import archiver from "archiver"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" })

// ── 1. Sync the manifest version from package.json ───────────────────────────
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const manifestPath = join(root, "public", "manifest.json")
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
if (manifest.version !== version) {
  manifest.version = version
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
  console.log(`✓ synced public/manifest.json version -> ${version}`)
}

// ── 2. Tests must pass before anything is built or shipped ───────────────────
console.log("\n▶ running tests (vitest run)…")
run("npm run test:run")

// ── 3. Build ─────────────────────────────────────────────────────────────────
console.log("\n▶ building…")
run("npm run build")

// ── 4. Zip dist/ contents (excluding _metadata/) ─────────────────────────────
const distDir = join(root, "dist")
if (!existsSync(join(distDir, "manifest.json"))) {
  console.error("✗ dist/manifest.json missing — build did not produce output")
  process.exit(1)
}

const zipName = `seniorbrowse-v${version}.zip`
const zipPath = join(root, zipName)

const output = createWriteStream(zipPath)
const archive = archiver("zip", { zlib: { level: 9 } })

output.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(0)
  console.log(`\n✓ ${zipName} (${kb} KB) — ready to upload at`)
  console.log("  https://chrome.google.com/webstore/devconsole/")
})
archive.on("warning", (err) => { throw err })
archive.on("error", (err) => { throw err })

archive.pipe(output)
archive.glob("**/*", { cwd: distDir, ignore: ["_metadata/**"] })
await archive.finalize()
